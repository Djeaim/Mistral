'use client';

import { useState } from 'react';

export default function NewCustomerPage() {
  const [form, setForm] = useState({ company_name: '', contact_name: '', email: '', phone: '', address: '', city: '', zip: '', country: '', vat_number: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch('/api/customers/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const json = await res.json();
    if (res.ok) window.location.href = '/dashboard/customers';
    else setMsg(json.error || 'Error');
    setSaving(false);
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">New Customer</h1>
      <div className="mt-6 grid gap-3">
        {['company_name','contact_name','email','phone','address','city','zip','country','vat_number'].map((k) => (
          <input key={k} className="rounded-md border px-3 py-2" placeholder={k.replace('_',' ')} value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        ))}
        <button onClick={save} disabled={saving || !form.company_name} className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </div>
    </main>
  );
}


