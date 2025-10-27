import { getSupabaseServer } from '@/lib/supabaseServer';
import Link from 'next/link';

export default async function InvoicesPage() {
  const supabase = getSupabaseServer();
  const { data: invoices } = await supabase.from('invoices').select('id,invoice_number,status,total_ttc,issue_date').order('created_at', { ascending: false });
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <Link href="/dashboard/invoices/new" className="rounded-md bg-slate-900 px-4 py-2 text-white">New</Link>
      </div>
      <table className="mt-6 min-w-full text-sm">
        <thead className="bg-slate-50 text-left">
          <tr><th className="px-3 py-2">Number</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr>
        </thead>
        <tbody>
          {(invoices || []).map((i) => (
            <tr key={i.id} className="border-t">
              <td className="px-3 py-2">{i.invoice_number}</td>
              <td className="px-3 py-2">{i.issue_date}</td>
              <td className="px-3 py-2">€{Number(i.total_ttc).toFixed(2)}</td>
              <td className="px-3 py-2">{i.status}</td>
              <td className="px-3 py-2">
                <Link href={`/dashboard/invoices/${i.id}`} className="text-slate-600 underline">View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}


