'use client';

import { useEffect } from 'react';

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform rounded-md bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
      {message}
    </div>
  );
}


