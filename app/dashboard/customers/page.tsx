import { getSupabaseServer } from '@/lib/supabaseServer';

export default async function CustomersPage() {
  const supabase = getSupabaseServer();
  const { data: customers } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <a href="/dashboard/customers/new" className="rounded-md bg-slate-900 px-4 py-2 text-white">New</a>
      </div>
      <ul className="mt-6 divide-y rounded-lg border">
        {(customers || []).map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium">{c.company_name}</div>
              <div className="text-sm text-slate-600">{c.email}</div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}


