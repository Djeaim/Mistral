import { getSupabaseServer } from '@/lib/supabaseServer';
import { KpiCard } from '@/components/KpiCard';
import { TrendChart } from '@/components/TrendChart';
import { Funnel } from '@/components/Funnel';
import { PipelineBoard } from '@/components/PipelineBoard';

export default async function CampaignReportPage({ params }: { params: { id: string } }) {
  const id = (await params).id;
  const base = process.env.NEXT_PUBLIC_SITE_URL || '';
  const data = await fetch(`${base}/api/report/campaign?id=${id}&range=14d`, { cache: 'no-store' }).then((r) => r.json());

  const supabase = getSupabaseServer();
  const { data: prospects } = await supabase
    .from('campaign_prospects')
    .select('last_event_at, prospect:prospects(id,first_name,last_name,company,pipeline_status)')
    .eq('campaign_id', id);

  const funnelData = [
    { stage: 'Uploaded', value: data.funnel.uploaded },
    { stage: 'Contacted', value: data.funnel.contacted },
    { stage: 'Opened', value: data.funnel.opened },
    { stage: 'Replied', value: data.funnel.replied }
  ];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Campaign Report</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard label="Prospects" value={data.totals.prospects_total} />
        <KpiCard label="Emails sent" value={data.totals.emails_sent} />
        <KpiCard label="Open rate" value={data.totals.open_rate} suffix="%" />
        <KpiCard label="Reply rate" value={data.totals.reply_rate} suffix="%" />
        <KpiCard label="Meetings booked" value={data.totals.meetings_booked || 0} />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="mb-2 text-sm font-medium">Trend (14 days)</div>
          <TrendChart data={data.series} />
        </div>
        <div className="rounded-lg border p-4">
          <div className="mb-2 text-sm font-medium">Funnel</div>
          <Funnel data={funnelData} />
        </div>
      </div>

      <div className="mt-8 rounded-lg border p-4">
        <div className="mb-2 text-sm font-medium">Pipeline</div>
        <PipelineBoard campaignId={id} prospects={(prospects || []).map((r) => ({ id: r.prospect.id, first_name: r.prospect.first_name, last_name: r.prospect.last_name, company: r.prospect.company, last_event_at: r.last_event_at, pipeline_status: r.prospect.pipeline_status || 'cold' }))} />
      </div>

      <div className="mt-6 flex gap-3">
        <a href={`/api/export/prospects?campaign_id=${id}`} className="rounded-md border px-3 py-2 text-sm">Export prospects CSV</a>
        <a href={`/api/export/events?campaign_id=${id}`} className="rounded-md border px-3 py-2 text-sm">Export events CSV</a>
      </div>
    </main>
  );
}


