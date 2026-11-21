'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import AuthLayout from '@/components/auth/AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submissionInProgress = useRef(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (submissionInProgress.current) return;

    const trimmedEmail = email.trim();

    if (!trimmedEmail || trimmedEmail.length > 254) {
      toast.error('Please enter a valid email address of 254 characters or fewer.');
      return;
    }

    submissionInProgress.current = true;
    setLoading(true);
    setEmail(trimmedEmail);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Unable to send the reset email. Please try again.'
        );
      }

      setSubmitted(true);
      toast.success('Password reset instructions requested.');
    } catch (error: unknown) {
      console.error('Password reset request error:', error);
      toast.error(error instanceof Error ? error.message : 'Unable to send the reset email. Please try again.');
    } finally {
      submissionInProgress.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {submitted ? (
        <div>
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Check your email
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            If an account exists for{' '}
            <strong className="font-semibold text-slate-700">{email}</strong>,
            you’ll receive instructions to reset your password. Check your inbox and spam folder.
          </p>

          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-6 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Try another email address
          </button>

          <Link
            href="/signin"
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <Link
            href="/signin"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          <div className="mb-7">
            <p className="mb-3 text-sm font-semibold text-emerald-700">
              Account recovery
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
              Forgot your password?
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter the email address associated with your account and we’ll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                maxLength={254}
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Sending instructions...' : 'Send reset link'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
