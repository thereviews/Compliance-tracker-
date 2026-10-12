'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase, getAuthHeaders } from '@/lib/supabase-client';
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

type PageStatus =
  | 'loading'
  | 'ready'
  | 'processing'
  | 'success'
  | 'error'
  | 'check-email';

function InviteContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const invitationToken = searchParams.get('token') || '';
    setToken(invitationToken);

    if (!/^[A-Za-z0-9_-]{43}$/.test(invitationToken)) {
      setMessage('This invitation link is invalid or incomplete.');
      setStatus('error');
      return;
    }

    let cancelled = false;

    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (session) {
          setEmail(session.user.email || '');
        }

        setStatus('ready');
      } catch {
        if (!cancelled) {
          setMessage('Unable to check your session. Please refresh the page.');
          setStatus('error');
        }
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function acceptInvitation() {
    setStatus('processing');
    setMessage('');

    try {
      const headers = await getAuthHeaders();

      if (!headers.Authorization) {
        setStatus('ready');
        setMessage('Please sign in before accepting this invitation.');
        return;
      }

      const response = await fetch('/api/workspaces/invitations/accept', {
        method: 'POST',
        headers,
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(result.error || 'Unable to accept this invitation.');
        return;
      }

      setStatus('success');
      setMessage(
        'You have successfully joined the company workspace. You can now return to your dashboard.'
      );
    } catch {
      setStatus('error');
      setMessage('A network error occurred. Please try again.');
    }
  }

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        const redirectUrl = new URL('/invite', window.location.origin);
        redirectUrl.searchParams.set('token', token);

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl.toString(),
          },
        });

        if (error) throw error;

        if (data.session) {
          await acceptInvitation();
        } else {
          setStatus('check-email');
          setMessage(
            'Check your email to confirm your account. Then return to the invitation link to continue.'
          );
        }

        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      await acceptInvitation();
    } catch (error: unknown) {
      setStatus('ready');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Authentication failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-3 text-zinc-300">
        <Loader2 className="h-5 w-5 animate-spin" />
        Checking invitation...
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex justify-center">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
          <ShieldCheck className="h-9 w-9" />
        </div>
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          ComplianceTracker
        </h1>
        <p className="mt-3 text-sm text-zinc-400">
          Join your company workspace
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl sm:p-8">
        {status === 'success' ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
            <h2 className="text-xl font-semibold">Invitation accepted</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {message}
            </p>
            <a
              href="/"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              Go to dashboard
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        ) : status === 'processing' ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto mb-4 h-9 w-9 animate-spin text-emerald-400" />
            <p className="text-sm text-zinc-300">
              Accepting your invitation...
            </p>
          </div>
        ) : status === 'check-email' ? (
          <div className="text-center">
            <Mail className="mx-auto mb-4 h-10 w-10 text-emerald-400" />
            <h2 className="text-xl font-semibold">Confirm your email</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {message}
            </p>
          </div>
        ) : status === 'error' ? (
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-400" />
            <h2 className="text-xl font-semibold">
              Unable to accept invitation
            </h2>
            <p className="mt-3 break-words text-sm leading-6 text-zinc-400">
              {message}
            </p>
            <button
              type="button"
              onClick={() => {
                setMessage('');
                setStatus('ready');
              }}
              className="mt-6 w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold hover:bg-zinc-800"
            >
              Back
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold">
              {isSignUp ? 'Create your account' : 'Sign in to continue'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {isSignUp
                ? 'Create an account using the invited email address.'
                : 'Sign in using the email address that received the invitation.'}
            </p>

            {message && (
              <div className="mt-4 rounded-xl border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">
                {message}
              </div>
            )}

            <form onSubmit={handleAuth} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="invite-email"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
                  <input
                    id="invite-email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-11 pr-4 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="invite-password"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
                  <input
                    id="invite-password"
                    type="password"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    required
                    minLength={isSignUp ? 8 : undefined}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-11 pr-4 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {isSignUp ? 'Create account' : 'Sign in and accept'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-zinc-800 pt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setMessage('');
                }}
                className="text-sm text-zinc-400 transition hover:text-zinc-100"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Create one"}
              </button>
            </div>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs leading-5 text-zinc-500">
        For security, only the account associated with the invited email
        address can accept this invitation.
      </p>
    </div>
  );
}

export default function InvitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100">
      <Suspense
        fallback={
          <div className="text-sm text-zinc-400">
            Loading invitation...
          </div>
        }
      >
        <InviteContent />
      </Suspense>
    </main>
  );
}
