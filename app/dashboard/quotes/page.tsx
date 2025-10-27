import { getSupabaseServer } from '@/lib/supabaseServer';
import Link from 'next/link';

export default async function QuotesPage() {
  const supabase = getSupabaseServer();
  const { data: quotes } = await supabase.from('quotes').select('id,quote_number,status,total_ttc,issue_date').order('created_at', { ascending: false });
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quotes</h1>
        <Link href="/dashboard/quotes/new" className="rounded-md bg-slate-900 px-4 py-2 text-white">New</Link>
      </div>
      <table className="mt-6 min-w-full text-sm">
        <thead className="bg-slate-50 text-left">
          <tr><th className="px-3 py-2">Number</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr>
        </thead>
        <tbody>
          {(quotes || []).map((q) => (
            <tr key={q.id} className="border-t">
              <td className="px-3 py-2">{q.quote_number}</td>
              <td className="px-3 py-2">{q.issue_date}</td>
              <td className="px-3 py-2">€{Number(q.total_ttc).toFixed(2)}</td>
              <td className="px-3 py-2">{q.status}</td>
              <td className="px-3 py-2">
                <Link href={`/dashboard/quotes/${q.id}`} className="text-slate-600 underline">View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}


