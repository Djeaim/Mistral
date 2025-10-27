import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { encryptToBase64 } from '@/lib/crypto';

function getClient(req: NextRequest, res: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
}

export async function GET(req: NextRequest) {
  const res = NextResponse.json({ items: [] });
  const supabase = getClient(req, res);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase.from('smtp_credentials').select('id,provider,host,port,user,from_name,from_email').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const supabase = getClient(req, res);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { provider, host, port, user, password, from_name, from_email } = body || {};
  if (!host || !port || !user || !password || !from_email) {
    return NextResponse.json({ error: 'Missing SMTP fields' }, { status: 400 });
  }
  const password_encrypted = encryptToBase64(password);
  const { data, error } = await supabase.from('smtp_credentials').insert({
    user_id: auth.user.id,
    provider,
    host,
    port,
    user,
    password_encrypted,
    from_name,
    from_email
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: { id: data.id, provider: data.provider, host: data.host, port: data.port, user: data.user, from_name: data.from_name, from_email: data.from_email } });
}


