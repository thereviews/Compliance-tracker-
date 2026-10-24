'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  Plus,
  RefreshCw,
  Search,
  X,
  Trash2,
  Pencil,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ClipboardCheck,
  LogOut,
  CalendarDays,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase, getAuthHeaders } from '@/lib/supabase-client';

const FRAMEWORKS = [
  'SOC 2',
  'ISO 27001',
  'GDPR',
  'HIPAA',
  'PCI DSS',
  'Custom',
] as const;

const STATUSES = [
  'not_started',
  'in_progress',
  'compliant',
  'non_compliant',
  'not_applicable',
] as const;

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

type EntryStatus = (typeof STATUSES)[number];
type EntryPriority = (typeof PRIORITIES)[number];

type Workspace = {
  id: string;
  name: string;
  type: string;
  role: string;
};

type RegisterEntry = {
  id: string;
  workspace_id: string;
  title: string;
  framework: string;
  category: string;
  description: string | null;
  responsible_person: string | null;
  status: EntryStatus;
  priority: EntryPriority;
  review_date: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type EntryForm = {
  title: string;
  framework: string;
  category: string;
  description: string;
  responsible_person: string;
  status: EntryStatus;
  priority: EntryPriority;
  review_date: string;
  notes: string;
};

const EMPTY_FORM: EntryForm = {
  title: '',
  framework: 'SOC 2',
  category: 'General',
  description: '',
  responsible_person: '',
  status: 'not_started',
  priority: 'medium',
  review_date: '',
  notes: '',
};

function label(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function dateLabel(value: string | null) {
  if (!value) return 'Not set';

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? 'Invalid date'
    : date.toLocaleDateString();
}

function statusStyle(status: string) {
  switch (status) {
    case 'compliant':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    case 'non_compliant':
      return 'border-red-500/30 bg-red-500/10 text-red-400';
    case 'in_progress':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
    case 'not_applicable':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
    default:
      return 'border-zinc-700 bg-zinc-800 text-zinc-400';
  }
}

function priorityStyle(priority: string) {
  switch (priority) {
    case 'critical':
      return 'text-red-400';
    case 'high':
      return 'text-orange-400';
    case 'medium':
      return 'text-amber-400';
    default:
      return 'text-zinc-400';
  }
}

const inputClass =
  'w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500';

const labelClass = 'mb-1.5 block text-sm font-medium text-zinc-300';

export default function ComplianceRegisterPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  const [entries, setEntries] = useState<RegisterEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RegisterEntry | null>(null);
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [frameworkFilter, setFrameworkFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const currentWorkspace = workspaces.find(
    (workspace) => workspace.id === workspaceId,
  );

  const role = currentWorkspace?.role || '';
  const canCreate = ['owner', 'admin', 'member'].includes(role);
  const canManageAll = ['owner', 'admin'].includes(role);

  const checkUser = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      router.replace('/login');
      return;
    }

    setUserEmail(user.email || '');
    setUserId(user.id);
    setAuthLoading(false);
  }, [router]);

  useEffect(() => {
    void checkUser();
  }, [checkUser]);

  const fetchWorkspaces = useCallback(async () => {
    if (!userEmail) return;

    setWorkspaceLoading(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/workspaces', { headers });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not load workspaces');
      }

      const loaded: Workspace[] = result.workspaces || [];
      setWorkspaces(loaded);

      const savedId = localStorage.getItem(
        `selectedWorkspace:${userEmail}`,
      );

      const selected = loaded.find((item) => item.id === savedId);
      const personal = loaded.find((item) => item.type === 'personal');

      setWorkspaceId((selected || personal || loaded[0])?.id || '');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not load workspaces',
      );
    } finally {
      setWorkspaceLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces]);

  const fetchEntries = useCallback(async () => {
    if (!workspaceId) {
      setEntries([]);
      return;
    }

    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/compliance-register?workspaceId=${encodeURIComponent(workspaceId)}`,
        { headers },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not load register entries');
      }

      setEntries(result.entries || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not load register',
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const handleWorkspaceChange = (id: string) => {
    setWorkspaceId(id);
    setEntries([]);
    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setSearch('');
    setStatusFilter('all');
    localStorage.setItem(`selectedWorkspace:${userEmail}`, id);
  };

  const openCreateForm = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = (entry: RegisterEntry) => {
    if (!canManageAll && role === 'member' && entry.created_by !== currentWorkspace?.id) {
      // The API remains the source of truth for edit permissions.
      // The actual creator ID is checked by the server.
    }

    setEditing(entry);
    setForm({
      title: entry.title,
      framework: entry.framework,
      category: entry.category,
      description: entry.description || '',
      responsible_person: entry.responsible_person || '',
      status: entry.status,
      priority: entry.priority,
      review_date: entry.review_date || '',
      notes: entry.notes || '',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const updateForm = <K extends keyof EntryForm>(
    key: K,
    value: EntryForm[K],
  ) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!workspaceId || !canCreate) return;

    if (!form.title.trim() || !form.framework.trim() || !form.category.trim()) {
      toast.error('Title, framework, and category are required.');
      return;
    }

    setSaving(true);

    try {
      const headers = await getAuthHeaders();
      const payload = {
        ...form,
        title: form.title.trim(),
        framework: form.framework.trim(),
        category: form.category.trim(),
        description: form.description.trim() || null,
        responsible_person: form.responsible_person.trim() || null,
        review_date: form.review_date || null,
        notes: form.notes.trim() || null,
      };

      const response = await fetch('/api/compliance-register', {
        method: editing ? 'PATCH' : 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          editing
            ? { id: editing.id, workspace_id: workspaceId, ...payload }
            : { workspace_id: workspaceId, ...payload },
        ),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not save register entry');
      }

      toast.success(editing ? 'Requirement updated.' : 'Requirement created.');
      closeForm();
      await fetchEntries();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save requirement',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry: RegisterEntry) => {
    if (!canManageAll || !workspaceId) {
      toast.error('Only workspace owners and admins can delete entries.');
      return;
    }

    if (!window.confirm(`Delete "${entry.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/compliance-register?id=${encodeURIComponent(entry.id)}&workspaceId=${encodeURIComponent(workspaceId)}`,
        { method: 'DELETE', headers },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not delete entry');
      }

      toast.success('Requirement deleted.');
      await fetchEntries();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not delete entry',
      );
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesSearch =
        !query ||
        [
          entry.title,
          entry.framework,
          entry.category,
          entry.responsible_person || '',
          entry.description || '',
        ].some((value) => value.toLowerCase().includes(query));

      return (
        matchesSearch &&
        (statusFilter === 'all' || entry.status === statusFilter) &&
        (frameworkFilter === 'all' || entry.framework === frameworkFilter) &&
        (priorityFilter === 'all' || entry.priority === priorityFilter)
      );
    });
  }, [entries, search, statusFilter, frameworkFilter, priorityFilter]);

  const compliantCount = entries.filter(
    (entry) => entry.status === 'compliant',
  ).length;

  const inProgressCount = entries.filter(
    (entry) => entry.status === 'in_progress',
  ).length;

  const nonCompliantCount = entries.filter(
    (entry) => entry.status === 'non_compliant',
  ).length;

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-emerald-400">
        Verifying session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight">ComplianceTracker</h1>
              <p className="hidden text-xs text-zinc-500 sm:block">
                Compliance register
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:border-emerald-500 hover:text-emerald-400"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <button
              onClick={logout}
              title="Sign out"
              className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-emerald-400">
              GOVERNANCE & CONTROL
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              Compliance Register
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Maintain your compliance requirements, track control status,
              assign responsibility, and keep upcoming reviews visible.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void fetchEntries()}
              disabled={loading || !workspaceId}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-emerald-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={openCreateForm}
              disabled={!workspaceId || !canCreate}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add requirement
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <label className={labelClass}>Workspace</label>
          <select
            value={workspaceId}
            onChange={(event) => handleWorkspaceChange(event.target.value)}
            disabled={workspaceLoading || workspaces.length === 0}
            className={`${inputClass} max-w-xl`}
          >
            {workspaces.length === 0 && (
              <option value="">No workspace available</option>
            )}
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name} · {label(workspace.role)}
              </option>
            ))}
          </select>
        </section>

        {!workspaceLoading && workspaces.length === 0 && (
          <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
            <AlertTriangle className="mb-3 h-6 w-6 text-amber-400" />
            <h3 className="font-semibold">No workspace found</h3>
            <p className="mt-2 text-sm text-zinc-400">
              You need access to a workspace before managing compliance
              requirements.
            </p>
          </section>
        )}

        {workspaceId && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                title="Total requirements"
                value={entries.length}
                icon={<ClipboardCheck className="h-5 w-5 text-zinc-400" />}
              />
              <SummaryCard
                title="Compliant"
                value={compliantCount}
                icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              />
              <SummaryCard
                title="In progress"
                value={inProgressCount}
                icon={<Clock className="h-5 w-5 text-amber-400" />}
              />
              <SummaryCard
                title="Non-compliant"
                value={nonCompliantCount}
                icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
              />
            </section>

            <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search requirements, frameworks, categories..."
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <select
                  value={frameworkFilter}
                  onChange={(event) => setFrameworkFilter(event.target.value)}
                  className={`${inputClass} lg:max-w-48`}
                  aria-label="Filter by framework"
                >
                  <option value="all">All frameworks</option>
                  {Array.from(
                    new Set([
                      ...FRAMEWORKS,
                      ...entries.map((entry) => entry.framework),
                    ]),
                  ).map((framework) => (
                    <option key={framework} value={framework}>
                      {framework}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className={`${inputClass} lg:max-w-48`}
                  aria-label="Filter by status"
                >
                  <option value="all">All statuses</option>
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {label(status)}
                    </option>
                  ))}
                </select>
                <select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                  className={`${inputClass} lg:max-w-44`}
                  aria-label="Filter by priority"
                >
                  <option value="all">All priorities</option>
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {label(priority)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between text-sm text-zinc-500">
                <span>
                  Showing {filteredEntries.length} of {entries.length} requirements
                </span>
                {loading && <span>Loading...</span>}
              </div>

              {loading && entries.length === 0 ? (
                <div className="py-12 text-center text-sm text-zinc-500">
                  Loading compliance register...
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-700 px-5 py-12 text-center">
                  <FileText className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
                  <h3 className="font-semibold">
                    {entries.length === 0
                      ? 'Your register is empty'
                      : 'No matching requirements'}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                    {entries.length === 0
                      ? 'Add your first compliance requirement to start tracking controls and review dates.'
                      : 'Try changing your search or filters.'}
                  </p>
                  {entries.length === 0 && canCreate && (
                    <button
                      onClick={openCreateForm}
                      className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
                    >
                      Add first requirement
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                        <th className="px-3 py-3 font-medium">Requirement</th>
                        <th className="px-3 py-3 font-medium">Framework</th>
                        <th className="px-3 py-3 font-medium">Status</th>
                        <th className="px-3 py-3 font-medium">Priority</th>
                        <th className="px-3 py-3 font-medium">Responsible</th>
                        <th className="px-3 py-3 font-medium">Review date</th>
                        <th className="px-3 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((entry) => {
                        const canEdit =
                          canManageAll ||
                          (role === 'member' &&
                            entry.created_by === userId);

                        return (
                          <tr
                            key={entry.id}
                            className="border-b border-zinc-800/70 transition hover:bg-zinc-800/30"
                          >
                            <td className="max-w-sm px-3 py-4">
                              <p className="font-medium text-zinc-100">
                                {entry.title}
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                {entry.category}
                              </p>
                              {entry.description && (
                                <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                                  {entry.description}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-4 text-zinc-300">
                              {entry.framework}
                            </td>
                            <td className="px-3 py-4">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyle(entry.status)}`}
                              >
                                {label(entry.status)}
                              </span>
                            </td>
                            <td className={`px-3 py-4 font-medium ${priorityStyle(entry.priority)}`}>
                              {label(entry.priority)}
                            </td>
                            <td className="px-3 py-4 text-zinc-400">
                              {entry.responsible_person || 'Not assigned'}
                            </td>
                            <td className="px-3 py-4 text-zinc-400">
                              <span className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-zinc-500" />
                                {dateLabel(entry.review_date)}
                              </span>
                            </td>
                            <td className="px-3 py-4">
                              <div className="flex justify-end gap-2">
                                {canEdit && (
                                  <button
                                    onClick={() => openEditForm(entry)}
                                    title="Edit requirement"
                                    className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                )}
                                {canManageAll && (
                                  <button
                                    onClick={() => void handleDelete(entry)}
                                    title="Delete requirement"
                                    className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:border-red-500 hover:text-red-400"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-8 backdrop-blur-sm">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="register-form-title"
              className="my-auto w-full max-w-3xl rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 sm:px-6">
                <div>
                  <h3 id="register-form-title" className="text-lg font-semibold">
                    {editing ? 'Edit requirement' : 'Add compliance requirement'}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Define the requirement and how it will be tracked.
                  </p>
                </div>
                <button
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  aria-label="Close form"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5 p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Requirement title *</label>
                    <input
                      required
                      maxLength={200}
                      value={form.title}
                      onChange={(event) => updateForm('title', event.target.value)}
                      placeholder="e.g. Enforce multi-factor authentication"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Framework *</label>
                    <select
                      required
                      value={form.framework}
                      onChange={(event) => updateForm('framework', event.target.value)}
                      className={inputClass}
                    >
                      {FRAMEWORKS.map((framework) => (
                        <option key={framework} value={framework}>
                          {framework}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Category *</label>
                    <input
                      required
                      maxLength={100}
                      value={form.category}
                      onChange={(event) => updateForm('category', event.target.value)}
                      placeholder="e.g. Access Control"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Status</label>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateForm('status', event.target.value as EntryStatus)
                      }
                      className={inputClass}
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {label(status)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Priority</label>
                    <select
                      value={form.priority}
                      onChange={(event) =>
                        updateForm('priority', event.target.value as EntryPriority)
                      }
                      className={inputClass}
                    >
                      {PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {label(priority)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Responsible person</label>
                    <input
                      maxLength={200}
                      value={form.responsible_person}
                      onChange={(event) =>
                        updateForm('responsible_person', event.target.value)
                      }
                      placeholder="Name or role"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Review date</label>
                    <input
                      type="date"
                      value={form.review_date}
                      onChange={(event) => updateForm('review_date', event.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>Description</label>
                    <textarea
                      rows={3}
                      maxLength={10000}
                      value={form.description}
                      onChange={(event) => updateForm('description', event.target.value)}
                      placeholder="Describe the control or compliance requirement..."
                      className={inputClass}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>Notes</label>
                    <textarea
                      rows={3}
                      maxLength={10000}
                      value={form.notes}
                      onChange={(event) => updateForm('notes', event.target.value)}
                      placeholder="Evidence references, review findings, or follow-up notes..."
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !canCreate}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                    {saving
                      ? 'Saving...'
                      : editing
                        ? 'Save changes'
                        : 'Create requirement'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{title}</p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}
