import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const res = NextResponse.redirect(new URL(`/dashboard/campaigns/${(await params).id}/linkedin`, req.url));
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
  const id = (await params).id;

  const { data: prospects } = await supabase
    .from('campaign_prospects')
    .select('prospect:prospects(id,linkedin_url,first_name,last_name,company,title)')
    .eq('campaign_id', id);

  const now = new Date();
  const toInsert: any[] = [];
  for (const row of prospects || []) {
    const p = row.prospect;
    if (!p?.linkedin_url) continue;
    toInsert.push(
      { user_id: auth.user.id, campaign_id: id, prospect_id: p.id, action_type: 'visit_profile', due_at: now.toISOString(), status: 'pending' },
      { user_id: auth.user.id, campaign_id: id, prospect_id: p.id, action_type: 'send_connection', due_at: new Date(now.getTime() + 15 * 60 * 1000).toISOString(), status: 'pending' }
    );
    toInsert.push({ user_id: auth.user.id, campaign_id: id, prospect_id: p.id, action_type: 'like_recent_post', due_at: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(), status: 'pending' });
  }
  if (toInsert.length > 0) {
    await supabase.from('linkedin_actions').insert(toInsert);
  }

  return res;
}


