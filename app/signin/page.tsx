'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import AuthLayout from '@/components/auth/AuthLayout';

const isSafeInternalPath = (path: string): boolean => {
  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('\\') ||
    /[\u0000-\u001F\u007F]/.test(path)
  ) {
    return false;
  }

  try {
    return new URL(path, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
};

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const submissionInProgress = useRef(false);

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (submissionInProgress.current) return;

    const trimmedEmail = email.trim();

    if (trimmedEmail.length > 254) {
      toast.error('Your email address is too long.');
      return;
    }

    if (password.length > 128) {
      toast.error('Your password must be 128 characters or fewer.');
      return;
    }

    submissionInProgress.current = true;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) throw error;

      toast.success('Signed in successfully!');

      const nextPath = new URLSearchParams(window.location.search).get('next');

      if (nextPath && isSafeInternalPath(nextPath)) {
        router.push(nextPath);
      } else {
        router.push('/dashboard');
      }

      router.refresh();
    } catch (error: unknown) {
      console.error('Sign-in error:', error);
      toast.error(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    } finally {
      submissionInProgress.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-8">
        <p className="mb-3 text-sm font-semibold text-emerald-700">
          Welcome back
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
          Sign in to your account
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Enter your details to access your compliance workspace.
        </p>
      </div>

      <form onSubmit={handleSignIn} className="space-y-5">
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

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">
              Forgot password?
            </Link>
          </div>

          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              maxLength={128}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign in'}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <div className="mt-7 border-t border-slate-100 pt-6 text-center">
        <p className="text-sm text-slate-500">
          New to ComplianceTracker?{' '}
          <Link href="/signup" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
