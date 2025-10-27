import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

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

  const {
    data: { session }
  } = await supabase.auth.getSession();

  const url = new URL(req.url);
  const isDashboard = url.pathname.startsWith('/dashboard');
  const isAuth = url.pathname.startsWith('/(auth)');
  const isOnboarding = url.pathname.startsWith('/onboarding');
  const isApi = url.pathname.startsWith('/api');
  const isWorker = url.pathname.startsWith('/api/worker');

  // Basic rate limit for public API (edge cache, best-effort)
  if (isApi && !isWorker) {
    const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
    const key = `rl_${ip}`;
    const now = Date.now();
    const windowMs = 60 * 1000;
    const limit = 60;
    // @ts-ignore
    const globalAny: any = global;
    globalAny.__rl = globalAny.__rl || new Map<string, { count: number; start: number }>();
    const entry = globalAny.__rl.get(key) || { count: 0, start: now };
    if (now - entry.start > windowMs) {
      entry.count = 0; entry.start = now;
    }
    entry.count += 1;
    globalAny.__rl.set(key, entry);
    if (entry.count > limit) {
      return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
    }
  }

  if (isDashboard && !session) {
    return NextResponse.redirect(new URL('/(auth)/login', req.url));
  }

  if (isAuth && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Onboarding redirect: if logged-in and missing company profile and no OpenAI key
  if (!isOnboarding && session) {
    const { data: user } = await supabase.auth.getUser();
    if (user?.user) {
      const uid = user.user.id;
      const [{ data: company }, { data: keyRow }] = await Promise.all([
        supabase.from('company_profiles').select('user_id').eq('user_id', uid).maybeSingle(),
        supabase.from('users').select('openai_api_key').eq('user_id', uid).maybeSingle()
      ]);
      if (!company && !keyRow?.openai_api_key && isDashboard) {
        return NextResponse.redirect(new URL('/onboarding', req.url));
      }
    }
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/(auth)/:path*', '/onboarding']
};


