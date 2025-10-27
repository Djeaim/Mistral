'use client';

import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { isValidEmail } from '@/lib/email';

type Prospect = {
  first_name?: string;
  last_name?: string;
  company?: string;
  title?: string;
  email: string;
  linkedin_url?: string;
  notes?: string;
};

type SequenceStep = { step_number: number; delay_hours: number; purpose?: string; ai_prompt_template?: string };

export default function NewCampaignPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [language, setLanguage] = useState<'en'|'fr'>('en');
  const [smtpId, setSmtpId] = useState<string | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [seq, setSeq] = useState<SequenceStep[]>([
    { step_number: 1, delay_hours: 0, purpose: 'Initial outreach' },
    { step_number: 2, delay_hours: 72, purpose: 'Follow-up' }
  ]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const validProspects = useMemo(() => prospects.filter((p) => isValidEmail(p.email)), [prospects]);

  const onCSV = (file: File) => {
    Papa.parse<Prospect>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data || []).map((r) => ({
          first_name: r.first_name?.trim(),
          last_name: r.last_name?.trim(),
          company: r.company?.trim(),
          title: r.title?.trim(),
          email: String(r.email || '').trim(),
          linkedin_url: r.linkedin_url?.trim(),
          notes: r.notes?.trim()
        }));
        setProspects(rows);
      }
    });
  };

  const launch = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, objective, language, smtp_id: smtpId, prospects: validProspects, sequence: seq })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed');
      window.location.href = `/dashboard/campaigns/${body.campaign_id}`;
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold">New Campaign</h1>
      <div className="mt-6 rounded-lg border p-6">
        <div className="mb-4 text-sm text-slate-600">Step {step} of 5</div>
        {step === 1 && (
          <div className="grid gap-3">
            <input className="rounded-md border px-3 py-2" placeholder="Campaign name" value={name} onChange={(e) => setName(e.target.value)} />
            <textarea className="rounded-md border px-3 py-2" placeholder="Objective / brief" value={objective} onChange={(e) => setObjective(e.target.value)} />
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-2"><input type="radio" checked={language==='en'} onChange={() => setLanguage('en')} /> English</label>
              <label className="flex items-center gap-2"><input type="radio" checked={language==='fr'} onChange={() => setLanguage('fr')} /> French</label>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-3">
            <p className="text-sm text-slate-600">Select an existing SMTP credential (first one will be used if left empty):</p>
            <input className="rounded-md border px-3 py-2" placeholder="SMTP Credential ID (optional)" value={smtpId || ''} onChange={(e) => setSmtpId(e.target.value)} />
            <p className="text-xs text-slate-500">You can manage SMTP in Settings → SMTP.</p>
          </div>
        )}
        {step === 3 && (
          <div className="grid gap-3">
            <input type="file" accept=".csv" onChange={(e) => e.target.files && onCSV(e.target.files[0])} />
            <div className="text-sm text-slate-600">Valid rows: {validProspects.length}</div>
          </div>
        )}
        {step === 4 && (
          <div className="grid gap-4">
            {seq.map((s, idx) => (
              <div key={s.step_number} className="rounded-md border p-4">
                <div className="mb-2 text-sm font-medium">Step {s.step_number}</div>
                <input className="mb-2 w-full rounded-md border px-3 py-2" placeholder="Purpose" value={s.purpose || ''} onChange={(e) => setSeq(seq.map((x, i) => i===idx ? { ...x, purpose: e.target.value } : x))} />
                <input className="mb-2 w-full rounded-md border px-3 py-2" placeholder="Delay (hours)" type="number" value={s.delay_hours} onChange={(e) => setSeq(seq.map((x, i) => i===idx ? { ...x, delay_hours: Number(e.target.value) } : x))} />
                <div className="mb-2 flex gap-2">
                  <select className="rounded-md border px-3 py-2" onChange={async (e) => {
                    const id = e.target.value;
                    if (!id) return;
                    const res = await fetch(`/api/templates/get?id=${id}`);
                    const json = await res.json();
                    setSeq(seq.map((x, i) => i===idx ? { ...x, ai_prompt_template: json.body } : x));
                  }}>
                    <option value="">Choose template</option>
                  </select>
                </div>
                <textarea className="h-28 w-full rounded-md border px-3 py-2" placeholder="AI prompt template (optional)" value={s.ai_prompt_template || ''} onChange={(e) => setSeq(seq.map((x, i) => i===idx ? { ...x, ai_prompt_template: e.target.value } : x))} />
              </div>
            ))}
          </div>
        )}
        {step === 5 && (
          <div className="grid gap-2 text-sm text-slate-700">
            <div><span className="font-medium">Name:</span> {name}</div>
            <div><span className="font-medium">Language:</span> {language}</div>
            <div><span className="font-medium">Prospects:</span> {validProspects.length}</div>
            <div><span className="font-medium">Sequence steps:</span> {seq.length}</div>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button className="rounded-md border px-4 py-2" disabled={step===1} onClick={() => setStep((s) => s-1)}>Back</button>
          {step < 5 ? (
            <button className="rounded-md bg-slate-900 px-4 py-2 text-white" onClick={() => setStep((s) => s+1)}>Next</button>
          ) : (
            <button className="rounded-md bg-slate-900 px-4 py-2 text-white" disabled={saving || !name || validProspects.length===0} onClick={launch}>{saving ? 'Launching...' : 'Review & Launch'}</button>
          )}
        </div>

        {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
      </div>
    </main>
  );
}


