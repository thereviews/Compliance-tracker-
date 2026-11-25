'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getAuthHeaders } from '@/lib/supabase-client';
import { Loader2, Mail, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';

export default function InvitationPage() {
  const router = useRouter();

  const [status, setStatus] = useState<
    'loading' | 'register' | 'sign-in' | 'confirmation-sent' | 'success' | 'error'
  >('loading');

  const [token, setToken] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [registrationBusy, setRegistrationBusy] = useState(false);

  useEffect(() => {
    let active = true;

    const processInvitation = async () => {
      const invitationToken = new URLSearchParams(
        window.location.search
      ).get('token') || '';

      if (!/^[a-f0-9]{64}$/i.test(invitationToken)) {
        if (active) {
          setMessage('This invitation link is invalid.');
          setStatus('error');
        }
        return;
      }

      if (active) setToken(invitationToken);

      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (!active) return;

      if (sessionError || !session) {
        setStatus('register');
        return;
      }

      try {
        const headers = await getAuthHeaders();

        const response = await fetch(
          '/api/workspaces/invitations/accept',
          {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: invitationToken })
          }
        );

        const result: unknown = await response.json().catch(() => null);

        if (
          !result ||
          typeof result !== 'object' ||
          Array.isArray(result)
        ) {
          throw new Error('The server returned an invalid response.');
        }

        const payload = result as Record<string, unknown>;

        if (!response.ok || payload.success !== true) {
          throw new Error(
            typeof payload.error === 'string'
              ? payload.error
              : 'Could not accept this invitation.'
          );
        }

        const invitation = payload.invitation;

        if (
          !invitation ||
          typeof invitation !== 'object' ||
          Array.isArray(invitation)
        ) {
          throw new Error('The invitation response is incomplete.');
        }

        const invitationData = invitation as Record<string, unknown>;

        if (
          invitationData.success !== true ||
          typeof invitationData.workspace_id !== 'string' ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            invitationData.workspace_id
          )
        ) {
          throw new Error('The invitation could not be confirmed.');
        }

        if (active) {
          setWorkspaceId(invitationData.workspace_id);
          setMessage('You have successfully joined the workspace.');
          setStatus('success');
        }
      } catch (error: unknown) {
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : 'Invitation acceptance failed.'
          );
          setStatus('error');
        }
      }
    };

    processInvitation();

    return () => {
      active = false;
    };
  }, []);

  const goToSignIn = () => {
    const nextPath =
      `/invite?token=${encodeURIComponent(token)}`;

    router.push(`/signin?next=${encodeURIComponent(nextPath)}`);
  };

  const submitRegistration = async () => {
    if (!name.trim() || !password) {
      setMessage('Please enter your name and choose a password.');
      return;
    }

    setRegistrationBusy(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          password,
          invitationToken: token
        })
      });

      const result: unknown = await response.json().catch(() => null);
      const payload =
        result && typeof result === 'object' && !Array.isArray(result)
          ? result as Record<string, unknown>
          : {};

      if (!response.ok || payload.success !== true) {
        if (response.status === 409) {
          setMessage(
            typeof payload.error === 'string'
              ? payload.error
              : 'An account already exists. Please sign in.'
          );
          setStatus('sign-in');
          return;
        }

        throw new Error(
          typeof payload.error === 'string'
            ? payload.error
            : 'Unable to register. Please try again.'
        );
      }

      setMessage(
        typeof payload.message === 'string'
          ? payload.message
          : 'Check your email for the confirmation link.'
      );
      setStatus('confirmation-sent');
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to register. Please try again.'
      );
    } finally {
      setRegistrationBusy(false);
    }
  };

  const goToWorkspace = () => {
    router.push(
      `/dashboard?workspaceId=${encodeURIComponent(workspaceId)}`
    );
  };

  return (
    <AuthLayout>
      <div className="mb-7">
        <p className="mb-3 text-sm font-semibold text-emerald-700">
          Workspace invitation
        </p>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
          {status === 'loading' && 'Checking your invitation'}
          {status === 'register' && 'Join your workspace'}
          {status === 'sign-in' && 'Sign in to accept invitation'}
          {status === 'confirmation-sent' && 'Check your email'}
          {status === 'success' && "You're part of the workspace"}
          {status === 'error' && 'Invitation unavailable'}
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {status === 'loading' && 'Please wait while we verify your invitation link.'}
          {status === 'register' && 'You have been invited to join a workspace. Create your account to continue.'}
          {status === 'sign-in' && 'Sign in with the account associated with this invitation.'}
          {status === 'confirmation-sent' && 'Your account registration has been submitted.'}
          {status === 'success' && 'Your invitation has been accepted successfully.'}
          {status === 'error' && 'We could not complete this invitation.'}
        </p>
      </div>

      {status === 'loading' && (
        <div className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50 px-5 py-8 text-center">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-emerald-700" />
          <p className="text-sm font-medium text-slate-700">
            Verifying invitation...
          </p>
        </div>
      )}

      {status === 'register' && (
        <>
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <p className="text-sm leading-6 text-slate-600">
              Complete the form below to create your account and join the invited workspace.
            </p>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitRegistration();
            }}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="invite-name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Full name
              </label>
              <input
                id="invite-name"
                type="text"
                autoComplete="name"
                maxLength={100}
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
              />
            </div>

            <div>
              <label
                htmlFor="invite-password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="invite-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Use at least 6 characters.
              </p>
            </div>

            {message && (
              <p
                role="alert"
                className="rounded-lg border border-rose-100 bg-rose-50 px-3.5 py-3 text-sm text-rose-700"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={registrationBusy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {registrationBusy ? 'Creating account...' : 'Create account & continue'}
              {!registrationBusy && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-7 border-t border-slate-100 pt-6 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?
            </p>
            <button
              type="button"
              onClick={goToSignIn}
              className="mt-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Sign in to accept invitation
            </button>
          </div>
        </>
      )}

      {status === 'confirmation-sent' && (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
            <Mail className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Confirmation email sent
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {message}
              </p>
            </div>
          </div>

          <p className="text-sm leading-6 text-slate-500">
            Open the confirmation email and follow its link. You will return here to finish joining the workspace.
          </p>
        </div>
      )}

      {status === 'sign-in' && (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
            <p className="text-sm leading-6 text-slate-600">
              {message || 'Please sign in with the email address that received this invitation.'}
            </p>
          </div>

          <button
            type="button"
            onClick={goToSignIn}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-600/20"
          >
            Sign in to accept invitation
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
            <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
            <p className="text-sm leading-6 text-slate-700">
              {message}
            </p>
          </div>

          <button
            type="button"
            onClick={goToWorkspace}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-600/20"
          >
            Open workspace
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <p className="text-sm leading-6 text-rose-700">
              {message}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/signin')}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
          >
            Return to sign in
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
