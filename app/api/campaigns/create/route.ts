import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { isValidEmail } from '@/lib/email';
import { computeScheduleTimes } from '@/lib/rateLimit';
import { checkQuota } from '@/lib/billing/limits';

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
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

  const body = await req.json();
  const { name, objective, language, smtp_id, prospects = [], sequence = [] } = body || {};
  if (!name || !language) return NextResponse.json({ error: 'Missing campaign fields' }, { status: 400 });

  // Gating: campaigns
  const canCreate = await checkQuota(auth.user.id, { type: 'campaigns' });
  if (!canCreate.allowed) return NextResponse.json({ error: canCreate.reason, upgradeUrl: '/pricing' }, { status: 402 });
  const { data: campaign, error: cErr } = await supabase.from('campaigns').insert({ user_id: auth.user.id, name, objective, language }).select('*').single();
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  // store sequence
  if (Array.isArray(sequence) && sequence.length > 0) {
    const seqRows = sequence.map((s: any) => ({ campaign_id: campaign.id, step_number: s.step_number, delay_hours: s.delay_hours || 0, purpose: s.purpose, ai_prompt_template: s.ai_prompt_template }));
    await supabase.from('email_sequences').insert(seqRows);
  }

  // upsert prospects and link
  const valid = prospects.filter((p: any) => isValidEmail(p.email));
  const upserts = valid.map((p: any) => ({ user_id: auth.user.id, first_name: p.first_name, last_name: p.last_name, company: p.company, title: p.title, email: p.email, linkedin_url: p.linkedin_url, notes: p.notes }));
  const canImport = await checkQuota(auth.user.id, { type: 'prospects', amount: upserts.length });
  if (!canImport.allowed) return NextResponse.json({ error: canImport.reason, upgradeUrl: '/pricing' }, { status: 402 });
  let createdProspects: any[] = [];
  for (const chunk of [upserts]) {
    const { data: ps, error: pErr } = await supabase.from('prospects').upsert(chunk as any, { onConflict: 'user_id,email' }).select('*');
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
    createdProspects = ps || [];
  }
  const links = createdProspects.map((p) => ({ campaign_id: campaign.id, prospect_id: p.id, status: 'queued', last_event_at: new Date().toISOString() }));
  await supabase.from('campaign_prospects').insert(links);

  // schedule step 1 messages
  const now = new Date();
  const times = computeScheduleTimes(createdProspects.length, now);
  const messages = createdProspects.map((p, i) => ({
    campaign_id: campaign.id,
    prospect_id: p.id,
    sequence_step: 1,
    scheduled_at: new Date(times[i]).toISOString(),
    status: 'scheduled'
  }));
  await supabase.from('email_messages').insert(messages);

  await supabase.from('events').insert({ user_id: auth.user.id, campaign_id: campaign.id, type: 'scheduled', meta: { count: messages.length } });

  return NextResponse.json({ campaign_id: campaign.id });
}


