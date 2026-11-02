'use client';

import { useEffect, useState } from 'react';
import { Bell, Save, LoaderCircle } from 'lucide-react';
import { getAuthHeaders } from '@/lib/supabase-client';
import { toast } from 'sonner';

const AVAILABLE_DAYS = [7, 30, 60, 90];
const DEFAULT_DAYS = [90, 60, 30, 7];

type ReminderSettingsProps = {
  workspaceId: string;
  role: string;
};

type SettingsResponse = {
  workspace_id: string;
  notice_reminder_days: number[];
  updated_at: string | null;
};

export function ReminderSettings({
  workspaceId,
  role,
}: ReminderSettingsProps) {
  const [days, setDays] = useState<number[]>(DEFAULT_DAYS);
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
          const savedDays = Array.isArray(settings.notice_reminder_days)
            ? settings.notice_reminder_days
                .filter((day) => AVAILABLE_DAYS.includes(day))
                .sort((a, b) => b - a)
            : DEFAULT_DAYS;

          setDays(savedDays);
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

      const response = await fetch('/api/workspaces/reminder-settings', {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId,
          notice_reminder_days: days,
        }),
      });

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
    <section className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <Bell className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">
              Non-renewal notice reminders
            </h3>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              Get notified before a contract&apos;s non-renewal notice deadline.
            </p>
          </div>
        </div>

      </div>

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading reminder settings…
        </div>
      ) : (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <fieldset disabled={!canEdit}>
            <legend className="text-xs font-medium text-slate-600">
              Remind me before the deadline
            </legend>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {AVAILABLE_DAYS.map((day) => {
                const selected = days.includes(day);

                return (
                  <label
                    key={day}
                    className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      selected
                        ? 'border-blue-200 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    } ${!canEdit ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleDay(day)}
                      className="h-4 w-4 shrink-0 rounded border-slate-300 accent-blue-600"
                    />
                    <span className="font-medium">{day} days</span>
                    <span className="hidden text-xs text-slate-500 lg:inline">
                      {day === 7
                        ? '· 1 week'
                        : day === 30
                          ? '· 1 month'
                          : day === 60
                            ? '· 2 months'
                            : '· 3 months'}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {!canEdit ? (
              <p className="text-xs text-slate-500">
                Only workspace owners and admins can change these settings.
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                {`${days.length} reminder interval${days.length === 1 ? '' : 's'} selected`}
              </p>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving…' : 'Save settings'}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
