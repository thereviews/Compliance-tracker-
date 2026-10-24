'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';
import { ShieldCheck, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error('Enter your email address');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        throw error;
      }

      setSubmitted(true);
      toast.success('If an account exists, a recovery email will be sent.');
    } catch {
      toast.error('Could not request a password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">
          Reset your password
        </h1>

        <p className="mt-2 text-sm text-zinc-400">
          Recover access to your ComplianceTracker account.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-zinc-900 border border-zinc-800 py-8 px-6 shadow-xl rounded-2xl sm:px-10">
          {submitted ? (
            <div className="text-center space-y-4">
              <Mail className="w-10 h-10 text-emerald-400 mx-auto" />

              <h2 className="text-lg font-semibold">
                Check your email
              </h2>

              <p className="text-sm text-zinc-400">
                If an account exists for that address, you should receive
                instructions to reset your password. Check your spam folder too.
              </p>

              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                Try another email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="recovery-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3 top-3 text-zinc-500" />

                  <input
                    id="recovery-email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 pl-11 text-zinc-100 focus:outline-none focus:border-emerald-500 text-sm"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Recovery Link'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
