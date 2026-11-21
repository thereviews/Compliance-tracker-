'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const completeSignIn = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const tokenHash = url.searchParams.get('token_hash');
      const verificationType = url.searchParams.get('type');
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      const authError =
        url.searchParams.get('error_description') ||
        url.searchParams.get('error') ||
        hashParams.get('error_description') ||
        hashParams.get('error');

      const requestedNext = url.searchParams.get('next');
      const nextPath =
        requestedNext &&
        requestedNext.startsWith('/') &&
        !requestedNext.startsWith('//')
          ? requestedNext
          : '/';

      if (authError) {
        if (active) {
          toast.error(authError);
          router.replace('/signin');
        }
        return;
      }

      let session = null;
      let authFailure: Error | null = null;

      if (code) {
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(code);

        session = data.session;
        authFailure = error;
      } else if (tokenHash && verificationType === 'recovery') {
        const { data, error } = await supabase.auth.verifyOtp({
          type: 'recovery',
          token_hash: tokenHash,
        });

        session = data.session;
        authFailure = error;
      } else if (
        hashParams.get('type') === 'recovery' &&
        hashParams.get('access_token') &&
        hashParams.get('refresh_token')
      ) {
        const { data, error } = await supabase.auth.setSession({
          access_token: hashParams.get('access_token')!,
          refresh_token: hashParams.get('refresh_token')!,
        });

        session = data.session;
        authFailure = error;
      } else {
        // Allow Supabase to process other URL-based authentication sessions.
        const { data, error } = await supabase.auth.getSession();

        session = data.session;
        authFailure = error;
      }

      if (!active) return;

      if (authFailure || !session) {
        toast.error(
          authFailure?.message ||
            'The confirmation link could not establish a session. Please request a new confirmation email.'
        );
        router.replace('/signin');
        return;
      }

      router.replace(nextPath);
      router.refresh();
    };

    completeSignIn();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <ShieldCheck className="h-7 w-7" />
        </div>

        <h1 className="mt-5 text-xl font-bold text-slate-900">
          Completing sign-in
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Please wait while we securely connect your account.
        </p>

        <div className="mx-auto mt-6 h-7 w-7 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
      </div>
    </main>
  );
}
