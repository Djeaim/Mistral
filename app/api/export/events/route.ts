import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  const campaignId = req.nextUrl.searchParams.get('campaign_id');
  if (!campaignId) return NextResponse.json({ error: 'Missing campaign_id' }, { status: 400 });
  const [{ data }, { data: camp }] = await Promise.all([
  supabase
    .from('events')
    .select('created_at,type,prospect_id')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true }),
  supabase.from('campaigns').select('is_demo').eq('id', campaignId).maybeSingle()
  ]);

  const header = ['created_at','type','prospect_id'];
  const lines = [header.join(',')];
  for (const e of data || []) {
    const vals = [e.created_at, e.type, e.prospect_id];
    lines.push(vals.map((v) => `"${String(v||'').replace(/"/g,'""')}"`).join(','));
  }
  const csv = lines.join('\n');
  const suffix = camp?.is_demo ? '-demo' : '';
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="events_${campaignId}${suffix}.csv"` } });
}


