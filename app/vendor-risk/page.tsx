'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldAlert,
  Plus,
  RefreshCw,
  Save,
  X,
  Trash2,
  AlertTriangle,
  Clock,
  LogOut,
  ClipboardCheck,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase, getAuthHeaders } from '@/lib/supabase-client';

const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
const STATUSES = ['draft', 'completed'] as const;

const RISK_FIELDS = [
  { key: 'data_sensitivity', label: 'Data sensitivity', description: 'Sensitivity of information the vendor handles.' },
  { key: 'system_access', label: 'System access', description: 'Access to your systems, networks, or accounts.' },
  { key: 'business_criticality', label: 'Business criticality', description: 'Impact if the vendor becomes unavailable.' },
  { key: 'regulatory_exposure', label: 'Regulatory exposure', description: 'Potential regulatory or legal consequences.' },
  { key: 'security_controls', label: 'Security controls', description: 'Strength of the vendor’s security safeguards.' },
  { key: 'incident_history', label: 'Incident history', description: 'Severity and history of security incidents.' },
] as const;

type RiskLevel = (typeof RISK_LEVELS)[number];
type RiskField = (typeof RISK_FIELDS)[number]['key'];
type AssessmentStatus = (typeof STATUSES)[number];

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

type Assessment = {
  id: string;
  workspace_id: string;
  vendor_id: string;
  assessment_date: string;
  next_review_date: string | null;
  data_sensitivity: RiskLevel;
  system_access: RiskLevel;
  business_criticality: RiskLevel;
  regulatory_exposure: RiskLevel;
  security_controls: RiskLevel;
  incident_history: RiskLevel;
  overall_risk: RiskLevel;
  findings: string | null;
  remediation_actions: string | null;
  assessment_status: AssessmentStatus;
  assessed_by: string;
  created_at: string;
  updated_at: string;
  vendors?: { name: string } | null;
};

type AssessmentForm = {
  assessment_date: string;
  next_review_date: string;
  data_sensitivity: RiskLevel;
  system_access: RiskLevel;
  business_criticality: RiskLevel;
  regulatory_exposure: RiskLevel;
  security_controls: RiskLevel;
  incident_history: RiskLevel;
  findings: string;
  remediation_actions: string;
  assessment_status: AssessmentStatus;
};

const today = () => new Date().toLocaleDateString('en-CA');

const EMPTY_FORM: AssessmentForm = {
  assessment_date: today(),
  next_review_date: '',
  data_sensitivity: 'medium',
  system_access: 'medium',
  business_criticality: 'medium',
  regulatory_exposure: 'medium',
  security_controls: 'medium',
  incident_history: 'medium',
  findings: '',
  remediation_actions: '',
  assessment_status: 'draft',
};

function label(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function dateLabel(value: string | null | undefined) {
  if (!value) return 'Not set';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString();
}

function riskStyle(risk: string) {
  switch (risk) {
    case 'critical':
      return 'border-red-500/40 bg-red-500/15 text-red-300';
    case 'high':
      return 'border-orange-500/40 bg-orange-500/15 text-orange-300';
    case 'medium':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
    case 'low':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    default:
      return 'border-zinc-700 bg-zinc-800 text-zinc-400';
  }
}

function overallRisk(values: Record<string, string>): RiskLevel {
  const rank: Record<RiskLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };

  return RISK_FIELDS.reduce<RiskLevel>((highest, field) => {
    const current = values[field.key] as RiskLevel;
    return rank[current] > rank[highest] ? current : highest;
  }, 'low');
}

