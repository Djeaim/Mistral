import Hero from '@/components/Hero';

export default function Page() {
  return (
    <main className="min-h-screen bg-white">
      <Hero />
      <footer className="mt-16 border-t py-6 text-center text-sm text-slate-600">
        <div className="space-x-4">
          <a href="/legal/privacy" className="underline">Privacy</a>
          <a href="/legal/terms" className="underline">Terms</a>
          <a href="/legal/cookies" className="underline">Cookies</a>
        </div>
      </footer>
    </main>
  );
}


