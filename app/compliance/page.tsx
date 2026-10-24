'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  Plus,
  RefreshCw,
  Save,
  X,
  Trash2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  supabase,
  getAuthHeaders,
} from '@/lib/supabase-client';

const FRAMEWORKS = [
  'SOC 2',
  'ISO 27001',
  'GDPR',
  'HIPAA',
  'PCI DSS',
] as const;

const STATUSES = [
  'not_assessed',
  'under_review',
  'compliant',
  'non_compliant',
  'expired',
] as const;

const VERIFICATION_STATUSES = [
  'unverified',
  'self_reported',
  'under_review',
  'verified',
] as const;

type Framework = (typeof FRAMEWORKS)[number];
type AssessmentStatus = (typeof STATUSES)[number];
type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

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

type EvidenceDocument = {
  id: string;
  vendor_id: string;
  document_type: string | null;
  file_path: string;
  expiration_date: string | null;
};

type Assessment = {
  id: string;
  workspace_id: string;
  vendor_id: string;
  framework: Framework;
  status: AssessmentStatus;
  verification_status: VerificationStatus;
  assessment_date: string | null;
  next_review_date: string | null;
  certificate_expiration_date: string | null;
  evidence_document_id: string | null;
  notes: string | null;
  created_at: string;
  vendors?: { name: string } | null;
};

type AssessmentForm = {
  framework: Framework;
  status: AssessmentStatus;
  verification_status: VerificationStatus;
  assessment_date: string;
  next_review_date: string;
  certificate_expiration_date: string;
  evidence_document_id: string;
  notes: string;
};

const EMPTY_FORM: AssessmentForm = {
  framework: 'SOC 2',
  status: 'not_assessed',
  verification_status: 'unverified',
  assessment_date: '',
  next_review_date: '',
  certificate_expiration_date: '',
  evidence_document_id: '',
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
    case 'verified':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';

    case 'non_compliant':
    case 'expired':
      return 'border-red-500/30 bg-red-500/10 text-red-400';

    case 'under_review':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-400';

    case 'self_reported':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-400';

    default:
      return 'border-zinc-700 bg-zinc-800 text-zinc-400';
  }
}

