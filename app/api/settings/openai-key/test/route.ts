import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json();
    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

    const res = NextResponse.json({ ok: true });
    createServerClient(supabaseUrl, supabaseAnonKey, {
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

    const client = new OpenAI({ apiKey: key });
    // Make a minimal benign call
    await client.models.list();

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Key validation failed' }, { status: 400 });
  }
}


