import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { decryptFromBase64 } from '@/lib/crypto';
import { createTransportFromCreds } from '@/lib/mailer';
import { injectTrackingPixel } from '@/lib/email';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, { cookies: { get() { return undefined; }, set() {}, remove() {} } });

    // Select due messages
    const now = new Date().toISOString();
    const { data: due, error } = await supabase
      .from('email_messages')
      .select('id,campaign_id,prospect_id,sequence_step,subject,body_html,tracking_token,status,scheduled_at')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .limit(25);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const sentIds: string[] = [];
    for (const msg of due || []) {
      // Fetch campaign, user, prospect, smtp creds, sequence template
      const [{ data: campaign }, { data: prospect }, { data: smtp }, { data: seq }, { data: userRow }, { data: ent }] = await Promise.all([
        supabase.from('campaigns').select('*').eq('id', msg.campaign_id).single(),
        supabase.from('prospects').select('*').eq('id', msg.prospect_id).single(),
        supabase.from('smtp_credentials').select('*').eq('user_id', (await supabase.from('campaigns').select('user_id').eq('id', msg.campaign_id).single()).data?.user_id).limit(1).maybeSingle(),
        supabase.from('email_sequences').select('*').eq('campaign_id', msg.campaign_id).eq('step_number', msg.sequence_step).single(),
        supabase.from('users').select('openai_api_key').eq('user_id', (await supabase.from('campaigns').select('user_id').eq('id', msg.campaign_id).single()).data?.user_id).single(),
        supabase.from('entitlements').select('emails_per_hour').eq('user_id', (await supabase.from('campaigns').select('user_id').eq('id', msg.campaign_id).single()).data?.user_id).maybeSingle()
      ]);
      // Enforce emails_per_hour by checking last hour sent count
      const userId = campaign.user_id as string;
      const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, { auth: { persistSession: false } });
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: sentLastHour } = await service
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('type', 'sent')
        .gte('created_at', since);
      const limit = ent?.emails_per_hour ?? Number(process.env.EMAILS_PER_HOUR_DEFAULT || '20');
      if ((sentLastHour || 0) >= limit) {
        continue; // skip for now, next cron will pick up
      }

      if (!campaign || !prospect || !smtp) {
        await supabase.from('email_messages').update({ status: 'failed', error: 'Missing campaign/prospect/SMTP' }).eq('id', msg.id);
        continue;
      }

      let subject = msg.subject;
      let body_html = msg.body_html;

      if (!subject || !body_html) {
        // Generate using OpenAI
        if (!userRow?.openai_api_key) {
          await supabase.from('email_messages').update({ status: 'failed', error: 'Missing OpenAI API key' }).eq('id', msg.id);
          continue;
        }
        const apiKey = decryptFromBase64(userRow.openai_api_key);
        const client = new OpenAI({ apiKey });
        const language = campaign.language === 'fr' ? 'French' : 'English';
        const prompt = (seq?.ai_prompt_template || `Write a concise outreach email to ${prospect.first_name} at ${prospect.company} (title: ${prospect.title}). Product: Mistral – AI CRM that automates prospecting so reps can focus on closing. Goal: book a short call. Tone: professional, brief, personalized. 90–120 words. Add a clear CTA to propose a time. Language: ${language}.`);
        const completion = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert SDR writing concise, personalized outreach emails.' },
            { role: 'user', content: prompt }
          ]
        });
        const text = completion.choices[0]?.message?.content || '';
        subject = `Quick question, ${prospect.first_name}`;
        body_html = `<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;font-size:16px;color:#0f172a">${text.replace(/\n/g, '<br/>')}</div>`;
      }

      const tracking = msg.tracking_token || crypto.randomUUID();
      const htmlWithPixel = injectTrackingPixel(body_html!, tracking);

      const pass = decryptFromBase64(smtp.password_encrypted);
      const transporter = createTransportFromCreds({ host: smtp.host, port: smtp.port, user: smtp.user, pass });

      try {
        await transporter.sendMail({
          from: `${smtp.from_name || smtp.user} <${smtp.from_email}>`,
          to: prospect.email,
          subject: subject!,
          html: htmlWithPixel
        });

        await Promise.all([
          supabase.from('email_messages').update({ status: 'sent', sent_at: new Date().toISOString(), tracking_token: tracking, subject, body_html }).eq('id', msg.id),
          supabase.from('campaign_prospects').update({ status: 'sent', last_event_at: new Date().toISOString() }).eq('campaign_id', msg.campaign_id).eq('prospect_id', msg.prospect_id),
          supabase.from('events').insert({ user_id: campaign.user_id, campaign_id: msg.campaign_id, prospect_id: msg.prospect_id, type: 'sent', meta: { message_id: msg.id } })
        ]);
        sentIds.push(msg.id);
      } catch (err: any) {
        await supabase.from('email_messages').update({ status: 'failed', error: err.message || 'send error' }).eq('id', msg.id);
      }
    }

    const out = { sent: sentIds.length };
    // eslint-disable-next-line no-console
    console.log('worker:send-due-emails summary', out);
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Worker error' }, { status: 500 });
  }
}