export default function VendorRiskPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);
  const [form, setForm] = useState<AssessmentForm>(EMPTY_FORM);

  const currentWorkspace = workspaces.find((item) => item.id === workspaceId);
  const canCreate = ['owner', 'admin', 'member'].includes(currentWorkspace?.role || '');
  const canDelete = ['owner', 'admin'].includes(currentWorkspace?.role || '');

  const checkUser = useCallback(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();

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

      if (!response.ok) throw new Error(result.error || 'Could not load workspaces');

      const loaded: Workspace[] = result.workspaces || [];
      setWorkspaces(loaded);

      const savedId = localStorage.getItem(`selectedWorkspace:${userEmail}`);
      const selected = loaded.find((item) => item.id === savedId);
      const personal = loaded.find((item) => item.type === 'personal');
      const fallback = selected || personal || loaded[0];

      setWorkspaceId(fallback?.id || '');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load workspaces');
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
    setAssessments([]);
    setFormOpen(false);
    setEditing(null);
    localStorage.setItem(`selectedWorkspace:${userEmail}`, id);
  };

  const fetchData = useCallback(async () => {
    if (!workspaceId) {
      setVendors([]);
      setAssessments([]);
      return;
    }

    setLoading(true);

    try {
      const [
        { data: vendorRows, error: vendorError },
        headers,
      ] = await Promise.all([
        supabase
          .from('vendors')
          .select('id, name')
          .eq('workspace_id', workspaceId)
          .order('name'),
        getAuthHeaders(),
      ]);

      if (vendorError) throw vendorError;

      const response = await fetch(
        `/api/vendor-risk-assessments?workspaceId=${encodeURIComponent(workspaceId)}`,
        { headers },
      );

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Could not load risk assessments');

      const loadedVendors: Vendor[] = vendorRows || [];
      setVendors(loadedVendors);
      setAssessments(result.assessments || []);

      setVendorId((current) =>
        current && loadedVendors.some((vendor) => vendor.id === current)
          ? current
          : loadedVendors[0]?.id || '',
      );
    } catch (error) {
      console.error('VENDOR RISK PAGE LOAD ERROR:', error);
      toast.error(error instanceof Error ? error.message : 'Could not load risk assessments');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const vendorAssessments = assessments.filter(
    (assessment) => assessment.vendor_id === vendorId,
  );

  const latestAssessment = vendorAssessments[0];
  const highRiskCount = vendorAssessments.filter(
    (assessment) => ['high', 'critical'].includes(assessment.overall_risk),
  ).length;
  const completedCount = vendorAssessments.filter(
    (assessment) => assessment.assessment_status === 'completed',
  ).length;
  const reviewDueCount = vendorAssessments.filter((assessment) =>
    assessment.next_review_date
      ? assessment.next_review_date <= today()
      : false,
  ).length;

  const openNewAssessment = () => {
    if (!vendorId || !canCreate) return;
    setEditing(null);
    setForm({ ...EMPTY_FORM, assessment_date: today() });
    setFormOpen(true);
  };

  const openEditAssessment = (assessment: Assessment) => {
    setEditing(assessment);
    setForm({
      assessment_date: assessment.assessment_date || today(),
      next_review_date: assessment.next_review_date || '',
      data_sensitivity: assessment.data_sensitivity,
      system_access: assessment.system_access,
      business_criticality: assessment.business_criticality,
      regulatory_exposure: assessment.regulatory_exposure,
      security_controls: assessment.security_controls,
      incident_history: assessment.incident_history,
      findings: assessment.findings || '',
      remediation_actions: assessment.remediation_actions || '',
      assessment_status: assessment.assessment_status,
    });
    setFormOpen(true);
  };

  const saveAssessment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!workspaceId || !vendorId || !canCreate) return;

    setSaving(true);

    try {
      const headers = await getAuthHeaders();
      const payload = {
        workspace_id: workspaceId,
        vendor_id: vendorId,
        assessment_date: form.assessment_date || today(),
        next_review_date: form.next_review_date || null,
        data_sensitivity: form.data_sensitivity,
        system_access: form.system_access,
        business_criticality: form.business_criticality,
        regulatory_exposure: form.regulatory_exposure,
        security_controls: form.security_controls,
        incident_history: form.incident_history,
        findings: form.findings.trim() || null,
        remediation_actions: form.remediation_actions.trim() || null,
        assessment_status: form.assessment_status,
      };

      const requestBody: Record<string, unknown> = editing
        ? { ...payload, id: editing.id }
        : payload;

      if (editing) {
        delete requestBody.vendor_id;
      }

      const response = await fetch('/api/vendor-risk-assessments', {
        method: editing ? 'PATCH' : 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save assessment');

      toast.success(editing ? 'Risk assessment updated' : 'Risk assessment created');
      setFormOpen(false);
      setEditing(null);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save assessment');
    } finally {
      setSaving(false);
    }
  };

  const deleteAssessment = async (assessment: Assessment) => {
    if (!canDelete || !workspaceId) return;

    if (!window.confirm(`Delete this risk assessment for ${assessment.vendors?.name || 'this vendor'}?`)) {
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/vendor-risk-assessments?id=${encodeURIComponent(assessment.id)}&workspaceId=${encodeURIComponent(workspaceId)}`,
        { method: 'DELETE', headers },
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not delete assessment');

      toast.success('Risk assessment deleted');
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete assessment');
    }
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
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight">ComplianceTracker</h1>
              <p className="hidden text-xs text-zinc-500 sm:block">Vendor risk management</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-emerald-500 hover:text-emerald-400">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <button onClick={logout} title="Sign out" className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-red-400">VENDOR RISK & GOVERNANCE</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Vendor risk assessments</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Assess vendor risk across six categories, document findings, and track remediation and review dates.
            </p>
          </div>
          <button onClick={() => void fetchData()} disabled={loading || !workspaceId} className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-emerald-500 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <label className="mb-2 block text-sm font-medium text-zinc-300">Workspace</label>
          <select
            value={workspaceId}
            onChange={(event) => handleWorkspaceChange(event.target.value)}
            disabled={workspaceLoading || workspaces.length === 0}
            className="w-full max-w-xl rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-emerald-500"
          >
            {workspaces.length === 0 && <option value="">No workspace available</option>}
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
            <p className="mt-2 text-sm text-zinc-400">You need access to a workspace before managing vendor risks.</p>
          </section>
        )}

        {workspaceId && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm text-zinc-400">Assessments</p>
                <p className="mt-3 text-3xl font-bold">{vendorAssessments.length}</p>
                <p className="mt-1 text-xs text-zinc-500">Selected vendor history</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm text-zinc-400">Latest overall risk</p>
                <div className="mt-3">
                  {latestAssessment ? (
                    <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${riskStyle(latestAssessment.overall_risk)}`}>
                      {label(latestAssessment.overall_risk)}
                    </span>
                  ) : <p className="text-3xl font-bold">—</p>}
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm text-zinc-400">High / critical assessments</p>
                <p className="mt-3 text-3xl font-bold">{highRiskCount}</p>
                <p className="mt-1 text-xs text-zinc-500">Across recorded assessments</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm text-zinc-400">Reviews due</p>
                <p className="mt-3 text-3xl font-bold">{reviewDueCount}</p>
                <p className="mt-1 text-xs text-zinc-500">Review date is today or earlier</p>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-zinc-300">Select vendor</label>
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
                    {vendors.length === 0 && <option value="">No vendors in this workspace</option>}
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                    ))}
                  </select>
                </div>
                {vendorId && canCreate && (
                  <button onClick={openNewAssessment} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400">
                    <Plus className="h-4 w-4" /> New assessment
                  </button>
                )}
              </div>
            </section>

            {vendors.length === 0 ? (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                <ClipboardCheck className="mx-auto h-9 w-9 text-zinc-600" />
                <h3 className="mt-3 font-semibold">No vendors yet</h3>
                <p className="mt-2 text-sm text-zinc-400">Add a vendor from the main dashboard first.</p>
                <Link href="/" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400">
                  <ArrowLeft className="h-4 w-4" /> Go to dashboard
                </Link>
              </section>
            ) : vendorAssessments.length === 0 ? (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                <ShieldAlert className="mx-auto h-9 w-9 text-zinc-600" />
                <h3 className="mt-3 font-semibold">No risk assessments yet</h3>
                <p className="mt-2 text-sm text-zinc-400">Create the first assessment for this vendor to record its risk profile.</p>
                {canCreate && (
                  <button onClick={openNewAssessment} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400">
                    <Plus className="h-4 w-4" /> Create assessment
                  </button>
                )}
              </section>
            ) : (
              <section className="space-y-4">
                {vendorAssessments.map((assessment) => (
                  <article key={assessment.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">Risk assessment</h3>
                          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${riskStyle(assessment.overall_risk)}`}>
                            {label(assessment.overall_risk)} risk
                          </span>
                          <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                            {label(assessment.assessment_status)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-400">
                          Assessed {dateLabel(assessment.assessment_date)} · Next review {dateLabel(assessment.next_review_date)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canCreate && (
                          <button onClick={() => openEditAssessment(assessment)} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-emerald-500 hover:text-emerald-400">
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => void deleteAssessment(assessment)} className="flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10">
                            <Trash2 className="h-4 w-4" /> Delete
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 border-t border-zinc-800 pt-5 sm:grid-cols-2 lg:grid-cols-3">
                      {RISK_FIELDS.map((field) => (
                        <div key={field.key} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                          <p className="text-sm font-medium text-zinc-300">{field.label}</p>
                          <p className="mt-1 text-xs leading-5 text-zinc-500">{field.description}</p>
                          <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${riskStyle(assessment[field.key])}`}>
                            {label(assessment[field.key])}
                          </span>
                        </div>
                      ))}
                    </div>

                    {assessment.findings && (
                      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <p className="text-xs font-medium text-zinc-500">Findings</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{assessment.findings}</p>
                      </div>
                    )}

                    {assessment.remediation_actions && (
                      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                        <p className="flex items-center gap-2 text-xs font-medium text-amber-300">
                          <AlertTriangle className="h-4 w-4" /> Remediation actions
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{assessment.remediation_actions}</p>
                      </div>
                    )}

                    {assessment.assessment_status === 'completed' && (
                      <p className="mt-4 flex items-center gap-2 text-xs text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" /> Assessment marked completed
                      </p>
                    )}
                  </article>
                ))}
              </section>
            )}
          </>
        )}
      </main>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-8 backdrop-blur-sm">
          <div className="my-auto w-full max-w-3xl rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 p-5">
              <div>
                <h2 className="text-lg font-semibold">{editing ? 'Edit risk assessment' : 'New vendor risk assessment'}</h2>
                <p className="mt-1 text-sm text-zinc-400">{vendors.find((vendor) => vendor.id === vendorId)?.name}</p>
              </div>
              <button onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label="Close form">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveAssessment} className="space-y-6 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-300">Assessment date</label>
                  <input type="date" required value={form.assessment_date} onChange={(event) => setForm({ ...form, assessment_date: event.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-300">Next review date</label>
                  <input type="date" value={form.next_review_date} onChange={(event) => setForm({ ...form, next_review_date: event.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500" />
                </div>
              </div>

              <section>
                <div className="mb-3">
                  <h3 className="font-semibold">Risk categories</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">Select a risk level for each category. Overall risk is calculated using the highest category rating.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {RISK_FIELDS.map((field) => (
                    <div key={field.key} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                      <label className="mb-1 block text-sm font-medium text-zinc-200">{field.label}</label>
                      <p className="mb-3 text-xs leading-5 text-zinc-500">{field.description}</p>
                      <select
                        value={form[field.key]}
                        onChange={(event) => setForm({ ...form, [field.key]: event.target.value as RiskLevel })}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500"
                      >
                        {RISK_LEVELS.map((level) => <option key={level} value={level}>{label(level)}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-400">Calculated overall risk</p>
                  <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${riskStyle(overallRisk(form as unknown as Record<string, string>))}`}>
                    {label(overallRisk(form as unknown as Record<string, string>))}
                  </span>
                </div>
              </section>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">Findings</label>
                <textarea rows={4} maxLength={20000} value={form.findings} onChange={(event) => setForm({ ...form, findings: event.target.value })} placeholder="Document identified risks, control gaps, incidents, and supporting observations..." className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500" />
                <p className="mt-1 text-right text-xs text-zinc-500">{form.findings.length}/20,000</p>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">Remediation actions</label>
                <textarea rows={4} maxLength={20000} value={form.remediation_actions} onChange={(event) => setForm({ ...form, remediation_actions: event.target.value })} placeholder="List corrective actions, responsible parties, and expected follow-up..." className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500" />
                <p className="mt-1 text-right text-xs text-zinc-500">{form.remediation_actions.length}/20,000</p>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">Assessment status</label>
                <select value={form.assessment_status} onChange={(event) => setForm({ ...form, assessment_status: event.target.value as AssessmentStatus })} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-emerald-500">
                  {STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}
                </select>
                <p className="mt-2 text-xs text-zinc-500">Use Draft while the assessment is in progress. Mark it Completed when the review is finished.</p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setFormOpen(false)} disabled={saving} className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !canCreate} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50">
                  <Save className="h-4 w-4" /> {saving ? 'Saving...' : editing ? 'Save changes' : 'Create assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
