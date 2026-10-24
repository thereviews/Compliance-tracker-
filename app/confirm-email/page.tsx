'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';

type ConfirmationStatus = 'checking' | 'success' | 'error';

export default function ConfirmEmailPage() {
  const [status, setStatus] = useState<ConfirmationStatus>('checking');
  const [message, setMessage] = useState('Verifying your email confirmation...');

  useEffect(() => {
    let active = true;

    async function verifyConfirmation() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const hash = url.hash;

        // PKCE confirmation links return a code in the query string.
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) throw error;

          if (active) {
            setStatus('success');
            setMessage('Your email has been confirmed successfully.');
          }

          return;
        }

        // Implicit-flow links return authentication tokens in the URL hash.
        const hasAuthTokens =
          hash.includes('access_token=') ||
          hash.includes('error_description=') ||
          hash.includes('error=');

        if (hash.includes('error_description=') || hash.includes('error=')) {
          const params = new URLSearchParams(hash.replace(/^#/, ''));
          throw new Error(
            params.get('error_description') ||
            params.get('error') ||
            'The confirmation link could not be verified.'
          );
        }

        if (hasAuthTokens) {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) throw error;

          if (session?.user) {
            if (active) {
              setStatus('success');
              setMessage('Your email has been confirmed successfully.');
            }
            return;
          }
        }

        throw new Error(
          'We could not verify this confirmation link. It may have expired, already been used, or opened without its confirmation token.'
        );
      } catch (error) {
        if (active) {
          setStatus('error');
          setMessage(
            error instanceof Error
              ? error.message
              : 'Email confirmation failed. Please request a new confirmation email.'
          );
        }
      }
    }

    void verifyConfirmation();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
          {status === 'checking' ? '…' : status === 'success' ? '✓' : '!'}
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          {status === 'checking'
            ? 'Confirming your email'
            : status === 'success'
              ? 'Email confirmed'
              : 'Confirmation unsuccessful'}
        </h1>

        <p className="mt-3 break-words text-sm leading-6 text-slate-600">
          {message}
        </p>

        {status === 'success' && (
          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700"
          >
            Continue to login
          </Link>
        )}

        {status === 'error' && (
          <div className="mt-6 space-y-3">
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700"
            >
              Return to signup
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              Go to login
            </Link>
          </div>
        )}

        {status === 'checking' && (
          <p className="mt-5 text-xs text-slate-500">
            Please keep this page open while we check your confirmation.
          </p>
        )}
      </section>
    </main>
  );
}
