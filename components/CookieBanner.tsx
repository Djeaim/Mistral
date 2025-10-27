'use client';

import { useEffect, useState } from 'react';

export function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('cookie_consent')) setShow(true);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white p-4 text-sm shadow">
      We use a privacy-friendly analytics tool and essential cookies. See our <a href="/legal/cookies" className="underline">Cookie Policy</a>.
      <button className="ml-3 rounded bg-slate-900 px-3 py-1 text-white" onClick={() => { localStorage.setItem('cookie_consent', '1'); setShow(false); }}>Accept</button>
    </div>
  );
}