export default function CompliancePage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [evidenceDocuments, setEvidenceDocuments] = useState<
    EvidenceDocument[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Assessment | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AssessmentForm>(EMPTY_FORM);

  const currentWorkspace = workspaces.find(
    (workspace) => workspace.id === workspaceId
  );

  const canCreate = ['owner', 'admin', 'member'].includes(
    currentWorkspace?.role || ''
  );

  const canDelete = ['owner', 'admin'].includes(
    currentWorkspace?.role || ''
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

      const selected = loaded.find((item) => item.id === savedId);
      const personal = loaded.find((item) => item.type === 'personal');
      const fallback = selected || personal || loaded[0];

      setWorkspaceId(fallback?.id || '');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not load workspaces'
      );
    } finally {
      setWorkspaceLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleWorkspaceChange = (id: string) => {
    setWorkspaceId(id);
    setVendorId('');
    setFormOpen(false);
    setEditing(null);

    localStorage.setItem(`selectedWorkspace:${userEmail}`, id);
  };

  const fetchData = useCallback(async () => {
    if (!workspaceId) {
      setVendors([]);
      setAssessments([]);
      setEvidenceDocuments([]);
      return;
    }

    setLoading(true);

    try {
      const [
        { data: vendorRows, error: vendorError },
        { data: documentRows, error: documentError },
        headers,
      ] = await Promise.all([
        supabase
          .from('vendors')
          .select('id, name')
          .eq('workspace_id', workspaceId)
          .order('name'),
        supabase
          .from('compliance_documents')
          .select('id, vendor_id, document_type, file_path, expiration_date')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false }),
        getAuthHeaders(),
      ]);
      if (vendorError) throw vendorError;
      if (documentError) throw documentError;

      const loadedVendors: Vendor[] = vendorRows || [];
      const loadedDocuments: EvidenceDocument[] = documentRows || [];

      const response = await fetch(
        `/api/compliance-assessments?workspaceId=${encodeURIComponent(
          workspaceId
        )}`,
        { headers }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not load assessments');
      }

      setVendors(loadedVendors);
      setEvidenceDocuments(loadedDocuments);
      setAssessments(result.assessments || []);

      setVendorId((current) => {
        if (current && loadedVendors.some((vendor) => vendor.id === current)) {
          return current;
        }

        return loadedVendors[0]?.id || '';
      });
    } catch (error) {
      console.error('COMPLIANCE PAGE LOAD ERROR:', error);

      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not load compliance information'
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const vendorAssessments = assessments.filter(
    (assessment) => assessment.vendor_id === vendorId
  );

  const assessedCount = vendorAssessments.filter(
    (assessment) => assessment.status !== 'not_assessed'
  ).length;

  const compliantCount = vendorAssessments.filter(
    (assessment) => assessment.status === 'compliant'
  ).length;

  const attentionCount = vendorAssessments.filter(
    (assessment) =>
      assessment.status === 'non_compliant' ||
      assessment.status === 'expired'
  ).length;

  const openNewAssessment = (framework: Framework) => {
    if (!vendorId || !canCreate) return;

    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      framework,
    });
    setFormOpen(true);
  };

  const openEditAssessment = (assessment: Assessment) => {
    setEditing(assessment);

    setForm({
      framework: assessment.framework,
      status: assessment.status,
      verification_status: assessment.verification_status,
      assessment_date: assessment.assessment_date || '',
      next_review_date: assessment.next_review_date || '',
      certificate_expiration_date:
        assessment.certificate_expiration_date || '',
      evidence_document_id: assessment.evidence_document_id || '',
      notes: assessment.notes || '',
    });

    setFormOpen(true);
  };

  const saveAssessment = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!workspaceId || !vendorId || !canCreate) return;

    setSaving(true);

    try {
      const headers = await getAuthHeaders();

      const payload = {
        workspace_id: workspaceId,
        vendor_id: vendorId,
        framework: form.framework,
        status: form.status,
        verification_status: form.verification_status,
        assessment_date: form.assessment_date || null,
        next_review_date: form.next_review_date || null,
        certificate_expiration_date:
          form.certificate_expiration_date || null,
        evidence_document_id: form.evidence_document_id || null,
        notes: form.notes.trim() || null,
      };

      const response = await fetch('/api/compliance-assessments', {
        method: editing ? 'PATCH' : 'POST',
        headers,
        body: JSON.stringify(
          editing
            ? {
                id: editing.id,
                workspace_id: workspaceId,
                status: form.status,
                verification_status: form.verification_status,
                assessment_date: form.assessment_date || null,
                next_review_date: form.next_review_date || null,
                certificate_expiration_date:
                  form.certificate_expiration_date || null,
                evidence_document_id: form.evidence_document_id || null,
                notes: form.notes.trim() || null,
              }
            : payload
        ),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not save assessment');
      }

      toast.success(editing ? 'Assessment updated' : 'Assessment created');

      setFormOpen(false);
      setEditing(null);

      await fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save assessment'
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteAssessment = async (assessment: Assessment) => {
    if (!canDelete || !workspaceId) return;

    const confirmed = window.confirm(
      `Delete the ${assessment.framework} assessment for this vendor?`
    );

    if (!confirmed) return;

    try {
      const headers = await getAuthHeaders();

      const response = await fetch(
        `/api/compliance-assessments?id=${encodeURIComponent(
          assessment.id
        )}&workspaceId=${encodeURIComponent(workspaceId)}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not delete assessment');
      }

      toast.success('Assessment deleted');
      await fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not delete assessment'
      );
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-emerald-400">
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
              <h1 className="font-bold tracking-tight">
                ComplianceTracker
              </h1>
              <p className="hidden text-xs text-zinc-500 sm:block">
                Vendor compliance
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
        <section>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-emerald-400">
                VENDOR RISK & GOVERNANCE
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight">
                Compliance assessments
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Track vendor compliance frameworks, verification status,
                evidence, and upcoming reviews in one place.
              </p>
            </div>

            <button
              onClick={() => void fetchData()}
              disabled={loading || !workspaceId}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-emerald-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Workspace
          </label>

          <select
            value={workspaceId}
            onChange={(event) => handleWorkspaceChange(event.target.value)}
            disabled={workspaceLoading || workspaces.length === 0}
            className="w-full max-w-xl rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-emerald-500"
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
              You need access to a workspace before managing assessments.
            </p>
          </section>
        )}

        {workspaceId && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Vendors</p>
                  <FileText className="h-5 w-5 text-zinc-500" />
                </div>
                <p className="mt-3 text-3xl font-bold">{vendors.length}</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Frameworks assessed</p>
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="mt-3 text-3xl font-bold">{assessedCount}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  For the selected vendor
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Compliant</p>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="mt-3 text-3xl font-bold">{compliantCount}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Framework assessments
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Needs attention</p>
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <p className="mt-3 text-3xl font-bold">{attentionCount}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Expired or non-compliant
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Select vendor
                  </label>

                  <select
                    value={vendorId}
                    onChange={(event) => {
                      setVendorId(event.target.value);
                      setFormOpen(false);
                      setEditing(null);
                    }}
                    disabled={vendors.length === 0}
                    className="w-full max-w-xl rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  >
                    {vendors.length === 0 && (
                      <option value="">No vendors in this workspace</option>
                    )}

                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>

                {vendorId && canCreate && (
                  <p className="text-xs text-zinc-500">
                    Role: {label(currentWorkspace?.role || 'member')}
                  </p>
                )}
              </div>
            </section>

            {vendors.length === 0 ? (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                <FileText className="mx-auto h-9 w-9 text-zinc-600" />
                <h3 className="mt-3 font-semibold">No vendors yet</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Add a vendor from the main dashboard first.
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go to dashboard
                </Link>
              </section>
            ) : (
              <section className="space-y-4">
                {FRAMEWORKS.map((framework) => {
                  const assessment = vendorAssessments.find(
                    (item) => item.framework === framework
                  );

                  return (
                    <article
                      key={framework}
                      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-3">
                            <ShieldCheck className="h-5 w-5 text-emerald-400" />
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold">
                              {framework}
                            </h3>

                            <p className="mt-1 text-sm text-zinc-400">
                              {assessment
                                ? 'Assessment recorded'
                                : 'No assessment recorded'}
                            </p>
                          </div>
                        </div>

                        {assessment ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyle(
                                assessment.status
                              )}`}
                            >
                              {label(assessment.status)}
                            </span>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyle(
                                assessment.verification_status
                              )}`}
                            >
                              {label(assessment.verification_status)}
                            </span>
                          </div>
                        ) : (
                          canCreate && (
                            <button
                              onClick={() => openNewAssessment(framework)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
                            >
                              <Plus className="h-4 w-4" />
                              Add assessment
                            </button>
                          )
                        )}
                      </div>

                      {assessment && (
                        <>
                          <div className="mt-5 grid gap-4 border-t border-zinc-800 pt-5 sm:grid-cols-3">
                            <div>
                              <p className="text-xs text-zinc-500">
                                Assessment date
                              </p>
                              <p className="mt-1 text-sm text-zinc-200">
                                {dateLabel(assessment.assessment_date)}
                              </p>
                            </div>

                            <div>
                              <p className="flex items-center gap-2 text-xs text-zinc-500">
                                <Clock className="h-3.5 w-3.5" />
                                Next review
                              </p>
                              <p className="mt-1 text-sm text-zinc-200">
                                {dateLabel(assessment.next_review_date)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-zinc-500">
                                Certificate expiry
                              </p>
                              <p className="mt-1 text-sm text-zinc-200">
                                {dateLabel(
                                  assessment.certificate_expiration_date
                                )}
                              </p>
                            </div>
                          </div>

                          {assessment.evidence_document_id && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
                              <FileText className="h-4 w-4 text-emerald-400" />
                              {evidenceDocuments.find(
                                (document) =>
                                  document.id === assessment.evidence_document_id
                              )?.document_type || 'Linked evidence document'}
                            </div>
                          )}

                          {assessment.notes && (
                            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                              <p className="text-xs font-medium text-zinc-500">
                                Notes
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                                {assessment.notes}
                              </p>
                            </div>
                          )}

                          {(canCreate || canDelete) && (
                            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-zinc-800 pt-4">
                              {canCreate && (
                                <button
                                  onClick={() => openEditAssessment(assessment)}
                                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-emerald-500 hover:text-emerald-400"
                                >
                                  Edit assessment
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  onClick={() => void deleteAssessment(assessment)}
                                  className="flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-8 backdrop-blur-sm">
          <div className="my-auto w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 p-5">
              <div>
                <h2 className="text-lg font-semibold">
                  {editing ? 'Edit assessment' : 'New compliance assessment'}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {vendors.find((vendor) => vendor.id === vendorId)?.name}
                </p>
              </div>

              <button
                onClick={() => setFormOpen(false)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                aria-label="Close form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveAssessment} className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-300">
                    Framework
                  </label>
                  <select
                    value={form.framework}
                    disabled={!!editing}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        framework: event.target.value as Framework,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500 disabled:opacity-60"
                  >
                    {FRAMEWORKS.map((framework) => (
                      <option key={framework} value={framework}>
                        {framework}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-300">
                    Compliance status
                  </label>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.value as AssessmentStatus,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {label(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm text-zinc-300">
                    Verification status
                  </label>
                  <select
                    value={form.verification_status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        verification_status:
                          event.target.value as VerificationStatus,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500"
                  >
                    {VERIFICATION_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {label(status)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Verified should be used only when the supporting evidence
                    has actually been reviewed.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-300">
                    Assessment date
                  </label>
                  <input
                    type="date"
                    value={form.assessment_date}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        assessment_date: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-300">
                    Next review date
                  </label>
                  <input
                    type="date"
                    value={form.next_review_date}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        next_review_date: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm text-zinc-300">
                    Certificate expiration date
                  </label>
                  <input
                    type="date"
                    value={form.certificate_expiration_date}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        certificate_expiration_date: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm text-zinc-300">
                    Evidence document
                  </label>
                  <select
                    value={form.evidence_document_id}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        evidence_document_id: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value="">No evidence linked</option>

                    {evidenceDocuments
                      .filter(
                        (document) =>
                          document.vendor_id === vendorId &&
                          assessments
                            .filter((assessment) => assessment.vendor_id === vendorId)
                            .every(
                              (assessment) =>
                                assessment.evidence_document_id !== document.id ||
                                assessment.id === editing?.id
                            )
                      ).map((document) => (
                        <option key={document.id} value={document.id}>
                          {document.document_type || 'Untitled document'}
                          {document.expiration_date
                            ? ` · Expires ${document.expiration_date}`
                            : ''}
                        </option>
                      ))}
                  </select>
                  <p className="mt-2 text-xs text-zinc-500">
                    Only existing documents linked to this vendor can be used
                    as evidence.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm text-zinc-300">
                    Notes
                  </label>
                  <textarea
                    rows={4}
                    maxLength={10000}
                    value={form.notes}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        notes: event.target.value,
                      })
                    }
                    placeholder="Record findings, limitations, or remediation notes..."
                    className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500"
                  />
                  <p className="mt-1 text-right text-xs text-zinc-500">
                    {form.notes.length}/10,000
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : editing ? 'Save changes' : 'Create assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
