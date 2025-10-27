import { getSupabaseServer } from '@/lib/supabaseServer';

export default async function TemplatesPage() {
  const supabase = getSupabaseServer();
  const { data: templates } = await supabase.from('ai_templates').select('*').order('created_at', { ascending: false });
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">AI Templates</h1>
      <table className="mt-6 min-w-full text-sm">
        <thead className="bg-slate-50 text-left"><tr><th className="px-3 py-2">Scope</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Lang</th><th className="px-3 py-2">Owner</th><th className="px-3 py-2">Actions</th></tr></thead>
        <tbody>
          {(templates || []).map((t) => (
            <tr key={t.id} className="border-t">
              <td className="px-3 py-2">{t.scope}</td>
              <td className="px-3 py-2">{t.name}</td>
              <td className="px-3 py-2">{t.language}</td>
              <td className="px-3 py-2">{t.user_id ? 'You' : 'Global'}</td>
              <td className="px-3 py-2">
                {!t.user_id && (
                  <form action={`/api/templates/duplicate?id=${t.id}`} method="post"><button className="rounded-md border px-2 py-1 text-xs">Duplicate</button></form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}


