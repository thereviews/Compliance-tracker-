'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  FileText,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
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

export default function ComplianceEvidencePage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingPdf, setOpeningPdf] = useState<string | null>(null);

  const currentWorkspace = workspaces.find(
    (workspace) => workspace.id === workspaceId
  );

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

  const filteredEvidence = evidence.filter(
    (item) => !vendorId || item.vendor_id === vendorId
  );

  const expiredCount = filteredEvidence.filter(
    (item) =>
      item.expiration_date &&
      new Date(`${item.expiration_date}T00:00:00`).getTime() <
        new Date(new Date().toDateString()).getTime()
  ).length;

  const needsVerification = filteredEvidence.filter(
    (item) =>
      item.verification_status === 'unverified' ||
      item.verification_status === 'under_review'
  ).length;

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
              href="/compliance"
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

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">Evidence records</p>
              <FileText className="h-5 w-5 text-blue-400" />
            </div>
            <p className="mt-3 text-3xl font-bold">{filteredEvidence.length}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">Expired evidence</p>
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <p className="mt-3 text-3xl font-bold">{expiredCount}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">Needs verification</p>
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <p className="mt-3 text-3xl font-bold">{needsVerification}</p>
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
                    <th className="px-5 py-4">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredEvidence.map((item) => {
                    const expiration = expirationInfo(item.expiration_date);

                    return (
                      <tr key={item.id} className="transition hover:bg-zinc-800/30">
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-5 flex items-center gap-2 text-xs text-zinc-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Evidence access follows your selected workspace membership.
        </p>
      </div>
    </main>
  );
}
