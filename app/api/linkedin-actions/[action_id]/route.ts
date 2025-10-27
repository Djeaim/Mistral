import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { checkQuota } from '@/lib/billing/limits';

function getClient(req: NextRequest, res: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  return createServerClient(url, key, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set(name: string, value: string, options: CookieOptions) { res.cookies.set({ name, value, ...options }); },
      remove(name: string, options: CookieOptions) { res.cookies.set({ name, value: '', ...options }); }
    }
  });
}

export async function POST(req: NextRequest, { params }: { params: { action_id: string } }) {
  const res = NextResponse.json({ ok: true });
  const supabase = getClient(req, res);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = (await params).action_id;
  const body = await req.json().catch(() => ({}));
  const { op, due_at } = body;

  if (op === 'done' || op === 'skip') {
    if (op === 'done') {
      const q = await checkQuota(auth.user.id, { type: 'linkedin_actions_per_day', amount: 1 });
      if (!q.allowed) return NextResponse.json({ error: q.reason, upgradeUrl: '/pricing' }, { status: 402 });
    }
    const { error } = await supabase.from('linkedin_actions').update({ status: op === 'done' ? 'done' : 'skipped', done_at: new Date().toISOString() }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return res;
  }

  if (op === 'reschedule') {
    const { error } = await supabase.from('linkedin_actions').update({ due_at }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return res;
  }

  if (op === 'regenerate') {
    const { data: action } = await supabase.from('linkedin_actions').select('*').eq('id', id).single();
    if (!action) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Call internal AI endpoint
    const ai = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/ai/generate-linkedin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: action.campaign_id, prospect_id: action.prospect_id, action_type: action.action_type })
    }).then((r) => r.json());
    if (!ai.text) return NextResponse.json({ error: 'AI failed' }, { status: 500 });
    const { error } = await supabase.from('linkedin_actions').update({ ai_message: ai.text }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ text: ai.text });
  }

  return NextResponse.json({ error: 'Invalid op' }, { status: 400 });
}


