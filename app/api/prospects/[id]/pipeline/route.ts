import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
  const { status, campaign_id } = await req.json();
  if (!['cold','warm','hot'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  const pid = (await params).id;
  const { error } = await supabase.from('prospects').update({ pipeline_status: status }).eq('id', pid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (status === 'hot' && campaign_id) {
    await supabase.from('events').insert({ user_id: auth.user.id, campaign_id, prospect_id: pid, type: 'pipeline_hot' });
  }
  return res;
}


