import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

function rangeToDays(r: string) { if (r === '30d') return 30; if (r === '14d') return 14; return 7; }

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  const id = req.nextUrl.searchParams.get('id');
  const range = req.nextUrl.searchParams.get('range') || '14d';
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const days = rangeToDays(range);
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const startDay = start.toISOString().slice(0, 10);
  const endDay = end.toISOString().slice(0, 10);

  const { data: seriesRows } = await supabase
    .from('metrics_daily')
    .select('*')
    .eq('campaign_id', id)
    .gte('day', startDay)
    .lte('day', endDay)
    .order('day', { ascending: true });

  const series = seriesRows?.map((r) => ({ day: r.day, emails_sent: r.emails_sent, opens: r.opens, replies: r.replies })) || [];
  const totals = seriesRows?.reduce((acc, r) => { acc.emails_sent += r.emails_sent||0; acc.opens += r.opens||0; acc.replies += r.replies||0; return acc; }, { emails_sent: 0, opens: 0, replies: 0 })!;
  const openRate = totals.emails_sent ? Math.round((totals.opens / totals.emails_sent) * 100) : 0;
  const replyRate = totals.emails_sent ? Math.round((totals.replies / totals.emails_sent) * 100) : 0;

  // Prospects total
  const { count: prospectsTotal } = await supabase
    .from('campaign_prospects')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', id);

  // Funnel via events
  const { data: sentProspects } = await supabase
    .from('events')
    .select('prospect_id')
    .eq('campaign_id', id)
    .eq('type', 'sent');
  const { data: openProspects } = await supabase
    .from('events')
    .select('prospect_id')
    .eq('campaign_id', id)
    .eq('type', 'open');
  const { data: replyProspects } = await supabase
    .from('events')
    .select('prospect_id')
    .eq('campaign_id', id)
    .eq('type', 'manual_reply');

  const contacted = new Set((sentProspects||[]).map((x) => x.prospect_id)).size;
  const opened = new Set((openProspects||[]).map((x) => x.prospect_id)).size;
  const replied = new Set((replyProspects||[]).map((x) => x.prospect_id)).size;

  return NextResponse.json({
    totals: { prospects_total: prospectsTotal || 0, emails_sent: totals.emails_sent, open_rate: openRate, reply_rate: replyRate, meetings_booked: undefined },
    series,
    funnel: { uploaded: prospectsTotal || 0, contacted, opened, replied }
  });
}


