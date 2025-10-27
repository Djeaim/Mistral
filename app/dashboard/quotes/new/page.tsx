'use client';

import { useEffect, useState } from 'react';

export default function NewQuotePage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [validUntil, setValidUntil] = useState<string>('');
  const [currency, setCurrency] = useState('EUR');
  const [vatRate, setVatRate] = useState<number | ''>('');
  const [lines, setLines] = useState<{ description: string; quantity: number; unit_price: number; vat_rate?: number | null }[]>([
    { description: '', quantity: 1, unit_price: 0 }
  ]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/customers/list').then((r) => r.json()).then((d) => setCustomers(d.items || [])).catch(() => {});
  }, []);

  async function create() {
    setSaving(true);
    setMsg(null);
    const res = await fetch('/api/quotes/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_id: customerId, issue_date: issueDate, valid_until: validUntil || null, currency, vat_rate: vatRate === '' ? null : vatRate, lines }) });
    const json = await res.json();
    if (res.ok) window.location.href = `/dashboard/quotes/${json.id}`; else setMsg(json.error || 'Error');
    setSaving(false);
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">New Quote</h1>
      <div className="mt-6 grid gap-3">
        <select className="rounded-md border px-3 py-2" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Select customer</option>
          {customers.map((c) => (<option key={c.id} value={c.id}>{c.company_name}</option>))}
        </select>
        <input type="date" className="rounded-md border px-3 py-2" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        <input type="date" className="rounded-md border px-3 py-2" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} placeholder="valid until" />
        <input className="rounded-md border px-3 py-2" placeholder="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
        <input className="rounded-md border px-3 py-2" placeholder="VAT rate (optional)" value={vatRate} onChange={(e) => setVatRate(e.target.value === '' ? '' : Number(e.target.value))} />
        <div className="rounded-md border p-3">
          {lines.map((l, i) => (
            <div key={i} className="mb-2 grid grid-cols-5 gap-2">
              <input className="col-span-2 rounded-md border px-2 py-1" placeholder="Description" value={l.description} onChange={(e) => setLines(lines.map((x, idx) => idx===i ? { ...x, description: e.target.value } : x))} />
              <input type="number" className="rounded-md border px-2 py-1" placeholder="Qty" value={l.quantity} onChange={(e) => setLines(lines.map((x, idx) => idx===i ? { ...x, quantity: Number(e.target.value) } : x))} />
              <input type="number" className="rounded-md border px-2 py-1" placeholder="Unit price" value={l.unit_price} onChange={(e) => setLines(lines.map((x, idx) => idx===i ? { ...x, unit_price: Number(e.target.value) } : x))} />
              <input type="number" className="rounded-md border px-2 py-1" placeholder="Line VAT (optional)" value={l.vat_rate ?? ''} onChange={(e) => setLines(lines.map((x, idx) => idx===i ? { ...x, vat_rate: e.target.value === '' ? null : Number(e.target.value) } : x))} />
            </div>
          ))}
          <button className="rounded border px-2 py-1 text-sm" onClick={() => setLines([...lines, { description: '', quantity: 1, unit_price: 0 }])}>Add line</button>
        </div>
        <button onClick={create} disabled={saving || !customerId || lines.length===0} className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Creating...' : 'Generate PDF & Save'}</button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </div>
    </main>
  );
}


