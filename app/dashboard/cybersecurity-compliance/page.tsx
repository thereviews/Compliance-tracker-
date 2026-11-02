'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Layers3,
  ClipboardList,
  Shield,
  FolderCheck,
  AlertTriangle,
  CheckCircle2,
  Target,
  ArrowUpRight,
  Plus,
  Pencil,
  X,
  Save,
  FileText,
  Upload,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { toast } from 'sonner';
import { supabase, getAuthHeaders } from '@/lib/supabase-client';

type Workspace = {
  id: string;
  name: string;
  type: string;
  role: string;
};

type FrameworkCatalogItem = {
  key: string;
  name: string;
  version: string;
  description: string;
  requirementCount: number;
};

type FrameworkRequirement = {
  id: string;
  requirement_code: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
};

type WorkspaceFramework = {
  id: string;
  name: string;
  version: string | null;
  description: string | null;
  status: string;
  requirements: FrameworkRequirement[];
};

type SecurityControl = {
  id: string;
  workspace_id: string;
  control_code: string | null;
  title: string;
  description: string | null;
  category: string | null;
  implementation_status: 'not_started' | 'in_progress' | 'implemented' | 'not_applicable';
  effectiveness_status: 'not_assessed' | 'effective' | 'needs_improvement' | 'ineffective';
  owner: string | null;
  review_date: string | null;
  notes: string | null;
  requirementIds: string[];
  requirements: {
    id: string;
    requirement_code: string;
    title: string;
    framework: { id: string; name: string; version: string | null } | null;
  }[];
};

type SecurityEvidence = {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  description: string | null;
  evidence_date: string | null;
  expiration_date: string | null;
  verification_status: 'unverified' | 'self_reported' | 'under_review' | 'verified' | 'rejected';
  uploaded_by: string;
  created_at: string;
  updated_at?: string;
  controlIds: string[];
  controls: {
    id: string;
    title: string;
    control_code: string | null;
  }[];
};

type EvidenceForm = {
  description: string;
  evidenceDate: string;
  expirationDate: string;
  verificationStatus: SecurityEvidence['verification_status'];
  controlIds: string[];
};

const EMPTY_EVIDENCE_FORM: EvidenceForm = {
  description: '',
  evidenceDate: '',
  expirationDate: '',
  verificationStatus: 'unverified',
  controlIds: [],
};

type ControlForm = {
  title: string;
  controlCode: string;
  description: string;
  category: string;
  implementationStatus: SecurityControl['implementation_status'];
  effectivenessStatus: SecurityControl['effectiveness_status'];
  owner: string;
  reviewDate: string;
  notes: string;
  requirementIds: string[];
};

const EMPTY_CONTROL_FORM: ControlForm = {
  title: '',
  controlCode: '',
  description: '',
  category: '',
  implementationStatus: 'not_started',
  effectivenessStatus: 'not_assessed',
  owner: '',
  reviewDate: '',
  notes: '',
  requirementIds: [],
};

type Summary = {
  frameworkTotal: number;
  activeFrameworks: number;
  requirementTotal: number;
  controlTotal: number;
  implementedControls: number;
  evidenceTotal: number;
  verifiedEvidence: number;
  gapTotal: number;
  openActions: number;
  evidenceBackedControls: number;
  readiness: number;
};

const EMPTY_SUMMARY: Summary = {
  frameworkTotal: 0,
  activeFrameworks: 0,
  requirementTotal: 0,
  controlTotal: 0,
  implementedControls: 0,
  evidenceTotal: 0,
  verifiedEvidence: 0,
  gapTotal: 0,
  openActions: 0,
  evidenceBackedControls: 0,
  readiness: 0,
};

const inputClass =
  'w-full max-w-xl rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-cyan-500';

function SummaryCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: number | string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{title}</p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

