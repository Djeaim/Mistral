'use client';

import { useEffect, useState } from 'react';

type Cred = {
  id?: string;
  provider?: string;
  host: string;
  port: number;
  user: string;
  password?: string;
  from_name?: string;
  from_email: string;
};

export default function SMTPSettingsPage() {
  const [form, setForm] = useState<Cred>({ host: '', port: 587, user: '', from_email: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [existing, setExisting] = useState<Cred[]>([]);

  useEffect(() => {
    fetch('/api/smtp')
      .then((r) => r.json())
      .then((d) => setExisting(d.items || []))
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed');
      setMessage('Saved');
      setExisting((prev) => [body.item, ...prev]);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">SMTP Settings</h1>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-6">
          <div className="grid gap-3">
            <input className="rounded-md border px-3 py-2" placeholder="Provider (optional)" value={form.provider || ''} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
            <input className="rounded-md border px-3 py-2" placeholder="SMTP Host" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
            <input className="rounded-md border px-3 py-2" placeholder="Port" type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} />
            <input className="rounded-md border px-3 py-2" placeholder="SMTP Username" value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} />
            <input className="rounded-md border px-3 py-2" placeholder="SMTP Password" type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <input className="rounded-md border px-3 py-2" placeholder="From name" value={form.from_name || ''} onChange={(e) => setForm({ ...form, from_name: e.target.value })} />
            <input className="rounded-md border px-3 py-2" placeholder="From email" value={form.from_email} onChange={(e) => setForm({ ...form, from_email: e.target.value })} />
            <button onClick={save} disabled={saving} className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            {message && <p className="text-sm text-slate-600">{message}</p>}
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-lg font-medium">Existing</h2>
          <ul className="space-y-2">
            {existing.map((c) => (
              <li key={c.id} className="rounded-md border border-slate-200 p-3">
                <div className="text-sm font-medium">{c.provider || c.host}</div>
                <div className="text-sm text-slate-600">{c.user} → {c.from_email}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}


