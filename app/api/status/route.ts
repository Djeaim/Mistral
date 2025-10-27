import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET(_req: NextRequest) {
  const supabase = getSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: sub }, { data: ent }, { count: campaignsCount }, { count: prospectsCount }, { count: sentLast24 } ] = await Promise.all([
    supabase.from('subscriptions').select('plan,status').eq('user_id', auth.user.id).maybeSingle(),
    supabase.from('entitlements').select('*').eq('user_id', auth.user.id).maybeSingle(),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('user_id', auth.user.id),
    supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('user_id', auth.user.id),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('user_id', auth.user.id).eq('type', 'sent').gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())
  ]);

  // Degraded if any failed email_messages in last hour
  const { count: failed } = await supabase.from('email_messages').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('scheduled_at', new Date(Date.now() - 60*60*1000).toISOString());
  const degraded = (failed || 0) > 0;

  return NextResponse.json({
    plan: sub?.plan || 'starter',
    entitlements: ent || null,
    counts: { campaigns: campaignsCount || 0, prospects: prospectsCount || 0, emails_sent_24h: sentLast24 || 0 },
    degraded
  });
}


