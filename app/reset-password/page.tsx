'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { ShieldCheck, Lock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
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

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">
          Choose a new password
        </h1>

        <p className="mt-2 text-sm text-zinc-400">
          Secure your ComplianceTracker account with a new password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-zinc-900 border border-zinc-800 py-8 px-6 shadow-xl rounded-2xl sm:px-10">
          {completed ? (
            <div className="text-center space-y-4">
              <h2 className="text-lg font-semibold">Password updated</h2>
              <p className="text-sm text-zinc-400">
                Your password has been changed successfully.
              </p>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-2.5 rounded-xl"
              >
                Continue to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2"
                >
                  New password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-3 text-zinc-500" />
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
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
                  htmlFor="confirm-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2"
                >
                  Confirm new password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-3 text-zinc-500" />
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 pl-11 text-zinc-100 focus:outline-none focus:border-emerald-500 text-sm"
                    placeholder="Re-enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
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
