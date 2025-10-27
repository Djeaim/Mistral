import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import OpenAI from 'openai';
import { decryptFromBase64 } from '@/lib/crypto';
import { renderTemplate } from '@/lib/email';

const TEMPLATES: Record<string, string> = {
  send_connection:
    'Write a concise LinkedIn connection note to {{first_name}} ({{title}} at {{company}}). Goal: get accepted and book a short intro call. 180–250 chars max. Language: {{language}}.',
  follow_up_msg:
    'Write a brief LinkedIn DM after connection acceptance to {{first_name}} at {{company}} (title: {{title}}). Value-driven, propose 2 time slots. 120–200 words. Language: {{language}}.'
};

export async function POST(req: NextRequest) {
  try {
    const { campaign_id, prospect_id, action_type } = await req.json();
    if (!campaign_id || !prospect_id || !action_type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const res = NextResponse.json({ ok: true });
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set(name: string, value: string, options: CookieOptions) { res.cookies.set({ name, value, ...options }); },
        remove(name: string, options: CookieOptions) { res.cookies.set({ name, value: '', ...options }); }
      }
    });

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [{ data: campaign }, { data: prospect }, { data: tmpl }] = await Promise.all([
      supabase.from('campaigns').select('*').eq('id', campaign_id).single(),
      supabase.from('prospects').select('*').eq('id', prospect_id).single(),
      supabase.from('ai_templates').select('*').or('user_id.is.null,user_id.eq.' + auth.user.id).eq('scope', 'linkedin').eq('language', (await supabase.from('campaigns').select('language').eq('id', campaign_id).single()).data?.language || 'en').limit(1).maybeSingle()
    ]);
    if (!campaign || !prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: userRow } = await supabase.from('users').select('openai_api_key').eq('user_id', auth.user.id).single();
    const language = campaign.language === 'fr' ? 'French' : 'English';
    const template = tmpl?.body || TEMPLATES[action_type] || TEMPLATES.send_connection;
    const prompt = renderTemplate(template, {
      first_name: prospect.first_name,
      company: prospect.company,
      title: prospect.title,
      language
    });

    if (!userRow?.openai_api_key) {
      return NextResponse.json({ text: prompt });
    }
    const apiKey = decryptFromBase64(userRow.openai_api_key);
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful SDR assistant. Keep LinkedIn note length <= 250 characters.' },
        { role: 'user', content: prompt }
      ]
    });

    const text = completion.choices[0]?.message?.content?.trim() || '';
    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}


