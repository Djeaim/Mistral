import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

function fakeProspects() {
  const names = [['Alice','Martin'],['Bob','Durand'],['Claire','Petit'],['David','Moreau'],['Emma','Lefevre'],['Fabien','Bernard'],['Gina','Lambert'],['Hugo','Robert'],['Ines','Faure'],['Jack','Girard'],['Katy','Blanc'],['Leo','Dumont'],['Maya','Robin'],['Nina','Perrot'],['Olivier','Lopez']];
  const companies = ['Acme','Globex','Innotech','BlueSoft','Nexium'];
  return Array.from({ length: 15 }).map((_, i) => {
    const [f,l] = names[i % names.length];
    const company = companies[i % companies.length];
    return { first_name: f, last_name: l, company, title: 'Head of Sales', email: `${f.toLowerCase()}.${l.toLowerCase()}@example.com` };
  });
}

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set(name: string, value: string, options: CookieOptions) { res.cookies.set({ name, value, ...options }); },
      remove(name: string, options: CookieOptions) { res.cookies.set({ name, value: '', ...options }); }
    }
  });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // create demo campaign
  const { data: campaign } = await supabase.from('campaigns').insert({ user_id: auth.user.id, name: 'Demo Campaign', objective: 'Explore Mistral', language: 'en', is_demo: true }).select('*').single();
  const prospects = fakeProspects().map((p) => ({ user_id: auth.user.id, ...p, is_demo: true }));
  const { data: ps } = await supabase.from('prospects').insert(prospects).select('*');
  await supabase.from('campaign_prospects').insert((ps||[]).map((p:any) => ({ campaign_id: campaign!.id, prospect_id: p.id, status: 'sent', last_event_at: new Date().toISOString() })));
  await supabase.from('email_sequences').insert([
    { campaign_id: campaign!.id, step_number: 1, delay_hours: 0, purpose: 'Initial outreach' },
    { campaign_id: campaign!.id, step_number: 2, delay_hours: 72, purpose: 'Follow-up' }
  ]);
  await supabase.from('events').insert({ user_id: auth.user.id, campaign_id: campaign!.id, type: 'sent', meta: { demo: true } });
  return res;
}


