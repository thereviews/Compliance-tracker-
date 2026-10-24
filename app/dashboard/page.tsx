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
  FileText,
  AlertTriangle,
  Clock,
  History,
} from 'lucide-react';
import { UploadModal } from '@/components/UploadModal';
import { EditDocumentModal } from '@/components/EditDocumentModal';
import { ReminderSettings } from '@/components/ReminderSettings';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
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
        router.push('/login');
        return;
      }

      setUserEmail(user.email || '');
      setUserId(user.id);
      setAuthLoading(false);
    } catch (err) {
      console.error('AUTH CHECK ERROR:', err);
      router.push('/login');
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
    router.push('/login');
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-emerald-500">
        Verifying session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h1 className="font-bold text-lg tracking-tight">
              ComplianceTracker
            </h1>
          </div>

          <div className="flex items-center gap-4">
          <Link
          href="/compliance"
          className="flex items-center gap-2 border border-zinc-700 hover:border-emerald-500 text-zinc-300 hover:text-emerald-400 px-3 py-2 rounded-xl text-sm transition-colors"
>
          <ShieldCheck className="w-4 h-4" />
          Compliance
          </Link>

          <Link
            href="/compliance-register"
            className="flex items-center gap-2 border border-zinc-700 hover:border-emerald-500 text-zinc-300 hover:text-emerald-400 px-3 py-2 rounded-xl text-sm transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            Compliance Register
          </Link>

          <Link
            href="/corrective-actions"
            className="flex items-center gap-2 border border-zinc-700 hover:border-emerald-500 text-zinc-300 hover:text-emerald-400 px-3 py-2 rounded-xl text-sm transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            Corrective Actions
          </Link>

          <Link
            href="/compliance-reports"
            className="flex items-center gap-2 border border-zinc-700 hover:border-emerald-500 text-zinc-300 hover:text-emerald-400 px-3 py-2 rounded-xl text-sm transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            Compliance Reports
          </Link>

          <Link
            href="/vendor-risk"
            className="flex items-center gap-2 border border-zinc-700 hover:border-emerald-500 text-zinc-300 hover:text-emerald-400 px-3 py-2 rounded-xl text-sm transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            Vendor Risk
          </Link>

          <Link
            href="/compliance-evidence"
            className="flex items-center gap-2 border border-zinc-700 hover:border-emerald-500 text-zinc-300 hover:text-emerald-400 px-3 py-2 rounded-xl text-sm transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            Evidence
          </Link>

          <Link
            href="/audit-logs"
            className="flex items-center gap-2 border border-zinc-700 hover:border-emerald-500 text-zinc-300 hover:text-emerald-400 px-3 py-2 rounded-xl text-sm transition-colors"
          >
            <History className="w-4 h-4" />
            Audit Logs
          </Link>

            <span className="text-xs text-zinc-400 hidden sm:inline">
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
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Upload Document
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>

          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Workspaces */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Your Workspaces</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Manage your personal and company workspace memberships.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCompanyModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-2 rounded-xl text-sm"
            >
              <Plus className="w-4 h-4" />
              Create Company
            </button>
          </div>

          <div className="mb-5">
            <label
              htmlFor="workspace-selector"
              className="block text-sm font-medium text-zinc-300 mb-2"
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
              className="w-full sm:max-w-md bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
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
                <>
                <form
                  onSubmit={handleSendInvitation}
                  className="mt-5 border border-zinc-800 bg-zinc-950/60 rounded-xl p-4 space-y-4"
                >
                  <div>
                    <h3 className="font-semibold text-zinc-100">
                      Invite a Company Member
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                      Send an email invitation to join this company workspace.
                      Invitations expire after 48 hours.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="invite-email"
                        className="block text-sm font-medium text-zinc-300 mb-2"
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
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="invite-role"
                        className="block text-sm font-medium text-zinc-300 mb-2"
                      >
                        Role
                      </label>
                      <select
                        id="invite-role"
                        value={inviteRole}
                        onChange={(event) =>
                          setInviteRole(event.target.value as 'member' | 'viewer')
                        }
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingInvite || !inviteEmail.trim()}
                    className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-2.5 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingInvite ? 'Sending Invitation...' : 'Send Invitation'}
                  </button>
                </form>

                <div className="mt-4 border border-zinc-800 bg-zinc-950/60 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-zinc-100">
                      Pending Invitations
                    </h3>
                    <span className="text-xs text-zinc-400">
                      {pendingInvitations.length}
                    </span>
                  </div>

                  {invitationsLoading ? (
                    <p className="text-sm text-zinc-400 py-3">
                      Loading invitations...
                    </p>
                  ) : pendingInvitations.length === 0 ? (
                    <p className="text-sm text-zinc-400 py-3">
                      No pending invitations.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {pendingInvitations.map((invitation) => {
                        const expired =
                          new Date(invitation.expires_at).getTime() <= Date.now();

                        return (
                          <div
                            key={invitation.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-zinc-800 rounded-lg p-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-zinc-100 break-all">
                                {invitation.invited_email}
                              </p>
                              <p className="text-xs text-zinc-400 mt-1 capitalize">
                                Role: {invitation.role}
                              </p>
                              <p className={`text-xs mt-1 ${expired ? 'text-amber-400' : 'text-zinc-400'}`}>
                                {expired ? 'Expired' : 'Expires'}: {' '}
                                {new Date(invitation.expires_at).toLocaleString()}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRevokeInvitation(invitation.id)}
                              disabled={Boolean(revokingInvitationId)}
                              className="shrink-0 border border-red-900 text-red-300 hover:bg-red-950 rounded-lg px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="mt-4 border border-zinc-800 bg-zinc-950/60 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-zinc-100">
                      Company Members
                    </h3>
                    <span className="text-xs text-zinc-400">
                      {companyMembers.length}
                    </span>
                  </div>

                  {membersLoading ? (
                    <p className="text-sm text-zinc-400 py-3">
                      Loading company members...
                    </p>
                  ) : companyMembers.length === 0 ? (
                    <p className="text-sm text-zinc-400 py-3">
                      No company members found.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {companyMembers.map((member) => {
                        const isOwner = member.role === 'owner';
                        const isSelf = member.userId === userId;
                        const selectedRole =
                          memberRoleChanges[member.userId] ?? member.role;

                        return (
                          <div
                            key={member.userId}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-zinc-800 rounded-lg p-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-zinc-100 break-all">
                                {member.email || member.userId}
                                {isSelf ? ' (You)' : ''}
                              </p>

                              <p className="text-xs text-zinc-400 mt-1">
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
                                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
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
                                    className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-lg px-3 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
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
                                    className="border border-red-900 text-red-300 hover:bg-red-950 rounded-lg px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {memberActionId === member.userId
                                      ? 'Processing...'
                                      : 'Remove'}
                                  </button>
                                </>
                              )}

                              {isOwner && (
                                <span className="text-xs text-amber-300 border border-amber-900 rounded-lg px-3 py-2">
                                  Workspace Owner
                                </span>
                              )}

                              {isSelf && !isOwner && (
                                <span className="text-xs text-zinc-400">
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
                </>
              ) : null;
            })()}
          </div>

          {workspaceLoading ? (
            <p className="text-sm text-zinc-400 py-3">
              Loading workspaces...
            </p>
          ) : workspaces.length === 0 ? (
            <p className="text-sm text-zinc-400 py-3">
              No workspaces found.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="border border-zinc-800 bg-zinc-950/50 rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Building2 className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-medium break-words">
                        {workspace.name}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        {workspace.type === 'personal'
                          ? 'Personal workspace'
                          : 'Company workspace'}
                      </p>
                      <span className="inline-block mt-2 text-xs rounded-md bg-zinc-800 px-2 py-1 text-zinc-300 capitalize">
                        {workspace.role || 'member'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-zinc-500 mt-4">
            Documents are organized by workspace. Access to shared company documents depends on your role.
          </p>
        </section>

        {(() => {
          const selectedWorkspace = workspaces.find(
            (workspace: any) => workspace.id === selectedWorkspaceId
          );

          return selectedWorkspace ? (
            <ReminderSettings
              workspaceId={selectedWorkspace.id}
              role={selectedWorkspace.role || 'member'}
            />
          ) : null;
        })()}

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Total */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Total Contracts
              </span>

              <FileText className="w-5 h-5 text-emerald-400" />
            </div>

            <p className="text-2xl font-bold">
              {totalContracts}
            </p>
          </div>

          {/* Expiring */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Expiring Soon (30d)
              </span>

              <Clock className="w-5 h-5 text-amber-400" />
            </div>

            <p className="text-2xl font-bold text-amber-400">
              {expiringSoonCount}
            </p>
          </div>

          {/* Expired */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Expired / Action Needed
              </span>

              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>

            <p className="text-2xl font-bold text-rose-400">
              {expiredCount}
            </p>
          </div>

          {/* Value at Risk */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Value at Risk
              </span>

              <span className="text-xs font-bold text-zinc-400">
                $
              </span>
            </div>

            <p className="text-2xl font-bold">
              ${valueAtRisk.toLocaleString()}
            </p>
          </div>

        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">

          <div className="relative w-full sm:w-80">

            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />

            <input
              type="text"
              placeholder="Search vendor name..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 pl-9 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
            />

          </div>

          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">

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
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100'
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">

          <div className="overflow-x-auto">

            <table className="w-full text-left border-collapse text-sm">

              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-xs font-semibold uppercase tracking-wider bg-zinc-900/50">
                  <th className="p-4">Vendor Name</th>
                  <th className="p-4">Document Type</th>
                  <th className="p-4">Expiration Date</th>
                  <th className="p-4">Auto-Renewal Window</th>
                  <th className="p-4">Financial Value</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800">

                {loading ? (

                  Array.from({ length: 3 }).map(
                    (_, i) => (
                      <tr
                        key={i}
                        className="animate-pulse"
                      >
                        <td
                          colSpan={7}
                          className="p-4 h-12 bg-zinc-900/30"
                        />
                      </tr>
                    )
                  )

                ) : filteredDocuments.length === 0 ? (

                  <tr>
                    <td
                      colSpan={7}
                      className="p-12 text-center text-zinc-500"
                    >
                      {documents.length === 0
                        ? 'No documents uploaded yet. Upload your first contract to get started.'
                        : 'No documents match the selected filter.'}
                    </td>
                  </tr>

                ) : (

                  filteredDocuments.map((doc) => {

                    const status =
                      doc.currentStatus;

                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-zinc-800/30 transition-colors"
                      >

                        <td className="p-4 font-medium text-zinc-200">
                          {doc.vendors?.name ||
                            'Unknown'}
                        </td>

                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-300">
                            {doc.document_type ||
                              'Contract'}
                          </span>
                        </td>

                        <td className="p-4 text-zinc-300">
                          {doc.expiration_date ||
                            'N/A'}
                        </td>

                        <td className="p-4 text-zinc-400">
                          {doc.auto_renewal
                            ? `${
                                doc.notice_period_days ||
                                30
                              } Days Notice`
                            : 'No Auto-Renewal'}
                        </td>

                        <td className="p-4 font-mono text-zinc-300">
                          $
                          {doc.financial_value
                            ? Number(
                                doc.financial_value
                              ).toLocaleString()
                            : '0'}
                        </td>

                        <td className="p-4">

                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              status === 'Active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : status ===
                                  'Expiring Soon'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >

                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                status === 'Active'
                                  ? 'bg-emerald-400'
                                  : status ===
                                    'Expiring Soon'
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                              }`}
                            />

                            {status}

                          </span>

                        </td>

                        <td className="p-4 text-right space-x-2">

                          {doc.file_path && (
                            <button
                              onClick={() => handleOpenPdf(doc.id)}
                              className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-medium rounded-lg transition-colors"
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
                              onClick={() => setEditingDoc(doc)}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors"
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
                              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium rounded-lg transition-colors"
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

      </main>

      {companyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-modal-title"
            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
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
                className="p-2 text-zinc-400 hover:text-zinc-100 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany}>
              <label
                htmlFor="company-name"
                className="block text-sm text-zinc-300 mb-2"
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
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
              />

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setCompanyModalOpen(false)}
                  disabled={creatingCompany}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creatingCompany || !companyName.trim()}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
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

    </div>
  );
}
