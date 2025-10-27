import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function POST(req: NextRequest, { params }: { params: { id: string; prospect_id: string } }) {
  const res = NextResponse.json({ ok: true });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set(name: string, value: string, options: CookieOptions) { res.cookies.set({ name, value, ...options }); },
      remove(name: string, options: CookieOptions) { res.cookies.set({ name, value: '', ...options }); }
    }
  });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { status } = await req.json();
  const { id, prospect_id } = await params;
  await supabase.from('campaign_prospects').update({ connection_status: status }).eq('campaign_id', id).eq('prospect_id', prospect_id);
  if (status === 'accepted') {
    // enqueue follow_up_msg in 24h
    await supabase.from('linkedin_actions').insert({ user_id: auth.user.id, campaign_id: id, prospect_id, action_type: 'follow_up_msg', due_at: new Date(Date.now() + 24*60*60*1000).toISOString(), status: 'pending' });
  }
  return res;
}


