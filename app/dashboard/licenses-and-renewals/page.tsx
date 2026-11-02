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
  CalendarDays,
  FileText,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  HeartPulse,
  Award,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { toast } from 'sonner';
import { supabase, getAuthHeaders } from '@/lib/supabase-client';

const CATEGORIES = [
  { value: 'business_license', label: 'Business Licenses & Permits', short: 'Licenses & Permits', icon: Building2 },
  { value: 'insurance', label: 'Insurance Renewals', short: 'Insurance', icon: HeartPulse },
  { value: 'certification', label: 'Certification Renewals', short: 'Certifications', icon: Award },
] as const;

const STATUSES = [
  'active',
  'in_progress',
  'renewed',
  'expired',
  'cancelled',
] as const;

type Category = (typeof CATEGORIES)[number]['value'];
type Status = (typeof STATUSES)[number];

type Workspace = {
  id: string;
  name: string;
  type: string;
  role: string;
};

type RenewalRecord = {
  id: string;
  workspace_id: string;
  created_by: string;
  category: Category;
  name: string;
  reference_number: string | null;
  issuer: string | null;
  jurisdiction: string | null;
  renewal_type: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  renewal_deadline: string | null;
  responsible_person: string | null;
  status: Status;
  source_document_id: string | null;
  notes: string | null;
  completion_notes: string | null;
  renewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type RenewalForm = {
  category: Category;
  name: string;
  reference_number: string;
  issuer: string;
  jurisdiction: string;
  renewal_type: string;
  issue_date: string;
  expiration_date: string;
  renewal_deadline: string;
  responsible_person: string;
  status: Status;
  notes: string;
  completion_notes: string;
};

const EMPTY_FORM: RenewalForm = {
  category: 'business_license',
  name: '',
  reference_number: '',
  issuer: '',
  jurisdiction: '',
  renewal_type: '',
  issue_date: '',
  expiration_date: '',
  renewal_deadline: '',
  responsible_person: '',
  status: 'active',
  notes: '',
  completion_notes: '',
};

const inputClass =
  'w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500';

const labelClass = 'mb-1.5 block text-sm font-medium text-zinc-300';

function titleCase(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(value: string | null) {
  if (!value) return 'Not set';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function daysUntil(value: string | null) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function recordStatus(record: RenewalRecord): Status {
  if (record.status === 'renewed' || record.status === 'cancelled') {
    return record.status;
  }

  const days = daysUntil(record.expiration_date);

  if (days !== null && days < 0) return 'expired';
  if (record.status === 'in_progress') return 'in_progress';

  return record.status;
}

function statusStyle(status: string) {
  switch (status) {
    case 'active':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    case 'renewed':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
    case 'in_progress':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    case 'expired':
      return 'border-red-500/30 bg-red-500/10 text-red-300';
    default:
      return 'border-zinc-700 bg-zinc-800 text-zinc-400';
  }
}

export default function LicensesAndRenewalsPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [records, setRecords] = useState<RenewalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RenewalRecord | null>(null);
  const [form, setForm] = useState<RenewalForm>(EMPTY_FORM);
  const [canManage, setCanManage] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      const { data, error } = await supabase.auth.getUser();

      if (cancelled) return;

      if (error || !data.user) {
        router.replace('/signin');
        return;
      }

      setUserEmail(data.user.email || '');
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [router]);

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

      const savedId = localStorage.getItem(`selectedWorkspace:${userEmail}`);
      const selected = loaded.find((item) => item.id === savedId);
      const personal = loaded.find((item) => item.type === 'personal');

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

  const fetchRecords = useCallback(async () => {
    if (!workspaceId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/licenses-and-renewals?workspaceId=${encodeURIComponent(workspaceId)}`,
        { headers },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not load renewal records.');
      }

      setRecords(result.records || []);

      const role = result.role || '';
      setCanManage(['owner', 'admin', 'member'].includes(role));
      setCanDelete(['owner', 'admin'].includes(role));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not load renewal records.',
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (workspaceId && userEmail) {
      localStorage.setItem(`selectedWorkspace:${userEmail}`, workspaceId);
    }
  }, [workspaceId, userEmail]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const status = recordStatus(record);
      const matchesCategory =
        categoryFilter === 'all' || record.category === categoryFilter;
      const matchesStatus =
        statusFilter === 'all' || status === statusFilter;

      const searchable = [
        record.name,
        record.reference_number,
        record.issuer,
        record.jurisdiction,
        record.responsible_person,
        record.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        matchesCategory &&
        matchesStatus &&
        (!query || searchable.includes(query))
      );
    });
  }, [records, search, categoryFilter, statusFilter]);

  const summary = useMemo(() => {
    const active = records.filter((record) => {
      const status = recordStatus(record);
      return status === 'active' || status === 'in_progress';
    }).length;

    const upcoming = records.filter((record) => {
      const status = recordStatus(record);
      const days = daysUntil(record.expiration_date);
      return (
        status !== 'renewed' &&
        status !== 'cancelled' &&
        days !== null &&
        days >= 0 &&
        days <= 30
      );
    }).length;

    const expired = records.filter(
      (record) => recordStatus(record) === 'expired',
    ).length;

    const renewed = records.filter(
      (record) => record.status === 'renewed',
    ).length;

    return { total: records.length, active, upcoming, expired, renewed };
  }, [records]);

  const statusChartData = useMemo(() => {
    const statuses: Status[] = [
      'active',
      'in_progress',
      'renewed',
      'expired',
      'cancelled',
    ];

    return statuses
      .map((status) => ({
        status,
        name: titleCase(status),
        value: records.filter(
          (record) => recordStatus(record) === status,
        ).length,
      }))
      .filter((item) => item.value > 0);
  }, [records]);

  const categoryChartData = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category: category.value,
        name: category.short,
        count: records.filter(
          (record) => record.category === category.value,
        ).length,
      })).filter((item) => item.count > 0),
    [records],
  );

  const upcomingRecords = useMemo(
    () =>
      records
        .filter((record) => {
          const status = recordStatus(record);
          const days = daysUntil(record.expiration_date);

          return (
            status !== 'renewed' &&
            status !== 'cancelled' &&
            days !== null &&
            days <= 30
          );
        })
        .sort((a, b) => {
          const daysA = daysUntil(a.expiration_date) ?? Infinity;
          const daysB = daysUntil(b.expiration_date) ?? Infinity;
          return daysA - daysB;
        })
        .slice(0, 5),
    [records],
  );

  const statusChartColors: Record<Status, string> = {
    active: '#34d399',
    in_progress: '#fbbf24',
    renewed: '#60a5fa',
    expired: '#f87171',
    cancelled: '#71717a',
  };

  function handleStatusChartClick(data: unknown) {
    if (!data || typeof data !== 'object' || !('status' in data)) return;

    const status = data.status;

    if (
      typeof status !== 'string' ||
      !STATUSES.includes(status as Status)
    ) {
      return;
    }

    setStatusFilter((current) => current === status ? 'all' : status);
  }

  function handleCategoryChartClick(data: unknown) {
    if (!data || typeof data !== 'object' || !('category' in data)) return;

    const category = data.category;

    if (
      typeof category !== 'string' ||
      !CATEGORIES.some((item) => item.value === category)
    ) {
      return;
    }

    setCategoryFilter((current) => current === category ? 'all' : category);
  }

  function openCreate() {
    setEditingRecord(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  }

  function openEdit(record: RenewalRecord) {
    setEditingRecord(record);
    setForm({
      category: record.category,
      name: record.name || '',
      reference_number: record.reference_number || '',
      issuer: record.issuer || '',
      jurisdiction: record.jurisdiction || '',
      renewal_type: record.renewal_type || '',
      issue_date: record.issue_date || '',
      expiration_date: record.expiration_date || '',
      renewal_deadline: record.renewal_deadline || '',
      responsible_person: record.responsible_person || '',
      status: record.status,
      notes: record.notes || '',
      completion_notes: record.completion_notes || '',
    });
    setIsModalOpen(true);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspaceId) {
      toast.error('Select a workspace first.');
      return;
    }

    if (!form.name.trim()) {
      toast.error('Enter a name for this record.');
      return;
    }

    if (
      form.issue_date &&
      form.expiration_date &&
      form.issue_date > form.expiration_date
    ) {
      toast.error('The issue date cannot be after the expiration date.');
      return;
    }

    setSaving(true);

    try {
      const headers = {
        ...(await getAuthHeaders()),
        'Content-Type': 'application/json',
      };

      const payload = {
        ...form,
        workspace_id: workspaceId,
        ...(editingRecord ? { id: editingRecord.id } : {}),
      };

      const response = await fetch('/api/licenses-and-renewals', {
        method: editingRecord ? 'PATCH' : 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not save the record.');
      }

      toast.success(
        editingRecord ? 'Renewal record updated.' : 'Renewal record created.',
      );
      setIsModalOpen(false);
      setEditingRecord(null);
      setForm(EMPTY_FORM);
      await fetchRecords();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save the record.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record: RenewalRecord) {
    if (!canDelete) {
      toast.error('Only workspace owners and admins can delete records.');
      return;
    }

    if (!window.confirm(`Delete "${record.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/licenses-and-renewals?id=${encodeURIComponent(record.id)}&workspaceId=${encodeURIComponent(workspaceId)}`,
        { method: 'DELETE', headers },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not delete the record.');
      }

      toast.success('Renewal record deleted.');
      await fetchRecords();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not delete the record.',
      );
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/signin');
  }

  const selectedWorkspace = workspaces.find(
    (workspace) => workspace.id === workspaceId,
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className="rounded-lg border border-zinc-800 p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold">Licenses &amp; Renewals</h1>
              <p className="hidden text-xs text-zinc-500 sm:block">
                Business licenses, insurance, and certifications
              </p>
            </div>
          </div>
          <button
            onClick={() => void handleSignOut()}
            className="flex items-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              Business compliance
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Licenses &amp; Renewals
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Keep essential business licenses, insurance policies, and
              certifications organized so important renewal dates do not slip
              through the cracks.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:min-w-64">
            <label className={labelClass} htmlFor="workspace-select">
              Workspace
            </label>
            <select
              id="workspace-select"
              className={inputClass}
              value={workspaceId}
              disabled={workspaceLoading}
              onChange={(event) => setWorkspaceId(event.target.value)}
            >
              <option value="">
                {workspaceLoading ? 'Loading workspaces...' : 'Select workspace'}
              </option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: 'Total records', value: summary.total, icon: FileText, color: 'text-zinc-200' },
            { label: 'Active', value: summary.active, icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Due in 30 days', value: summary.upcoming, icon: Clock, color: 'text-amber-400' },
            { label: 'Expired', value: summary.expired, icon: AlertTriangle, color: 'text-red-400' },
            { label: 'Renewed', value: summary.renewed, icon: ShieldCheck, color: 'text-blue-400' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-400 sm:text-sm">{item.label}</span>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <section className="mb-8 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Renewal Insights</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Status, category, and deadline insights for {selectedWorkspace?.name || 'the selected workspace'}.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h4 className="font-semibold">Status Distribution</h4>
              <p className="mt-1 text-xs text-zinc-500">
                Select a status below to filter records.
              </p>

              {statusChartData.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
                  No renewal records to display.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="46%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {statusChartData.map((item) => (
                        <Cell
                          key={item.status}
                          fill={statusChartColors[item.status]}
                          stroke={statusFilter === item.status ? '#fafafa' : '#18181b'}
                          strokeWidth={statusFilter === item.status ? 3 : 1}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: '1px solid #3f3f46',
                        borderRadius: '12px',
                        color: '#f4f4f5',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}

              <div className="flex flex-wrap gap-3">
                {statusChartData.map((item) => (
                  <button
                    key={item.status}
                    type="button"
                    onClick={() =>
                      setStatusFilter((current) =>
                        current === item.status ? 'all' : item.status,
                      )
                    }
                    className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs transition ${
                      statusFilter === item.status
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:bg-zinc-800/60'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: statusChartColors[item.status] }}
                    />
                    {item.name}: {item.value}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h4 className="font-semibold">Records by Category</h4>
              <p className="mt-1 text-xs text-zinc-500">
                Select a category below to filter records.
              </p>

              {categoryChartData.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
                  No category data to display.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={categoryChartData}
                    layout="vertical"
                    margin={{ top: 8, right: 20, bottom: 8, left: 8 }}
                  >
                    <CartesianGrid
                      stroke="#3f3f46"
                      strokeDasharray="3 3"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      stroke="#a1a1aa"
                      fontSize={12}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={115}
                      stroke="#a1a1aa"
                      fontSize={11}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: '1px solid #3f3f46',
                        borderRadius: '12px',
                        color: '#f4f4f5',
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name="Records"
                      fill="#34d399"
                      radius={[0, 5, 5, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                {categoryChartData.map((item) => (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() =>
                      setCategoryFilter((current) =>
                        current === item.category ? 'all' : item.category,
                      )
                    }
                    className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                      categoryFilter === item.category
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {item.name}: {item.count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h4 className="font-semibold">Upcoming &amp; Overdue Renewals</h4>
            <p className="mt-1 text-xs text-zinc-500">
              The five nearest deadlines, including expired records that need attention.
            </p>

            {upcomingRecords.length === 0 ? (
              <div className="flex min-h-24 items-center justify-center text-sm text-zinc-500">
                No upcoming or overdue expirations found.
              </div>
            ) : (
              <div className="mt-4 divide-y divide-zinc-800">
                {upcomingRecords.map((record) => {
                  const days = daysUntil(record.expiration_date);
                  const category = CATEGORIES.find(
                    (item) => item.value === record.category,
                  );

                  return (
                    <div
                      key={record.id}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-200">
                          {record.name}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {category?.short || titleCase(record.category)} · Expires {formatDate(record.expiration_date)}
                        </p>
                      </div>
                      <span className={`shrink-0 text-xs ${
                        days !== null && days < 0
                          ? 'text-red-400'
                          : days === 0
                            ? 'text-amber-300'
                            : 'text-zinc-400'
                      }`}>
                        {days !== null && days < 0
                          ? `${Math.abs(days)} days overdue`
                          : days === 0
                            ? 'Expires today'
                            : days === null
                              ? 'Date unavailable'
                              : `${days} days remaining`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex flex-col gap-4 border-b border-zinc-800 p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-lg font-semibold">Renewal records</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'}
                  {selectedWorkspace ? ` in ${selectedWorkspace.name}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void fetchRecords()}
                  disabled={loading || !workspaceId}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-3 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                {canManage && (
                  <button
                    onClick={openCreate}
                    disabled={!workspaceId}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add record
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  className={`${inputClass} pl-9`}
                  placeholder="Search records..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search renewal records"
                />
              </div>
              <select
                className={inputClass}
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                aria-label="Filter by category"
              >
                <option value="all">All categories</option>
                {CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              <select
                className={inputClass}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {titleCase(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading || workspaceLoading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-zinc-500">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
              <p className="text-sm">Loading renewal records...</p>
            </div>
          ) : !workspaceId ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <Building2 className="mb-3 h-8 w-8 text-zinc-600" />
              <p className="font-medium">No workspace selected</p>
              <p className="mt-1 text-sm text-zinc-500">
                Select a workspace to manage its renewal records.
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <CalendarDays className="h-7 w-7" />
              </div>
              <h4 className="text-lg font-semibold">
                {records.length ? 'No matching records' : 'Start tracking renewals'}
              </h4>
              <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                {records.length
                  ? 'Try changing your search or filters.'
                  : 'Add a business license, insurance policy, or certification to keep its important dates in one place.'}
              </p>
              {!records.length && canManage && (
                <button
                  onClick={openCreate}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
                >
                  <Plus className="h-4 w-4" />
                  Add your first record
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-800 bg-zinc-950/60 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-5 py-4 font-medium">Record</th>
                      <th className="px-5 py-4 font-medium">Category</th>
                      <th className="px-5 py-4 font-medium">Expiration</th>
                      <th className="px-5 py-4 font-medium">Renewal deadline</th>
                      <th className="px-5 py-4 font-medium">Status</th>
                      <th className="px-5 py-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {filteredRecords.map((record) => {
                      const category = CATEGORIES.find((item) => item.value === record.category);
                      const Icon = category?.icon || ShieldCheck;
                      const status = recordStatus(record);
                      const days = daysUntil(record.expiration_date);

                      return (
                        <tr key={record.id} className="transition hover:bg-zinc-800/30">
                          <td className="px-5 py-4">
                            <div className="font-medium text-zinc-100">{record.name}</div>
                            <div className="mt-1 text-xs text-zinc-500">
                              {[record.issuer, record.reference_number].filter(Boolean).join(' · ') || 'No issuer or reference'}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-2 text-zinc-300">
                              <Icon className="h-4 w-4 text-zinc-500" />
                              {category?.short || titleCase(record.category)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-zinc-200">{formatDate(record.expiration_date)}</div>
                            {days !== null && status !== 'renewed' && status !== 'cancelled' && (
                              <div className={`mt-1 text-xs ${days < 0 ? 'text-red-400' : days <= 30 ? 'text-amber-400' : 'text-zinc-500'}`}>
                                {days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? 'Expires today' : `${days} days remaining`}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-zinc-400">
                            {formatDate(record.renewal_deadline)}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyle(status)}`}>
                              {titleCase(status)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1">
                              {canManage && (
                                <button
                                  onClick={() => openEdit(record)}
                                  aria-label={`Edit ${record.name}`}
                                  className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-emerald-400"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => void handleDelete(record)}
                                  aria-label={`Delete ${record.name}`}
                                  className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
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

              <div className="divide-y divide-zinc-800 md:hidden">
                {filteredRecords.map((record) => {
                  const category = CATEGORIES.find((item) => item.value === record.category);
                  const Icon = category?.icon || ShieldCheck;
                  const status = recordStatus(record);
                  const days = daysUntil(record.expiration_date);

                  return (
                    <article key={record.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-emerald-400">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="break-words font-medium">{record.name}</h4>
                            <p className="mt-1 text-xs text-zinc-500">
                              {category?.short || titleCase(record.category)}
                            </p>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-1 text-xs ${statusStyle(status)}`}>
                          {titleCase(status)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-zinc-500">Expiration</p>
                          <p className="mt-1 text-zinc-200">{formatDate(record.expiration_date)}</p>
                          {days !== null && status !== 'renewed' && status !== 'cancelled' && (
                            <p className={`mt-1 text-xs ${days < 0 ? 'text-red-400' : days <= 30 ? 'text-amber-400' : 'text-zinc-500'}`}>
                              {days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? 'Expires today' : `${days} days remaining`}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Renewal deadline</p>
                          <p className="mt-1 text-zinc-200">{formatDate(record.renewal_deadline)}</p>
                        </div>
                        {record.issuer && (
                          <div className="col-span-2">
                            <p className="text-xs text-zinc-500">Issuer</p>
                            <p className="mt-1 text-zinc-300">{record.issuer}</p>
                          </div>
                        )}
                      </div>

                      {(canManage || canDelete) && (
                        <div className="mt-4 flex gap-2">
                          {canManage && (
                            <button
                              onClick={() => openEdit(record)}
                              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => void handleDelete(record)}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-900/60 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <p className="mt-4 text-xs leading-5 text-zinc-600">
          Renewal status and expiration dates are based on the records you enter.
          Automated email reminders will be connected separately.
        </p>
      </main>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setIsModalOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="renewal-modal-title"
            className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-5 sm:p-6">
              <div>
                <h3 id="renewal-modal-title" className="text-xl font-semibold">
                  {editingRecord ? 'Edit renewal record' : 'Add a renewal record'}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Enter the details you have. You can update this record later.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                aria-label="Close form"
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="renewal-category">Category *</label>
                  <select
                    id="renewal-category"
                    className={inputClass}
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value as Category })}
                    required
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="renewal-name">Record name *</label>
                  <input
                    id="renewal-name"
                    className={inputClass}
                    placeholder="e.g. Business operating license"
                    maxLength={200}
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="renewal-issuer">Issuing authority / provider</label>
                  <input
                    id="renewal-issuer"
                    className={inputClass}
                    placeholder="e.g. City licensing department"
                    value={form.issuer}
                    onChange={(event) => setForm({ ...form, issuer: event.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="renewal-reference">License / policy / certificate number</label>
                  <input
                    id="renewal-reference"
                    className={inputClass}
                    placeholder="Reference number"
                    value={form.reference_number}
                    onChange={(event) => setForm({ ...form, reference_number: event.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="renewal-jurisdiction">Jurisdiction / location</label>
                  <input
                    id="renewal-jurisdiction"
                    className={inputClass}
                    placeholder="e.g. State or municipality"
                    value={form.jurisdiction}
                    onChange={(event) => setForm({ ...form, jurisdiction: event.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="renewal-type">Renewal type</label>
                  <input
                    id="renewal-type"
                    className={inputClass}
                    placeholder="e.g. Annual, every 3 years"
                    value={form.renewal_type}
                    onChange={(event) => setForm({ ...form, renewal_type: event.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="renewal-issue-date">Issue / start date</label>
                  <input
                    id="renewal-issue-date"
                    type="date"
                    className={inputClass}
                    value={form.issue_date}
                    onChange={(event) => setForm({ ...form, issue_date: event.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="renewal-expiration">Expiration date</label>
                  <input
                    id="renewal-expiration"
                    type="date"
                    className={inputClass}
                    value={form.expiration_date}
                    onChange={(event) => setForm({ ...form, expiration_date: event.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="renewal-deadline">Renewal / filing deadline</label>
                  <input
                    id="renewal-deadline"
                    type="date"
                    className={inputClass}
                    value={form.renewal_deadline}
                    onChange={(event) => setForm({ ...form, renewal_deadline: event.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="renewal-responsible">Responsible person</label>
                  <input
                    id="renewal-responsible"
                    className={inputClass}
                    placeholder="Person responsible for renewal"
                    value={form.responsible_person}
                    onChange={(event) => setForm({ ...form, responsible_person: event.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="renewal-status">Status</label>
                  <select
                    id="renewal-status"
                    className={inputClass}
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: event.target.value as Status })}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {titleCase(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="renewal-notes">Notes</label>
                  <textarea
                    id="renewal-notes"
                    className={`${inputClass} min-h-24 resize-y`}
                    placeholder="Requirements, contact information, or renewal instructions..."
                    maxLength={10000}
                    value={form.notes}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  />
                </div>

                {form.status === 'renewed' && (
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="renewal-completion-notes">Renewal completion notes</label>
                    <textarea
                      id="renewal-completion-notes"
                      className={`${inputClass} min-h-20 resize-y`}
                      placeholder="Confirmation number, date submitted, or other completion details..."
                      maxLength={10000}
                      value={form.completion_notes}
                      onChange={(event) => setForm({ ...form, completion_notes: event.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse justify-end gap-3 border-t border-zinc-800 bg-zinc-950/40 p-5 sm:flex-row sm:px-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {saving ? 'Saving...' : editingRecord ? 'Save changes' : 'Create record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
