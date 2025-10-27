'use client';

import { useEffect, useState } from 'react';

export function StatusPill() {
  const [degraded, setDegraded] = useState<boolean | null>(null);
  useEffect(() => {
    fetch('/api/status').then((r) => r.json()).then((d) => setDegraded(!!d.degraded)).catch(() => setDegraded(true));
  }, []);
  if (degraded === null) return null;
  return (
    <div className={`mt-8 rounded-full px-3 py-1 text-xs ${degraded ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
      {degraded ? 'Degraded' : 'All systems normal'}
    </div>
  );
}


