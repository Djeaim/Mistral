import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function GET(req: NextRequest, { params }: { params: { id: string; prospect_id: string } }) {
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

  const { id, prospect_id } = await params;
  const { error } = await supabase.from('email_messages').insert({ campaign_id: id, prospect_id, sequence_step: 1, scheduled_at: new Date().toISOString(), status: 'scheduled' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.redirect(new URL(`/dashboard/campaigns/${id}`, req.url));
}


