'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { copyToClipboard } from '@/lib/clipboard';
import { Toast } from '@/components/Toast';

type Action = {
  id: string;
  action_type: 'visit_profile'|'send_connection'|'follow_up_msg'|'like_recent_post';
  ai_message?: string | null;
  due_at?: string | null;
  status: 'pending'|'done'|'skipped';
  prospect: { id: string; first_name?: string; last_name?: string; company?: string; title?: string; linkedin_url?: string };
};

export default function ClientView({ campaignId, initialActions }: { campaignId: string; initialActions: Action[] }) {
  const [rows, setRows] = useState<Action[]>(initialActions);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const counters = useMemo(() => {
    const now = new Date();
    const today = now.toDateString();
    let pendingToday = 0;
    let overdue = 0;
    let doneWeek = 0;
    for (const r of rows) {
      if (r.status === 'pending' && r.due_at) {
        const d = new Date(r.due_at);
        if (d.toDateString() === today) pendingToday++;
        if (d.getTime() <= now.getTime()) overdue++;
      }
      if (r.status === 'done') {
        doneWeek++;
      }
    }
    return { pendingToday, overdue, doneWeek };
  }, [rows]);

  async function op(actionId: string, op: string, extra?: any) {
    const res = await fetch(`/api/linkedin-actions/${actionId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op, ...extra }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setToast(json.error || 'Operation failed');
      return;
    }
    if (op === 'regenerate') {
      setRows((prev) => prev.map((r) => (r.id === actionId ? { ...r, ai_message: json.text } : r)));
      setToast('AI text updated');
    } else if (op === 'done' || op === 'skip') {
      setRows((prev) => prev.map((r) => (r.id === actionId ? { ...r, status: op === 'done' ? 'done' : 'skipped' } : r)));
      setToast('Updated');
    } else if (op === 'reschedule') {
      setRows((prev) => prev.map((r) => (r.id === actionId ? { ...r, due_at: extra?.due_at } : r)));
      setToast('Rescheduled');
    }
  }

  async function bulk(opName: 'done'|'reschedule') {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    for (const id of ids) {
      await op(id, opName, opName === 'reschedule' ? { due_at: new Date(Date.now() + 24*60*60*1000).toISOString() } : undefined);
    }
    setSelected({});
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">LinkedIn Queue</h1>
        <div className="text-sm text-slate-600">Recommended: &lt;= {process.env.NEXT_PUBLIC_LINKEDIN_ACTIONS_PER_DAY_DEFAULT || 50} actions/day</div>
      </div>
      <p className="mt-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-900">Manual execution only. Mistral does not automate LinkedIn requests.</p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-semibold">{counters.pendingToday}</div>
          <div className="text-sm text-slate-600">Pending today</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-semibold">{counters.overdue}</div>
          <div className="text-sm text-slate-600">Overdue</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-semibold">{counters.doneWeek}</div>
          <div className="text-sm text-slate-600">Done (this week)</div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button className="rounded-md border px-3 py-2 text-sm" onClick={() => bulk('done')}>Mark selected done</button>
        <button className="rounded-md border px-3 py-2 text-sm" onClick={() => bulk('reschedule')}>Reschedule +1 day</button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2"><input type="checkbox" onChange={(e) => setSelected(Object.fromEntries(rows.map((r) => [r.id, e.target.checked])))} /></th>
              <th className="px-3 py-2">Due</th>
              <th className="px-3 py-2">Prospect</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Buttons</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="px-3 py-2"><input type="checkbox" checked={!!selected[r.id]} onChange={(e) => setSelected({ ...selected, [r.id]: e.target.checked })} /></td>
                <td className="px-3 py-2">{r.due_at ? new Date(r.due_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) : '-'}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{r.prospect.first_name} {r.prospect.last_name}</div>
                  <div className="text-slate-600">{r.prospect.company}</div>
                </td>
                <td className="px-3 py-2">{r.action_type.replaceAll('_', ' ')}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {r.prospect.linkedin_url && (
                      <Link href={r.prospect.linkedin_url} target="_blank" className="rounded-md border px-3 py-1">Open profile</Link>
                    )}
                    {r.ai_message && (
                      <button className="rounded-md border px-3 py-1" onClick={async () => { const ok = await copyToClipboard(r.ai_message || ''); setToast(ok ? 'Copied' : 'Copy failed'); }}>Copy message</button>
                    )}
                    <button className="rounded-md border px-3 py-1" onClick={() => op(r.id, 'regenerate')}>Regenerate AI text</button>
                    <button className="rounded-md border px-3 py-1" onClick={() => op(r.id, 'done')}>Mark done</button>
                    <button className="rounded-md border px-3 py-1" onClick={() => op(r.id, 'skip')}>Skip</button>
                  </div>
                </td>
                <td className="px-3 py-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  );
}


