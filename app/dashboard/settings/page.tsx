'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Save,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';

export default function SettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          router.replace('/signin');
          return;
        }

        if (active) {
          setFullName(
            typeof user.user_metadata?.full_name === 'string'
              ? user.user_metadata.full_name
              : ''
          );
          setEmail(user.email || '');
          setNewEmail(user.email || '');
          setLoading(false);
        }
      } catch {
        if (active) {
          toast.error('Could not load your account settings.');
          router.replace('/signin');
        }
      }
    }

    void loadAccount();

    return () => {
      active = false;
    };
  }, [router]);

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = fullName.trim();

    if (!normalizedName) {
      toast.error('Please enter your name.');
      return;
    }

    setSavingName(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: normalizedName },
      });

      if (error) throw error;

      setFullName(
        typeof data.user.user_metadata?.full_name === 'string'
          ? data.user.user_metadata.full_name
          : normalizedName
      );

      toast.success('Your name has been updated.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not update your name.'
      );
    } finally {
      setSavingName(false);
    }
  }

  async function saveEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = newEmail.trim().toLowerCase();

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (normalizedEmail === email.toLowerCase()) {
      toast.error('Your new email is the same as your current email.');
      return;
    }

    setSavingEmail(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        email: normalizedEmail,
      });

      if (error) throw error;

      if (data.user.new_email) {
        toast.success(
          'Check your new email address for a confirmation link. Your current email remains active until the change is confirmed.'
        );
      } else {
        setEmail(data.user.email || normalizedEmail);
        setNewEmail(data.user.email || normalizedEmail);
        toast.success('Your email address has been updated.');
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not update your email.'
      );
    } finally {
      setSavingEmail(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword.length < 8 || newPassword.length > 128) {
      toast.error('Your password must be between 8 and 128 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('The passwords do not match.');
      return;
    }

    setSavingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      toast.success('Your password has been changed.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not update your password.'
      );
    } finally {
      setSavingPassword(false);
    }
  }

  const inputClass =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:opacity-60';

  const buttonClass =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
        Loading account settings...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Settings
          </h1>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <UserRound className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="font-semibold">Personal information</h2>
              <p className="mt-1 text-sm text-slate-500">
                Update the name associated with your account.
              </p>
            </div>
          </div>

          <form onSubmit={saveName} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                maxLength={100}
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className={inputClass}
                placeholder="Your full name"
              />
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={savingName} className={buttonClass}>
                {savingName ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save name
              </button>
            </div>
          </form>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <Mail className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="font-semibold">Email address</h2>
              <p className="mt-1 text-sm text-slate-500">
                Current email: {email}
              </p>
            </div>
          </div>

          <form onSubmit={saveEmail} className="space-y-4">
            <div>
              <label htmlFor="newEmail" className="text-sm font-medium text-slate-700">
                New email address
              </label>
              <input
                id="newEmail"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={savingEmail} className={buttonClass}>
                {savingEmail ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Update email
              </button>
            </div>
          </form>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <LockKeyhole className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="font-semibold">Password and security</h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose a new password of at least 8 characters.
              </p>
            </div>
          </div>

          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className={inputClass}
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={inputClass}
                placeholder="Enter the new password again"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className={buttonClass}
              >
                {savingPassword ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <LockKeyhole className="h-4 w-4" />
                )}
                Change password
              </button>
            </div>
          </form>
        </div>

      </div>
    </main>
  );
}
