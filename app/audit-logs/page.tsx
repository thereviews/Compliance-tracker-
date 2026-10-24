'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  History,
  CalendarDays,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase, getAuthHeaders } from '@/lib/supabase-client';

type Workspace = {
  id: string;
  name: string;
  type: string;
  role: string;
};

type AuditLog = {
  id: string;
  workspace_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

type AuditResponse = {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  role: string;
};

const actions = [
  'created',
  'updated',
  'deleted',
  'uploaded',
  'viewed',
  'downloaded',
  'status_changed',
];

const entityTypes = [
  'vendor',
  'document',
  'compliance_assessment',
  'compliance_evidence',
  'risk_assessment',
  'workspace_member',
];

function label(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function actionStyle(action: string) {
  switch (action) {
    case 'created':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    case 'uploaded':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
    case 'updated':
    case 'status_changed':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
    case 'deleted':
      return 'border-red-500/30 bg-red-500/10 text-red-400';
    default:
      return 'border-zinc-700 bg-zinc-800 text-zinc-300';
  }
}

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Unknown date';

  return date.toLocaleString();
}

export default function AuditLogsPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const currentWorkspace = workspaces.find(
    (workspace) => workspace.id === workspaceId
  );

  const checkUser = useCallback(async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace('/login');
        return;
      }

      setUserEmail(user.email || '');
      setAuthLoading(false);
    } catch {
      router.replace('/login');
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
        throw new Error(result.error || 'Could not load workspaces');
      }

      const loaded: Workspace[] = result.workspaces || [];
      setWorkspaces(loaded);

      const savedId = localStorage.getItem(
        `selectedWorkspace:${userEmail}`
      );
      const saved = loaded.find((item) => item.id === savedId);
      const personal = loaded.find((item) => item.type === 'personal');
      const selected = saved || personal || loaded[0];

      if (selected) {
        setWorkspaceId(selected.id);
      } else {
        setWorkspaceId('');
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not load workspaces'
      );
    } finally {
      setWorkspaceLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (userEmail) {
      void fetchWorkspaces();
    }
  }, [userEmail, fetchWorkspaces]);

  const fetchLogs = useCallback(async () => {
    if (!workspaceId) {
      setLogs([]);
      setTotal(0);
      setTotalPages(0);
      return;
    }

    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({
        workspaceId,
        page: String(page),
        pageSize: String(pageSize),
      });

      if (action) params.set('action', action);
      if (entityType) params.set('entityType', entityType);
      if (search.trim()) params.set('search', search.trim());
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);

      const response = await fetch(
        `/api/audit-logs?${params.toString()}`,
        { headers }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not load audit logs');
      }

      const data = result as AuditResponse;
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not load audit logs'
      );
    } finally {
      setLoading(false);
    }
  }, [
    workspaceId,
    page,
    pageSize,
    action,
    entityType,
    search,
    fromDate,
    toDate,
  ]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  function changeWorkspace(id: string) {
    setWorkspaceId(id);
    if (userEmail) {
      localStorage.setItem(`selectedWorkspace:${userEmail}`, id);
    }
    setPage(1);
  }

  function resetFilters() {
    setAction('');
    setEntityType('');
    setSearch('');
    setFromDate('');
    setToDate('');
    setPage(1);
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <p className="text-zinc-400">Checking your session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                ComplianceTracker
              </h1>
              <p className="text-xs text-zinc-400">Audit history</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition-colors hover:border-emerald-500 hover:text-emerald-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <span className="hidden text-xs text-zinc-400 sm:inline">
              {userEmail}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Audit Logs
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Review recorded activity across vendors, documents, compliance
              evidence, assessments, and risk reviews in your workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchLogs()}
            disabled={loading || !workspaceId}
            className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition-colors hover:border-emerald-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <label
            htmlFor="workspace"
            className="mb-2 block text-sm font-medium text-zinc-300"
          >
            Workspace
          </label>
          <select
            id="workspace"
            value={workspaceId}
            onChange={(event) => changeWorkspace(event.target.value)}
            disabled={workspaceLoading || workspaces.length === 0}
            className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
          >
            {workspaces.length === 0 && (
              <option value="">
                {workspaceLoading ? 'Loading workspaces...' : 'No workspaces available'}
              </option>
            )}
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          {currentWorkspace && (
            <p className="mt-2 text-xs text-zinc-500">
              Role: {label(currentWorkspace.role)}
            </p>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3">
                <History className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Matching events</p>
                <p className="mt-1 text-2xl font-bold">
                  {loading ? '—' : total.toLocaleString()}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Events matching your current filters
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-3">
                <CalendarDays className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Current page</p>
                <p className="mt-1 text-2xl font-bold">
                  {total === 0 ? 0 : page} / {Math.max(totalPages, 1)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              {logs.length} event(s) displayed on this page
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold">Filter activity</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label htmlFor="audit-search" className="mb-2 block text-sm text-zinc-400">
                Search entity
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3">
                <Search className="h-4 w-4 shrink-0 text-zinc-500" />
                <input
                  id="audit-search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search name or entity ID"
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="audit-action" className="mb-2 block text-sm text-zinc-400">
                Action
              </label>
              <select
                id="audit-action"
                value={action}
                onChange={(event) => {
                  setAction(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">All actions</option>
                {actions.map((item) => (
                  <option key={item} value={item}>{label(item)}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="audit-entity" className="mb-2 block text-sm text-zinc-400">
                Entity type
              </label>
              <select
                id="audit-entity"
                value={entityType}
                onChange={(event) => {
                  setEntityType(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">All entity types</option>
                {entityTypes.map((item) => (
                  <option key={item} value={item}>{label(item)}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="audit-from" className="mb-2 block text-sm text-zinc-400">
                From date
              </label>
              <input
                id="audit-from"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="audit-to" className="mb-2 block text-sm text-zinc-400">
                To date
              </label>
              <input
                id="audit-to"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => {
                  setToDate(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
              >
                Clear filters
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
            <div>
              <h3 className="font-semibold">Activity history</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Newest events appear first
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-400">
              Rows
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-zinc-100 outline-none"
              >
                {[10, 25, 50].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="px-5 py-16 text-center text-sm text-zinc-400">
              Loading audit history...
            </div>
          ) : logs.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <History className="mx-auto h-10 w-10 text-zinc-600" />
              <h4 className="mt-4 font-medium">No audit events found</h4>
              <p className="mt-2 text-sm text-zinc-500">
                Try changing your filters, or check again after recording activity.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {logs.map((log) => (
                <article key={log.id} className="space-y-3 px-5 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-medium text-zinc-100">
                        {log.entity_name || label(log.entity_type)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {label(log.entity_type)}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${actionStyle(log.action)}`}>
                      {label(log.action)}
                    </span>
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-zinc-500">Timestamp</p>
                      <p className="mt-1 text-zinc-300">
                        {formatTimestamp(log.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Actor ID</p>
                      <p className="mt-1 break-all font-mono text-xs text-zinc-400">
                        {log.actor_id || 'User no longer available'}
                      </p>
                    </div>
                  </div>

                  {log.entity_id && (
                    <p className="break-all text-xs text-zinc-500">
                      Entity ID: <span className="font-mono">{log.entity_id}</span>
                    </p>
                  )}

                  {Object.keys(log.details || {}).length > 0 && (
                    <details className="rounded-xl border border-zinc-800 bg-zinc-950/70">
                      <summary className="cursor-pointer px-3 py-3 text-sm text-zinc-300 hover:text-emerald-400">
                        View event details
                      </summary>
                      <pre className="overflow-x-auto border-t border-zinc-800 p-3 text-xs leading-5 text-zinc-400">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </article>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-5 py-4">
            <p className="text-sm text-zinc-500">
              {total === 0
                ? 'No matching events'
                : `Showing ${(page - 1) * pageSize + 1}–${Math.min(
                    (page - 1) * pageSize + logs.length,
                    total
                  )} of ${total.toLocaleString()} events`}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={loading || page <= 1}
                className="flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={loading || page >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <p className="text-xs leading-5 text-zinc-500">
          This page displays recorded audit events. Activity may be missing if
          an operation was not instrumented or its audit write failed.
        </p>
      </div>
    </main>
  );
}
