'use client';

import { useEffect, useState } from 'react';

const STEPS = [
  { id: 'create', text: 'Create a campaign' },
  { id: 'import', text: 'Import prospects' },
  { id: 'templates', text: 'Choose templates' },
  { id: 'launch', text: 'Launch & track results' }
];

export function ProductTour() {
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('tour_done')) setShow(true);
  }, []);
  if (!show) return null;
  const step = STEPS[idx];
  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-md border bg-white p-3 shadow-lg">
      <div className="text-sm">{step.text}</div>
      <div className="mt-2 flex justify-between text-sm">
        <button className="rounded border px-2 py-1" onClick={() => setShow(false)}>Close</button>
        <button className="rounded bg-slate-900 px-2 py-1 text-white" onClick={() => { const n = idx + 1; if (n >= STEPS.length) { localStorage.setItem('tour_done','1'); setShow(false); } else setIdx(n); }}>Next</button>
      </div>
    </div>
  );
}