export default function CybersecurityCompliancePage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [frameworkCatalog, setFrameworkCatalog] = useState<FrameworkCatalogItem[]>([]);
  const [frameworks, setFrameworks] = useState<WorkspaceFramework[]>([]);
  const [frameworksLoading, setFrameworksLoading] = useState(false);
  const [addingFramework, setAddingFramework] = useState('');
  const [controls, setControls] = useState<SecurityControl[]>([]);
  const [controlsLoading, setControlsLoading] = useState(false);

  const [evidence, setEvidence] = useState<SecurityEvidence[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [editingEvidenceId, setEditingEvidenceId] = useState<string | null>(null);
  const [evidenceForm, setEvidenceForm] = useState<EvidenceForm>({ ...EMPTY_EVIDENCE_FORM });
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [deletingEvidenceId, setDeletingEvidenceId] = useState<string | null>(null);
  const [openingEvidenceId, setOpeningEvidenceId] = useState<string | null>(null);
  const [creatingActionFor, setCreatingActionFor] = useState<string | null>(null);
  const [savingControl, setSavingControl] = useState(false);
  const [showControlForm, setShowControlForm] = useState(false);
  const [editingControlId, setEditingControlId] = useState<string | null>(null);
  const [controlForm, setControlForm] = useState<ControlForm>(EMPTY_CONTROL_FORM);

  const currentRole = workspaces.find((workspace) => workspace.id === workspaceId)?.role;
  const canManageControls = currentRole === 'owner' || currentRole === 'admin';

  const allRequirements = frameworks.flatMap((framework) =>
    framework.requirements.map((requirement) => ({
      ...requirement,
      frameworkName: framework.name,
    })),
  );

  const mappedRequirementIds = new Set(
    controls.flatMap((control) => control.requirementIds),
  );

  const unmappedRequirements = allRequirements.filter(
    (requirement) => !mappedRequirementIds.has(requirement.id),
  );

  const controlGapFindings = controls.flatMap((control) => {
    if (control.implementation_status === 'not_applicable') return [];

    const reasons: string[] = [];

    if (
      control.implementation_status === 'not_started' ||
      control.implementation_status === 'in_progress'
    ) {
      reasons.push(
        control.implementation_status === 'not_started'
          ? 'Implementation not started'
          : 'Implementation in progress',
      );
    }

    if (control.effectiveness_status === 'needs_improvement') {
      reasons.push('Effectiveness needs improvement');
    } else if (control.effectiveness_status === 'ineffective') {
      reasons.push('Control is ineffective');
    } else if (control.effectiveness_status === 'not_assessed') {
      reasons.push('Effectiveness not assessed');
    }

    const hasEvidence = evidence.some((item) =>
      item.controlIds.includes(control.id),
    );

    if (
      control.implementation_status === 'implemented' &&
      !hasEvidence
    ) {
      reasons.push('No linked evidence');
    }

    return reasons.length > 0 ? [{ control, reasons }] : [];
  });

  const gapTotal = unmappedRequirements.length + controlGapFindings.length;

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

  const fetchSummary = useCallback(async () => {
    if (!workspaceId) {
      setSummary(EMPTY_SUMMARY);
      return;
    }

    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/cybersecurity-compliance/summary?workspaceId=${encodeURIComponent(workspaceId)}`,
        { headers },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not load cybersecurity summary');
      }

      setSummary(result.summary || EMPTY_SUMMARY);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not load cybersecurity summary',
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  const fetchFrameworks = useCallback(async () => {
    if (!workspaceId) {
      setFrameworkCatalog([]);
      setFrameworks([]);
      return;
    }

    setFrameworksLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/cybersecurity-compliance/frameworks?workspaceId=${encodeURIComponent(workspaceId)}`,
        { headers },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not load frameworks');
      }

      setFrameworkCatalog(result.catalog || []);
      setFrameworks(result.frameworks || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not load frameworks',
      );
    } finally {
      setFrameworksLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchFrameworks();
  }, [fetchFrameworks]);

  const fetchControls = useCallback(async () => {
    if (!workspaceId) {
      setControls([]);
      return;
    }

    setControlsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/cybersecurity-compliance/controls?workspaceId=${encodeURIComponent(workspaceId)}`,
        { headers },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not load security controls');
      }

      setControls(result.controls || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not load security controls',
      );
    } finally {
      setControlsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchControls();
  }, [fetchControls]);

  const fetchEvidence = useCallback(async () => {
    if (!workspaceId) {
      setEvidence([]);
      return;
    }

    setEvidenceLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/cybersecurity-compliance/evidence?workspaceId=${encodeURIComponent(workspaceId)}`,
        { headers },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not load evidence records.');
      }

      setEvidence(result.evidence || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not load evidence records.',
      );
    } finally {
      setEvidenceLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchEvidence();
  }, [fetchEvidence]);

  const createGapCorrectiveAction = async ({
    key,
    title,
    description,
    controlId,
    priority = 'medium',
  }: {
    key: string;
    title: string;
    description: string;
    controlId: string | null;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }) => {
    if (!workspaceId || creatingActionFor) return;

    setCreatingActionFor(key);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/corrective-actions', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          title: `Address gap: ${title}`.slice(0, 200),
          description,
          security_control_id: controlId,
          priority,
          status: 'open',
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not create corrective action.');
      }

      toast.success('Corrective action created.');
      await fetchSummary();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not create corrective action.',
      );
    } finally {
      setCreatingActionFor(null);
    }
  };

  const addFramework = async (frameworkKey: string) => {
    if (!workspaceId || addingFramework) return;

    setAddingFramework(frameworkKey);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/cybersecurity-compliance/frameworks', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, frameworkKey }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not add framework');
      }

      toast.success(`${result.framework?.name || 'Framework'} added successfully`);
      await fetchFrameworks();
      await fetchSummary();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not add framework',
      );
    } finally {
      setAddingFramework('');
    }
  };

  const openNewControlForm = () => {
    setEditingControlId(null);
    setControlForm({ ...EMPTY_CONTROL_FORM });
    setShowControlForm(true);
  };

  const openEditControlForm = (control: SecurityControl) => {
    setEditingControlId(control.id);
    setControlForm({
      title: control.title,
      controlCode: control.control_code || '',
      description: control.description || '',
      category: control.category || '',
      implementationStatus: control.implementation_status,
      effectivenessStatus: control.effectiveness_status,
      owner: control.owner || '',
      reviewDate: control.review_date || '',
      notes: control.notes || '',
      requirementIds: [...control.requirementIds],
    });
    setShowControlForm(true);
  };

  const saveControl = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!workspaceId || !canManageControls || savingControl) return;

    if (!controlForm.title.trim()) {
      toast.error('Enter a control title.');
      return;
    }

    setSavingControl(true);
    try {
      const headers = await getAuthHeaders();
      const isEditing = Boolean(editingControlId);
      const response = await fetch('/api/cybersecurity-compliance/controls', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          ...(isEditing ? { id: editingControlId } : {}),
          title: controlForm.title,
          controlCode: controlForm.controlCode,
          description: controlForm.description,
          category: controlForm.category,
          implementationStatus: controlForm.implementationStatus,
          effectivenessStatus: controlForm.effectivenessStatus,
          owner: controlForm.owner,
          reviewDate: controlForm.reviewDate || null,
          notes: controlForm.notes,
          requirementIds: controlForm.requirementIds,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not save security control.');
      }

      toast.success(isEditing ? 'Security control updated.' : 'Security control created.');
      setShowControlForm(false);
      setEditingControlId(null);
      setControlForm({ ...EMPTY_CONTROL_FORM });
      await Promise.all([fetchControls(), fetchSummary()]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save security control.',
      );
    } finally {
      setSavingControl(false);
    }
  };

  const openNewEvidenceForm = () => {
    setEditingEvidenceId(null);
    setEvidenceForm({ ...EMPTY_EVIDENCE_FORM });
    setEvidenceFile(null);
    setShowEvidenceForm(true);
  };

  const openEditEvidenceForm = (item: SecurityEvidence) => {
    setEditingEvidenceId(item.id);
    setEvidenceForm({
      description: item.description || '',
      evidenceDate: item.evidence_date || '',
      expirationDate: item.expiration_date || '',
      verificationStatus: item.verification_status,
      controlIds: [...item.controlIds],
    });
    setEvidenceFile(null);
    setShowEvidenceForm(true);
  };

  const saveEvidence = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!workspaceId || !canManageControls || savingEvidence) return;

    if (!editingEvidenceId && !evidenceFile) {
      toast.error('Select a PDF file to upload.');
      return;
    }

    if (
      evidenceFile &&
      (evidenceFile.size === 0 ||
        evidenceFile.size > 25 * 1024 * 1024 ||
        !evidenceFile.name.toLowerCase().endsWith('.pdf') ||
        (evidenceFile.type && evidenceFile.type !== 'application/pdf'))
    ) {
      toast.error('Select a valid PDF no larger than 25 MB.');
      return;
    }

    if (
      evidenceForm.evidenceDate &&
      evidenceForm.expirationDate &&
      evidenceForm.expirationDate < evidenceForm.evidenceDate
    ) {
      toast.error('Expiration date cannot be earlier than evidence date.');
      return;
    }

    setSavingEvidence(true);
    try {
      const headers = await getAuthHeaders();
      const isEditing = Boolean(editingEvidenceId);
      let response: Response;

      if (isEditing) {
        response = await fetch('/api/cybersecurity-compliance/evidence', {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evidenceId: editingEvidenceId,
            workspaceId,
            description: evidenceForm.description,
            evidenceDate: evidenceForm.evidenceDate,
            expirationDate: evidenceForm.expirationDate,
            verificationStatus: evidenceForm.verificationStatus,
            controlIds: evidenceForm.controlIds,
          }),
        });
      } else {
        const formData = new FormData();
        formData.append('workspaceId', workspaceId);
        formData.append('file', evidenceFile as File);
        formData.append('description', evidenceForm.description);
        formData.append('evidenceDate', evidenceForm.evidenceDate);
        formData.append('expirationDate', evidenceForm.expirationDate);
        formData.append('verificationStatus', evidenceForm.verificationStatus);
        formData.append('controlIds', JSON.stringify(evidenceForm.controlIds));

        response = await fetch('/api/cybersecurity-compliance/evidence', {
          method: 'POST',
          headers,
          body: formData,
        });
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not save evidence.');
      }

      toast.success(isEditing ? 'Evidence updated.' : 'Evidence uploaded.');
      setShowEvidenceForm(false);
      setEditingEvidenceId(null);
      setEvidenceForm({ ...EMPTY_EVIDENCE_FORM });
      setEvidenceFile(null);

      await Promise.all([fetchEvidence(), fetchSummary()]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save evidence.',
      );
    } finally {
      setSavingEvidence(false);
    }
  };

  const deleteEvidence = async (item: SecurityEvidence) => {
    if (!workspaceId || !canManageControls || deletingEvidenceId) return;
    if (!window.confirm(`Delete "${item.file_name}"? This cannot be undone.`)) return;

    setDeletingEvidenceId(item.id);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/cybersecurity-compliance/evidence', {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceId: item.id,
          workspaceId,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not delete evidence.');
      }

      toast.success(
        result.storageFileRemoved === false
          ? 'Evidence record deleted, but its stored PDF could not be removed.'
          : 'Evidence deleted.',
      );
      await Promise.all([fetchEvidence(), fetchSummary()]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not delete evidence.',
      );
    } finally {
      setDeletingEvidenceId(null);
    }
  };

  const openEvidenceFile = async (item: SecurityEvidence) => {
    if (openingEvidenceId) return;

    setOpeningEvidenceId(item.id);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/cybersecurity-compliance/evidence/${encodeURIComponent(item.id)}/file`,
        { headers },
      );
      const result = await response.json();

      if (!response.ok || !result.url) {
        throw new Error(result.error || 'Could not open the evidence PDF.');
      }

      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not open the evidence PDF.',
      );
    } finally {
      setOpeningEvidenceId(null);
    }
  };

  const handleWorkspaceChange = (id: string) => {
    setWorkspaceId(id);
    setSummary(EMPTY_SUMMARY);
    localStorage.setItem(`selectedWorkspace:${userEmail}`, id);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/signin');
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-cyan-400">
        Verifying session...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen max-w-full overflow-x-hidden bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight">ComplianceTracker</h1>
              <p className="hidden text-xs text-zinc-500 sm:block">
                Cybersecurity compliance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:border-cyan-500 hover:text-cyan-400"
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

      <main className="mx-auto w-full min-w-0 max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-cyan-400">
              SECURITY GOVERNANCE
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              Cybersecurity Compliance
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Track security requirements, monitor controls, organize evidence,
              identify gaps, and prepare for assessments and audits.
            </p>
          </div>

          <button
            onClick={() => void fetchSummary()}
            disabled={loading || !workspaceId}
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-cyan-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">
            Workspace
          </label>
          <select
            value={workspaceId}
            onChange={(event) => handleWorkspaceChange(event.target.value)}
            disabled={workspaceLoading || workspaces.length === 0}
            className={inputClass}
          >
            {workspaces.length === 0 && (
              <option value="">No workspace available</option>
            )}
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name} · {workspace.role}
              </option>
            ))}
          </select>
        </section>

        {!workspaceLoading && workspaces.length === 0 && (
          <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
            <AlertTriangle className="mb-3 h-6 w-6 text-amber-400" />
            <h3 className="font-semibold">No workspace found</h3>
            <p className="mt-2 text-sm text-zinc-400">
              You need access to a workspace before managing cybersecurity
              compliance.
            </p>
          </section>
        )}

        {workspaceId && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryCard
                title="Frameworks"
                value={summary.frameworkTotal}
                detail={`${summary.activeFrameworks} active`}
                icon={<Layers3 className="h-5 w-5 text-cyan-400" />}
              />
              <SummaryCard
                title="Requirements"
                value={summary.requirementTotal}
                detail="Tracked across your frameworks"
                icon={<ClipboardList className="h-5 w-5 text-blue-400" />}
              />
              <SummaryCard
                title="Security controls"
                value={summary.controlTotal}
                detail={`${summary.implementedControls} implemented`}
                icon={<Shield className="h-5 w-5 text-emerald-400" />}
              />
              <SummaryCard
                title="Evidence records"
                value={summary.evidenceTotal}
                detail={`${summary.verifiedEvidence} verified`}
                icon={<FolderCheck className="h-5 w-5 text-violet-400" />}
              />
              <SummaryCard
                title="Identified gaps"
                value={summary.gapTotal}
                detail="Controls needing attention or evidence"
                icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}
              />
              <SummaryCard
                title="Open corrective actions"
                value={summary.openActions}
                detail="Actions linked to security controls"
                icon={<Target className="h-5 w-5 text-rose-400" />}
              />
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-semibold">Audit readiness</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Share of all controls that are implemented and have linked
                    evidence.
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-3xl font-bold text-cyan-400">
                    {summary.readiness}%
                  </p>
                  <p className="text-xs text-zinc-500">
                    {summary.evidenceBackedControls} of {summary.controlTotal}{' '}
                    controls evidence-backed
                  </p>
                </div>
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all"
                  style={{ width: `${summary.readiness}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                This is an internal progress indicator, not a certification or
                independent audit opinion.
              </p>
            </section>

            {(() => {
              const implementationData = [
                { name: 'Implemented', value: controls.filter(c => c.implementation_status === 'implemented').length, color: '#10b981' },
                { name: 'In progress', value: controls.filter(c => c.implementation_status === 'in_progress').length, color: '#06b6d4' },
                { name: 'Not started', value: controls.filter(c => c.implementation_status === 'not_started').length, color: '#f59e0b' },
                { name: 'Not applicable', value: controls.filter(c => c.implementation_status === 'not_applicable').length, color: '#71717a' },
              ];

              const effectivenessData = [
                { name: 'Effective', value: controls.filter(c => c.effectiveness_status === 'effective').length, color: '#10b981' },
                { name: 'Needs improvement', value: controls.filter(c => c.effectiveness_status === 'needs_improvement').length, color: '#f59e0b' },
                { name: 'Ineffective', value: controls.filter(c => c.effectiveness_status === 'ineffective').length, color: '#ef4444' },
                { name: 'Not assessed', value: controls.filter(c => c.effectiveness_status === 'not_assessed').length, color: '#71717a' },
              ];

              const evidenceData = [
                { name: 'Evidence-backed', value: summary.evidenceBackedControls, color: '#10b981' },
                { name: 'Missing evidence', value: Math.max(0, summary.implementedControls - summary.evidenceBackedControls), color: '#f59e0b' },
              ];

              const renderLegend = (items: typeof implementationData) => (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {items.map(item => (
                    <div key={item.name} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-zinc-300">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="min-w-0 flex-1">{item.name}</span>
                      <span className="font-semibold text-zinc-100">{item.value}</span>
                    </div>
                  ))}
                </div>
              );

              const renderDonut = (items: typeof implementationData, total: number, label: string) => (
                <div className="relative mt-3 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={items.filter(item => item.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={92}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {items.filter(item => item.value > 0).map(item => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>

                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">{total}</span>
                    <span className="text-xs text-zinc-500">Total</span>
                  </div>
                </div>
              );

              return (
                <section className="grid gap-4 xl:grid-cols-3">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                    <div>
                      <h3 className="font-semibold text-zinc-100">Control implementation</h3>
                      <p className="mt-1 text-sm text-zinc-400">Progress across recorded security controls.</p>
                    </div>
                    {controls.length === 0 ? (
                      <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
                        Add security controls to see status analytics.
                      </div>
                    ) : (
                      renderDonut(implementationData, controls.length, 'Controls')
                    )}
                    {renderLegend(implementationData)}
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                    <div>
                      <h3 className="font-semibold text-zinc-100">Control effectiveness</h3>
                      <p className="mt-1 text-sm text-zinc-400">Recorded assessment results.</p>
                    </div>
                    {controls.length === 0 ? (
                      <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
                        Add security controls to see assessment analytics.
                      </div>
                    ) : (
                      renderDonut(effectivenessData, controls.length, 'Controls')
                    )}
                    {renderLegend(effectivenessData)}
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                    <div>
                      <h3 className="font-semibold text-zinc-100">Evidence coverage</h3>
                      <p className="mt-1 text-sm text-zinc-400">Evidence linked to implemented controls.</p>
                    </div>
                    {summary.implementedControls === 0 ? (
                      <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
                        No implemented controls to measure yet.
                      </div>
                    ) : (
                      renderDonut(evidenceData, summary.implementedControls, 'Controls')
                    )}
                    {renderLegend(evidenceData)}
                  </div>
                </section>
              );
            })()}

            <section className="space-y-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <h3 className="text-xl font-semibold">Security frameworks</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Add a built-in framework to this workspace and start with its curated requirements.
                  </p>
                </div>
                <p className="text-xs text-zinc-500">
                  {frameworks.length} added · {frameworksLoading ? 'Loading…' : 'Workspace-specific'}
                </p>
              </div>

              {frameworks.length > 0 && (
                <div className="space-y-4">
                  {frameworks.map((framework) => (
                    <div key={framework.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-white">
                            {framework.name}{' '}
                            <span className="text-sm font-normal text-zinc-400">
                              {framework.version || ''}
                            </span>
                          </h4>
                          <p className="mt-1 text-sm text-zinc-400">
                            {framework.description}
                          </p>
                        </div>
                        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
                          {framework.requirements.length} starter requirements
                        </span>
                      </div>

                      {framework.requirements.length > 0 ? (
                        <div className="mt-4 divide-y divide-zinc-800 rounded-xl border border-zinc-800">
                          {framework.requirements.map((requirement) => (
                            <div key={requirement.id} className="grid gap-2 p-3 sm:grid-cols-[110px_1fr_auto]">
                              <span className="font-mono text-xs text-cyan-300">
                                {requirement.requirement_code}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-zinc-200">
                                  {requirement.title}
                                </p>
                                {requirement.description && (
                                  <p className="mt-1 text-xs leading-5 text-zinc-400">
                                    {requirement.description}
                                  </p>
                                )}
                                {requirement.category && (
                                  <p className="mt-1 text-xs text-zinc-500">
                                    {requirement.category}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs capitalize text-zinc-400">
                                {requirement.priority}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-zinc-500">
                          No starter requirements are available for this framework.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                {frameworkCatalog.map((item) => {
                  const alreadyAdded = frameworks.some(
                    (framework) =>
                      framework.name === item.name &&
                      framework.version === item.version,
                  );
                  const currentRole = workspaces.find(
                    (workspace) => workspace.id === workspaceId,
                  )?.role;
                  const canAdd =
                    currentRole === 'owner' || currentRole === 'admin';

                  return (
                    <div key={item.key} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                      <h4 className="font-semibold">{item.name}</h4>
                      <p className="mt-1 text-xs text-zinc-500">
                        Version {item.version} · {item.requirementCount} starter requirements
                      </p>
                      <p className="mt-3 min-h-12 text-sm leading-5 text-zinc-400">
                        {item.description}
                      </p>
                      <button
                        onClick={() => void addFramework(item.key)}
                        disabled={!canAdd || alreadyAdded || !!addingFramework || frameworksLoading}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {alreadyAdded ? (
                          'Already added'
                        ) : addingFramework === item.key ? (
                          'Adding…'
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Add framework
                          </>
                        )}
                      </button>
                      {!canAdd && !alreadyAdded && (
                        <p className="mt-2 text-center text-xs text-zinc-500">
                          Owner/admin access required
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs leading-5 text-zinc-500">
                Starter requirements are a practical tracking foundation, not an exhaustive official checklist or a guarantee of certification. Review them against the applicable standard and your organization’s scope.
              </p>
            </section>


            <section className="space-y-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-xl font-semibold">Security controls</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Define safeguards, assign owners, track implementation and effectiveness, and link controls to framework requirements.
                  </p>
                </div>
                {canManageControls && (
                  <button
                    type="button"
                    onClick={openNewControlForm}
                    className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400"
                  >
                    <Plus className="h-4 w-4" />
                    Add control
                  </button>
                )}
              </div>

              {showControlForm && canManageControls && (
                <form
                  onSubmit={saveControl}
                  className="space-y-5 rounded-2xl border border-cyan-500/20 bg-zinc-900 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-semibold text-white">
                      {editingControlId ? 'Edit security control' : 'New security control'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowControlForm(false);
                        setEditingControlId(null);
                        setControlForm({ ...EMPTY_CONTROL_FORM });
                      }}
                      className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      aria-label="Close form"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-sm text-zinc-300">Control title *</span>
                      <input
                        required
                        maxLength={200}
                        className={inputClass}
                        value={controlForm.title}
                        onChange={(event) => setControlForm((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="e.g. Multi-factor authentication"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm text-zinc-300">Control code</span>
                      <input
                        maxLength={80}
                        className={inputClass}
                        value={controlForm.controlCode}
                        onChange={(event) => setControlForm((prev) => ({ ...prev, controlCode: event.target.value }))}
                        placeholder="e.g. IAM-01"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm text-zinc-300">Category</span>
                      <input
                        maxLength={120}
                        className={inputClass}
                        value={controlForm.category}
                        onChange={(event) => setControlForm((prev) => ({ ...prev, category: event.target.value }))}
                        placeholder="e.g. Access management"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm text-zinc-300">Owner</span>
                      <input
                        maxLength={200}
                        className={inputClass}
                        value={controlForm.owner}
                        onChange={(event) => setControlForm((prev) => ({ ...prev, owner: event.target.value }))}
                        placeholder="Person or team responsible"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm text-zinc-300">Implementation status</span>
                      <select
                        className={inputClass}
                        value={controlForm.implementationStatus}
                        onChange={(event) => setControlForm((prev) => ({ ...prev, implementationStatus: event.target.value as ControlForm['implementationStatus'] }))}
                      >
                        <option value="not_started">Not started</option>
                        <option value="in_progress">In progress</option>
                        <option value="implemented">Implemented</option>
                        <option value="not_applicable">Not applicable</option>
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm text-zinc-300">Effectiveness</span>
                      <select
                        className={inputClass}
                        value={controlForm.effectivenessStatus}
                        onChange={(event) => setControlForm((prev) => ({ ...prev, effectivenessStatus: event.target.value as ControlForm['effectivenessStatus'] }))}
                      >
                        <option value="not_assessed">Not assessed</option>
                        <option value="effective">Effective</option>
                        <option value="needs_improvement">Needs improvement</option>
                        <option value="ineffective">Ineffective</option>
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm text-zinc-300">Next review date</span>
                      <input
                        type="date"
                        className={inputClass}
                        value={controlForm.reviewDate}
                        onChange={(event) => setControlForm((prev) => ({ ...prev, reviewDate: event.target.value }))}
                      />
                    </label>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-sm text-zinc-300">Description</span>
                    <textarea
                      rows={3}
                      maxLength={10000}
                      className={inputClass}
                      value={controlForm.description}
                      onChange={(event) => setControlForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Describe what this control requires and how it should operate."
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-sm text-zinc-300">Notes</span>
                    <textarea
                      rows={3}
                      maxLength={10000}
                      className={inputClass}
                      value={controlForm.notes}
                      onChange={(event) => setControlForm((prev) => ({ ...prev, notes: event.target.value }))}
                      placeholder="Record implementation details, review findings, or other notes."
                    />
                  </label>

                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium text-zinc-200">Linked framework requirements</h5>
                      <p className="mt-1 text-xs text-zinc-500">
                        Select the requirements this control helps satisfy. You can select more than one.
                      </p>
                    </div>
                    {frameworks.some((framework) => framework.requirements.length > 0) ? (
                      <div className="max-h-64 space-y-4 overflow-y-auto rounded-xl border border-zinc-800 p-3">
                        {frameworks.map((framework) => (
                          <div key={framework.id}>
                            <p className="mb-2 text-xs font-semibold text-cyan-300">
                              {framework.name} {framework.version || ''}
                            </p>
                            <div className="space-y-2">
                              {framework.requirements.map((requirement) => (
                                <label key={requirement.id} className="flex items-start gap-2 text-sm text-zinc-300">
                                  <input
                                    type="checkbox"
                                    className="mt-1 accent-cyan-500"
                                    checked={controlForm.requirementIds.includes(requirement.id)}
                                    onChange={(event) => setControlForm((prev) => ({
                                      ...prev,
                                      requirementIds: event.target.checked
                                        ? [...prev.requirementIds, requirement.id]
                                        : prev.requirementIds.filter((id) => id !== requirement.id),
                                    }))}
                                  />
                                  <span>
                                    <span className="font-mono text-cyan-300">{requirement.requirement_code}</span>
                                    {' — '}{requirement.title}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-zinc-800 p-3 text-sm text-zinc-500">
                        Add a framework above before linking requirements to this control.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={savingControl}
                      className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {savingControl ? 'Saving…' : editingControlId ? 'Save changes' : 'Create control'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowControlForm(false);
                        setEditingControlId(null);
                        setControlForm({ ...EMPTY_CONTROL_FORM });
                      }}
                      className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {controlsLoading ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
                  Loading security controls…
                </div>
              ) : controls.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
                  <Shield className="mx-auto h-8 w-8 text-zinc-500" />
                  <p className="mt-3 font-medium text-zinc-200">No security controls yet</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {canManageControls
                      ? 'Create your first control to begin tracking implementation.'
                      : 'Workspace controls will appear here when they are added.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {controls.map((control) => (
                    <article key={control.id} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {control.control_code && (
                              <span className="font-mono text-xs text-cyan-300">{control.control_code}</span>
                            )}
                            {control.category && (
                              <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-400">{control.category}</span>
                            )}
                          </div>
                          <h4 className="mt-2 font-semibold text-white">{control.title}</h4>
                        </div>
                        {canManageControls && (
                          <button
                            type="button"
                            onClick={() => openEditControlForm(control)}
                            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        )}
                      </div>

                      {control.description && (
                        <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-400">{control.description}</p>
                      )}

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300">
                          Implementation: {control.implementation_status.replaceAll('_', ' ')}
                        </span>
                        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300">
                          Effectiveness: {control.effectiveness_status.replaceAll('_', ' ')}
                        </span>
                      </div>

                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <p className="text-zinc-400">
                          Owner: <span className="text-zinc-200">{control.owner || 'Unassigned'}</span>
                        </p>
                        <p className="text-zinc-400">
                          Next review: <span className="text-zinc-200">{control.review_date || 'Not scheduled'}</span>
                        </p>
                      </div>

                      {control.notes && (
                        <p className="whitespace-pre-wrap border-t border-zinc-800 pt-3 text-sm text-zinc-400">
                          {control.notes}
                        </p>
                      )}

                      {control.requirements.length > 0 && (
                        <div className="border-t border-zinc-800 pt-3">
                          <p className="mb-2 text-xs font-medium text-zinc-400">Linked requirements</p>
                          <div className="flex flex-wrap gap-2">
                            {control.requirements.map((requirement) => (
                              <span key={requirement.id} className="rounded-lg bg-cyan-500/10 px-2.5 py-1.5 text-xs text-cyan-300">
                                {requirement.framework?.name || 'Framework'} · {requirement.requirement_code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-xl font-semibold">Evidence library</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Store audit-ready documents, record verification status, and connect evidence to the controls it supports.
                  </p>
                </div>
                {canManageControls && (
                  <button
                    type="button"
                    onClick={openNewEvidenceForm}
                    className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400"
                  >
                    <Upload className="h-4 w-4" />
                    Upload evidence
                  </button>
                )}
              </div>

              {showEvidenceForm && canManageControls && (
                <form
                  onSubmit={saveEvidence}
                  className="space-y-5 rounded-2xl border border-cyan-500/20 bg-zinc-900 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-semibold text-white">
                      {editingEvidenceId ? 'Edit evidence details' : 'Upload evidence PDF'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEvidenceForm(false);
                        setEditingEvidenceId(null);
                        setEvidenceForm({ ...EMPTY_EVIDENCE_FORM });
                        setEvidenceFile(null);
                      }}
                      className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      aria-label="Close evidence form"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {!editingEvidenceId && (
                    <label className="block space-y-1.5">
                      <span className="text-sm text-zinc-300">PDF file *</span>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        required
                        className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-1.5 file:text-sm file:text-zinc-200`}
                        onChange={(event) => setEvidenceFile(event.target.files?.[0] || null)}
                      />
                      <span className="block text-xs text-zinc-500">
                        PDF only. Maximum file size: 25 MB.
                      </span>
                    </label>
                  )}

                  <label className="block space-y-1.5">
                    <span className="text-sm text-zinc-300">Description</span>
                    <textarea
                      rows={3}
                      maxLength={10000}
                      className={inputClass}
                      value={evidenceForm.description}
                      onChange={(event) => setEvidenceForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Describe what this document demonstrates or supports."
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-sm text-zinc-300">Evidence date</span>
                      <input
                        type="date"
                        className={inputClass}
                        value={evidenceForm.evidenceDate}
                        onChange={(event) => setEvidenceForm((prev) => ({ ...prev, evidenceDate: event.target.value }))}
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm text-zinc-300">Expiration date</span>
                      <input
                        type="date"
                        className={inputClass}
                        value={evidenceForm.expirationDate}
                        onChange={(event) => setEvidenceForm((prev) => ({ ...prev, expirationDate: event.target.value }))}
                      />
                    </label>
                    <label className="space-y-1.5 sm:col-span-2">
                      <span className="text-sm text-zinc-300">Verification status</span>
                      <select
                        className={inputClass}
                        value={evidenceForm.verificationStatus}
                        onChange={(event) => setEvidenceForm((prev) => ({ ...prev, verificationStatus: event.target.value as EvidenceForm['verificationStatus'] }))}
                      >
                        <option value="unverified">Unverified</option>
                        <option value="self_reported">Self-reported</option>
                        <option value="under_review">Under review</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium text-zinc-200">Link to security controls</h5>
                      <p className="mt-1 text-xs text-zinc-500">
                        Select every control this evidence supports. You can change these links later.
                      </p>
                    </div>
                    {controls.length > 0 ? (
                      <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-zinc-800 p-3">
                        {controls.map((control) => (
                          <label key={control.id} className="flex items-start gap-2 text-sm text-zinc-300">
                            <input
                              type="checkbox"
                              className="mt-1 accent-cyan-500"
                              checked={evidenceForm.controlIds.includes(control.id)}
                              onChange={(event) => setEvidenceForm((prev) => ({
                                ...prev,
                                controlIds: event.target.checked
                                  ? [...prev.controlIds, control.id]
                                  : prev.controlIds.filter((id) => id !== control.id),
                              }))}
                            />
                            <span>
                              {control.control_code && (
                                <span className="mr-2 font-mono text-cyan-300">{control.control_code}</span>
                              )}
                              {control.title}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-zinc-800 p-3 text-sm text-zinc-500">
                        Create security controls above before linking evidence.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={savingEvidence}
                      className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {editingEvidenceId ? <Save className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                      {savingEvidence ? 'Saving…' : editingEvidenceId ? 'Save changes' : 'Upload PDF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEvidenceForm(false);
                        setEditingEvidenceId(null);
                        setEvidenceForm({ ...EMPTY_EVIDENCE_FORM });
                        setEvidenceFile(null);
                      }}
                      className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {evidenceLoading ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
                  Loading evidence…
                </div>
              ) : evidence.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
                  <FolderCheck className="mx-auto h-8 w-8 text-zinc-500" />
                  <p className="mt-3 font-medium text-zinc-200">No evidence uploaded yet</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {canManageControls
                      ? 'Upload a policy, report, screenshot, or other PDF to begin building your evidence library.'
                      : 'Evidence uploaded to this workspace will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {evidence.map((item) => (
                    <article key={item.id} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="rounded-xl bg-violet-500/10 p-2 text-violet-300">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="break-words font-semibold text-white">{item.file_name}</h4>
                            <p className="mt-1 text-xs text-zinc-500">
                              {item.file_type.toUpperCase()} · {(item.file_size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
                          item.verification_status === 'verified'
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : item.verification_status === 'rejected'
                              ? 'bg-rose-500/10 text-rose-300'
                              : 'bg-zinc-800 text-zinc-300'
                        }`}>
                          {item.verification_status.replaceAll('_', ' ')}
                        </span>
                      </div>

                      {item.description && (
                        <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                          {item.description}
                        </p>
                      )}

                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <p className="text-zinc-400">
                          Evidence date: <span className="text-zinc-200">{item.evidence_date || 'Not provided'}</span>
                        </p>
                        <p className="text-zinc-400">
                          Expires: <span className="text-zinc-200">{item.expiration_date || 'Not provided'}</span>
                        </p>
                      </div>

                      <div className="border-t border-zinc-800 pt-3">
                        <p className="mb-2 text-xs font-medium text-zinc-400">Linked security controls</p>
                        {item.controls.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {item.controls.map((control) => (
                              <span key={control.id} className="rounded-lg bg-cyan-500/10 px-2.5 py-1.5 text-xs text-cyan-300">
                                {control.control_code ? `${control.control_code} · ` : ''}{control.title}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500">No controls linked</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
                        <button
                          type="button"
                          onClick={() => void openEvidenceFile(item)}
                          disabled={openingEvidenceId === item.id}
                          className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {openingEvidenceId === item.id ? 'Opening…' : 'Open PDF'}
                        </button>
                        {canManageControls && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditEvidenceForm(item)}
                              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteEvidence(item)}
                              disabled={deletingEvidenceId === item.id}
                              className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {deletingEvidenceId === item.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                    <h3 className="text-xl font-semibold">Gap analysis</h3>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">
                    Review unmapped framework requirements and security controls that need attention.
                  </p>
                </div>
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-300">
                  {gapTotal} {gapTotal === 1 ? 'finding' : 'findings'}
                </span>
              </div>

              {frameworksLoading || controlsLoading || evidenceLoading ? (
                <p className="rounded-xl border border-zinc-800 p-4 text-sm text-zinc-400">
                  Loading data for gap analysis…
                </p>
              ) : gapTotal === 0 ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="font-medium">No gaps identified in the current tracking data</p>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    This reflects the frameworks, controls and evidence currently recorded here; it is not an independent compliance assessment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unmappedRequirements.map((requirement) => {
                    const key = `requirement-${requirement.id}`;
                    return (
                      <article key={key} className="rounded-xl border border-zinc-800 p-4">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs text-cyan-300">
                                {requirement.requirement_code}
                              </span>
                              <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
                                No linked control
                              </span>
                            </div>
                            <h4 className="mt-2 font-medium text-zinc-100">
                              {requirement.title}
                            </h4>
                            <p className="mt-1 text-xs text-zinc-500">
                              {requirement.frameworkName} · {requirement.priority} priority
                            </p>
                            {requirement.description && (
                              <p className="mt-2 text-sm leading-5 text-zinc-400">
                                {requirement.description}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => void createGapCorrectiveAction({
                              key,
                              title: `${requirement.requirement_code}: ${requirement.title}`,
                              description: `This framework requirement has no linked security control. Review the requirement, determine the appropriate safeguard, and create and link a security control. Framework: ${requirement.frameworkName}.`,
                              controlId: null,
                            })}
                            disabled={!!creatingActionFor}
                            className="shrink-0 rounded-lg border border-amber-500/30 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
                          >
                            {creatingActionFor === key ? 'Creating…' : 'Create corrective action'}
                          </button>
                        </div>
                      </article>
                    );
                  })}

                  {controlGapFindings.map(({ control, reasons }) => {
                    const key = `control-${control.id}`;
                    const priority =
                      control.effectiveness_status === 'ineffective'
                        ? 'high' as const
                        : 'medium' as const;

                    return (
                      <article key={key} className="rounded-xl border border-zinc-800 p-4">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {control.control_code && (
                                <span className="font-mono text-xs text-cyan-300">
                                  {control.control_code}
                                </span>
                              )}
                              <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
                                Needs attention
                              </span>
                            </div>
                            <h4 className="mt-2 font-medium text-zinc-100">
                              {control.title}
                            </h4>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {reasons.map((reason) => (
                                <span key={reason} className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                                  {reason}
                                </span>
                              ))}
                            </div>
                            {control.requirements.length > 0 && (
                              <p className="mt-2 text-xs text-zinc-500">
                                Linked requirements: {control.requirements.map((item) => item.requirement_code).join(', ')}
                              </p>
                            )}
                            {control.owner && (
                              <p className="mt-1 text-xs text-zinc-500">
                                Owner: {control.owner}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => void createGapCorrectiveAction({
                              key,
                              title: control.title,
                              description: `Gap analysis identified the following issue(s): ${reasons.join('; ')}. Review the control, define remediation steps, and attach supporting evidence when appropriate.`,
                              controlId: control.id,
                              priority,
                            })}
                            disabled={!!creatingActionFor}
                            className="shrink-0 rounded-lg border border-amber-500/30 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
                          >
                            {creatingActionFor === key ? 'Creating…' : 'Create corrective action'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
              <p className="text-xs leading-5 text-zinc-500">
                Findings are based on recorded workspace data. A missing control or evidence link does not by itself prove that an organization is non-compliant.
              </p>
            </section>
          </>
        )}

        {loading && (
          <p className="text-center text-sm text-zinc-500">
            Loading cybersecurity summary...
          </p>
        )}
      </main>
    </div>
  );
}
