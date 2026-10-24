'use client';

import { useEffect, useState } from 'react';
import { Bell, Save, LoaderCircle } from 'lucide-react';
import { getAuthHeaders } from '@/lib/supabase-client';
import { toast } from 'sonner';

const AVAILABLE_DAYS = [1, 3, 7, 14, 30, 45, 60, 90, 120, 180];
const DEFAULT_DAYS = [90, 60, 30, 7];

type ReminderSettingsProps = {
  workspaceId: string;
  role: string;
};

type SettingsResponse = {
  workspace_id: string;
  notice_reminder_days: number[];
  enabled: boolean;
  updated_at: string | null;
};

export function ReminderSettings({
  workspaceId,
  role,
}: ReminderSettingsProps) {
  const [days, setDays] = useState<number[]>(DEFAULT_DAYS);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canEdit = ['owner', 'admin'].includes(role);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setLoading(true);

      try {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams({ workspaceId });

        const response = await fetch(
          `/api/workspaces/reminder-settings?${params.toString()}`,
          { headers }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Could not load reminder settings');
        }

        const settings = result.settings as SettingsResponse;

        if (!cancelled) {
          setDays(
            Array.isArray(settings.notice_reminder_days)
              ? settings.notice_reminder_days
              : DEFAULT_DAYS
          );
          setEnabled(settings.enabled !== false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('LOAD REMINDER SETTINGS ERROR:', error);
          toast.error(
            error instanceof Error
              ? error.message
              : 'Could not load reminder settings'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (workspaceId) {
      void loadSettings();
    }

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  function toggleDay(day: number) {
    setDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((a, b) => b - a)
    );
  }

  async function saveSettings() {
    if (!canEdit || saving) return;

    setSaving(true);

    try {
      const headers = await getAuthHeaders();

      const response = await fetch(
        '/api/workspaces/reminder-settings',
        {
          method: 'PUT',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspaceId,
            notice_reminder_days: days,
            enabled,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not save reminder settings');
      }

      toast.success('Reminder settings saved');
    } catch (error) {
      console.error('SAVE REMINDER SETTINGS ERROR:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not save reminder settings'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400">
          <Bell className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-zinc-100">
            Non-renewal Notice Reminders
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Choose when your team should be reminded before a contract&apos;s
            non-renewal notice deadline.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-zinc-400">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading reminder settings…
        </div>
      ) : (
        <>
          <label className="mt-5 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={enabled}
              disabled={!canEdit}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            <span className="text-sm text-zinc-200">
              Enable notice-deadline reminders
            </span>
          </label>

          <fieldset className="mt-5" disabled={!canEdit || !enabled}>
            <legend className="text-sm font-medium text-zinc-200">
              Remind me this many days before the deadline
            </legend>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {AVAILABLE_DAYS.map((day) => (
                <label
                  key={day}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${
                    days.includes(day)
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                      : 'border-zinc-700 text-zinc-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={days.includes(day)}
                    onChange={() => toggleDay(day)}
                    className="h-4 w-4 accent-emerald-500"
                  />
                  {day} {day === 1 ? 'day' : 'days'}
                </label>
              ))}
            </div>
          </fieldset>

          {!canEdit && (
            <p className="mt-4 text-sm text-zinc-400">
              Only workspace owners and admins can change these settings.
            </p>
          )}

          {canEdit && (
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving…' : 'Save Reminder Settings'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
