import { getSupabaseServer } from '@/lib/supabaseServer';

export default async function BillingSettingsPage() {
  const supabase = getSupabaseServer();
  const [{ data: sub }, { data: ent }] = await Promise.all([
    supabase.from('subscriptions').select('*').maybeSingle(),
    supabase.from('entitlements').select('*').maybeSingle()
  ]);

  async function getPortalUrl() {
    'use server';
    const res = await fetch('/api/billing/portal', { method: 'POST' });
    const json = await res.json();
    return json.url as string;
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <div className="mt-6 rounded-lg border p-6">
        <div className="text-sm text-slate-600">Plan</div>
        <div className="text-lg font-medium capitalize">{sub?.plan || 'starter'}</div>
        <div className="mt-2 text-sm text-slate-600">Status: {sub?.status || 'active'}</div>
        {sub?.current_period_end && <div className="text-sm text-slate-600">Renews: {new Date(sub.current_period_end).toLocaleDateString()}</div>}
        <form action={async () => { const url = await getPortalUrl(); /* @ts-expect-error */ redirect(url); }} className="mt-4">
          <button className="rounded-md border px-3 py-2 text-sm">Manage billing</button>
        </form>
      </div>
      <div className="mt-6 rounded-lg border p-6">
        <div className="mb-2 text-sm font-medium">Entitlements</div>
        <ul className="text-sm text-slate-700">
          <li>Emails per hour: {ent?.emails_per_hour ?? 20}</li>
          <li>Campaigns max: {ent?.campaigns_max ?? 1}</li>
          <li>Prospects max: {ent?.prospects_max ?? 100}</li>
          <li>LinkedIn actions/day: {ent?.linkedin_actions_per_day ?? 20}</li>
        </ul>
      </div>
    </main>
  );
}


