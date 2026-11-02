'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SignupPage() {
const [fullName, setFullName] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [loading, setLoading] = useState(false);
const [confirmationSent, setConfirmationSent] = useState(false);

const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
e.preventDefault();

const normalizedFullName = fullName.trim();

if (!normalizedFullName || normalizedFullName.length > 100) {
  toast.error('Enter your full name (maximum 100 characters).');
  return;
}

const normalizedEmail = email.trim().toLowerCase();

if (password.length < 8) {
  toast.error('Your password must be at least 8 characters long.');
  return;
}

if (password !== confirmPassword) {
  toast.error('The passwords do not match.');
  return;
}

setLoading(true);

try {
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        full_name: normalizedFullName,
      },
      emailRedirectTo: `${window.location.origin}/signin`,
    },
  });

  if (error) throw error;

  if (data.session) {
    toast.success('Account created successfully!');
    window.location.replace('/dashboard');
    return;
  }

  setConfirmationSent(true);
  toast.success('Check your email for the confirmation link.');
 } catch (error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (
    message.includes('password should be') ||
    message.includes('password is too') ||
    message.includes('weak_password')
  ) {
    toast.error('Choose a stronger password that meets the password requirements.');
  } else if (
    message.includes('user already registered') ||
    message.includes('already been registered')
  ) {
    toast.error('We couldn’t create your account with those details. Try signing in if you already have an account.');
  } else if (
    message.includes('email rate limit') ||
    message.includes('too many requests') ||
    message.includes('rate limit')
  ) {
    toast.error('Too many attempts. Please wait before trying again.');
  } else if (
    message.includes('error sending confirmation email') ||
    message.includes('sending confirmation email')
  ) {
    toast.error('Your account could not be confirmed by email right now. Please try again later.');
  } else if (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('failed to fetch')
  ) {
    toast.error('Unable to connect right now. Check your internet connection and try again.');
  } else {
    toast.error('We couldn’t create your account. Check your details and try again.');
  }
} finally {
  setLoading(false);
}

};

return (
<div className="flex min-h-screen flex-col justify-center bg-zinc-950 px-4 py-10 text-zinc-100 sm:px-6">
<div className="mx-auto w-full max-w-md text-center">
<div className="mb-5 flex items-center justify-center gap-2.5">
<div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
<ShieldCheck className="h-5 w-5" />
</div>
</div>

    <h2 className="text-xl font-semibold tracking-tight">
      ComplianceTracker
    </h2>

    <p className="mt-2 text-sm text-zinc-400">
      Manage vendors, SOC 2 reports, and contract renewals
    </p>
    <p className="mt-2 text-xs font-medium text-emerald-400">
      Business Compliance
    </p>
  </div>

  <div className="mx-auto mt-7 w-full max-w-md">
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-7 shadow-xl shadow-black/20 sm:px-8">
      {confirmationSent ? (
        <div className="text-center">
          <Mail className="mx-auto mb-4 h-9 w-9 text-emerald-400" />

          <h3 className="text-xl font-semibold">
            Check your email
          </h3>

          <p className="mt-3 text-sm text-zinc-400">
            If email confirmation is required, follow the confirmation
            link sent to <strong className="text-zinc-200">{email.trim()}</strong>.
            You can then sign in to Business Compliance.
          </p>

          <Link
            href="/signin"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-zinc-900"
          >
            Go to Sign In
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          <h3 className="mb-6 text-xl font-semibold tracking-tight">
            Create your account
          </h3>

          <form className="space-y-5" onSubmit={handleSignup}>
            <div>
              <label
                htmlFor="fullName"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Full Name
              </label>

              <input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                maxLength={100}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-3 pl-10 pr-11 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-3 pl-10 pr-11 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-zinc-500 transition hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Confirm Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-3 pl-10 pr-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                  placeholder="Enter your password again"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={
                    showConfirmPassword
                      ? 'Hide confirmation password'
                      : 'Show confirmation password'
                  }
                  aria-pressed={showConfirmPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-zinc-500 transition hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </>
      )}

      <div className="mt-6 border-t border-zinc-800 pt-5 text-center text-sm text-zinc-400">
        Already have an account?{' '}
        <Link
          href="/signin"
          className="font-medium text-emerald-400 transition hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          Sign in
        </Link>
      </div>
    </div>
  </div>
</div>

);
}
