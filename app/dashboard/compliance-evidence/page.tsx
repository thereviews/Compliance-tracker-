'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  FileText,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CalendarClock,
  BadgeCheck,
  XCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { toast } from 'sonner';
import { supabase, getAuthHeaders } from '@/lib/supabase-client';

type Workspace = {
  id: string;
  name: string;
  type: string;
  role: string;
};

type Vendor = {
  id: string;
  name: string;
};

type Evidence = {
  id: string;
  workspace_id: string;
  vendor_id: string;
  document_id: string;
  evidence_type: string;
  framework: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  verification_status: string;
  notes: string | null;
  created_at: string;
  vendors: { name: string } | null;
  compliance_documents: {
    id: string;
    document_type: string | null;
    file_path: string;
    status: string | null;
  } | null;
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

function verificationStyle(status: string) {
  switch (status) {
    case 'verified':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    case 'rejected':
      return 'border-red-500/30 bg-red-500/10 text-red-400';
    case 'under_review':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
    case 'self_reported':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
    default:
      return 'border-zinc-700 bg-zinc-800 text-zinc-400';
  }
}

function expirationInfo(value: string | null) {
  if (!value) {
    return { text: 'No expiration date', style: 'text-zinc-400' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiration = new Date(`${value}T00:00:00`);
  const days = Math.ceil(
    (expiration.getTime() - today.getTime()) / 86400000
  );

  if (Number.isNaN(expiration.getTime())) {
    return { text: 'Invalid date', style: 'text-zinc-400' };
  }

  if (days < 0) {
    return {
      text: `Expired ${Math.abs(days)} day(s) ago`,
      style: 'text-red-400',
    };
  }

  if (days === 0) {
    return { text: 'Expires today', style: 'text-amber-400' };
  }

  if (days <= 30) {
    return {
      text: `Expires in ${days} day(s)`,
      style: 'text-amber-400',
    };
  }

  return { text: `Valid until ${dateLabel(value)}`, style: 'text-emerald-400' };
}

function ComplianceEvidenceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userEmail, setUserEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingPdf, setOpeningPdf] = useState<string | null>(null);

  const [editingEvidence, setEditingEvidence] = useState<Evidence | null>(null);
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [editVendorId, setEditVendorId] = useState('');
  const [editEvidenceType, setEditEvidenceType] = useState('certificate');
  const [editFramework, setEditFramework] = useState('');
  const [editIssueDate, setEditIssueDate] = useState('');
  const [editExpirationDate, setEditExpirationDate] = useState('');
  const [editVerificationStatus, setEditVerificationStatus] = useState('unverified');
  const [editNotes, setEditNotes] = useState('');

  const currentWorkspace = workspaces.find(
    (workspace) => workspace.id === workspaceId
  );

  const checkUser = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      router.replace('/signin');
      return;
    }

    setUserEmail(user.email || '');
    setAuthLoading(false);
  }, [router]);

  useEffect(() => {
    void checkUser();
  }, [checkUser]);

  const fetchWorkspaces = useCallback(async () => {
    if (!userEmail) return;

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

      const selected = loaded.find((item) => item.id === savedId);
      const personal = loaded.find((item) => item.type === 'personal');
      const fallback = selected || personal || loaded[0];

      setWorkspaceId(fallback?.id || '');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not load workspaces'
      );
    }
  }, [userEmail]);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces]);

  const fetchData = useCallback(async () => {
    if (!workspaceId) {
      setVendors([]);
      setEvidence([]);
      setVendorId('');
      return;
    }

    setLoading(true);

    try {
      const [vendorResult, headers] = await Promise.all([
        supabase
          .from('vendors')
          .select('id, name')
          .eq('workspace_id', workspaceId)
          .order('name'),
        getAuthHeaders(),
      ]);

      if (vendorResult.error) throw vendorResult.error;

      const loadedVendors: Vendor[] = vendorResult.data || [];
      setVendors(loadedVendors);

      const response = await fetch(
        `/api/compliance-evidence?workspaceId=${encodeURIComponent(
          workspaceId
        )}`,
        { headers }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not load compliance evidence');
      }

      setEvidence(result.evidence || []);

      setVendorId((current) =>
        current && loadedVendors.some((vendor) => vendor.id === current)
          ? current
          : ''
      );
    } catch (error) {
      console.error('COMPLIANCE EVIDENCE LOAD ERROR:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not load compliance evidence'
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleWorkspaceChange = (id: string) => {
    setWorkspaceId(id);
    setVendorId('');
    localStorage.setItem(`selectedWorkspace:${userEmail}`, id);
  };

  const filteredEvidence = useMemo(
    () =>
      evidence.filter(
        (item) =>
          (!vendorId || item.vendor_id === vendorId) &&
          (!verificationFilter ||
            item.verification_status === verificationFilter)
      ),
    [evidence, vendorId, verificationFilter]
  );

  const dashboardStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const next30Days = new Date(today);
    next30Days.setDate(next30Days.getDate() + 30);

    const expired = filteredEvidence.filter((item) => {
      if (!item.expiration_date) return false;
      const expiration = new Date(`${item.expiration_date}T00:00:00`);
      return !Number.isNaN(expiration.getTime()) && expiration < today;
    });

    const expiringSoon = filteredEvidence.filter((item) => {
      if (!item.expiration_date) return false;
      const expiration = new Date(`${item.expiration_date}T00:00:00`);
      return (
        !Number.isNaN(expiration.getTime()) &&
        expiration >= today &&
        expiration <= next30Days
      );
    });

    const verified = filteredEvidence.filter(
      (item) => item.verification_status === 'verified'
    );

    const needsVerification = filteredEvidence.filter(
      (item) =>
        item.verification_status === 'unverified' ||
        item.verification_status === 'under_review' ||
        item.verification_status === 'self_reported'
    );

    return {
      total: filteredEvidence.length,
      verified: verified.length,
      needsVerification: needsVerification.length,
      expired: expired.length,
      expiringSoon: expiringSoon.length,
    };
  }, [filteredEvidence]);

  const verificationChartData = useMemo(() => {
    const statuses = [
      { status: 'verified', name: 'Verified', color: '#34d399' },
      { status: 'under_review', name: 'Under review', color: '#fbbf24' },
      { status: 'unverified', name: 'Unverified', color: '#f87171' },
      { status: 'self_reported', name: 'Self-reported', color: '#60a5fa' },
      { status: 'rejected', name: 'Rejected', color: '#c084fc' },
    ];

    return statuses.map((entry) => ({
      ...entry,
      count: filteredEvidence.filter(
        (item) => item.verification_status === entry.status
      ).length,
    }));
  }, [filteredEvidence]);

  const attentionEvidence = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const next30Days = new Date(today);
    next30Days.setDate(next30Days.getDate() + 30);

    return filteredEvidence
      .filter((item) => {
        const awaitingVerification =
          item.verification_status === 'unverified' ||
          item.verification_status === 'under_review' ||
          item.verification_status === 'self_reported' ||
          item.verification_status === 'rejected';

        if (awaitingVerification) return true;
        if (!item.expiration_date) return false;

        const expiration = new Date(`${item.expiration_date}T00:00:00`);

        return (
          !Number.isNaN(expiration.getTime()) &&
          expiration <= next30Days
        );
      })
      .sort((a, b) => {
        const aDate = a.expiration_date || '9999-12-31';
        const bDate = b.expiration_date || '9999-12-31';
        return aDate.localeCompare(bDate);
      })
      .slice(0, 5);
  }, [filteredEvidence]);

  const expiredCount = dashboardStats.expired;
  const needsVerification = dashboardStats.needsVerification;

  const openPdf = async (item: Evidence) => {
    const path = item.compliance_documents?.file_path;

    if (!path) {
      toast.error('The PDF storage path is missing.');
      return;
    }

    setOpeningPdf(item.id);

    try {
      const { data, error } = await supabase.storage
        .from('compliance-files')
        .createSignedUrl(path, 60);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Could not open the PDF');
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not open the PDF'
      );
    } finally {
      setOpeningPdf(null);
    }
  };

  const startEditingEvidence = (item: Evidence) => {
    setEditingEvidence(item);
    setEditVendorId(item.vendor_id);
    setEditEvidenceType(item.evidence_type);
    setEditFramework(item.framework || '');
    setEditIssueDate(item.issue_date || '');
    setEditExpirationDate(item.expiration_date || '');
    setEditVerificationStatus(item.verification_status);
    setEditNotes(item.notes || '');
  };

  // Open the requested evidence record when arriving from the main Dashboard.
  useEffect(() => {
    const documentId = searchParams.get('documentId');

    if (!documentId || loading || evidence.length === 0) return;

    const matchingEvidence = evidence.find(
      (item) => item.document_id === documentId
    );

    if (matchingEvidence) {
      startEditingEvidence(matchingEvidence);
    } else {
      toast.error('The matching compliance evidence record could not be found.');
    }

    router.replace('/dashboard/compliance-evidence');
  }, [searchParams, evidence, loading, router]);

  const closeEvidenceEditor = () => {
    if (savingEvidence) return;
    setEditingEvidence(null);
  };

  const saveEvidenceChanges = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingEvidence || !workspaceId) return;

    if (!editVendorId) {
      toast.error('Please select a vendor.');
      return;
    }

    if (
      editIssueDate &&
      editExpirationDate &&
      editExpirationDate < editIssueDate
    ) {
      toast.error('Expiration date cannot be before issue date.');
      return;
    }

    setSavingEvidence(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/compliance-evidence', {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evidenceId: editingEvidence.id,
          workspaceId,
          vendorId: editVendorId,
          evidenceType: editEvidenceType,
          framework: editFramework,
          issueDate: editIssueDate,
          expirationDate: editExpirationDate,
          verificationStatus: editVerificationStatus,
          notes: editNotes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not update evidence.');
      }

      toast.success('Compliance evidence updated.');
      setEditingEvidence(null);
      await fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not update compliance evidence.'
      );
    } finally {
      setSavingEvidence(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-emerald-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>

            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                  Vendor risk &amp; governance
                </p>
                <h1 className="text-2xl font-bold sm:text-3xl">
                  Compliance Evidence
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm text-zinc-400">
              Review vendor certificates, audit reports, security policies,
              verification status, and upcoming expiration dates.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/compliance-assessments"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-emerald-500 hover:text-emerald-400"
            >
              <ShieldCheck className="h-4 w-4" />
              Assessments
            </Link>

            <button
              type="button"
              onClick={() => void fetchData()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-emerald-500 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-400">Total evidence</p>
              <FileText className="h-5 w-5 text-blue-400" />
            </div>
            <p className="mt-3 text-3xl font-bold">{dashboardStats.total}</p>
            <p className="mt-1 text-xs text-zinc-500">Records in the current view</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-400">Verified</p>
              <BadgeCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="mt-3 text-3xl font-bold">{dashboardStats.verified}</p>
            <p className="mt-1 text-xs text-zinc-500">Evidence marked as verified</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-400">Needs verification</p>
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <p className="mt-3 text-3xl font-bold">{dashboardStats.needsVerification}</p>
            <p className="mt-1 text-xs text-zinc-500">Unverified, self-reported or under review</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-400">Expired evidence</p>
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <p className="mt-3 text-3xl font-bold">{dashboardStats.expired}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {dashboardStats.expiringSoon} expiring within 30 days
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-400">Workspace</span>
              <select
                value={workspaceId}
                onChange={(event) => handleWorkspaceChange(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name} · {label(workspace.role)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-zinc-400">Vendor</span>
              <select
                value={vendorId}
                onChange={(event) => setVendorId(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">All vendors</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {currentWorkspace && (
            <p className="mt-3 text-xs text-zinc-500">
              {currentWorkspace.name} · {label(currentWorkspace.role)}
            </p>
          )}
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4">
              <h2 className="font-semibold">Verification distribution</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Select a category to filter the evidence table.
              </p>
            </div>

            {filteredEvidence.length === 0 ? (
              <div className="flex min-h-56 items-center justify-center text-sm text-zinc-500">
                No evidence matches the current filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
                <div className="h-56 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={verificationChartData.filter((item) => item.count > 0)}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={3}
                        onClick={(entry) => {
                          const selected = verificationChartData.find(
                            (item) => item.name === entry?.name
                          );
                          if (selected) {
                            setVerificationFilter((current) =>
                              current === selected.status ? '' : selected.status
                            );
                          }
                        }}
                        className="cursor-pointer"
                      >
                        {verificationChartData
                          .filter((item) => item.count > 0)
                          .map((item) => (
                            <Cell key={item.status} fill={item.color} />
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
                </div>

                <div className="space-y-3">
                  {verificationChartData.map((item) => (
                    <button
                      key={item.status}
                      type="button"
                      onClick={() =>
                        setVerificationFilter((current) =>
                          current === item.status ? '' : item.status
                        )
                      }
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                        verificationFilter === item.status
                          ? 'bg-zinc-800 ring-1 ring-emerald-500/50'
                          : 'hover:bg-zinc-800/60'
                      }`}
                    >
                      <span className="flex items-center gap-2 text-zinc-300">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </span>
                      <span className="font-semibold text-zinc-100">
                        {item.count}
                      </span>
                    </button>
                  ))}

                  {verificationFilter && (
                    <button
                      type="button"
                      onClick={() => setVerificationFilter('')}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Clear verification filter
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Evidence requiring attention</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Review outstanding verification and expiration issues.
                </p>
              </div>
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
            </div>

            {attentionEvidence.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                <p className="mt-3 text-sm font-medium text-zinc-200">
                  Nothing needs attention
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  No outstanding verification or upcoming expiration issues found.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {attentionEvidence.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const row = document.getElementById(`evidence-${item.id}`);
                      row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-left transition hover:border-emerald-500/50"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-100">
                          {label(item.evidence_type)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {item.vendors?.name || 'Unknown vendor'}
                        </p>
                      </div>
                      <span
                        className={`inline-flex w-fit rounded-full border px-2 py-1 text-xs ${verificationStyle(item.verification_status)}`}
                      >
                        {label(item.verification_status)}
                      </span>
                    </div>
                    <p className={`mt-2 text-xs ${expirationInfo(item.expiration_date).style}`}>
                      Expiration: {expirationInfo(item.expiration_date).text}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="flex flex-col gap-2 border-b border-zinc-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold">Uploaded evidence</h2>
            <p className="text-xs text-zinc-500">
              {filteredEvidence.length} record(s)
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 px-5 py-16 text-sm text-zinc-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading evidence...
            </div>
          ) : filteredEvidence.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <FileText className="mx-auto h-10 w-10 text-zinc-600" />
              <h3 className="mt-4 font-semibold">No evidence found</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Upload a certificate or report using the dashboard&apos;s
                Upload Document button and select Compliance Evidence.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
              >
                Go to dashboard
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-zinc-950/60 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-5 py-4">Evidence</th>
                    <th className="px-5 py-4">Vendor</th>
                    <th className="px-5 py-4">Framework</th>
                    <th className="px-5 py-4">Verification</th>
                    <th className="px-5 py-4">Expiration</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredEvidence.map((item) => {
                    const expiration = expirationInfo(item.expiration_date);

                    return (
                      <tr id={`evidence-${item.id}`} key={item.id} className="transition hover:bg-zinc-800/30">
                        <td className="px-5 py-4">
                          <p className="font-medium text-zinc-100">
                            {label(item.evidence_type)}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Issue date: {dateLabel(item.issue_date)}
                          </p>
                          {item.notes && (
                            <p className="mt-2 max-w-xs whitespace-pre-wrap text-xs text-zinc-400">
                              {item.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-zinc-300">
                          {item.vendors?.name || 'Unknown vendor'}
                        </td>
                        <td className="px-5 py-4 text-zinc-300">
                          {item.framework || 'Not specified'}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${verificationStyle(item.verification_status)}`}
                          >
                            {label(item.verification_status)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-zinc-300">
                            {dateLabel(item.expiration_date)}
                          </p>
                          <p className={`mt-1 text-xs ${expiration.style}`}>
                            {expiration.text}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingEvidence(item)}
                              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 transition hover:border-emerald-500 hover:text-emerald-400"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => void openPdf(item)}
                              disabled={openingPdf === item.id}
                              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 transition hover:border-emerald-500 hover:text-emerald-400 disabled:opacity-50"
                            >
                              {openingPdf === item.id ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ExternalLink className="h-3.5 w-3.5" />
                              )}
                              View PDF
                            </button>
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

        {editingEvidence && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-evidence-title"
              className="my-8 w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                <div>
                  <h2 id="edit-evidence-title" className="font-semibold text-zinc-100">
                    Edit Compliance Evidence
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Update the evidence details without uploading the PDF again.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEvidenceEditor}
                  disabled={savingEvidence}
                  className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
                >
                  Close
                </button>
              </div>

              <form onSubmit={saveEvidenceChanges} className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Vendor
                  </label>
                  <select
                    required
                    value={editVendorId}
                    onChange={(e) => setEditVendorId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200"
                  >
                    <option value="">Select a vendor...</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Evidence Type
                  </label>
                  <select
                    required
                    value={editEvidenceType}
                    onChange={(e) => setEditEvidenceType(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200"
                  >
                    <option value="certificate">Certificate</option>
                    <option value="audit_report">Audit Report</option>
                    <option value="questionnaire">Questionnaire</option>
                    <option value="security_policy">Security Policy</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Compliance Framework
                  </label>
                  <select
                    value={editFramework}
                    onChange={(e) => setEditFramework(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200"
                  >
                    <option value="">Not specified</option>
                    <option value="SOC 2">SOC 2</option>
                    <option value="ISO 27001">ISO 27001</option>
                    <option value="GDPR">GDPR</option>
                    <option value="HIPAA">HIPAA</option>
                    <option value="PCI DSS">PCI DSS</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-400">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      value={editIssueDate}
                      onChange={(e) => setEditIssueDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-400">
                      Expiration Date
                    </label>
                    <input
                      type="date"
                      value={editExpirationDate}
                      min={editIssueDate || undefined}
                      onChange={(e) => setEditExpirationDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Verification Status
                  </label>
                  <select
                    required
                    value={editVerificationStatus}
                    onChange={(e) => setEditVerificationStatus(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200"
                  >
                    <option value="unverified">Unverified</option>
                    <option value="self_reported">Self-reported</option>
                    <option value="under_review">Under review</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Notes
                  </label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    maxLength={10000}
                    rows={3}
                    placeholder="Add certification details or review notes..."
                    className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200"
                  />
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Existing PDF
                  </p>
                  <p className="mt-1 truncate text-sm text-zinc-300">
                    {editingEvidence.compliance_documents?.file_path
                      ? editingEvidence.compliance_documents.file_path.split('/').pop()
                      : 'No PDF file is linked to this record.'}
                  </p>
                  {editingEvidence.compliance_documents?.file_path && (
                    <button
                      type="button"
                      onClick={() => void openPdf(editingEvidence)}
                      disabled={openingPdf === editingEvidence.id}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:border-emerald-500 hover:text-emerald-400 disabled:opacity-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View current PDF
                    </button>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeEvidenceEditor}
                    disabled={savingEvidence}
                    className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEvidence || !editVendorId}
                    className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {savingEvidence ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <p className="mt-5 flex items-center gap-2 text-xs text-zinc-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Evidence access follows your selected workspace membership.
        </p>
      </div>
    </main>
  );
}

export default function ComplianceEvidencePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
        </main>
      }
    >
      <ComplianceEvidenceContent />
    </Suspense>
  );
}
