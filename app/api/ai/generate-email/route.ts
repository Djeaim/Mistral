import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import OpenAI from 'openai';
import { decryptFromBase64 } from '@/lib/crypto';
import { renderTemplate } from '@/lib/email';

const DEFAULT_TEMPLATE = `Write a concise outreach email to {{first_name}} at {{company}} (title: {{title}}).
Product: Mistral – AI CRM that automates prospecting so reps can focus on closing.
Goal: book a short call. Tone: professional, brief, personalized. 90–120 words. Add a clear CTA to propose a time. Language: {{language}}.`;

export async function POST(req: NextRequest) {
  try {
    const { campaign_id, prospect_id, sequence_step } = await req.json();
    if (!campaign_id || !prospect_id || typeof sequence_step !== 'number') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

    const res = NextResponse.json({ ok: true });
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: '', ...options });
        }
      }
    });

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [{ data: campaign }, { data: prospect }, { data: seq }, { data: tmpl }] = await Promise.all([
      supabase.from('campaigns').select('*').eq('id', campaign_id).single(),
      supabase.from('prospects').select('*').eq('id', prospect_id).single(),
      supabase
        .from('email_sequences')
        .select('*')
        .eq('campaign_id', campaign_id)
        .eq('step_number', sequence_step)
        .single(),
      supabase.from('ai_templates').select('*').or('user_id.is.null,user_id.eq.' + auth.user.id).eq('scope', 'email').eq('language', campaign?.language || 'en').limit(1).maybeSingle()
    ]);

    if (!campaign || !prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: userRow } = await supabase.from('users').select('openai_api_key').eq('user_id', auth.user.id).single();
    if (!userRow?.openai_api_key) return NextResponse.json({ error: 'API key not set' }, { status: 400 });

    const language = campaign.language === 'fr' ? 'French' : 'English';
    const templateBody = seq?.ai_prompt_template || tmpl?.body || DEFAULT_TEMPLATE;
    const prompt = renderTemplate(templateBody, {
      first_name: prospect.first_name,
      company: prospect.company,
      title: prospect.title,
      language
    });

    // Demo mode fallback
    if (!userRow?.openai_api_key) {
      const subject = `Quick question, ${prospect.first_name}`;
      const body_html = `<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;font-size:16px;color:#0f172a">${prompt}</div>`;
      return NextResponse.json({ subject, body_html });
    }

    const apiKey = decryptFromBase64(userRow.openai_api_key);
    const client = new OpenAI({ apiKey });

    const system = 'You are an expert SDR writing concise, personalized outreach emails.';

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ]
    });

    const text = completion.choices[0]?.message?.content || '';
    const subject = `Quick question, ${prospect.first_name}`;
    const body_html = `<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;font-size:16px;color:#0f172a">${text.replace(/\n/g, '<br/>')}</div>`;

    return NextResponse.json({ subject, body_html });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}


