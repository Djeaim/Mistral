import Link from 'next/link';
import { getSupabaseServer } from '@/lib/supabaseServer';

export default async function CampaignDetail({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServer();
  const id = (await params).id;
  const [{ data: campaign }, { data: rows }] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', id).single(),
    supabase.from('campaign_prospects').select('prospect:prospects(*), status, last_event_at').eq('campaign_id', id)
  ]);

  const counters = {
    total: rows?.length || 0,
    queued: rows?.filter((r) => r.status === 'queued').length || 0,
    sent: rows?.filter((r) => r.status === 'sent').length || 0,
    opened: rows?.filter((r) => r.status === 'opened').length || 0,
    replied: rows?.filter((r) => r.status === 'replied').length || 0
  };

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{campaign?.name}</h1>
        <div className="flex items-center gap-4">
          <Link href={`/api/campaigns/${id}/linkedin/generate-queue`} className="rounded-md border px-3 py-2 text-sm">Generate LinkedIn queue</Link>
          <Link href={`/dashboard/campaigns/${id}/linkedin`} className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">LinkedIn</Link>
          <Link href="/dashboard/campaigns" className="text-sm text-slate-600 underline">Back</Link>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        {Object.entries(counters).map(([k, v]) => (
          <div key={k} className="rounded-lg border border-slate-200 p-4 text-center">
            <div className="text-2xl font-semibold">{v}</div>
            <div className="text-sm capitalize text-slate-600">{k}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 overflow-hidden rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Prospect</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last event</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r) => (
              <tr key={r.prospect.id} className="border-t">
                <td className="px-3 py-2">{r.prospect.first_name} {r.prospect.last_name}</td>
                <td className="px-3 py-2">{r.prospect.company}</td>
                <td className="px-3 py-2">{r.prospect.email}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">{r.last_event_at ? new Date(r.last_event_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) : '-'}</td>
                <td className="px-3 py-2">
                  <Link href={`/dashboard/campaigns/${id}/preview?prospect=${r.prospect.id}`} className="text-slate-600 underline">Preview</Link>
                  <span className="mx-2">·</span>
                  <Link href={`/api/campaigns/${id}/prospects/${r.prospect.id}/resend`} className="text-slate-600 underline">Resend</Link>
                  <span className="mx-2">·</span>
                  <Link href={`/api/campaigns/${id}/prospects/${r.prospect.id}/mark-replied`} className="text-slate-600 underline">Mark replied</Link>
                  <span className="mx-2">·</span>
                  <Link href={`/api/campaigns/${id}/prospects/${r.prospect.id}/set-status?status=hot`} className="text-slate-600 underline">Set hot</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}


