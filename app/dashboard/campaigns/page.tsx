import Link from 'next/link';
import { getSupabaseServer } from '@/lib/supabaseServer';

export default async function CampaignsPage() {
  const supabase = getSupabaseServer();
  const [{ data: campaigns }, { data: ent }] = await Promise.all([
    supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
    supabase.from('entitlements').select('*').maybeSingle()
  ]);
  const used = (campaigns || []).length;
  const max = ent?.campaigns_max ?? 1;
  const nearing = used / max >= 0.8;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Campaigns</h1>
        <Link href="/dashboard/campaigns/new" className="rounded-md bg-slate-900 px-4 py-2 text-white">New Campaign</Link>
      </div>
      {nearing && (
        <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">You're using {used}/{max} campaigns. Upgrade for more capacity. <Link href="/pricing" className="underline">See plans</Link>.</div>
      )}
      <ul className="mt-6 divide-y divide-slate-200 rounded-lg border">
        {(campaigns || []).map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-slate-600">{c.objective}</div>
            </div>
            <Link href={`/dashboard/campaigns/${c.id}`} className="text-sm text-slate-600 underline">Open</Link>
          </li>
        ))}
        {(!campaigns || campaigns.length === 0) && (
          <li className="px-4 py-6 text-slate-600">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border p-4">
                <div className="font-medium">Create your first campaign</div>
                <p className="text-sm text-slate-600">Import prospects, choose templates, and launch.</p>
                <Link href="/dashboard/campaigns/new" className="mt-2 inline-block rounded-md bg-slate-900 px-3 py-2 text-white">Create campaign</Link>
              </div>
              <div className="rounded-md border p-4">
                <div className="font-medium">Load demo data</div>
                <p className="text-sm text-slate-600">Explore Mistral with sample data. Sending disabled.</p>
                <form action="/api/demo/create" method="post"><button className="mt-2 rounded-md border px-3 py-2 text-sm">Load demo</button></form>
              </div>
            </div>
          </li>
        )}
      </ul>
    </main>
  );
}


