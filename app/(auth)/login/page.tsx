'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabaseClient } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    supabaseClient.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) router.replace('/dashboard');
    });

    const { data: sub } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session) router.replace('/dashboard');
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
      <div className="w-full rounded-lg border border-slate-200 p-6">
        <h1 className="mb-4 text-center text-2xl font-semibold">Sign in to Mistral</h1>
        <Auth
          supabaseClient={supabaseClient}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
          redirectTo={process.env.NEXT_PUBLIC_SITE_URL + '/dashboard'}
          view="sign_in"
        />
      </div>
    </main>
  );
}


