'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const saveKey = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/openai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: apiKey })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to save key');
      setMessage('API key saved securely.');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setSaving(false);
    }
  };

  const testKey = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/openai-key/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: apiKey })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Key test failed');
      setMessage('Key works!');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="mt-6 rounded-lg border border-slate-200 p-6">
        <label className="block text-sm font-medium text-slate-700">OpenAI API Key</label>
        <input
          type="password"
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <div className="mt-4 flex gap-3">
          <button
            onClick={saveKey}
            disabled={saving || !apiKey}
            className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={testKey}
            disabled={testing || !apiKey}
            className="rounded-md border border-slate-300 px-4 py-2 disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test API Key'}
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
      </div>
    </main>
  );
}


