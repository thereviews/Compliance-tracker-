'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  supabase,
  getAuthHeaders,
} from '@/lib/supabase-client';
import {
  ShieldCheck,
  Building2,
  X,
  Plus,
  Search,
  LogOut,
  Menu,
  FileText,
  AlertTriangle,
  Clock,
  History,
  ClipboardCheck,
  FileCheck2,
  FolderCheck,
  Building,
  ListChecks,
  CalendarClock,
  BarChart3,
  Settings,
  ScrollText,
  ArrowUpRight,
} from 'lucide-react';
import { UploadModal } from '@/components/UploadModal';
import { EditDocumentModal } from '@/components/EditDocumentModal';
import { EditComplianceEvidenceModal } from '@/components/EditComplianceEvidenceModal';
import { ContractAnalytics } from '@/components/ContractAnalytics';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [editingEvidence, setEditingEvidence] = useState<any>(null);
  const [complianceEvidence, setComplianceEvidence] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [complianceSummary, setComplianceSummary] = useState<any>(null);
  const [complianceSummaryLoading, setComplianceSummaryLoading] = useState(false);
  const [complianceSummaryError, setComplianceSummaryError] = useState('');
  const [cybersecuritySummary, setCybersecuritySummary] = useState<any>(null);
  const [cybersecuritySummaryLoading, setCybersecuritySummaryLoading] = useState(false);
  const [cybersecuritySummaryError, setCybersecuritySummaryError] = useState('');
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'viewer'>('member');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [revokingInvitationId, setRevokingInvitationId] = useState('');
  const [companyMembers, setCompanyMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberActionId, setMemberActionId] = useState('');
  const [memberRoleChanges, setMemberRoleChanges] = useState<Record<string, 'admin' | 'member' | 'viewer'>>({});

  const router = useRouter();

  // Check authentication
  const checkUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push('/signin');
        return;
      }

      setUserEmail(user.email || '');
      setUserId(user.id);
      setAuthLoading(false);
    } catch (err) {
      console.error('AUTH CHECK ERROR:', err);
      router.push('/signin');
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  // Fetch documents whenever the selected workspace changes.
  useEffect(() => {
    if (userEmail && selectedWorkspaceId) {
      fetchDocuments();
    }
  }, [userEmail, selectedWorkspaceId, statusFilter, search]);

  // Fetch the workspaces the current user belongs to.
  useEffect(() => {
    if (userEmail) {
      fetchWorkspaces();
    }
  }, [userEmail]);

  // Load pending invitations for the selected company workspace.
  useEffect(() => {
    if (selectedWorkspaceId && workspaces.length > 0) {
      void fetchPendingInvitations(selectedWorkspaceId);
    } else {
      setPendingInvitations([]);
    }
  }, [selectedWorkspaceId, workspaces]);
  // Load company members when the selected workspace changes.
  useEffect(() => {
    if (selectedWorkspaceId && workspaces.length > 0) {
      void fetchCompanyMembers(selectedWorkspaceId);
    } else {
      setCompanyMembers([]);
      setMemberRoleChanges({});
    }
  }, [selectedWorkspaceId, workspaces]);

  const handleWorkspaceChange = (workspaceId: string) => {
    const workspace = workspaces.find(
      (item: any) => item.id === workspaceId
    );

    if (!workspace) return;

    setSelectedWorkspaceId(workspaceId);
    localStorage.setItem(
      `selectedWorkspace:${userEmail}`,
      workspaceId
    );

    setIsUploadOpen(false);
    setEditingDoc(null);
    setEditingEvidence(null);
  };

  const fetchWorkspaces = async () => {
    setWorkspaceLoading(true);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/workspaces', { headers });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error || 'Failed to load workspaces'
        );
      }

      const loadedWorkspaces = json.workspaces || [];
      setWorkspaces(loadedWorkspaces);

      const storageKey = `selectedWorkspace:${userEmail}`;
      const savedWorkspaceId = localStorage.getItem(storageKey);

      const savedWorkspace = loadedWorkspaces.find(
        (workspace: any) => workspace.id === savedWorkspaceId
      );

      const personalWorkspace = loadedWorkspaces.find(
        (workspace: any) => workspace.type === 'personal'
      );

      const defaultWorkspace =
        savedWorkspace || personalWorkspace || loadedWorkspaces[0];

      if (defaultWorkspace) {
        setSelectedWorkspaceId(defaultWorkspace.id);
      }
    } catch (error: any) {
      console.error('FETCH WORKSPACES ERROR:', error);
      toast.error(error.message || 'Failed to load workspaces');
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const fetchComplianceSummary = async (
    workspaceId: string,
    isCurrent: () => boolean
  ) => {
    setComplianceSummaryLoading(true);
    setComplianceSummaryError('');
    setComplianceSummary(null);

    try {
      const headers = await getAuthHeaders();
      const workspaceParam = `workspaceId=${encodeURIComponent(workspaceId)}`;

      const endpoints = [
        `/api/compliance-assessments?${workspaceParam}`,
        `/api/compliance-register?${workspaceParam}`,
        `/api/compliance-evidence?${workspaceParam}`,
        `/api/vendor-risk-assessments?${workspaceParam}`,
        `/api/corrective-actions?${workspaceParam}`,
        `/api/licenses-and-renewals?${workspaceParam}`,
        `/api/audit-logs?${workspaceParam}&page=1&pageSize=10`,
      ];

      const responses = await Promise.all(
        endpoints.map((endpoint) => fetch(endpoint, { headers }))
      );

      const payloads = await Promise.all(
        responses.map(async (response) => {
          const json = await response.json();
          if (!response.ok) {
            throw new Error(json.error || 'Could not load compliance status');
          }
          return json;
        })
      );

      if (!isCurrent()) return;

      const [
        assessmentsData,
        registerData,
        evidenceData,
        riskData,
        actionsData,
        renewalsData,
        auditData,
      ] = payloads;

      const assessments = assessmentsData.assessments ?? [];
      const entries = registerData.entries ?? [];
      const evidence = evidenceData.evidence ?? [];
      setComplianceEvidence(evidence);
      const riskAssessments = riskData.assessments ?? [];
      const actions = actionsData.actions ?? [];
      const renewals = renewalsData.records ?? [];
      const auditLogs = auditData.logs ?? [];

      // Compare date-only values using the local calendar date.
      const dateKey = (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const today = dateKey(todayDate);

      const thirtyDaysDate = new Date(todayDate);
      thirtyDaysDate.setDate(thirtyDaysDate.getDate() + 30);
      const thirtyDaysFromNow = dateKey(thirtyDaysDate);

      const openActionStatuses = ['open', 'in_progress', 'blocked'];
      const closedActionStatuses = ['resolved', 'closed'];
      const finalRenewalStatuses = ['renewed', 'cancelled'];

      setComplianceSummary({
        assessmentTotal: assessments.length,
        compliantAssessments: assessments.filter(
          (item: any) => item.status === 'compliant'
        ).length,
        assessmentAttention: assessments.filter(
          (item: any) => ['non_compliant', 'expired'].includes(item.status)
        ).length,

        registerTotal: entries.length,
        registerCompliant: entries.filter(
          (item: any) => item.status === 'compliant'
        ).length,
        registerNonCompliant: entries.filter(
          (item: any) => item.status === 'non_compliant'
        ).length,

        evidenceTotal: evidence.length,
        evidenceExpired: evidence.filter(
          (item: any) =>
            item.expiration_date && item.expiration_date < today
        ).length,
        evidenceVerification: evidence.filter(
          (item: any) =>
            ['unverified', 'under_review'].includes(item.verification_status)
        ).length,

        riskTotal: riskAssessments.length,
        highRisk: riskAssessments.filter(
          (item: any) => ['high', 'critical'].includes(item.overall_risk)
        ).length,

        openActions: actions.filter(
          (item: any) => openActionStatuses.includes(item.status)
        ).length,
        overdueActions: actions.filter(
          (item: any) =>
            item.due_date &&
            item.due_date < today &&
            !closedActionStatuses.includes(item.status)
        ).length,

        expiredRenewals: renewals.filter(
          (item: any) =>
            !finalRenewalStatuses.includes(item.status) &&
            (
              item.status === 'expired' ||
              (item.expiration_date && item.expiration_date < today)
            )
        ).length,
        dueRenewals: renewals.filter(
          (item: any) =>
            item.expiration_date &&
            item.expiration_date >= today &&
            item.expiration_date <= thirtyDaysFromNow &&
            !['renewed', 'cancelled', 'expired'].includes(item.status)
        ).length,

        overdueReviews: entries.filter(
          (item: any) =>
            item.status !== 'not_applicable' &&
            item.review_date &&
            item.review_date < today
        ).length,

        auditTotal: auditData.total ?? 0,
        auditRecent: auditLogs.length,
      });
    } catch (error: any) {
      if (!isCurrent()) return;
      console.error('FETCH COMPLIANCE SUMMARY ERROR:', error);
      setComplianceSummaryError(
        error.message || 'Could not load compliance status'
      );
      setComplianceSummary(null);
    } finally {
      if (isCurrent()) {
        setComplianceSummaryLoading(false);
      }
    }
  };

  // Refresh the cards when the selected workspace changes.
  useEffect(() => {
    if (!selectedWorkspaceId) {
      setComplianceSummary(null);
      setComplianceSummaryLoading(false);
      setComplianceSummaryError('');
      return;
    }

    let active = true;

    void fetchComplianceSummary(selectedWorkspaceId, () => active);

    return () => {
      active = false;
    };
  }, [selectedWorkspaceId]);

  // Load cybersecurity metrics independently from the other dashboard summaries.
  useEffect(() => {
    if (!selectedWorkspaceId) {
      setCybersecuritySummary(null);
      setCybersecuritySummaryLoading(false);
      setCybersecuritySummaryError('');
      return;
    }

    let active = true;

    const loadCybersecuritySummary = async () => {
      setCybersecuritySummaryLoading(true);
      setCybersecuritySummaryError('');

      try {
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/cybersecurity-compliance/summary?workspaceId=${encodeURIComponent(selectedWorkspaceId)}`,
          { headers },
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Could not load cybersecurity summary');
        }

        if (active) setCybersecuritySummary(result.summary || null);
      } catch (error) {
        if (active) {
          setCybersecuritySummary(null);
          setCybersecuritySummaryError(
            error instanceof Error ? error.message : 'Could not load cybersecurity summary',
          );
        }
      } finally {
        if (active) setCybersecuritySummaryLoading(false);
      }
    };

    void loadCybersecuritySummary();

    return () => {
      active = false;
    };
  }, [selectedWorkspaceId]);

  const handleCreateCompany = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = companyName.trim();

    if (!name) {
      toast.error('Enter a company name');
      return;
    }

    setCreatingCompany(true);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error || 'Failed to create company workspace'
        );
      }

      toast.success('Company workspace created');
      setCompanyName('');
      setCompanyModalOpen(false);
      await fetchWorkspaces();
    } catch (error: any) {
      console.error('CREATE COMPANY ERROR:', error);
      toast.error(error.message || 'Could not create company workspace');
    } finally {
      setCreatingCompany(false);
    }
  };

  const handleSendInvitation = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const email = inviteEmail.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid email address');
      return;
    }

    const workspace = workspaces.find(
      (item: any) => item.id === selectedWorkspaceId
    );

    if (!workspace || workspace.type !== 'company') {
      toast.error('Select a company workspace first');
      return;
    }

    if (!['owner', 'admin'].includes(workspace.role)) {
      toast.error('Only company owners and admins can invite members');
      return;
    }

    setSendingInvite(true);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/workspaces/invitations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          email,
          role: inviteRole,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to send invitation');
      }

      toast.success(json.message || 'Invitation sent successfully');
      setInviteEmail('');
      setInviteRole('member');
      await fetchPendingInvitations(selectedWorkspaceId);
    } catch (error: any) {
      console.error('SEND INVITATION ERROR:', error);
      toast.error(error.message || 'Could not send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const fetchPendingInvitations = async (workspaceId: string) => {
    const workspace = workspaces.find(
      (item: any) => item.id === workspaceId
    );

    if (
      !workspace ||
      workspace.type !== 'company' ||
      !['owner', 'admin'].includes(workspace.role)
    ) {
      setPendingInvitations([]);
      return;
    }

    setInvitationsLoading(true);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/workspaces/invitations?workspaceId=${encodeURIComponent(workspaceId)}`,
        { headers }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load invitations');
      }

      setPendingInvitations(json.invitations || []);
    } catch (error: any) {
      console.error('FETCH INVITATIONS ERROR:', error);
      setPendingInvitations([]);
      toast.error(error.message || 'Could not load invitations');
    } finally {
      setInvitationsLoading(false);
    }
  };
  const fetchCompanyMembers = async (workspaceId: string) => {
    const workspace = workspaces.find(
      (item: any) => item.id === workspaceId
    );

    if (
      !workspace ||
      workspace.type !== 'company' ||
      !['owner', 'admin'].includes(workspace.role)
    ) {
      setCompanyMembers([]);
      setMemberRoleChanges({});
      return;
    }

    setMembersLoading(true);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/workspaces/members?workspaceId=${encodeURIComponent(workspaceId)}`,
        { headers }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load company members');
      }

      setCompanyMembers(json.members || []);
      setMemberRoleChanges({});
    } catch (error: any) {
      console.error('FETCH COMPANY MEMBERS ERROR:', error);
      setCompanyMembers([]);
      toast.error(error.message || 'Could not load company members');
    } finally {
      setMembersLoading(false);
    }
  };

  const handleUpdateMemberRole = async (memberUserId: string) => {
const role = memberRoleChanges[memberUserId];

if (!selectedWorkspaceId || !role || memberActionId) return;

const member = companyMembers.find(
  (item) => item.userId === memberUserId
);

if (!member || member.role === role) {
  toast.error('Choose a different role first');
  return;
}

if (memberUserId === userId) {
  toast.error('You cannot change your own role');
  return;
}

setMemberActionId(memberUserId);

try {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/workspaces/members', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      workspaceId: selectedWorkspaceId,
      userId: memberUserId,
      role,
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || 'Failed to update member role');
  }

  setCompanyMembers((current) =>
    current.map((item) =>
      item.userId === memberUserId ? { ...item, role } : item
    )
  );

  setMemberRoleChanges((current) => {
    const updated = { ...current };
    delete updated[memberUserId];
    return updated;
  });

  toast.success('Member role updated');
} catch (error: any) {
  console.error('UPDATE MEMBER ROLE ERROR:', error);
  toast.error(error.message || 'Could not update member role');
} finally {
  setMemberActionId('');
}

};

const handleRemoveMember = async (
memberUserId: string,
memberEmail: string
) => {
if (!selectedWorkspaceId || memberActionId) return;

if (memberUserId === userId) {
  toast.error('You cannot remove yourself');
  return;
}

const confirmed = window.confirm(
  `Remove ${memberEmail} from this company workspace?`
);

if (!confirmed) return;

setMemberActionId(memberUserId);

try {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/workspaces/members', {
    method: 'DELETE',
    headers,
    body: JSON.stringify({
      workspaceId: selectedWorkspaceId,
      userId: memberUserId,
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || 'Failed to remove member');
  }

  setCompanyMembers((current) =>
    current.filter((item) => item.userId !== memberUserId)
  );

  setMemberRoleChanges((current) => {
    const updated = { ...current };
    delete updated[memberUserId];
    return updated;
  });

  toast.success('Member removed');
} catch (error: any) {
  console.error('REMOVE MEMBER ERROR:', error);
  toast.error(error.message || 'Could not remove member');
} finally {
  setMemberActionId('');
}

};
  const handleRevokeInvitation = async (invitationId: string) => {
    if (!selectedWorkspaceId || revokingInvitationId) return;

    setRevokingInvitationId(invitationId);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/workspaces/invitations', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          invitationId,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to revoke invitation');
      }

      setPendingInvitations((current) =>
        current.filter((invitation) => invitation.id !== invitationId)
      );
      toast.success('Invitation revoked');
    } catch (error: any) {
      console.error('REVOKE INVITATION ERROR:', error);
      toast.error(error.message || 'Could not revoke invitation');
    } finally {
      setRevokingInvitationId('');
    }
  };

  // Calculate status from expiration date
  const getCurrentStatus = (
    expirationDate: string | null
  ) => {
    if (!expirationDate) {
      return 'Active';
    }

    // Use local date and compare YYYY-MM-DD strings
    // to avoid timezone problems.
    const today = new Date();
    const todayStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');

    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(
      thirtyDaysFromNow.getDate() + 30
    );

    const thirtyDaysStr = [
      thirtyDaysFromNow.getFullYear(),
      String(thirtyDaysFromNow.getMonth() + 1).padStart(2, '0'),
      String(thirtyDaysFromNow.getDate()).padStart(2, '0'),
    ].join('-');

    if (expirationDate < todayStr) {
      return 'Expired';
    }

    if (expirationDate <= thirtyDaysStr) {
      return 'Expiring Soon';
    }

    return 'Active';
  };

  // Add calculated status to every document
  const documentsWithCurrentStatus = documents.map(
    (doc) => ({
      ...doc,
      currentStatus: getCurrentStatus(
        doc.expiration_date
      ),
    })
  );

  // Apply status filter on the client using calculated status
  const filteredDocuments =
    statusFilter === 'all'
      ? documentsWithCurrentStatus
      : documentsWithCurrentStatus.filter(
          (doc) =>
            doc.currentStatus === statusFilter
        );

  const fetchDocuments = async () => {
    if (!selectedWorkspaceId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();

      params.append('workspaceId', selectedWorkspaceId);

      if (search.trim()) {
        params.append('search', search.trim());
      }

      const res = await fetch(
        `/api/documents?${params.toString()}`,
        { headers }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error || 'Failed to fetch documents'
        );
      }

      if (json.success) {
        const refreshedDocuments = json.documents || [];

        setDocuments(refreshedDocuments);

        setEditingDoc((current: any) => {
          if (!current) return current;

          return (
            refreshedDocuments.find(
              (doc: any) => doc.id === current.id
            ) || current
          );
        });
      }
    } catch (error: unknown) {
      console.error('FETCH DOCUMENTS ERROR:', error);
      setDocuments([]);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPdf = async (id: string) => {
    // Open a tab immediately to avoid browser popup blocking.
    const pdfWindow = window.open('about:blank', '_blank');

    if (!pdfWindow) {
      toast.error('Allow pop-ups to open this PDF');
      return;
    }

    pdfWindow.opener = null;

    try {
      const headers = await getAuthHeaders();

      const res = await fetch(
        `/api/documents/${id}/file`,
        { headers }
      );

      const json = await res.json();

      if (!res.ok || !json.url) {
        throw new Error(
          json.error || 'Could not open PDF'
        );
      }

      pdfWindow.location.href = json.url;
    } catch (error: unknown) {
      pdfWindow.close();
      console.error('OPEN PDF ERROR:', error);

      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not open PDF'
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this document?'
      )
    ) {
      return;
    }

    try {
      const headers = await getAuthHeaders();

      const res = await fetch(
        `/api/documents/${id}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.details ||
            json.error ||
            'Delete failed'
        );
      }

      toast.success('Document deleted');

      await fetchDocuments();
    } catch (error: any) {
      console.error('DELETE ERROR:', error);
      toast.error(error.message || 'Delete failed');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/signin');
  };

  // Dashboard metrics use calculated status
  const totalContracts =
    documentsWithCurrentStatus.length;

  const expiringSoonCount =
    documentsWithCurrentStatus.filter(
      (doc) =>
        doc.currentStatus === 'Expiring Soon'
    ).length;

  const expiredCount =
    documentsWithCurrentStatus.filter(
      (doc) =>
        doc.currentStatus === 'Expired'
    ).length;

  const valueAtRisk =
    documentsWithCurrentStatus
      .filter(
        (doc) =>
          doc.currentStatus === 'Expiring Soon' ||
          doc.currentStatus === 'Expired'
      )
      .reduce(
        (total, doc) =>
          total +
          (Number(doc.financial_value) || 0),
        0
      );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-blue-600">
        Verifying session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* Mobile navigation backdrop */}
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* Responsive compliance navigation sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-slate-950 text-slate-100 transition-transform duration-200 lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 py-5 lg:border-b lg:border-slate-800">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white">
              ComplianceTracker
            </h1>
            <p className="mt-0.5 text-xs text-slate-400">
              Compliance workspace
            </p>
          </div>
        </div>

        <nav
          aria-label="Main navigation"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a')) {
              setMobileNavOpen(false);
            }
          }}
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 py-5"
        >
          <p className="hidden px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:block">
            Overview
          </p>

          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-3 rounded-lg bg-blue-500/15 px-3 py-2.5 text-sm font-medium text-blue-300 transition-colors hover:bg-blue-500/20"
          >
            <Building2 className="h-[18px] w-[18px] shrink-0 text-blue-300" />
            Dashboard
          </Link>

          <p className="hidden px-3 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:block">
            Compliance
          </p>

          <Link href="/dashboard/compliance-assessments" className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            <ShieldCheck className="h-[18px] w-[18px] shrink-0" />
            Compliance Assessments
          </Link>

          <Link href="/dashboard/cybersecurity-compliance" className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            <ShieldCheck className="h-[18px] w-[18px] shrink-0 text-cyan-400" />
            Cybersecurity Compliance
          </Link>

          <Link href="/dashboard/compliance-register" className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            <ClipboardCheck className="h-[18px] w-[18px] shrink-0 text-emerald-400" />
            Compliance Register
          </Link>

          <Link href="/dashboard/compliance-evidence" className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            <FolderCheck className="h-[18px] w-[18px] shrink-0 text-emerald-400" />
            Compliance Evidence
          </Link>

          <Link href="/dashboard/licenses-and-renewals" className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            <CalendarClock className="h-[18px] w-[18px] shrink-0 text-amber-400" />
            Licenses &amp; Renewals
          </Link>

          <Link href="/dashboard/corrective-actions" className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            <AlertTriangle className="h-[18px] w-[18px] shrink-0 text-rose-400" />
            Corrective Actions
          </Link>

          <Link href="/dashboard/compliance-reports" className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            <BarChart3 className="h-[18px] w-[18px] shrink-0 text-violet-400" />
            Reports
          </Link>

          <p className="hidden px-3 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:block">
            Management
          </p>

          <Link href="/dashboard/vendor-risk" className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            <Building className="h-[18px] w-[18px] shrink-0 text-orange-400" />
            Vendor Risk
          </Link>

          <Link href="/dashboard/audit-logs" className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
            <History className="h-[18px] w-[18px] shrink-0 text-sky-400" />
            Audit Logs
          </Link>

          <p className="hidden px-3 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:block">
            Account
          </p>

          <Link href="/dashboard/settings" className="group flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-all duration-200 hover:translate-x-0.5 hover:bg-slate-800 hover:text-white">
            <Settings className="h-[18px] w-[18px] shrink-0 text-slate-400 transition-colors group-hover:text-blue-300" />
            Settings
          </Link>
        </nav>

        <div className="mt-auto shrink-0 border-t border-slate-800 px-4 py-4">
          <p className="px-1 text-xs font-medium text-slate-300">
            ComplianceTracker
          </p>
          <p className="mt-1 px-1 text-xs text-slate-500">
            Keep your obligations organized.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors duration-200 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 transition-colors" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation menu"
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen(true)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                Dashboard
              </p>
              <p className="hidden max-w-xs truncate text-xs text-slate-500 sm:block">
                Manage documents, vendors, and compliance activities.
              </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden max-w-48 truncate text-xs text-slate-500 md:inline">
                {userEmail}
              </span>

              <button
                onClick={() => setIsUploadOpen(true)}
                disabled={
                  !['owner', 'admin', 'member'].includes(
                    workspaces.find(
                      (workspace: any) =>
                        workspace.id === selectedWorkspaceId
                    )?.role
                  )
                }
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
              >
                <Plus className="h-4 w-4" />
                <span>Upload Document</span>
              </button>

              <button
                onClick={handleLogout}
                aria-label="Log out"
                title="Log out"
                className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

      <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">

        {/* Workspaces */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Your Workspaces</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Manage your personal and company workspace memberships.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCompanyModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Company
            </button>
          </div>

          <div className="mb-3">
            <label
              htmlFor="workspace-selector"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Current Workspace
            </label>

            <select
              id="workspace-selector"
              value={selectedWorkspaceId}
              onChange={(event) =>
                handleWorkspaceChange(event.target.value)
              }
              disabled={workspaceLoading || workspaces.length === 0}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 sm:max-w-md"
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name} ({workspace.type === 'personal' ? 'Personal' : 'Company'})
                </option>
              ))}
            </select>

            {(() => {
              const selectedWorkspace = workspaces.find(
                (workspace: any) => workspace.id === selectedWorkspaceId
              );

              return selectedWorkspace?.type === 'company' &&
                ['owner', 'admin'].includes(selectedWorkspace.role) ? (
                <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-600">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block">Company administration</span>
                        <span className="mt-1 block text-xs font-normal text-slate-500">
                          Invitations, members, and access roles
                        </span>
                      </span>
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      Manage
                    </span>
                  </summary>
                  <div className="space-y-3 border-t border-slate-200 p-3">
                <form
                  onSubmit={handleSendInvitation}
                  className="space-y-3 rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Invite a Company Member
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Send an email invitation to join this company workspace.
                      Invitations expire after 48 hours.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="invite-email"
                        className="mb-1.5 block text-xs font-medium text-slate-600"
                      >
                        Email address
                      </label>
                      <input
                        id="invite-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="colleague@company.com"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="invite-role"
                        className="mb-1.5 block text-xs font-medium text-slate-600"
                      >
                        Role
                      </label>
                      <select
                        id="invite-role"
                        value={inviteRole}
                        onChange={(event) =>
                          setInviteRole(event.target.value as 'member' | 'viewer')
                        }
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingInvite || !inviteEmail.trim()}
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingInvite ? 'Sending Invitation...' : 'Send Invitation'}
                  </button>
                </form>

                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-slate-900">
                      Pending Invitations
                    </h3>
                    <span className="text-xs text-slate-500">
                      {pendingInvitations.length}
                    </span>
                  </div>

                  {invitationsLoading ? (
                    <p className="text-sm text-slate-500 py-3">
                      Loading invitations...
                    </p>
                  ) : pendingInvitations.length === 0 ? (
                    <p className="text-sm text-slate-500 py-3">
                      No pending invitations.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {pendingInvitations.map((invitation) => {
                        const expired =
                          new Date(invitation.expires_at).getTime() <= Date.now();

                        return (
                          <div
                            key={invitation.id}
                            className="flex flex-col gap-2 rounded-lg border border-slate-200 p-2.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 break-all">
                                {invitation.invited_email}
                              </p>
                              <p className="text-xs text-slate-500 mt-1 capitalize">
                                Role: {invitation.role}
                              </p>
                              <p className={`text-xs mt-1 ${expired ? 'text-amber-700' : 'text-slate-500'}`}>
                                {expired ? 'Expired' : 'Expires'}: {' '}
                                {new Date(invitation.expires_at).toLocaleString()}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRevokeInvitation(invitation.id)}
                              disabled={Boolean(revokingInvitationId)}
                              className="shrink-0 border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 rounded-lg px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {revokingInvitationId === invitation.id
                                ? 'Revoking...'
                                : 'Revoke'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-slate-900">
                      Company Members
                    </h3>
                    <span className="text-xs text-slate-500">
                      {companyMembers.length}
                    </span>
                  </div>

                  {membersLoading ? (
                    <p className="text-sm text-slate-500 py-3">
                      Loading company members...
                    </p>
                  ) : companyMembers.length === 0 ? (
                    <p className="text-sm text-slate-500 py-3">
                      No company members found.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {companyMembers.map((member) => {
                        const isOwner = member.role === 'owner';
                        const isSelf = member.userId === userId;
                        const selectedRole =
                          memberRoleChanges[member.userId] ?? member.role;

                        return (
                          <div
                            key={member.userId}
                            className="flex flex-col gap-2 rounded-lg border border-slate-200 p-2.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 break-all">
                                {member.email || member.userId}
                                {isSelf ? ' (You)' : ''}
                              </p>

                              <p className="text-xs text-slate-500 mt-1">
                                Current role:{' '}
                                <span className="capitalize">
                                  {member.role}
                                </span>
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {!isOwner && !isSelf && (
                                <>
                                  <select
                                    aria-label={`Role for ${member.email || member.userId}`}
                                    value={selectedRole}
                                    onChange={(event) =>
                                      setMemberRoleChanges((current) => ({
                                        ...current,
                                        [member.userId]: event.target.value as
                                          | 'admin'
                                          | 'member'
                                          | 'viewer',
                                      }))
                                    }
                                    disabled={Boolean(memberActionId)}
                                    className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
                                  >
                                    <option value="admin">Admin</option>
                                    <option value="member">Member</option>
                                    <option value="viewer">Viewer</option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateMemberRole(member.userId)
                                    }
                                    disabled={
                                      Boolean(memberActionId) ||
                                      selectedRole === member.role
                                    }
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-3 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    {memberActionId === member.userId
                                      ? 'Saving...'
                                      : 'Save Role'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveMember(
                                        member.userId,
                                        member.email || 'this member'
                                      )
                                    }
                                    disabled={Boolean(memberActionId)}
                                    className="border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 rounded-lg px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {memberActionId === member.userId
                                      ? 'Processing...'
                                      : 'Remove'}
                                  </button>
                                </>
                              )}

                              {isOwner && (
                                <span className="text-xs text-amber-800 border border-amber-200 bg-amber-50 rounded-lg px-3 py-2">
                                  Workspace Owner
                                </span>
                              )}

                              {isSelf && !isOwner && (
                                <span className="text-xs text-slate-500">
                                  Your account
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                  </div>
                </details>
              ) : null;
            })()}
          </div>

          {workspaceLoading ? (
            <p className="text-sm text-slate-500 py-3">
              Loading workspaces...
            </p>
          ) : workspaces.length === 0 ? (
            <p className="text-sm text-slate-500 py-3">
              No workspaces found.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-blue-50 p-1.5 text-blue-700">
                      <Building2 className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-medium break-words">
                        {workspace.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {workspace.type === 'personal'
                          ? 'Personal workspace'
                          : 'Company workspace'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-slate-500">
            Documents are organized by workspace. Access to shared company documents depends on your role.
          </p>
        </section>


        {/* Contract overview */}
        <section aria-labelledby="contract-overview-heading" className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
                Overview
              </p>
              <h2 id="contract-overview-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                Contract overview
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Monitor contract deadlines, outstanding issues, and financial exposure.
              </p>
            </div>
          </div>

          {/* Contract KPI cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

            <article className="group relative min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:p-5">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-500" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">
                    Total contracts
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-slate-950">
                    {totalContracts.toLocaleString()}
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100">
                  <FileText className="h-[18px] w-[18px]" />
                </span>
              </div>
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
                Contracts in this workspace
              </p>
            </article>

            <article className="group relative min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md sm:p-5">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-amber-500" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">
                    Expiring soon
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-slate-950">
                    {expiringSoonCount.toLocaleString()}
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100">
                  <Clock className="h-[18px] w-[18px]" />
                </span>
              </div>
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
                Due within the next 30 days
              </p>
            </article>

            <article className="group relative min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md sm:p-5">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-rose-500" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">
                    Expired contracts
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-slate-950">
                    {expiredCount.toLocaleString()}
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100">
                  <AlertTriangle className="h-[18px] w-[18px]" />
                </span>
              </div>
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
                Past their expiration date
              </p>
            </article>

            <article className="group relative min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md sm:p-5">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-violet-500" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">
                    Value at risk
                  </p>
                  <p className="mt-3 break-words text-3xl font-semibold tracking-tight tabular-nums text-slate-950">
                    ${valueAtRisk.toLocaleString()}
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-100">
                  <span className="text-lg font-semibold">$</span>
                </span>
              </div>
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
                Financial value of expiring or expired contracts
              </p>
            </article>

          </div>

          {/* Compliance at a Glance */}
          <section aria-labelledby="compliance-glance-heading" className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
                  Your compliance workspace
                </p>
                <h2
                  id="compliance-glance-heading"
                  className="mt-1 text-xl font-bold tracking-tight text-slate-900"
                >
                  Compliance at a Glance
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Live compliance status for your selected workspace.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">Compliance Assessments</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {complianceSummaryLoading
                      ? 'Loading…'
                      : complianceSummaryError
                        ? 'Status unavailable'
                        : complianceSummary
                          ? <>{`${complianceSummary.assessmentTotal} assessments · ${complianceSummary.compliantAssessments} compliant`}<br />{`${complianceSummary.assessmentAttention} need attention`}</>
                          : 'Select a workspace to view status.'}
                  </span>
                </span>
              </div>

              <Link
                href="/dashboard/cybersecurity-compliance"
                className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-100">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">
                    Cybersecurity Compliance
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {cybersecuritySummaryLoading
                      ? 'Loading…'
                      : cybersecuritySummaryError
                        ? 'Status unavailable'
                        : cybersecuritySummary
                          ? <>{`${cybersecuritySummary.readiness}% audit readiness`}<br />{`${cybersecuritySummary.implementedControls} of ${cybersecuritySummary.controlTotal} controls implemented · ${cybersecuritySummary.openActions} open security actions`}</>
                          : 'Select a workspace to view status.'}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-blue-700" />
              </Link>

              <Link
                href="/dashboard/compliance-register"
                className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100">
                  <ClipboardCheck className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">Compliance Register</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {complianceSummaryLoading
                      ? 'Loading…'
                      : complianceSummaryError
                        ? 'Status unavailable'
                        : complianceSummary
                          ? <>{`${complianceSummary.registerTotal} requirements tracked`}<br />{`${complianceSummary.registerNonCompliant} non-compliant · ${complianceSummary.registerCompliant} compliant`}</>
                          : 'Select a workspace to view status.'}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-blue-700" />
              </Link>

              <Link
                href="/dashboard/compliance-evidence"
                className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100">
                  <FolderCheck className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">Compliance Evidence</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {complianceSummaryLoading
                      ? 'Loading…'
                      : complianceSummaryError
                        ? 'Status unavailable'
                        : complianceSummary
                          ? <>{`${complianceSummary.evidenceTotal} evidence records`}<br />{`${complianceSummary.evidenceExpired} expired · ${complianceSummary.evidenceVerification} awaiting verification`}</>
                          : 'Select a workspace to view status.'}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-blue-700" />
              </Link>

              <Link
                href="/dashboard/vendor-risk"
                className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100">
                  <Building className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">Vendor Risk</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {complianceSummaryLoading
                      ? 'Loading…'
                      : complianceSummaryError
                        ? 'Status unavailable'
                        : complianceSummary
                          ? <>{`${complianceSummary.riskTotal} risk assessments`}<br />{`${complianceSummary.highRisk} high/critical risk`}</>
                          : 'Select a workspace to view status.'}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-blue-700" />
              </Link>

              <Link
                href="/dashboard/corrective-actions"
                className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100">
                  <ListChecks className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">Corrective Actions</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {complianceSummaryLoading
                      ? 'Loading…'
                      : complianceSummaryError
                        ? 'Status unavailable'
                        : complianceSummary
                          ? <>{`${complianceSummary.openActions} open actions`}<br />{`${complianceSummary.overdueActions} overdue`}</>
                          : 'Select a workspace to view status.'}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-blue-700" />
              </Link>

              <Link
                href="/dashboard/licenses-and-renewals"
                className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-100">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">Licenses &amp; Renewals</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {complianceSummaryLoading
                      ? 'Loading…'
                      : complianceSummaryError
                        ? 'Status unavailable'
                        : complianceSummary
                          ? <>{`${complianceSummary.expiredRenewals} expired`}<br />{`${complianceSummary.dueRenewals} due within 30 days`}</>
                          : 'Select a workspace to view status.'}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-blue-700" />
              </Link>

              <Link
                href="/dashboard/compliance-reports"
                className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-100">
                  <BarChart3 className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">Compliance Reports</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {complianceSummaryLoading
                      ? 'Loading…'
                      : complianceSummaryError
                        ? 'Status unavailable'
                        : complianceSummary
                          ? <>{`${complianceSummary.overdueReviews} overdue reviews`}<br />{`${complianceSummary.openActions} open corrective actions`}</>
                          : 'Select a workspace to view status.'}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-blue-700 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>

              <Link
                href="/dashboard/audit-logs"
                className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200">
                  <ScrollText className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">Audit Logs</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {complianceSummaryLoading
                      ? 'Loading…'
                      : complianceSummaryError
                        ? 'Status unavailable'
                        : complianceSummary
                          ? <>{`${complianceSummary.auditTotal} total events`}<br />{`${complianceSummary.auditRecent} recent events loaded`}</>
                          : 'Select a workspace to view status.'}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-blue-700" />
              </Link>
            </div>
          </section>

          {/* Real workspace contract analytics */}
          <ContractAnalytics documents={documentsWithCurrentStatus} />

        </section>

        {/* Contracts workspace */}
        <section aria-labelledby="contracts-heading" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="contracts-heading" className="text-xl font-bold tracking-tight text-slate-900">
                Contracts & documents
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search, review, and manage your workspace documents.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
              {filteredDocuments.length} {filteredDocuments.length === 1 ? 'result' : 'results'}
            </span>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40 sm:flex-row sm:items-center sm:justify-between">

          <div className="relative w-full sm:max-w-md">

            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              placeholder="Search vendor name..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />

          </div>

          <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0">

            {[
              'all',
              'Active',
              'Expiring Soon',
              'Expired',
            ].map((status) => (

              <button
                key={status}
                onClick={() =>
                  setStatusFilter(status)
                }
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 ring-1 ring-inset ring-blue-600'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {status === 'all'
                  ? 'All Statuses'
                  : status}
              </button>

            ))}

          </div>

        </div>

        {/* Main Data Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">

          <div className="overflow-x-auto">

            <table className="w-full border-collapse text-left text-sm">

              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  <th className="whitespace-nowrap px-4 py-4">Vendor Name</th>
                  <th className="whitespace-nowrap px-4 py-4">Document Type</th>
                  <th className="whitespace-nowrap px-4 py-4">Expiration Date</th>
                  <th className="whitespace-nowrap px-4 py-4">Auto-Renewal Window</th>
                  <th className="whitespace-nowrap px-4 py-4">Financial Value</th>
                  <th className="whitespace-nowrap px-4 py-4">Status</th>
                  <th className="whitespace-nowrap px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {loading ? (

                  Array.from({ length: 3 }).map(
                    (_, i) => (
                      <tr
                        key={i}
                        className="animate-pulse"
                      >
                        <td
                          colSpan={7}
                          className="p-4 h-12 bg-slate-50"
                        />
                      </tr>
                    )
                  )

                ) : filteredDocuments.length === 0 ? (

                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="mx-auto flex max-w-md flex-col items-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                          <FileText className="h-6 w-6" />
                        </span>
                        <h3 className="mt-4 text-sm font-semibold text-slate-900">
                          {documents.length === 0
                            ? 'No contracts yet'
                            : 'No matching documents'}
                        </h3>
                        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                          {documents.length === 0
                            ? 'Upload your first contract to start tracking expiration dates, renewal windows, and financial exposure.'
                            : 'Try a different search term or select another status filter.'}
                        </p>
                        {documents.length === 0 && (
                          <button
                            type="button"
                            onClick={() => setIsUploadOpen(true)}
                            disabled={
                              !['owner', 'admin', 'member'].includes(
                                workspaces.find(
                                  (workspace: any) =>
                                    workspace.id === selectedWorkspaceId
                                )?.role
                              )
                            }
                            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus className="h-4 w-4" />
                            Upload your first contract
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                ) : (

                  filteredDocuments.map((doc) => {

                    const status =
                      doc.currentStatus;

                    return (
                      <tr
                        key={doc.id}
                        className="transition-colors duration-150 hover:bg-slate-50/80"
                      >

                        <td className="min-w-[180px] px-4 py-4 font-semibold leading-5 text-slate-900">
                          {doc.vendors?.name ||
                            'Unknown'}
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex max-w-[180px] items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {doc.document_type ||
                              'Contract'}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-700">
                          {doc.expiration_date ||
                            'N/A'}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                          {doc.auto_renewal
                            ? `${
                                doc.notice_period_days ||
                                30
                              } Days Notice`
                            : 'No Auto-Renewal'}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-medium tabular-nums text-slate-800">
                          $
                          {doc.financial_value
                            ? Number(
                                doc.financial_value
                              ).toLocaleString()
                            : '0'}
                        </td>

                        <td className="px-4 py-4">

                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : status ===
                                  'Expiring Soon'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >

                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                status === 'Active'
                                  ? 'bg-emerald-500'
                                  : status ===
                                    'Expiring Soon'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            />

                            {status}

                          </span>

                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right">

                          {doc.file_path && (
                            <button
                              onClick={() => handleOpenPdf(doc.id)}
                              className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                            >
                              Open PDF
                            </button>
                          )}

                          {(
                            ['owner', 'admin'].includes(
                              workspaces.find(
                                (workspace: any) =>
                                  workspace.id === selectedWorkspaceId
                              )?.role
                            ) ||
                            (
                              workspaces.find(
                                (workspace: any) =>
                                  workspace.id === selectedWorkspaceId
                              )?.role === 'member' &&
                              doc.user_id === userId
                            )
                          ) && (
                            <button
                              onClick={() => {
                                if (
                                  doc.document_type?.startsWith('Compliance Evidence:')
                                ) {
                                  const matchingEvidence = complianceEvidence.find(
                                    (item: any) => item.document_id === doc.id
                                  );

                                  if (!matchingEvidence) {
                                    toast.error('Evidence details are not ready yet. Please try again shortly.');
                                    return;
                                  }

                                  setEditingEvidence(matchingEvidence);
                                  return;
                                }

                                setEditingDoc(doc);
                              }}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                            >
                              Edit
                            </button>
                          )}

                          {['owner', 'admin'].includes(
                            workspaces.find(
                              (workspace: any) =>
                                workspace.id === selectedWorkspaceId
                            )?.role
                          ) && (
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1"
                            >
                              Delete
                            </button>
                          )}

                        </td>

                      </tr>
                    );
                  })

                )}

              </tbody>

            </table>

          </div>

          </div>
        </section>

      </main>
      </div>

      {companyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-modal-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 id="company-modal-title" className="text-lg font-semibold">
                Create Company Workspace
              </h2>

              <button
                type="button"
                onClick={() => {
                  if (!creatingCompany) {
                    setCompanyModalOpen(false);
                  }
                }}
                disabled={creatingCompany}
                aria-label="Close dialog"
                className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany}>
              <label
                htmlFor="company-name"
                className="block text-sm text-slate-700 mb-2"
              >
                Company name
              </label>

              <input
                id="company-name"
                type="text"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                maxLength={120}
                required
                autoFocus
                placeholder="Enter company name"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setCompanyModalOpen(false)}
                  disabled={creatingCompany}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creatingCompany || !companyName.trim()}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-500 disabled:opacity-50"
                >
                  {creatingCompany ? 'Creating...' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <UploadModal
        isOpen={isUploadOpen}
        workspaceId={selectedWorkspaceId}
        onClose={() =>
          setIsUploadOpen(false)
        }
        onSuccess={fetchDocuments}
      />

      <EditDocumentModal
        key={editingDoc?.id ?? 'no-document'}
        document={editingDoc}
        workspaceId={selectedWorkspaceId}
        isOpen={!!editingDoc}
        onClose={() => setEditingDoc(null)}
        onSuccess={fetchDocuments}
        workspaceMembers={companyMembers}
        canAssign={workspaces.some(
          (workspace: any) =>
            workspace.id === selectedWorkspaceId &&
            workspace.type === 'company' &&
            ['owner', 'admin'].includes(workspace.role)
        )}
      />

      <EditComplianceEvidenceModal
        evidenceRecord={editingEvidence}
        workspaceId={selectedWorkspaceId}
        onClose={() => setEditingEvidence(null)}
        onSuccess={fetchDocuments}
      />

    </div>
  );
}
