'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { Eye, EyeOff, ArrowLeft, ArrowRight, Lock } from 'lucide-react';
import { toast } from 'sonner';
import AuthLayout from '@/components/auth/AuthLayout';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const router = useRouter();
  const submissionInProgress = useRef(false);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setHasSession(!!session);
        setCheckingSession(false);
      }
    });

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!mounted) return;

        if (error) {
          setHasSession(false);
        } else {
          setHasSession(!!data.session);
        }

        setCheckingSession(false);
      })
      .catch((error: unknown) => {
        if (!mounted) return;

        setHasSession(false);
        setCheckingSession(false);
        toast.error('Unable to verify your recovery link. Please request a new one.');
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (submissionInProgress.current) return;

    if (password.length < 6 || password.length > 128) {
      toast.error('Your password must be between 6 and 128 characters.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('The passwords do not match.');
      return;
    }

    submissionInProgress.current = true;
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      toast.success('Your password has been updated successfully.');
      router.replace('/signin');
    } catch (error: unknown) {
      console.error('Password update error:', error);
      toast.error(error instanceof Error ? error.message : 'Unable to update your password. Please try again.');
    } finally {
      submissionInProgress.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {checkingSession ? (
        <div className="py-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
          <p className="mt-4 text-sm text-slate-500">
            Verifying your recovery link...
          </p>
        </div>
      ) : !hasSession ? (
        <div>
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Lock className="h-6 w-6" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Recovery link unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            This password-reset link may have expired or already been used. Request a new link to continue.
          </p>

          <Link
            href="/forgot-password"
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Request a new reset link
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/signin"
            className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-7">
            <p className="mb-3 text-sm font-semibold text-emerald-700">
              Recovery verified
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
              Create a new password
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Choose a new password for your ComplianceTracker account.
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                New password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  maxLength={128}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Use at least 6 characters.
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-700">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  maxLength={128}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Enter your new password again"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Updating password...' : 'Update password'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
