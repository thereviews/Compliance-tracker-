'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getAuthHeaders } from '@/lib/supabase-client';
import { ShieldCheck, Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react';

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
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
        <div className="flex justify-center mb-5">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">
          ComplianceTracker
        </h1>

        {status === 'loading' && (
          <>
            <Loader2 className="w-7 h-7 animate-spin text-emerald-400 mx-auto my-6" />
            <p className="text-sm text-zinc-400">
              Verifying your invitation...
            </p>
          </>
        )}

        {status === 'register' && (
          <>
            <Mail className="w-8 h-8 text-emerald-400 mx-auto my-6" />
            <p className="text-zinc-300 mb-5">
              You have been invited to join a workspace. Create your account to continue.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submitRegistration();
              }}
              className="space-y-4 text-left"
            >
              <div>
                <label htmlFor="invite-name" className="block text-sm text-zinc-300 mb-2">
                  Your name
                </label>
                <input
                  id="invite-name"
                  type="text"
                  autoComplete="name"
                  maxLength={100}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:border-emerald-500"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="invite-password" className="block text-sm text-zinc-300 mb-2">
                  Choose a password
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
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:border-emerald-500"
                  placeholder="At least 6 characters"
                />
              </div>
              {message && (
                <p className="text-sm text-rose-300">{message}</p>
              )}
              <button
                type="submit"
                disabled={registrationBusy}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-zinc-950 font-semibold py-3 rounded-xl"
              >
                {registrationBusy ? 'Submitting...' : 'Create Account & Continue'}
              </button>
            </form>
            <p className="text-sm text-zinc-400 mt-6">
              Already have an account?
            </p>
            <button
              onClick={goToSignIn}
              className="text-emerald-400 hover:text-emerald-300 font-medium mt-2"
            >
              Sign in to accept invitation
            </button>
          </>
        )}

        {status === 'confirmation-sent' && (
          <>
            <Mail className="w-10 h-10 text-emerald-400 mx-auto my-6" />
            <p className="text-zinc-300 mb-4">{message}</p>
            <p className="text-sm text-zinc-400">
              Open the confirmation email and follow its link. You will return here to finish joining the workspace.
            </p>
          </>
        )}

        {status === 'sign-in' && (
          <>
            <Mail className="w-8 h-8 text-emerald-400 mx-auto my-6" />
            <p className="text-zinc-300 mb-6">
              {message || 'Please sign in with the email address that received this invitation.'}
            </p>
            <button
              onClick={goToSignIn}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-3 rounded-xl"
            >
              Sign In to Accept Invitation
            </button>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto my-6" />
            <p className="text-zinc-300 mb-6">{message}</p>
            <button
              onClick={goToWorkspace}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-3 rounded-xl"
            >
              Open Workspace
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto my-6" />
            <p className="text-rose-300 mb-6">{message}</p>
            <button
              onClick={() => router.push('/signin')}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold py-3 rounded-xl"
            >
              Return to Sign In
            </button>
          </>
        )}
      </div>
    </main>
  );
}
