'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);
const router = useRouter();

const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
e.preventDefault();
setLoading(true);

try {
  const normalizedEmail = email.trim().toLowerCase();

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) throw error;

  toast.success('Logged in successfully!');
  router.replace('/dashboard');
  router.refresh();
} catch (error: unknown) {
  const message =
    error instanceof Error ? error.message : 'Authentication failed';

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
      <h3 className="text-xl font-semibold mb-6">Sign in to your account</h3>

      <form className="space-y-6" onSubmit={handleLogin}>
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 pl-11 text-zinc-100 focus:outline-none focus:border-emerald-500 text-sm"
              placeholder="Enter your password"
            />
          </div>
        </div>

        <div className="text-right -mt-3">
          <Link
            href="/forgot-password"
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-zinc-400">
        Don't have an account?{' '}
        <Link
          href="/signup"
          className="text-emerald-400 hover:text-emerald-300 font-medium"
        >
          Create one
        </Link>
      </div>
    </div>
  </div>
</div>

);
}
