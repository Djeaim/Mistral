'use client';

import { useState } from 'react';

type Prospect = { id: string; first_name?: string; last_name?: string; company?: string; last_event_at?: string | null; pipeline_status: 'cold'|'warm'|'hot' };

export function PipelineBoard({ campaignId, prospects: initial }: { campaignId: string; prospects: Prospect[] }) {
  const [prospects, setProspects] = useState<Prospect[]>(initial);

  async function mark(id: string, status: 'cold'|'warm'|'hot') {
    const res = await fetch(`/api/prospects/${id}/pipeline`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, campaign_id: campaignId }) });
    if (res.ok) setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, pipeline_status: status } : p)));
  }

  const cols: ('cold'|'warm'|'hot')[] = ['cold','warm','hot'];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cols.map((col) => (
        <div key={col} className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 font-medium capitalize">{col}</div>
          <div className="space-y-2">
            {prospects.filter((p) => p.pipeline_status === col).map((p) => (
              <div key={p.id} className="rounded-md border p-3">
                <div className="font-medium">{p.first_name} {p.last_name}</div>
                <div className="text-sm text-slate-600">{p.company}</div>
                <div className="mt-2 flex gap-2 text-xs">
                  {col !== 'cold' && <button className="rounded border px-2 py-1" onClick={() => mark(p.id, 'cold')}>Mark Cold</button>}
                  {col !== 'warm' && <button className="rounded border px-2 py-1" onClick={() => mark(p.id, 'warm')}>Mark Warm</button>}
                  {col !== 'hot' && <button className="rounded border px-2 py-1" onClick={() => mark(p.id, 'hot')}>Mark Hot</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


