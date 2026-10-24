'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function SignupPage() {
const [fullName, setFullName] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
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
      emailRedirectTo: `${window.location.origin}/login`,
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
  const message =
    error instanceof Error ? error.message : 'Could not create your account';

  toast.error(message);
} finally {
  setLoading(false);
}

};

return (
<div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
<div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
<div className="flex justify-center items-center gap-2 mb-3">
<div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
<ShieldCheck className="w-8 h-8" />
</div>
</div>

    <h2 className="text-3xl font-bold tracking-tight">
      ComplianceTracker
    </h2>

    <p className="mt-2 text-sm text-zinc-400">
      Manage vendors, SOC 2 reports, and contract renewals
    </p>
    <p className="mt-2 text-xs text-emerald-400">
      Business Compliance
    </p>
  </div>

  <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
    <div className="bg-zinc-900 border border-zinc-800 py-8 px-6 shadow-xl rounded-2xl sm:px-10">
      {confirmationSent ? (
        <div className="text-center">
          <Mail className="w-10 h-10 text-emerald-400 mx-auto mb-4" />

          <h3 className="text-xl font-semibold">
            Check your email
          </h3>

          <p className="mt-3 text-sm text-zinc-400">
            If email confirmation is required, follow the confirmation
            link sent to <strong className="text-zinc-200">{email.trim()}</strong>.
            You can then sign in to Business Compliance.
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-2.5 rounded-xl transition-all"
          >
            Go to Sign In
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          <h3 className="text-xl font-semibold mb-6">
            Create your account
          </h3>

          <form className="space-y-5" onSubmit={handleSignup}>
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2"
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500 text-sm"
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3 top-3 text-zinc-500" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 pl-11 text-zinc-100 focus:outline-none focus:border-emerald-500 text-sm"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2"
              >
                Password
              </label>

              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-3 text-zinc-500" />
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 pl-11 text-zinc-100 focus:outline-none focus:border-emerald-500 text-sm"
                  placeholder="At least 8 characters"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2"
              >
                Confirm Password
              </label>

              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-3 text-zinc-500" />
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 pl-11 text-zinc-100 focus:outline-none focus:border-emerald-500 text-sm"
                  placeholder="Enter your password again"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </>
      )}

      <div className="mt-6 text-center text-sm text-zinc-400">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-emerald-400 hover:text-emerald-300 font-medium"
        >
          Sign in
        </Link>
      </div>
    </div>
  </div>
</div>

);
}
