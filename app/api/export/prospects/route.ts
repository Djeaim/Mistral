import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  const campaignId = req.nextUrl.searchParams.get('campaign_id');
  if (!campaignId) return NextResponse.json({ error: 'Missing campaign_id' }, { status: 400 });

  const [{ data }, { data: camp }] = await Promise.all([
  supabase
    .from('campaign_prospects')
    .select('last_event_at, prospect:prospects(first_name,last_name,company,email,pipeline_status)')
    .eq('campaign_id', campaignId),
  supabase.from('campaigns').select('is_demo').eq('id', campaignId).maybeSingle()
  ]);

  const header = ['name','company','email','status','last_event_at'];
  const lines = [header.join(',')];
  for (const row of data || []) {
    const p = row.prospect;
    const name = `${p.first_name||''} ${p.last_name||''}`.trim();
    const vals = [name, p.company||'', p.email||'', p.pipeline_status||'cold', row.last_event_at || ''];
    lines.push(vals.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(','));
  }
  const csv = lines.join('\n');
  const suffix = camp?.is_demo ? '-demo' : '';
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="prospects_${campaignId}${suffix}.csv"` } });
}


