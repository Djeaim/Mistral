'use client';

import { useState } from 'react';

const plans = [
  { id: 'starter', name: 'Starter', price: '0€ / mo', features: ['1 campaign', '100 prospects', '20 emails/hr', '20 LinkedIn actions/day'] },
  { id: 'pro', name: 'Pro', price: '49€ / mo', features: ['10 campaigns', '5k prospects', '60 emails/hr', '80 LinkedIn actions/day'] },
  { id: 'business', name: 'Business', price: '197€ / mo', features: ['50 campaigns', '50k prospects', '200 emails/hr', '200 LinkedIn actions/day'] }
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function checkout(plan: 'pro'|'business') {
    setLoading(plan);
    try {
      const res = await fetch('/api/billing/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
      const body = await res.json();
      if (body.url) window.location.href = body.url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <h1 className="text-center text-3xl font-semibold">Pricing</h1>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className="rounded-lg border p-6">
            <div className="text-xl font-medium">{p.name}</div>
            <div className="mt-2 text-2xl">{p.price}</div>
            <ul className="mt-4 space-y-2 text-sm">
              {p.features.map((f) => (<li key={f}>• {f}</li>))}
            </ul>
            <div className="mt-6">
              {p.id === 'starter' ? (
                <a href="/(auth)/register" className="block rounded-md bg-slate-900 px-4 py-2 text-center text-white">Get started</a>
              ) : (
                <button onClick={() => checkout(p.id as any)} disabled={loading===p.id} className="w-full rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{loading===p.id ? 'Redirecting...' : 'Upgrade'}</button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 max-w-3xl">
        <h2 className="mb-3 text-center text-xl font-medium">FAQs</h2>
        <ul className="space-y-3 text-sm text-slate-700">
          <li>
            <div className="font-medium">Can I start in demo mode?</div>
            Yes. Load demo data during onboarding. Sending is disabled until you connect OpenAI + SMTP.
          </li>
          <li>
            <div className="font-medium">Can I cancel anytime?</div>
            Yes, via the billing portal.
          </li>
          <li>
            <div className="font-medium">What happens if I hit limits?</div>
            You can upgrade at any time; gating messages include a one-click Upgrade CTA.
          </li>
        </ul>
      </div>
    </main>
  );
}


