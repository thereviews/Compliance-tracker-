'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
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
  CircleDot,
  UserRound,
  ListTodo,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase, getAuthHeaders } from '@/lib/supabase-client';

const STATUSES = [
  'open',
  'in_progress',
  'blocked',
  'resolved',
  'closed',
] as const;

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

type ActionStatus = (typeof STATUSES)[number];
type ActionPriority = (typeof PRIORITIES)[number];

type Workspace = {
  id: string;
  name: string;
  type: string;
  role: string;
};

type RegisterEntry = {
  id: string;
  title: string;
  framework: string;
  category: string;
  status: string;
};

type CorrectiveAction = {
  id: string;
  workspace_id: string;
  register_entry_id: string | null;
  title: string;
  description: string | null;
  priority: ActionPriority;
  status: ActionStatus;
  assigned_to: string | null;
  due_date: string | null;
  resolution_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type ActionForm = {
  title: string;
  description: string;
  register_entry_id: string;
  priority: ActionPriority;
  status: ActionStatus;
  assigned_to: string;
  due_date: string;
  resolution_notes: string;
};

const EMPTY_FORM: ActionForm = {
  title: '',
  description: '',
  register_entry_id: '',
  priority: 'medium',
  status: 'open',
  assigned_to: '',
  due_date: '',
  resolution_notes: '',
};

const inputClass =
  'w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500';

const labelClass = 'mb-1.5 block text-sm font-medium text-zinc-300';

function label(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function dateLabel(value: string | null) {
  if (!value) return 'Not set';

  const parts = value.split('-').map(Number);

  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(
      undefined,
      { year: 'numeric', month: 'short', day: 'numeric' },
    );
  }

  return value;
}

function localDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function statusStyle(status: string) {
  switch (status) {
    case 'open':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
    case 'in_progress':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    case 'blocked':
      return 'border-red-500/30 bg-red-500/10 text-red-300';
    case 'resolved':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    case 'closed':
      return 'border-zinc-600 bg-zinc-800 text-zinc-300';
    default:
      return 'border-zinc-700 bg-zinc-800 text-zinc-300';
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

export default function CorrectiveActionsPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [registerEntries, setRegisterEntries] = useState<RegisterEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CorrectiveAction | null>(null);
  const [form, setForm] = useState<ActionForm>(EMPTY_FORM);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const currentWorkspace = workspaces.find(
    (workspace) => workspace.id === workspaceId,
  );
  const role = currentWorkspace?.role || '';
  const canCreate = ['owner', 'admin', 'member'].includes(role);
  const canManageAll = ['owner', 'admin'].includes(role);

  const checkUser = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace('/login');
        return;
      }

      setUserEmail(data.user.email || '');
      setUserId(data.user.id);
    } catch {
      router.replace('/login');
    } finally {
      setAuthLoading(false);
    }
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
        throw new Error(result.error || 'Could not load workspaces.');
      }

      const loaded: Workspace[] = result.workspaces || [];
      setWorkspaces(loaded);

      const savedId = localStorage.getItem(
        `selectedWorkspace:${userEmail}`,
      );

      const selected = loaded.find((workspace) => workspace.id === savedId);
      const personal = loaded.find(
        (workspace) => workspace.type === 'personal',
      );

      setWorkspaceId((selected || personal || loaded[0])?.id || '');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not load workspaces.',
      );
    } finally {
      setWorkspaceLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces]);

  const fetchActions = useCallback(async () => {
    if (!workspaceId) {
      setActions([]);
      return;
    }

    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/corrective-actions?workspaceId=${encodeURIComponent(workspaceId)}`,
        { headers },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not load corrective actions.');
      }

      setActions(result.actions || []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not load corrective actions.',
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const fetchRegisterEntries = useCallback(async () => {
    if (!workspaceId) {
      setRegisterEntries([]);
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/compliance-register?workspaceId=${encodeURIComponent(workspaceId)}`,
        { headers },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not load compliance register.');
      }

      setRegisterEntries(result.entries || []);
    } catch (error) {
      setRegisterEntries([]);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not load compliance register.',
      );
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchActions();
    void fetchRegisterEntries();
  }, [fetchActions, fetchRegisterEntries]);

  const handleWorkspaceChange = (id: string) => {
    setWorkspaceId(id);
    setActions([]);
    setRegisterEntries([]);
    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
    localStorage.setItem(`selectedWorkspace:${userEmail}`, id);
  };

  const openCreateForm = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = (action: CorrectiveAction) => {
    setEditing(action);
    setForm({
      title: action.title,
      description: action.description || '',
      register_entry_id: action.register_entry_id || '',
      priority: action.priority,
      status: action.status,
      assigned_to: action.assigned_to || '',
      due_date: action.due_date || '',
      resolution_notes: action.resolution_notes || '',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const updateForm = <K extends keyof ActionForm>(
    key: K,
    value: ActionForm[K],
  ) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!workspaceId || !canCreate) return;

    if (!form.title.trim()) {
      toast.error('Action title is required.');
      return;
    }

    setSaving(true);

    try {
      const headers = await getAuthHeaders();

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        register_entry_id: form.register_entry_id || null,
        priority: form.priority,
        status: form.status,
        assigned_to: form.assigned_to.trim() || null,
        due_date: form.due_date || null,
        resolution_notes: form.resolution_notes.trim() || null,
      };

      const response = await fetch('/api/corrective-actions', {
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
        throw new Error(result.error || 'Could not save corrective action.');
      }

      toast.success(
        editing ? 'Corrective action updated.' : 'Corrective action created.',
      );

      setFormOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await fetchActions();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not save corrective action.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (action: CorrectiveAction) => {
    if (!canManageAll || !workspaceId) {
      toast.error('Only workspace owners and admins can delete actions.');
      return;
    }

    if (!window.confirm(`Delete "${action.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/corrective-actions?id=${encodeURIComponent(action.id)}&workspaceId=${encodeURIComponent(workspaceId)}`,
        { method: 'DELETE', headers },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not delete corrective action.');
      }

      toast.success('Corrective action deleted.');
      await fetchActions();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not delete corrective action.',
      );
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const filteredActions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return actions.filter((action) => {
      const linkedEntry = registerEntries.find(
        (entry) => entry.id === action.register_entry_id,
      );

      const matchesSearch =
        !query ||
        [
          action.title,
          action.description || '',
          action.assigned_to || '',
          action.resolution_notes || '',
          linkedEntry?.title || '',
        ].some((value) => value.toLowerCase().includes(query));

      return (
        matchesSearch &&
        (statusFilter === 'all' || action.status === statusFilter) &&
        (priorityFilter === 'all' || action.priority === priorityFilter)
      );
    });
  }, [actions, registerEntries, search, statusFilter, priorityFilter]);

  const today = localDateString();

  const openCount = actions.filter(
    (action) => action.status === 'open' || action.status === 'blocked',
  ).length;

  const overdueCount = actions.filter(
    (action) =>
      Boolean(action.due_date) &&
      action.due_date! < today &&
      !['resolved', 'closed'].includes(action.status),
  ).length;

  const inProgressCount = actions.filter(
    (action) => action.status === 'in_progress',
  ).length;

  const resolvedCount = actions.filter((action) =>
    ['resolved', 'closed'].includes(action.status),
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
                Corrective actions
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
              GOVERNANCE & REMEDIATION
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              Corrective Actions
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Track compliance issues, assign remediation work, monitor
              deadlines, and document how findings are resolved.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                void fetchActions();
                void fetchRegisterEntries();
              }}
              disabled={loading || !workspaceId}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-emerald-500 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
            <button
              onClick={openCreateForm}
              disabled={!workspaceId || !canCreate}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add action
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
              You need access to a workspace before managing corrective
              actions.
            </p>
          </section>
        )}

        {workspaceId && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                title="Open actions"
                value={openCount}
                icon={<ListTodo className="h-5 w-5 text-blue-400" />}
              />
              <SummaryCard
                title="Overdue actions"
                value={overdueCount}
                icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
              />
              <SummaryCard
                title="In progress"
                value={inProgressCount}
                icon={<Clock className="h-5 w-5 text-amber-400" />}
              />
              <SummaryCard
                title="Resolved"
                value={resolvedCount}
                icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              />
            </section>

            <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search actions, assignees, linked requirements..."
                    className={`${inputClass} pl-9`}
                  />
                </div>

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
                  Showing {filteredActions.length} of {actions.length} actions
                </span>
                {loading && <span>Loading...</span>}
              </div>

              {loading && actions.length === 0 ? (
                <div className="py-12 text-center text-sm text-zinc-500">
                  Loading corrective actions...
                </div>
              ) : filteredActions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-700 px-5 py-12 text-center">
                  <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
                  <h3 className="font-semibold">
                    {actions.length === 0
                      ? 'No corrective actions yet'
                      : 'No matching actions'}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                    {actions.length === 0
                      ? 'Create your first remediation task to track an issue, assign responsibility, and follow it through to resolution.'
                      : 'Try changing your search or filters.'}
                  </p>
                  {actions.length === 0 && canCreate && (
                    <button
                      onClick={openCreateForm}
                      className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
                    >
                      Add first action
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                        <th className="px-3 py-3 font-medium">Action</th>
                        <th className="px-3 py-3 font-medium">Priority</th>
                        <th className="px-3 py-3 font-medium">Status</th>
                        <th className="px-3 py-3 font-medium">Assigned to</th>
                        <th className="px-3 py-3 font-medium">Due date</th>
                        <th className="px-3 py-3 font-medium">Linked requirement</th>
                        <th className="px-3 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActions.map((action) => {
                        const linkedEntry = registerEntries.find(
                          (entry) => entry.id === action.register_entry_id,
                        );

                        const canEdit =
                          canManageAll ||
                          (role === 'member' && action.created_by === userId);

                        const isOverdue =
                          Boolean(action.due_date) &&
                          action.due_date! < today &&
                          !['resolved', 'closed'].includes(action.status);

                        return (
                          <tr
                            key={action.id}
                            className="border-b border-zinc-800/70 transition hover:bg-zinc-800/30"
                          >
                            <td className="max-w-sm px-3 py-4">
                              <p className="font-medium text-zinc-100">
                                {action.title}
                              </p>
                              {action.description && (
                                <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                                  {action.description}
                                </p>
                              )}
                              {isOverdue && (
                                <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-400">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Overdue
                                </span>
                              )}
                            </td>

                            <td
                              className={`px-3 py-4 font-medium ${priorityStyle(action.priority)}`}
                            >
                              {label(action.priority)}
                            </td>

                            <td className="px-3 py-4">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyle(action.status)}`}
                              >
                                {label(action.status)}
                              </span>
                            </td>

                            <td className="px-3 py-4 text-zinc-400">
                              <span className="flex items-center gap-2">
                                <UserRound className="h-4 w-4 shrink-0 text-zinc-500" />
                                {action.assigned_to || 'Not assigned'}
                              </span>
                            </td>

                            <td className="px-3 py-4 text-zinc-400">
                              <span className="flex items-center gap-2">
                                <CalendarDays
                                  className={`h-4 w-4 shrink-0 ${isOverdue ? 'text-red-400' : 'text-zinc-500'}`}
                                />
                                <span className={isOverdue ? 'text-red-400' : ''}>
                                  {dateLabel(action.due_date)}
                                </span>
                              </span>
                            </td>

                            <td className="max-w-xs px-3 py-4">
                              {linkedEntry ? (
                                <>
                                  <p className="font-medium text-zinc-300">
                                    {linkedEntry.title}
                                  </p>
                                  <p className="mt-1 text-xs text-zinc-500">
                                    {linkedEntry.framework} · {linkedEntry.category}
                                  </p>
                                </>
                              ) : (
                                <span className="text-zinc-500">
                                  {action.register_entry_id
                                    ? 'Linked entry unavailable'
                                    : 'Not linked'}
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-4">
                              <div className="flex justify-end gap-2">
                                {canEdit && (
                                  <button
                                    onClick={() => openEditForm(action)}
                                    title="Edit corrective action"
                                    className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                )}
                                {canManageAll && (
                                  <button
                                    onClick={() => void handleDelete(action)}
                                    title="Delete corrective action"
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
              aria-labelledby="action-form-title"
              className="my-auto w-full max-w-3xl rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 sm:px-6">
                <div>
                  <h3 id="action-form-title" className="text-lg font-semibold">
                    {editing ? 'Edit corrective action' : 'Add corrective action'}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Record the issue, assign ownership, and track remediation.
                  </p>
                </div>
                <button
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
                  aria-label="Close form"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5 p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Action title *</label>
                    <input
                      required
                      maxLength={200}
                      value={form.title}
                      onChange={(event) =>
                        updateForm('title', event.target.value)
                      }
                      placeholder="e.g. Enforce multi-factor authentication"
                      className={inputClass}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      Linked compliance requirement
                    </label>
                    <select
                      value={form.register_entry_id}
                      onChange={(event) =>
                        updateForm('register_entry_id', event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="">No linked requirement</option>
                      {registerEntries.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.title} · {entry.framework}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-xs text-zinc-500">
                      Optional. Link this task to a requirement in your
                      Compliance Register.
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>Priority</label>
                    <select
                      value={form.priority}
                      onChange={(event) =>
                        updateForm(
                          'priority',
                          event.target.value as ActionPriority,
                        )
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
                    <label className={labelClass}>Status</label>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateForm(
                          'status',
                          event.target.value as ActionStatus,
                        )
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
                    <label className={labelClass}>Assigned to</label>
                    <input
                      maxLength={200}
                      value={form.assigned_to}
                      onChange={(event) =>
                        updateForm('assigned_to', event.target.value)
                      }
                      placeholder="Person or role responsible"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Due date</label>
                    <input
                      type="date"
                      value={form.due_date}
                      onChange={(event) =>
                        updateForm('due_date', event.target.value)
                      }
                      className={inputClass}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>Description</label>
                    <textarea
                      rows={4}
                      maxLength={10000}
                      value={form.description}
                      onChange={(event) =>
                        updateForm('description', event.target.value)
                      }
                      placeholder="Describe the finding, risk, or corrective work required..."
                      className={inputClass}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>Resolution notes</label>
                    <textarea
                      rows={3}
                      maxLength={10000}
                      value={form.resolution_notes}
                      onChange={(event) =>
                        updateForm('resolution_notes', event.target.value)
                      }
                      placeholder="Record remediation performed, evidence, or verification results..."
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
                    {saving && (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    )}
                    {saving
                      ? 'Saving...'
                      : editing
                        ? 'Save changes'
                        : 'Create action'}
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
  icon: ReactNode;
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
