'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import {
  ShieldCheck,
  LockKeyhole,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) throw error;

      router.replace('/dashboard');
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';

      if (
        message.includes('invalid login credentials') ||
        message.includes('invalid_credentials')
      ) {
        toast.error('Email or password is incorrect. Check your details and try again.');
      } else if (
        message.includes('email not confirmed') ||
        message.includes('email_not_confirmed')
      ) {
        toast.error('Please confirm your email address before signing in. Check your inbox.');
      } else if (
        message.includes('too many requests') ||
        message.includes('rate limit')
      ) {
        toast.error('Too many attempts. Please wait a moment before trying again.');
      } else if (
        message.includes('fetch failed') ||
        message.includes('network') ||
        message.includes('failed to fetch')
      ) {
        toast.error('Unable to connect right now. Check your internet connection and try again.');
      } else {
        console.error('Sign-in failed:', error);
        toast.error('We couldn’t sign you in. Please try again shortly.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-zinc-700 bg-zinc-950 py-3 pl-10 pr-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 disabled:opacity-50';

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center justify-center gap-2.5">
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
              Sign in to your account
            </h1>
          </div>

          <div className="px-6 py-6 sm:px-8">
            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-zinc-200"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    disabled={loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-zinc-200"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-emerald-400 transition hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-11`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={loading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-zinc-500 transition hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim() || !password}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-zinc-800 pt-5 text-center">
              <p className="text-sm text-zinc-400">
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  className="font-medium text-emerald-400 transition hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
