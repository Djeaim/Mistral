'use client';

import { useEffect, useState } from 'react';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState({ company_name: '', company_address: '', company_country: '', default_currency: 'EUR', default_vat_rate: 20 });
  const [prefs, setPrefs] = useState({ language: 'en', target: '' });
  const [mode, setMode] = useState<'key'|'demo'|'none'>('none');
  const [openaiKey, setOpenaiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // prefill currency by locale
  }, []);

  async function saveCompany() {
    setSaving(true);
    await fetch('/api/onboarding/save-company', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(company) });
    setSaving(false);
    setStep(2);
  }

  async function testKey() {
    setTesting(true);
    setTestMsg(null);
    const res = await fetch('/api/settings/openai-key/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: openaiKey }) });
    const body = await res.json();
    setTestMsg(res.ok ? 'Key works' : body.error || 'Failed');
    setTesting(false);
  }

  async function finish() {
    if (mode === 'key') {
      await fetch('/api/settings/openai-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: openaiKey }) });
    } else if (mode === 'demo') {
      await fetch('/api/demo/create', { method: 'POST' });
    }
    window.location.href = '/dashboard';
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Welcome to Mistral</h1>
      <div className="mt-2 text-sm text-slate-600">Step {step} of 4</div>
      {step === 1 && (
        <div className="mt-6 grid gap-3">
          <input className="rounded-md border px-3 py-2" placeholder="Company name" value={company.company_name} onChange={(e) => setCompany({ ...company, company_name: e.target.value })} />
          <input className="rounded-md border px-3 py-2" placeholder="Address" value={company.company_address} onChange={(e) => setCompany({ ...company, company_address: e.target.value })} />
          <input className="rounded-md border px-3 py-2" placeholder="Country" value={company.company_country} onChange={(e) => setCompany({ ...company, company_country: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-md border px-3 py-2" placeholder="Currency" value={company.default_currency} onChange={(e) => setCompany({ ...company, default_currency: e.target.value })} />
            <input type="number" className="rounded-md border px-3 py-2" placeholder="VAT %" value={company.default_vat_rate} onChange={(e) => setCompany({ ...company, default_vat_rate: Number(e.target.value) })} />
          </div>
          <div className="flex justify-end">
            <button className="rounded-md bg-slate-900 px-4 py-2 text-white" onClick={saveCompany} disabled={!company.company_name || !company.company_address || saving}>{saving ? 'Saving...' : 'Continue'}</button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="mt-6 grid gap-3">
          <div className="text-sm">Prospecting preferences</div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={prefs.language==='en'} onChange={() => setPrefs({ ...prefs, language: 'en' })} /> English</label>
            <label className="flex items-center gap-2"><input type="radio" checked={prefs.language==='fr'} onChange={() => setPrefs({ ...prefs, language: 'fr' })} /> French</label>
          </div>
          <input className="rounded-md border px-3 py-2" placeholder="Target role/industry" value={prefs.target} onChange={(e) => setPrefs({ ...prefs, target: e.target.value })} />
          <div className="flex justify-between">
            <button className="rounded-md border px-4 py-2" onClick={() => setStep(1)}>Back</button>
            <button className="rounded-md bg-slate-900 px-4 py-2 text-white" onClick={() => setStep(3)}>Continue</button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="mt-6 grid gap-4">
          <div className="rounded-md border p-4">
            <label className="flex items-center gap-2"><input type="radio" checked={mode==='key'} onChange={() => setMode('key')} /> Connect OpenAI Key</label>
            {mode === 'key' && (
              <div className="mt-3 grid gap-2">
                <input type="password" className="rounded-md border px-3 py-2" placeholder="sk-..." value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} />
                <div className="flex gap-2">
                  <button className="rounded-md border px-3 py-2 text-sm" onClick={testKey} disabled={!openaiKey || testing}>{testing ? 'Testing...' : 'Test key'}</button>
                  {testMsg && <span className="text-sm text-slate-600">{testMsg}</span>}
                </div>
              </div>
            )}
          </div>
          <div className="rounded-md border p-4">
            <label className="flex items-center gap-2"><input type="radio" checked={mode==='demo'} onChange={() => setMode('demo')} /> Use Demo Mode</label>
            <div className="mt-1 text-sm text-slate-600">Loads sample data. Sending is disabled until you connect OpenAI + SMTP.</div>
          </div>
          <div className="flex justify-between">
            <button className="rounded-md border px-4 py-2" onClick={() => setStep(2)}>Back</button>
            <button className="rounded-md bg-slate-900 px-4 py-2 text-white" onClick={() => setStep(4)} disabled={mode==='none'}>Continue</button>
          </div>
        </div>
      )}
      {step === 4 && (
        <div className="mt-6 grid gap-3">
          <div className="text-sm">SMTP setup (optional)</div>
          <div className="text-sm text-slate-600">You can add SMTP later in Settings → SMTP.</div>
          <div className="flex justify-between">
            <button className="rounded-md border px-4 py-2" onClick={() => setStep(3)}>Back</button>
            <button className="rounded-md bg-slate-900 px-4 py-2 text-white" onClick={finish}>Finish</button>
          </div>
        </div>
      )}
    </main>
  );
}


