import { getSupabaseServer } from '@/lib/supabaseServer';

export default async function QuoteDetail({ params }: { params: { id: string } }) {
  const id = (await params).id;
  const supabase = getSupabaseServer();
  const { data: q } = await supabase.from('quotes').select('*').eq('id', id).single();
  const { data: signed } = await supabase.storage.from('documents').createSignedUrl(q.pdf_url, 60 * 60);
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Quote {q.quote_number}</h1>
      <div className="mt-4 flex gap-3">
        <a href={signed?.signedUrl} target="_blank" className="rounded-md border px-3 py-2 text-sm">Download PDF</a>
        <form action={`/api/quotes/${id}/convert`} method="post"><button className="rounded-md border px-3 py-2 text-sm">Convert to Invoice</button></form>
      </div>
      <div className="mt-6 text-sm text-slate-700">Status: {q.status}</div>
    </main>
  );
}


