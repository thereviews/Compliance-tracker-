'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import {
  ShieldCheck,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowLeft,
  Check,
  LoaderCircle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const validLength = password.length >= 8 && password.length <= 128;
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const passwordsDiffer =
    confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    if (!validLength) {
      toast.error('Password must be between 8 and 128 characters.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session) {
        toast.error('Your recovery link may have expired. Request a new one.');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setCompleted(true);
      toast.success('Password updated successfully.');
    } catch {
      toast.error('Could not reset your password. Request a new recovery link.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-zinc-700 bg-zinc-950 py-3 pl-10 pr-11 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 disabled:opacity-50';

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold tracking-tight">
            ComplianceTracker
          </span>
        </div>

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl shadow-black/20">
          <div className="border-b border-zinc-800 px-6 py-6 sm:px-8">
            <h1 className="text-xl font-semibold tracking-tight">
              {completed ? 'Password updated' : 'Choose a new password'}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              {completed
                ? 'Your password has been changed successfully.'
                : ''}
            </p>
          </div>

          <div className="px-6 py-6 sm:px-8">
            {completed ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      Password changed
                    </p>
                    <p className="mt-1 text-sm leading-5 text-zinc-400">
                      You can now continue to sign in with your new password.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push('/signin')}
                  className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-zinc-900"
                >
                  Continue to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="new-password"
                    className="mb-2 block text-sm font-medium text-zinc-200"
                  >
                    New password
                  </label>
                  <p className="mb-2 text-xs text-zinc-500">
                  </p>

                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      id="new-password"
                      name="new-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      required
                      disabled={loading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-describedby="password-requirement"
                      className={inputClass}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      disabled={loading}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-zinc-500 hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div
                    id="password-requirement"
                    className="mt-2 flex items-center gap-1.5 text-xs"
                  >
                    <Check
                      className={`h-3.5 w-3.5 ${
                        validLength ? 'text-emerald-400' : 'text-zinc-600'
                      }`}
                    />
                    <span className={validLength ? 'text-emerald-400' : 'text-zinc-500'}>
                      8–128 characters
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="mb-2 block text-sm font-medium text-zinc-200"
                  >
                    Confirm password
                  </label>
                  <p className="mb-2 text-xs text-zinc-500">
                  </p>

                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      required
                      disabled={loading}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      aria-invalid={passwordsDiffer}
                      aria-describedby="confirm-feedback"
                      className={inputClass}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((value) => !value)
                      }
                      disabled={loading}
                      aria-label={
                        showConfirmPassword
                          ? 'Hide confirmation password'
                          : 'Show confirmation password'
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-zinc-500 hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <p
                    id="confirm-feedback"
                    aria-live="polite"
                    className={`mt-2 min-h-4 text-xs ${
                      passwordsMatch
                        ? 'text-emerald-400'
                        : passwordsDiffer
                          ? 'text-rose-400'
                          : 'text-zinc-500'
                    }`}
                  >
                    {passwordsMatch
                      ? 'Passwords match.'
                      : passwordsDiffer
                        ? 'Passwords do not match.'
                        : ' '}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !validLength || !passwordsMatch}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Updating password…
                    </>
                  ) : (
                    'Update password'
                  )}
                </button>

                <p className="text-center text-xs leading-5 text-zinc-500">
                  Only continue if you requested this password reset.
                </p>
              </form>
            )}

            <div className="mt-6 border-t border-zinc-800 pt-5">
              <Link
                href="/signin"
                className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
