'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Download,
  FileText,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ListTodo,
  Printer,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase, getAuthHeaders } from '@/lib/supabase-client';

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
  status: string;
  priority: string;
  review_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type CorrectiveAction = {
  id: string;
  workspace_id: string;
  register_entry_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  due_date: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
};

const inputClass =
  'w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500';

function label(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set';

  const parts = value.slice(0, 10).split('-').map(Number);

  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return value;
  }

  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(
    undefined,
    { year: 'numeric', month: 'short', day: 'numeric' },
  );
}

function localDateString() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

function csvCell(value: unknown) {
  let text = value == null ? '' : String(value);

  // Prevent spreadsheet applications from treating untrusted values as formulas.
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const content = '\uFEFF' + rows
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');

  const blob = new Blob([content], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function statusClass(status: string) {
  switch (status) {
    case 'compliant':
    case 'resolved':
    case 'closed':
      return 'text-emerald-400';
    case 'non_compliant':
    case 'blocked':
      return 'text-red-400';
    case 'in_progress':
      return 'text-amber-400';
    case 'open':
      return 'text-blue-400';
    default:
      return 'text-zinc-400';
  }
}

function priorityClass(priority: string) {
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

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-400">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-2.5">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-500">{description}</p>
    </section>
  );
}

export default function ComplianceReportsPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  const [entries, setEntries] = useState<RegisterEntry[]>([]);
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  const currentWorkspace = workspaces.find(
    (workspace) => workspace.id === workspaceId,
  );

  const today = localDateString();

  const metrics = useMemo(() => {
    const applicableEntries = entries.filter(
      (entry) => entry.status !== 'not_applicable',
    );

    const compliant = entries.filter(
      (entry) => entry.status === 'compliant',
    ).length;

    const nonCompliant = entries.filter(
      (entry) => entry.status === 'non_compliant',
    ).length;

    const inProgress = entries.filter(
      (entry) => entry.status === 'in_progress',
    ).length;

    const notStarted = entries.filter(
      (entry) => entry.status === 'not_started',
    ).length;

    const notApplicable = entries.filter(
      (entry) => entry.status === 'not_applicable',
    ).length;

    const complianceRate = applicableEntries.length
      ? Math.round((compliant / applicableEntries.length) * 100)
      : 0;

    const overdueReviews = entries.filter(
      (entry) =>
        entry.status !== 'not_applicable' &&
        Boolean(entry.review_date) &&
        entry.review_date! < today,
    );

    const openActions = actions.filter(
      (action) =>
        action.status === 'open' ||
        action.status === 'in_progress' ||
        action.status === 'blocked',
    );

    const overdueActions = actions.filter(
      (action) =>
        Boolean(action.due_date) &&
        action.due_date! < today &&
        action.status !== 'resolved' &&
        action.status !== 'closed',
    );

    const resolvedActions = actions.filter(
      (action) =>
        action.status === 'resolved' || action.status === 'closed',
    ).length;

    const priorityCounts = {
      critical: entries.filter((entry) => entry.priority === 'critical').length,
      high: entries.filter((entry) => entry.priority === 'high').length,
      medium: entries.filter((entry) => entry.priority === 'medium').length,
      low: entries.filter((entry) => entry.priority === 'low').length,
    };

    const actionPriorityCounts = {
      critical: actions.filter((action) => action.priority === 'critical').length,
      high: actions.filter((action) => action.priority === 'high').length,
      medium: actions.filter((action) => action.priority === 'medium').length,
      low: actions.filter((action) => action.priority === 'low').length,
    };

    return {
      applicableCount: applicableEntries.length,
      compliant,
      nonCompliant,
      inProgress,
      notStarted,
      notApplicable,
      complianceRate,
      overdueReviews,
      openActions,
      overdueActions,
      resolvedActions,
      priorityCounts,
      actionPriorityCounts,
    };
  }, [entries, actions, today]);

  const checkUser = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace('/login');
        return;
      }

      setUserEmail(data.user.email || '');
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
        error instanceof Error ? error.message : 'Could not load workspaces.',
      );
    } finally {
      setWorkspaceLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces]);

  const fetchReportData = useCallback(async () => {
    if (!workspaceId) {
      setEntries([]);
      setActions([]);
      return;
    }

    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const query = `workspaceId=${encodeURIComponent(workspaceId)}`;

      const [registerResponse, actionsResponse] = await Promise.all([
        fetch(`/api/compliance-register?${query}`, { headers }),
        fetch(`/api/corrective-actions?${query}`, { headers }),
      ]);

      const [registerResult, actionsResult] = await Promise.all([
        registerResponse.json(),
        actionsResponse.json(),
      ]);

      if (!registerResponse.ok) {
        throw new Error(
          registerResult.error || 'Could not load compliance register.',
        );
      }

      if (!actionsResponse.ok) {
        throw new Error(
          actionsResult.error || 'Could not load corrective actions.',
        );
      }

      setEntries(registerResult.entries || []);
      setActions(actionsResult.actions || []);
      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not load report data.',
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchReportData();
  }, [fetchReportData]);

  const handleWorkspaceChange = (id: string) => {
    setWorkspaceId(id);
    setEntries([]);
    setActions([]);

    if (userEmail) {
      localStorage.setItem(`selectedWorkspace:${userEmail}`, id);
    }
  };

  const exportRegisterCsv = () => {
    const rows: unknown[][] = [
      ['Compliance Register Report'],
      ['Workspace', currentWorkspace?.name || ''],
      ['Generated', new Date().toLocaleString()],
      [],
      [
        'Requirement',
        'Framework',
        'Category',
        'Status',
        'Priority',
        'Responsible Person',
        'Review Date',
        'Description',
        'Notes',
      ],
      ...entries.map((entry) => [
        entry.title,
        entry.framework,
        entry.category,
        label(entry.status),
        label(entry.priority),
        entry.responsible_person || '',
        entry.review_date || '',
        entry.description || '',
        entry.notes || '',
      ]),
    ];

    downloadCsv('compliance-register-report.csv', rows);
    toast.success('Compliance register CSV exported.');
  };

  const exportActionsCsv = () => {
    const rows: unknown[][] = [
      ['Corrective Actions Report'],
      ['Workspace', currentWorkspace?.name || ''],
      ['Generated', new Date().toLocaleString()],
      [],
      [
        'Action',
        'Status',
        'Priority',
        'Assigned To',
        'Due Date',
        'Description',
        'Resolution Notes',
      ],
      ...actions.map((action) => [
        action.title,
        label(action.status),
        label(action.priority),
        action.assigned_to || '',
        action.due_date || '',
        action.description || '',
        action.resolution_notes || '',
      ]),
    ];

    downloadCsv('corrective-actions-report.csv', rows);
    toast.success('Corrective actions CSV exported.');
  };

  const exportSummaryCsv = () => {
    const rows: unknown[][] = [
      ['Compliance Summary Report'],
      ['Workspace', currentWorkspace?.name || ''],
      ['Generated', new Date().toLocaleString()],
      [],
      ['Metric', 'Value'],
      ['Total requirements', entries.length],
      ['Applicable requirements', metrics.applicableCount],
      ['Compliant requirements', metrics.compliant],
      ['Non-compliant requirements', metrics.nonCompliant],
      ['In progress requirements', metrics.inProgress],
      ['Not started requirements', metrics.notStarted],
      ['Not applicable requirements', metrics.notApplicable],
      ['Compliance rate (%)', metrics.complianceRate],
      ['Overdue reviews', metrics.overdueReviews.length],
      ['Total corrective actions', actions.length],
      ['Open corrective actions', metrics.openActions.length],
      ['Overdue corrective actions', metrics.overdueActions.length],
      ['Resolved or closed actions', metrics.resolvedActions],
      [],
      ['Register priority', 'Count'],
      ['Critical', metrics.priorityCounts.critical],
      ['High', metrics.priorityCounts.high],
      ['Medium', metrics.priorityCounts.medium],
      ['Low', metrics.priorityCounts.low],
      [],
      ['Action priority', 'Count'],
      ['Critical', metrics.actionPriorityCounts.critical],
      ['High', metrics.actionPriorityCounts.high],
      ['Medium', metrics.actionPriorityCounts.medium],
      ['Low', metrics.actionPriorityCounts.low],
    ];

    downloadCsv('compliance-summary-report.csv', rows);
    toast.success('Compliance summary CSV exported.');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-emerald-400">
        Verifying session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <style jsx global>{`
        @media print {
          @page {
            size: auto;
            margin: 14mm;
          }

          html,
          body {
            background: #fff !important;
            color: #111 !important;
          }

          body {
            font-size: 10pt;
          }

          .no-print {
            display: none !important;
          }

          .report-shell,
          .report-shell section,
          .report-shell article {
            background: #fff !important;
            color: #111 !important;
            border-color: #ddd !important;
            box-shadow: none !important;
          }

          .report-shell .text-zinc-100,
          .report-shell .text-zinc-300,
          .report-shell .text-zinc-400,
          .report-shell .text-zinc-500,
          .report-shell .text-emerald-400,
          .report-shell .text-red-400,
          .report-shell .text-amber-400,
          .report-shell .text-orange-400,
          .report-shell .text-blue-400 {
            color: #111 !important;
          }

          .report-table {
            width: 100%;
            border-collapse: collapse;
          }

          .report-table th,
          .report-table td {
            border: 1px solid #ccc !important;
            padding: 5px !important;
            color: #111 !important;
            overflow-wrap: anywhere;
          }

          .report-table th {
            background: #eee !important;
          }

          .report-section {
            break-inside: avoid;
            margin-bottom: 18px;
          }

          .report-shell {
            max-width: none !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <header className="no-print sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">
              ComplianceTracker
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
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

      <main className="report-shell mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-emerald-400">
              GOVERNANCE & OVERSIGHT
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              Compliance Reports
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Review compliance health, monitor remediation progress, and
              export a report for your selected workspace.
            </p>
            {lastUpdated && (
              <p className="mt-2 text-xs text-zinc-500">
                Data refreshed: {lastUpdated}
              </p>
            )}
          </div>

          <div className="no-print flex flex-wrap gap-2">
            <button
              onClick={() => void fetchReportData()}
              disabled={loading || !workspaceId}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-emerald-500 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>

            <button
              onClick={exportSummaryCsv}
              disabled={loading || !workspaceId}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-emerald-500 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Summary CSV
            </button>

            <button
              onClick={() => window.print()}
              disabled={loading || !workspaceId}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Save as PDF
            </button>
          </div>
        </section>

        <section className="no-print rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">
            Workspace
          </label>
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
              You need access to a workspace before generating compliance
              reports.
            </p>
          </section>
        )}

        {workspaceId && (
          <>
            <section className="report-section rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Report overview</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Workspace: {currentWorkspace?.name || 'Selected workspace'}
                  </p>
                </div>
                <p className="text-sm text-zinc-400">
                  Report date: {formatDate(today)}
                </p>
              </div>

              {loading && (
                <p className="mt-4 text-sm text-emerald-400">
                  Updating report data...
                </p>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                  title="Compliance rate"
                  value={`${metrics.complianceRate}%`}
                  description={`${metrics.compliant} compliant of ${metrics.applicableCount} applicable requirements`}
                  icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />}
                />
                <SummaryCard
                  title="Total requirements"
                  value={entries.length}
                  description={`${metrics.notApplicable} marked not applicable`}
                  icon={<ClipboardCheck className="h-5 w-5 text-zinc-300" />}
                />
                <SummaryCard
                  title="Non-compliant"
                  value={metrics.nonCompliant}
                  description="Requirements currently marked non-compliant"
                  icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
                />
                <SummaryCard
                  title="Overdue reviews"
                  value={metrics.overdueReviews.length}
                  description="Applicable requirements with past review dates"
                  icon={<Clock className="h-5 w-5 text-amber-400" />}
                />
                <SummaryCard
                  title="Open actions"
                  value={metrics.openActions.length}
                  description="Open, in-progress, or blocked actions"
                  icon={<ListTodo className="h-5 w-5 text-blue-400" />}
                />
                <SummaryCard
                  title="Overdue actions"
                  value={metrics.overdueActions.length}
                  description="Unresolved actions past their due date"
                  icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
                />
                <SummaryCard
                  title="Resolved actions"
                  value={metrics.resolvedActions}
                  description="Actions resolved or closed"
                  icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                />
                <SummaryCard
                  title="In progress"
                  value={metrics.inProgress}
                  description="Requirements currently being addressed"
                  icon={<Clock className="h-5 w-5 text-amber-400" />}
                />
              </div>
            </section>

            <section className="report-section rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="text-lg font-semibold">Requirement status</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Breakdown of compliance register entries.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { title: 'Compliant', value: metrics.compliant, color: 'text-emerald-400' },
                  { title: 'Non-compliant', value: metrics.nonCompliant, color: 'text-red-400' },
                  { title: 'In progress', value: metrics.inProgress, color: 'text-amber-400' },
                  { title: 'Not started', value: metrics.notStarted, color: 'text-zinc-300' },
                  { title: 'Not applicable', value: metrics.notApplicable, color: 'text-blue-400' },
                ].map((item) => (
                  <article
                    key={item.title}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <p className="text-sm text-zinc-400">{item.title}</p>
                    <p className={`mt-2 text-2xl font-bold ${item.color}`}>
                      {item.value}
                    </p>
                  </article>
                ))}
              </div>

              <h4 className="mt-6 font-medium">Requirement priority</h4>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(metrics.priorityCounts).map(([priority, count]) => (
                  <div
                    key={priority}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <p className={`text-sm ${priorityClass(priority)}`}>
                      {label(priority)}
                    </p>
                    <p className="mt-2 text-xl font-semibold">{count}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="report-section rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Corrective actions</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Remediation status and priority across this workspace.
                  </p>
                </div>
                <button
                  onClick={exportActionsCsv}
                  disabled={loading}
                  className="no-print flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:border-emerald-500 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Export actions CSV
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { title: 'Open', value: actions.filter((action) => action.status === 'open').length },
                  { title: 'In progress', value: actions.filter((action) => action.status === 'in_progress').length },
                  { title: 'Blocked', value: actions.filter((action) => action.status === 'blocked').length },
                  { title: 'Resolved', value: actions.filter((action) => action.status === 'resolved').length },
                  { title: 'Closed', value: actions.filter((action) => action.status === 'closed').length },
                ].map((item) => (
                  <article
                    key={item.title}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <p className="text-sm text-zinc-400">{item.title}</p>
                    <p className="mt-2 text-2xl font-bold">{item.value}</p>
                  </article>
                ))}
              </div>

              <h4 className="mt-6 font-medium">Action priority</h4>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(metrics.actionPriorityCounts).map(([priority, count]) => (
                  <div
                    key={priority}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <p className={`text-sm ${priorityClass(priority)}`}>
                      {label(priority)}
                    </p>
                    <p className="mt-2 text-xl font-semibold">{count}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="report-section rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Compliance register details</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    {entries.length} requirement(s)
                  </p>
                </div>
                <button
                  onClick={exportRegisterCsv}
                  disabled={loading}
                  className="no-print flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:border-emerald-500 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Export register CSV
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="report-table w-full min-w-[850px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="px-3 py-3 font-medium">Requirement</th>
                      <th className="px-3 py-3 font-medium">Framework</th>
                      <th className="px-3 py-3 font-medium">Category</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">Priority</th>
                      <th className="px-3 py-3 font-medium">Responsible</th>
                      <th className="px-3 py-3 font-medium">Review date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-zinc-800/70">
                        <td className="px-3 py-3 font-medium">{entry.title}</td>
                        <td className="px-3 py-3">{entry.framework}</td>
                        <td className="px-3 py-3">{entry.category}</td>
                        <td className={`px-3 py-3 ${statusClass(entry.status)}`}>
                          {label(entry.status)}
                        </td>
                        <td className={`px-3 py-3 ${priorityClass(entry.priority)}`}>
                          {label(entry.priority)}
                        </td>
                        <td className="px-3 py-3">{entry.responsible_person || 'Unassigned'}</td>
                        <td className="px-3 py-3">
                          {formatDate(entry.review_date)}
                          {entry.review_date && entry.review_date < today && entry.status !== 'not_applicable' && (
                            <span className="mt-1 block text-xs text-red-400">Overdue</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {entries.length === 0 && !loading && (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                          No compliance requirements found for this workspace.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="report-section rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="text-lg font-semibold">Corrective action details</h3>
              <p className="mt-1 text-sm text-zinc-400">
                {actions.length} action(s)
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="report-table w-full min-w-[750px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="px-3 py-3 font-medium">Action</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">Priority</th>
                      <th className="px-3 py-3 font-medium">Assigned to</th>
                      <th className="px-3 py-3 font-medium">Due date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actions.map((action) => {
                      const overdue =
                        Boolean(action.due_date) &&
                        action.due_date! < today &&
                        action.status !== 'resolved' &&
                        action.status !== 'closed';

                      return (
                        <tr key={action.id} className="border-b border-zinc-800/70">
                          <td className="px-3 py-3 font-medium">{action.title}</td>
                          <td className={`px-3 py-3 ${statusClass(action.status)}`}>
                            {label(action.status)}
                          </td>
                          <td className={`px-3 py-3 ${priorityClass(action.priority)}`}>
                            {label(action.priority)}
                          </td>
                          <td className="px-3 py-3">{action.assigned_to || 'Unassigned'}</td>
                          <td className="px-3 py-3">
                            {formatDate(action.due_date)}
                            {overdue && (
                              <span className="mt-1 block text-xs text-red-400">Overdue</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {actions.length === 0 && !loading && (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                          No corrective actions found for this workspace.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="report-section rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="font-semibold">Report definitions</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-400">
                <li>
                  Compliance rate = compliant requirements divided by all
                  requirements except those marked not applicable.
                </li>
                <li>
                  Overdue reviews are applicable requirements with a review date
                  before today, regardless of their current status.
                </li>
                <li>
                  Open actions include open, in-progress, and blocked actions.
                </li>
                <li>
                  Overdue actions have a due date before today and are not
                  resolved or closed.
                </li>
                <li>
                  This report reflects the records available when the data was
                  last refreshed. Refresh before exporting to capture recent changes.
                </li>
              </ul>
            </section>
          </>
        )}

        <footer className="no-print pb-4 text-center text-xs text-zinc-600">
          <FileText className="mr-1 inline h-3.5 w-3.5" />
          ComplianceTracker · Workspace report
        </footer>
      </main>
    </div>
  );
}
