import { getSupabaseServer } from '@/lib/supabaseServer';
import { KpiCard } from '@/components/KpiCard';
import { TrendChart } from '@/components/TrendChart';
import { ProductTour } from '@/components/ProductTour';
import { StatusPill } from '@/components/StatusPill';

export default async function DashboardPage() {
  const supabase = getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const base = process.env.NEXT_PUBLIC_SITE_URL || '';
  const report = await fetch(`${base}/api/report/overview?range=14d`, { cache: 'no-store' }).then((r) => r.json());
  const [{ data: demoCampaign }, { data: keyRow }] = await Promise.all([
    supabase.from('campaigns').select('id').eq('is_demo', true).limit(1).maybeSingle(),
    supabase.from('users').select('openai_api_key').eq('user_id', user?.id || '').maybeSingle()
  ]);
  const showDemoBanner = !keyRow?.openai_api_key && !!demoCampaign;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-slate-600">Welcome{user ? `, ${user.email}` : ''}.</p>

      {showDemoBanner && (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">You are exploring Mistral in Demo Mode. Connect your OpenAI key and SMTP to go live. <a href="/dashboard/settings" className="underline">Settings</a> · <a href="/dashboard/settings/smtp" className="underline">SMTP</a></div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Emails sent (14d)" value={report.totals.emails_sent} />
        <KpiCard label="Open rate" value={report.totals.open_rate} suffix="%" />
        <KpiCard label="Reply rate" value={report.totals.reply_rate} suffix="%" />
        <KpiCard label="LinkedIn done" value={report.totals.linkedin_done} />
      </div>

      <div className="mt-8">
        <TrendChart data={report.series} />
      </div>

      <div className="flex items-center justify-between">
        <ProductTour />
        <StatusPill />
      </div>
    </main>
  );
}


