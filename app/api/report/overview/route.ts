import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

function rangeToDays(r: string) {
  if (r === '30d') return 30; if (r === '14d') return 14; return 7;
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  const range = req.nextUrl.searchParams.get('range') || '7d';
  const days = rangeToDays(range);
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const startDay = start.toISOString().slice(0, 10);
  const endDay = end.toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from('metrics_daily')
    .select('*')
    .is('campaign_id', null)
    .gte('day', startDay)
    .lte('day', endDay)
    .order('day', { ascending: true });

  const series = rows?.map((r) => ({ day: r.day, emails_sent: r.emails_sent, opens: r.opens, replies: r.replies })) || [];
  const totals = rows?.reduce((acc, r) => {
    acc.emails_sent += r.emails_sent || 0;
    acc.opens += r.opens || 0;
    acc.replies += r.replies || 0;
    acc.linkedin_done += r.linkedin_done || 0;
    return acc;
  }, { emails_sent: 0, opens: 0, replies: 0, linkedin_done: 0 })!;

  const openRate = totals.emails_sent ? Math.round((totals.opens / totals.emails_sent) * 100) : 0;
  const replyRate = totals.emails_sent ? Math.round((totals.replies / totals.emails_sent) * 100) : 0;

  // Top campaigns (last 7 days)
  const topStart = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: perCampaign } = await supabase
    .from('metrics_daily')
    .select('campaign_id,day,emails_sent,opens,replies')
    .not('campaign_id', 'is', null)
    .gte('day', topStart)
    .lte('day', endDay);

  const map = new Map<string, { campaign_id: string; emails_sent: number; opens: number; replies: number }>();
  for (const r of perCampaign || []) {
    const m = map.get(r.campaign_id) || { campaign_id: r.campaign_id, emails_sent: 0, opens: 0, replies: 0 };
    m.emails_sent += r.emails_sent || 0; m.opens += r.opens || 0; m.replies += r.replies || 0;
    map.set(r.campaign_id, m);
  }
  const top = [...map.values()].sort((a, b) => b.emails_sent - a.emails_sent).slice(0, 5);

  // Pipeline summary
  const { data: pipeline } = await supabase
    .from('prospects')
    .select('pipeline_status, count:id', { count: 'exact', head: false });
  const pipelineCounts = { cold: 0, warm: 0, hot: 0 } as Record<string, number>;
  for (const r of pipeline || []) pipelineCounts[r.pipeline_status] = (pipelineCounts[r.pipeline_status] || 0) + 1;

  return NextResponse.json({
    totals: { emails_sent: totals.emails_sent, open_rate: openRate, reply_rate: replyRate, linkedin_done: totals.linkedin_done },
    series,
    top_campaigns: top,
    pipeline: pipelineCounts
  });
}


