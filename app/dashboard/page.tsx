'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase, getAuthHeaders } from '@/lib/supabase-client';
import { ShieldCheck, Upload, Plus, CheckCircle, Clock, AlertCircle, FileText, BarChart3, Settings, Users, UserRound, LogOut, LayoutDashboard, Menu, X, Activity, ArrowUpRight, CalendarDays, CheckCircle2, CircleAlert, FileCheck2, FileWarning, ListTodo, Pencil, Trash2 } from 'lucide-react';
import { UploadEvidenceModal } from '@/components/UploadEvidenceModal';
import { toast } from 'sonner';


const SkeletonBlock = ({ className = '' }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded-lg bg-slate-200 ${className}`}
  />
);

export default function Dashboard() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'register' | 'evidence' | 'actions' | 'reports' | 'settings' | 'account'>(
    pathname === '/settings' ? 'account' : 'dashboard'
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspace, setWorkspace] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<any[]>([]);
  const [workspaceName, setWorkspaceName] = useState('');
  const [savingWorkspace, setSavingWorkspace] = useState(false);

  const [accountName, setAccountName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [savingAccountName, setSavingAccountName] = useState(false);
  const [savingAccountEmail, setSavingAccountEmail] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Member'>('Member');
  const [inviting, setInviting] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [deepLinkRequirementId, setDeepLinkRequirementId] = useState<string | null>(null);
  const [deepLinkActionId, setDeepLinkActionId] = useState<string | null>(null);
  const [updatingRequirementId, setUpdatingRequirementId] = useState<string | null>(null);
  const [editingRequirementId, setEditingRequirementId] = useState<string | null>(null);
  const [creatingRequirement, setCreatingRequirement] = useState(false);
  const [savingRequirement, setSavingRequirement] = useState(false);
  const [deletingRequirementId, setDeletingRequirementId] = useState<string | null>(null);
  const [requirementTitle, setRequirementTitle] = useState('');
  const [requirementDescription, setRequirementDescription] = useState('');
  const [requirementSource, setRequirementSource] = useState('');
  const [requirementPriority, setRequirementPriority] = useState('');
  const [requirementDeadline, setRequirementDeadline] = useState('');
  const [requirementStatus, setRequirementStatus] = useState('Under Review');
  const [requirementOwnerId, setRequirementOwnerId] = useState('');

  const [registerSearch, setRegisterSearch] = useState('');
  const [registerStatusFilter, setRegisterStatusFilter] = useState('all');
  const [registerPriorityFilter, setRegisterPriorityFilter] = useState('all');
  const [registerSourceFilter, setRegisterSourceFilter] = useState('all');
  const [evidenceSearch, setEvidenceSearch] = useState('');
  const [evidenceTypeFilter, setEvidenceTypeFilter] = useState('all');
  const [evidenceLinkFilter, setEvidenceLinkFilter] = useState('all');
  const [actionSearch, setActionSearch] = useState('');
  const [actionStatusFilter, setActionStatusFilter] = useState('all');
  const [actionAssignmentFilter, setActionAssignmentFilter] = useState('all');
  const [evidence, setEvidence] = useState<any[]>([]);
  const [deletingEvidenceId, setDeletingEvidenceId] = useState<string | null>(null);
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const [showActionForm, setShowActionForm] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [deletingActionId, setDeletingActionId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'action' | 'evidence' | 'requirement';
    id: string;
    title: string;
    description: string;
  } | null>(null);
  const [actionTitle, setActionTitle] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [actionRequirementId, setActionRequirementId] = useState('');
  const [actionAssigneeId, setActionAssigneeId] = useState('');
  const [actionDueDate, setActionDueDate] = useState('');
  const [savingAction, setSavingAction] = useState(false);
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null);

  const router = useRouter();
  const workspaceDataRequest = useRef(0);
  const teamMembersRequest = useRef(0);
  const workspaceInitialization = useRef<Promise<void> | null>(null);
  const deepLinkScrolled = useRef<string | null>(null);
  const deepLinkHighlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspaceDataCache = useRef(
    new Map<string, { data: any[]; cachedAt: number }>()
  );

  const WORKSPACE_CACHE_TTL = 20_000;

  const getCachedWorkspaceSection = (
    wsId: string,
    section: 'requirements' | 'evidence' | 'actions'
  ): any[] | null => {
    const key = `${wsId}:${section}`;
    const cached = workspaceDataCache.current.get(key);

    if (!cached) return null;

    if (Date.now() - cached.cachedAt > WORKSPACE_CACHE_TTL) {
      workspaceDataCache.current.delete(key);
      return null;
    }

    return cached.data;
  };

  const setCachedWorkspaceSection = (
    wsId: string,
    section: 'requirements' | 'evidence' | 'actions',
    data: any[]
  ) => {
    workspaceDataCache.current.set(`${wsId}:${section}`, {
      data,
      cachedAt: Date.now()
    });
  };

  const invalidateWorkspaceCache = (
    wsId: string,
    ...sections: Array<'requirements' | 'evidence' | 'actions'>
  ) => {
    sections.forEach((section) => {
      workspaceDataCache.current.delete(`${wsId}:${section}`);
    });
  };

  useEffect(() => {
    if (!workspaceInitialization.current) {
      workspaceInitialization.current = initWorkspace();
    }
  }, []);

  useEffect(() => {
    if (pathname === '/settings') {
      setActiveTab('account');
    } else if (pathname === '/') {
      setActiveTab((current) => current === 'account' ? 'dashboard' : current);
    }
  }, [pathname]);


  useEffect(() => {
    if (loading) return;

    const targetId = deepLinkRequirementId
      ? `requirement-${deepLinkRequirementId}`
      : deepLinkActionId
        ? `action-${deepLinkActionId}`
        : null;

    if (!targetId || deepLinkScrolled.current === targetId) return;

    const target = document.getElementById(targetId);

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      deepLinkScrolled.current = targetId;

      if (deepLinkHighlightTimer.current) {
        clearTimeout(deepLinkHighlightTimer.current);
      }

      deepLinkHighlightTimer.current = setTimeout(() => {
        setDeepLinkRequirementId(null);
        setDeepLinkActionId(null);
        deepLinkHighlightTimer.current = null;
      }, 4000);
    }
  }, [loading, requirements, actions, activeTab, deepLinkRequirementId, deepLinkActionId]);

  useEffect(() => {
    return () => {
      if (deepLinkHighlightTimer.current) {
        clearTimeout(deepLinkHighlightTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if ((activeTab === 'settings' || activeTab === 'actions' || activeTab === 'register') && workspace?.id) {
      loadTeamMembers(workspace.id);
    }
  }, [activeTab, workspace?.id]);

  const initWorkspace = async () => {
    try {
      const nextPath = `${window.location.pathname}${window.location.search}`;
      const redirectToSignIn = () => {
        router.replace(`/signin?next=${encodeURIComponent(nextPath)}`);
      };

      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        redirectToSignIn();
        return;
      }

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        redirectToSignIn();
        return;
      }

      setCurrentUserId(user.id);

      const requestedParams = new URLSearchParams(window.location.search);
      const requestedTab = requestedParams.get('tab');
      const requestedRequirementId = requestedParams.get('requirementId');
      const requestedActionId = requestedParams.get('actionId');

      if (requestedTab === 'register' || requestedTab === 'actions') {
        setActiveTab(requestedTab);
      }

      if (requestedRequirementId) {
        setDeepLinkRequirementId(requestedRequirementId);
        setRegisterSearch('');
        setRegisterStatusFilter('all');
        setRegisterPriorityFilter('all');
        setRegisterSourceFilter('all');
        setActiveTab('register');
      }

      if (requestedActionId) {
        setDeepLinkActionId(requestedActionId);
        setActionSearch('');
        setActionStatusFilter('all');
        setActionAssignmentFilter('all');
        setActiveTab('actions');
      }

      const metadataName =
        user.user_metadata?.full_name ?? user.user_metadata?.name;
      const initialAccountName =
        typeof metadataName === 'string' ? metadataName.slice(0, 100) : '';

      setAccountName(initialAccountName);
      setAccountEmail(user.email || '');
      setNewAccountEmail(user.email || '');

      const requestedWorkspaceId = new URLSearchParams(
        window.location.search
      ).get('workspaceId');

      const { data: memberships, error: membershipError } =
        await supabase
          .from('workspace_members')
          .select('workspace_id, role, workspaces(name)')
          .eq('user_id', user.id);

      if (membershipError) {
        console.error('Workspace membership error:', membershipError);
        toast.error('Could not load your workspaces.');
        setLoading(false);
        return;
      }

      if (!Array.isArray(memberships)) {
        console.error('Unexpected workspace membership response.');
        toast.error('Could not verify your workspace memberships.');
        setLoading(false);
        return;
      }

      const allowedRoles = ['Owner', 'Admin', 'Member'];
      const workspaceIdPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      const userWorkspaces = memberships.map((membership: any) => {
        const relatedWorkspace = Array.isArray(membership?.workspaces)
          ? membership.workspaces[0]
          : membership?.workspaces;

        if (
          !membership ||
          typeof membership.workspace_id !== 'string' ||
          !workspaceIdPattern.test(membership.workspace_id) ||
          !allowedRoles.includes(membership.role)
        ) {
          return null;
        }

        const workspaceDisplayName =
          typeof relatedWorkspace?.name === 'string'
            ? relatedWorkspace.name.slice(0, 100)
            : 'Unnamed Workspace';

        return {
          id: membership.workspace_id,
          name: workspaceDisplayName || 'Unnamed Workspace',
          role: membership.role
        };
      });

      if (userWorkspaces.some((item: any) => item === null)) {
        console.error('Invalid workspace membership data received.');
        toast.error('Some workspace information could not be verified.');
        setLoading(false);
        return;
      }

      if (userWorkspaces.length > 0) {
        setAvailableWorkspaces(userWorkspaces);

        const selectedWorkspace = requestedWorkspaceId
          ? userWorkspaces.find(
              (item: any) => item.id === requestedWorkspaceId
            )
          : userWorkspaces[0];

        if (!selectedWorkspace) {
          toast.error('You do not have access to the requested workspace.');
          setLoading(false);
          return;
        }

        setWorkspace(selectedWorkspace);
        setWorkspaceName(selectedWorkspace.name);

        const url = new URL(window.location.href);
        url.searchParams.set('workspaceId', selectedWorkspace.id);
        window.history.replaceState({}, '', url.toString());

        loadWorkspaceData(selectedWorkspace.id);
        return;
      }

      if (requestedWorkspaceId) {
        toast.error('You do not have access to the invited workspace.');
        setLoading(false);
        return;
      }

      // Create a workspace only when the user has no memberships.
      const { data: createdWorkspace, error: createError } =
        await supabase.rpc('create_default_workspace');

      if (createError) {
        console.error('Workspace creation error:', createError);
        toast.error('Could not create your workspace.');
        setLoading(false);
        return;
      }

      const newWs = Array.isArray(createdWorkspace)
        ? createdWorkspace[0]
        : createdWorkspace;

      if (
        !newWs ||
        typeof newWs.id !== 'string' ||
        !workspaceIdPattern.test(newWs.id) ||
        (newWs.name != null && typeof newWs.name !== 'string')
      ) {
        console.error('Invalid workspace creation response.');
        toast.error('Workspace creation returned invalid information.');
        setLoading(false);
        return;
      }

      const newWorkspace = {
        id: newWs.id,
        name:
          typeof newWs.name === 'string' && newWs.name.trim()
            ? newWs.name.trim().slice(0, 100)
            : 'Default Workspace',
        role: 'Owner'
      };

      setAvailableWorkspaces([newWorkspace]);
      setWorkspace(newWorkspace);
      setWorkspaceName(newWorkspace.name);

      const url = new URL(window.location.href);
      url.searchParams.set('workspaceId', newWorkspace.id);
      window.history.replaceState({}, '', url.toString());

      loadWorkspaceData(newWorkspace.id);
    } catch (error) {
      console.error('Dashboard initialization error:', error);
      toast.error('Could not initialize your dashboard. Please refresh and try again.');
      setLoading(false);
    }
  };

  const switchWorkspace = (workspaceId: string) => {
    const selectedWorkspace = availableWorkspaces.find(
      (item: any) => item.id === workspaceId
    );

    if (!selectedWorkspace || selectedWorkspace.id === workspace?.id) {
      return;
    }

    // Invalidate any team request belonging to the previous workspace.
    teamMembersRequest.current += 1;
    setTeamLoading(false);

    // Clear the previous workspace's information immediately.
    setWorkspace(selectedWorkspace);
    setWorkspaceName(selectedWorkspace.name);
    setRequirements([]);
    setEvidence([]);
    setActions([]);
    setTeamMembers([]);

    const url = new URL(window.location.href);
    url.searchParams.set('workspaceId', selectedWorkspace.id);
    window.history.replaceState({}, '', url.toString());

    loadWorkspaceData(selectedWorkspace.id);
  };

  const saveAccountName = async () => {
    const name = accountName.trim();

    if (!name || name.length > 100) {
      toast.error('Name must be between 1 and 100 characters.');
      return;
    }

    setSavingAccountName(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name }
      });

      if (error) throw error;

      setAccountName(name);
      toast.success('Personal information updated.');
    } catch (error: any) {
      toast.error(error.message || 'Could not update your name.');
    } finally {
      setSavingAccountName(false);
    }
  };

  const saveAccountEmail = async () => {
    const email = newAccountEmail.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid email address.');
      return;
    }

    if (email === accountEmail.toLowerCase()) {
      toast.error('This is already your current email address.');
      return;
    }

    setSavingAccountEmail(true);

    try {
      const { error } = await supabase.auth.updateUser({ email });

      if (error) throw error;

      toast.success('Email change requested. Check your inbox to confirm the new address.');
    } catch (error: any) {
      toast.error(error.message || 'Could not update your email.');
    } finally {
      setSavingAccountEmail(false);
    }
  };

  const changeAccountPassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error('Complete all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    if (!accountEmail) {
      toast.error('Your account email is unavailable. Please sign in again.');
      return;
    }

    setChangingPassword(true);

    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: accountEmail,
        password: currentPassword
      });

      if (verifyError) {
        throw new Error('Current password is incorrect.');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      toast.success('Password changed successfully.');
    } catch (error: any) {
      toast.error(error.message || 'Could not change your password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const saveWorkspaceName = async () => {
    const name = workspaceName.trim();

    if (!name || name.length > 100) {
      toast.error('Workspace name must be between 1 and 100 characters.');
      return;
    }

    if (!workspace?.id || !['Owner', 'Admin'].includes(workspace.role)) {
      toast.error('You do not have permission to rename this workspace.');
      return;
    }

    setSavingWorkspace(true);

    try {
      const headers = await getAuthHeaders();

      const response = await fetch('/api/workspaces', {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          name
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Could not update workspace name.');
      }

      setWorkspace((current: any) => ({
        ...current,
        name: result.workspace.name
      }));
      setWorkspaceName(result.workspace.name);
      setAvailableWorkspaces((current: any[]) =>
        current.map((item: any) =>
          item.id === workspace.id
            ? { ...item, name: result.workspace.name }
            : item
        )
      );
      toast.success('Workspace name updated.');
    } catch (error: any) {
      console.error('Workspace rename error:', error);
      toast.error(error.message || 'Could not update workspace name.');
    } finally {
      setSavingWorkspace(false);
    }
  };

  const loadTeamMembers = async (wsId: string) => {
    const requestId = ++teamMembersRequest.current;
    setTeamLoading(true);

    const isCurrentRequest = () =>
      teamMembersRequest.current === requestId;

    try {
      const headers = await getAuthHeaders();

      if (!isCurrentRequest()) return;

      const response = await fetch(
        `/api/workspaces/members?workspaceId=${encodeURIComponent(wsId)}`,
        { headers }
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Could not load team members.');
      }

      if (!isCurrentRequest()) return;

      setTeamMembers(Array.isArray(result.members) ? result.members : []);
    } catch (error) {
      if (!isCurrentRequest()) return;

      console.error('Team loading error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Could not load team members.'
      );
      setTeamMembers([]);
    } finally {
      if (isCurrentRequest()) {
        setTeamLoading(false);
      }
    }
  };

  const updateMemberRole = async (userId: string, role: 'Admin' | 'Member') => {
    if (!workspace?.id || workspace.role !== 'Owner') {
      toast.error('Only the workspace Owner can change roles.');
      return;
    }

    setUpdatingMemberId(userId);

    try {
      const headers = await getAuthHeaders();

      const response = await fetch('/api/workspaces/members', {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          userId,
          role
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.details || result.error || 'Could not update role.');
      }

      toast.success(`Member role changed to ${role}.`);
      await loadTeamMembers(workspace.id);
    } catch (error: any) {
      console.error('Role update error:', error);
      toast.error(error.message || 'Could not update member role.');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const removeWorkspaceMember = async (member: any) => {
    if (!workspace?.id || !['Owner', 'Admin'].includes(workspace.role)) {
      toast.error('You do not have permission to remove members.');
      return;
    }

    if (member.role === 'Owner') {
      toast.error('The workspace Owner cannot be removed.');
      return;
    }

    if (workspace.role === 'Admin' && member.role !== 'Member') {
      toast.error('Admins can only remove Members.');
      return;
    }

    const memberName = member.name || member.email || 'this member';
    if (!window.confirm(`Remove ${memberName} from this workspace? They will lose access to its records and documents.`)) {
      return;
    }

    setRemovingMemberId(member.userId);

    try {
      const headers = await getAuthHeaders();

      const response = await fetch('/api/workspaces/members', {
        method: 'DELETE',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          userId: member.userId
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.details || result.error || 'Could not remove workspace member.');
      }

      toast.success(`${memberName} was removed from the workspace.`);
      await loadTeamMembers(workspace.id);
    } catch (error: any) {
      console.error('Member removal error:', error);
      toast.error(error.message || 'Could not remove workspace member.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workspace?.id || !['Owner', 'Admin'].includes(workspace.role)) {
      toast.error('You do not have permission to invite members.');
      return;
    }

    setInviting(true);

    try {
      const headers = await getAuthHeaders();

      const response = await fetch('/api/workspaces/invitations', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          email: inviteEmail.trim(),
          role: inviteRole
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.details || result.error || 'Could not send invitation.');
      }

      toast.success('Invitation email sent.');
      setInviteEmail('');
      loadTeamMembers(workspace.id);
    } catch (error: any) {
      console.error('Invitation error:', error);
      toast.error(error.message || 'Could not send invitation.');
    } finally {
      setInviting(false);
    }
  };

  const openEvidenceFile = async (ev: any) => {
    const { data, error } = await supabase.storage
      .from('compliance-evidence')
      .createSignedUrl(ev.file_path, 300);

    if (error || !data?.signedUrl) {
      toast.error(error?.message || 'Could not open document.');
      return;
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const loadWorkspaceData = async (
    wsId: string,
    sections: Array<'requirements' | 'evidence' | 'actions'> = [
      'requirements',
      'evidence',
      'actions'
    ]
  ) => {
    let shouldLoadRequirements = sections.includes('requirements');
    let shouldLoadEvidence = sections.includes('evidence');
    let shouldLoadActions = sections.includes('actions');

    const isFullLoad =
      shouldLoadRequirements && shouldLoadEvidence && shouldLoadActions;

    const requestId = isFullLoad
      ? ++workspaceDataRequest.current
      : workspaceDataRequest.current;

    if (isFullLoad) setLoading(true);

    const isCurrentRequest = () =>
      workspaceDataRequest.current === requestId;

    try {
      const cachedRequirements = shouldLoadRequirements
        ? getCachedWorkspaceSection(wsId, 'requirements')
        : null;
      const cachedEvidence = shouldLoadEvidence
        ? getCachedWorkspaceSection(wsId, 'evidence')
        : null;
      const cachedActions = shouldLoadActions
        ? getCachedWorkspaceSection(wsId, 'actions')
        : null;

      if (cachedRequirements !== null) {
        setRequirements(cachedRequirements);
        shouldLoadRequirements = false;
      }

      if (cachedEvidence !== null) {
        setEvidence(cachedEvidence);
        shouldLoadEvidence = false;
      }

      if (cachedActions !== null) {
        setActions(cachedActions);
        shouldLoadActions = false;
      }

      if (
        isFullLoad &&
        !shouldLoadRequirements &&
        !shouldLoadEvidence &&
        !shouldLoadActions
      ) {
        return;
      }
      const headers =
        shouldLoadRequirements || shouldLoadActions
          ? await getAuthHeaders()
          : null;

      if (!isCurrentRequest()) return;

      const tasks: Promise<void>[] = [];

      if (shouldLoadRequirements) {
        tasks.push((async () => {
          try {
            const response = await fetch(
              `/api/compliance/register?workspaceId=${encodeURIComponent(wsId)}`,
              { headers: headers || {} }
            );
            const result = await response.json();

            if (!response.ok || !result.success) {
              throw new Error(
                result.error || 'Could not load the compliance register.'
              );
            }

            if (!isCurrentRequest()) return;
            const loadedRequirements = Array.isArray(result.requirements)
              ? result.requirements
              : [];
            setCachedWorkspaceSection(wsId, 'requirements', loadedRequirements);
            setRequirements(loadedRequirements);
          } catch (error) {
            if (!isCurrentRequest()) return;
            console.error('Register loading error:', error);
            toast.error(
              error instanceof Error
                ? error.message
                : 'Could not load the compliance register.'
            );
          }
        })());
      }

      if (shouldLoadEvidence) {
        tasks.push((async () => {
          try {
            const evidenceRes = await supabase
              .from('compliance_evidence')
              .select('*, compliance_evidence_requirements(requirement_id)')
              .eq('workspace_id', wsId)
              .order('created_at', { ascending: false });

            if (!isCurrentRequest()) return;
            if (evidenceRes.error) throw evidenceRes.error;

            const loadedEvidence = evidenceRes.data || [];
            setCachedWorkspaceSection(wsId, 'evidence', loadedEvidence);
            setEvidence(loadedEvidence);
          } catch (error) {
            if (!isCurrentRequest()) return;
            console.error('Evidence loading error:', error);
            toast.error('Could not load documents and evidence.');
          }
        })());
      }

      if (shouldLoadActions) {
        tasks.push((async () => {
          try {
            const response = await fetch(
              `/api/compliance/actions?workspaceId=${encodeURIComponent(wsId)}`,
              { headers: headers || {} }
            );
            const result = await response.json();

            if (!response.ok || !result.success) {
              throw new Error(result.error || 'Could not load actions.');
            }

            if (!isCurrentRequest()) return;
            const loadedActions = Array.isArray(result.actions)
              ? result.actions
              : [];
            setCachedWorkspaceSection(wsId, 'actions', loadedActions);
            setActions(loadedActions);
          } catch (error) {
            if (!isCurrentRequest()) return;
            console.error('Actions loading error:', error);
            toast.error(
              error instanceof Error
                ? error.message
                : 'Could not load compliance actions.'
            );
          }
        })());
      }

      await Promise.all(tasks);
    } catch (error) {
      if (!isCurrentRequest()) return;
      console.error('Workspace data loading error:', error);
      toast.error('Could not load workspace data. Please try again.');
    } finally {
      if (isFullLoad && isCurrentRequest()) {
        setLoading(false);
      }
    }
  };

  const createAction = async () => {
    if (!workspace?.id || !actionTitle.trim()) {
      toast.error('Enter an action title.');
      return;
    }

    if (!actionDueDate || !/^\d{4}-\d{2}-\d{2}$/.test(actionDueDate)) {
      toast.error('An action due date is required.');
      return;
    }

    setSavingAction(true);

    try {
      const headers = await getAuthHeaders();
      const isEditing = Boolean(editingActionId);
      const response = await fetch('/api/compliance/actions', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          ...(isEditing ? { actionId: editingActionId } : {}),
          title: actionTitle.trim(),
          description: actionDescription.trim() || null,
          requirementId: actionRequirementId || null,
          assigneeId: actionAssigneeId || null,
          dueDate: actionDueDate || null
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || (isEditing ? 'Could not update action.' : 'Could not create action.'));
      }

      invalidateWorkspaceCache(workspace.id, 'actions');

      if (isEditing) {
        setActions((current) =>
          current.map((action) => action.id === editingActionId ? result.action : action)
        );
      } else {
        setActions((current) => [result.action, ...current]);
      }

      setActionTitle('');
      setActionDescription('');
      setActionRequirementId('');
      setActionAssigneeId('');
      setActionDueDate('');
      setEditingActionId(null);
      setShowActionForm(false);
      toast.success(isEditing ? 'Compliance action updated.' : 'Compliance action created.');
    } catch (error: unknown) {
      console.error('Action save error:', error);
      toast.error(error instanceof Error ? error.message : 'Could not save action.');
    } finally {
      setSavingAction(false);
    }
  };

  const editAction = (action: any) => {
    setEditingActionId(action.id);
    setActionTitle(action.title || '');
    setActionDescription(action.description || '');
    setActionRequirementId(action.requirement_id || '');
    setActionAssigneeId(action.assignee_id || '');
    setActionDueDate(action.due_date ? String(action.due_date).slice(0, 10) : '');
    setShowActionForm(true);
  };

  const deleteAction = async (actionId: string, confirmed = false) => {
    if (!workspace?.id || deletingActionId) return;

    if (!confirmed) {
      setDeleteConfirmation({
        type: 'action',
        id: actionId,
        title: 'this action',
        description: 'Are you sure you want to delete this action?'
      });
      return;
    }

    setDeletingActionId(actionId);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/compliance/actions', {
        method: 'DELETE',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workspaceId: workspace.id, actionId })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Could not delete action.');
      }

      invalidateWorkspaceCache(workspace.id, 'actions');
      setActions((current) => current.filter((action) => action.id !== actionId));

      if (editingActionId === actionId) {
        setEditingActionId(null);
        setShowActionForm(false);
      }
      toast.success('Action deleted.');
    } catch (error: unknown) {
      console.error('Action deletion error:', error);
      toast.error(error instanceof Error ? error.message : 'Could not delete action.');
    } finally {
      setDeletingActionId(null);
    }
  };

  const updateActionStatus = async (actionId: string, status: string) => {
    if (!workspace?.id) return;

    setUpdatingActionId(actionId);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/compliance/actions', {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          actionId,
          status
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.details || result.error || 'Could not update action.');
      }

      invalidateWorkspaceCache(workspace.id, 'actions');
      setActions((current) =>
        current.map((action) =>
          action.id === actionId ? result.action : action
        )
      );

      toast.success('Action status updated.');
    } catch (error: any) {
      console.error('Action update error:', error);
      toast.error(error.message || 'Could not update action.');
    } finally {
      setUpdatingActionId(null);
    }
  };

  const deleteEvidence = async (evidenceId: string, fileName: string, confirmed = false) => {
    if (!workspace?.id || deletingEvidenceId) return;

    if (!confirmed) {
      setDeleteConfirmation({
        type: 'evidence',
        id: evidenceId,
        title: fileName,
        description: 'Are you sure you want to delete this document?'
      });
      return;
    }

    setDeletingEvidenceId(evidenceId);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/evidence/delete', {
        method: 'DELETE',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          evidenceId
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Could not delete evidence document.');
      }

      invalidateWorkspaceCache(workspace.id, 'evidence');
      await loadWorkspaceData(workspace.id, ['evidence']);

      if (result.storageDeleted === false) {
        toast.warning('Evidence record deleted, but the uploaded file could not be removed from storage.');
      } else {
        toast.success('Evidence document deleted successfully.');
      }
    } catch (error: any) {
      console.error('Evidence delete error:', error);
      toast.error(error.message || 'Could not delete evidence document.');
    } finally {
      setDeletingEvidenceId(null);
    }
  };

  const startEditRequirement = (req: any) => {
    setEditingRequirementId(req.id);
    setRequirementTitle(req.title || '');
    setRequirementDescription(req.description || '');
    setRequirementSource(req.obligation_source || '');
    setRequirementPriority(req.priority || '');
    setRequirementDeadline(req.deadline ? String(req.deadline).slice(0, 10) : '');
    setRequirementStatus(req.status || 'Under Review');
    setRequirementOwnerId(req.owner_id || '');
  };

  const cancelEditRequirement = () => {
    setEditingRequirementId(null);
    setCreatingRequirement(false);
    setRequirementTitle('');
    setRequirementDescription('');
    setRequirementSource('');
    setRequirementPriority('');
    setRequirementDeadline('');
    setRequirementStatus('Under Review');
    setRequirementOwnerId('');
  };

  const startCreateRequirement = () => {
    cancelEditRequirement();
    setRequirementPriority('Medium');
    setCreatingRequirement(true);
  };

  const saveRequirement = async () => {
    if (!workspace?.id || (!editingRequirementId && !creatingRequirement)) return;

    if (!requirementTitle.trim()) {
      toast.error('Requirement title is required.');
      return;
    }

    if (!requirementDeadline || !/^\d{4}-\d{2}-\d{2}$/.test(requirementDeadline)) {
      toast.error('A valid requirement deadline is required.');
      return;
    }

    const isCreating = creatingRequirement;

    setSavingRequirement(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/compliance/register', {
        method: isCreating ? 'POST' : 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          ...(isCreating ? {
            appliesTo: 'our_organization',
            confirmed: true
          } : {
            requirementId: editingRequirementId
          }),
          title: requirementTitle,
          description: requirementDescription || null,
          obligationSource: requirementSource,
          priority: requirementPriority,
          deadline: requirementDeadline || null,
          status: requirementStatus,
          responsibleUserId: requirementOwnerId || null
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.details || result.error || 'Could not save requirement.');
      }

      invalidateWorkspaceCache(workspace.id, 'requirements');
      await loadWorkspaceData(workspace.id, ['requirements']);
      cancelEditRequirement();
      toast.success(
        isCreating
          ? 'Requirement created successfully.'
          : 'Requirement updated successfully.'
      );
    } catch (error: any) {
      console.error('Requirement save error:', error);
      toast.error(error.message || 'Could not save requirement.');
    } finally {
      setSavingRequirement(false);
    }
  };

  const deleteRequirement = async (requirementId: string, title: string, confirmed = false) => {
    if (!workspace?.id || deletingRequirementId) return;

    if (!confirmed) {
      setDeleteConfirmation({
        type: 'requirement',
        id: requirementId,
        title,
        description: 'Are you sure you want to delete this requirement?'
      });
      return;
    }

    setDeletingRequirementId(requirementId);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/compliance/register', {
        method: 'DELETE',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          requirementId
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.details || result.error || 'Could not delete requirement.');
      }

      if (editingRequirementId === requirementId) {
        cancelEditRequirement();
      }

      invalidateWorkspaceCache(
        workspace.id,
        'requirements',
        'evidence',
        'actions'
      );
      await loadWorkspaceData(workspace.id, ['requirements', 'evidence', 'actions']);
      toast.success('Requirement and linked records deleted.');
    } catch (error: any) {
      console.error('Requirement delete error:', error);
      toast.error(error.message || 'Could not delete requirement.');
    } finally {
      setDeletingRequirementId(null);
    }
  };

  const updateRequirementStatus = async (
    requirementId: string,
    status: string
  ) => {
    if (!workspace?.id) return;

    setUpdatingRequirementId(requirementId);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/compliance/register', {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          requirementId,
          status
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.details || result.error || 'Could not update requirement.'
        );
      }

      setRequirements((current) =>
        current.map((item) =>
          item.id === requirementId ? result.requirement : item
        )
      );

      invalidateWorkspaceCache(workspace.id, 'requirements');
      await loadWorkspaceData(workspace.id, ['requirements']);
      toast.success('Requirement status updated.');
    } catch (error: any) {
      console.error('Requirement status update error:', error);
      toast.error(error.message || 'Could not update requirement.');
    } finally {
      setUpdatingRequirementId(null);
    }
  };


  const reports = useMemo(() => {
    const reportRequirements = requirements || [];
    const reportActions = actions || [];
    const reportEvidence = evidence || [];

    const reportEvidenceLinks = reportEvidence.flatMap((item: any) =>
      (item.compliance_evidence_requirements || []).map((link: any) => ({
        evidence_id: item.id,
        requirement_id: link.requirement_id
      }))
    );

    const normalizedStatus = (item: any) =>
      String(item.status || '').trim().toLowerCase();

    const totalRequirements = reportRequirements.length;

    const compliantCount = reportRequirements.filter(
      (item: any) => normalizedStatus(item) === 'compliant'
    ).length;

    const inProgressCount = reportRequirements.filter(
      (item: any) => normalizedStatus(item) === 'in progress'
    ).length;

    const nonCompliantCount = reportRequirements.filter(
      (item: any) => normalizedStatus(item) === 'non-compliant'
    ).length;

    const underReviewCount = reportRequirements.filter(
      (item: any) => normalizedStatus(item) === 'under review'
    ).length;

    const evidenceRequirementIds = new Set<string>();

    reportEvidence.forEach((item: any) => {
      if (item.requirement_id) {
        evidenceRequirementIds.add(item.requirement_id);
      }
    });

    reportEvidenceLinks.forEach((link: any) => {
      if (link.requirement_id) {
        evidenceRequirementIds.add(link.requirement_id);
      }
    });

    const requirementsWithEvidence = reportRequirements.filter(
      (item: any) => evidenceRequirementIds.has(item.id)
    ).length;

    const completedActionsCount = reportActions.filter(
      (item: any) => item.status === 'Completed'
    ).length;

    const openActionsCount = reportActions.filter(
      (item: any) => item.status !== 'Completed'
    ).length;

    const today = new Date().toISOString().slice(0, 10);

    const overdueActionsCount = reportActions.filter(
      (item: any) =>
        item.status !== 'Completed' &&
        typeof item.due_date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.due_date) &&
        item.due_date < today
    ).length;

    return {
      totalRequirements,
      compliantCount,
      inProgressCount,
      nonCompliantCount,
      underReviewCount,
      progressPercentage: totalRequirements > 0
        ? Math.round((compliantCount / totalRequirements) * 100)
        : 0,
      totalEvidence: reportEvidence.length,
      requirementsWithEvidence,
      requirementsWithoutEvidence:
        totalRequirements - requirementsWithEvidence,
      evidenceCoveragePercentage: totalRequirements > 0
        ? Math.round((requirementsWithEvidence / totalRequirements) * 100)
        : 0,
      totalActions: reportActions.length,
      openActionsCount,
      completedActionsCount,
      overdueActionsCount,
      requirements: reportRequirements,
      actions: reportActions,
      evidence: reportEvidence,
      evidenceLinks: reportEvidenceLinks
    };
  }, [requirements, evidence, actions]);

  const reportRequirements = reports.requirements;
  const reportActions = reports.actions;
  const reportEvidence = reports.evidence;
  const reportEvidenceLinks = reports.evidenceLinks;

  const reportToday = new Date();
  reportToday.setHours(0, 0, 0, 0);

  const isReportDateOverdue = (value: string | null | undefined) => {
    if (!value) return false;
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime()) && date < reportToday;
  };

  const evidenceRequirementIds = new Set<string>([
    ...reportEvidence.map((item: any) => item.requirement_id),
    ...reportEvidenceLinks.map((item: any) => item.requirement_id)
  ].filter(Boolean));

  const requirementsWithoutEvidence = reportRequirements.filter(
    (item: any) => !evidenceRequirementIds.has(item.id)
  );

  const overdueRequirements = reportRequirements.filter(
    (item: any) =>
      item.status !== 'Compliant' && isReportDateOverdue(item.deadline)
  );

  const upcomingRequirements = reportRequirements.filter((item: any) => {
    if (!item.deadline || item.status === 'Compliant') return false;
    const date = new Date(`${item.deadline}T00:00:00`);
    const limit = new Date(reportToday);
    limit.setDate(limit.getDate() + 30);
    return date >= reportToday && date <= limit;
  });

  const openReportActions = reportActions.filter(
    (item: any) => item.status !== 'Completed'
  );

  const overdueActions = openReportActions.filter(
    (item: any) => isReportDateOverdue(item.due_date)
  );

  const upcomingActions = openReportActions.filter((item: any) => {
    if (!item.due_date) return false;
    const date = new Date(`${item.due_date}T00:00:00`);
    const limit = new Date(reportToday);
    limit.setDate(limit.getDate() + 30);
    return date >= reportToday && date <= limit;
  });

  const dashboardDeadlines = [
    ...overdueRequirements.map((item: any) => ({
      ...item,
      type: 'Requirement',
      dueDate: item.deadline
    })),
    ...overdueActions.map((item: any) => ({
      ...item,
      type: 'Action',
      dueDate: item.due_date
    })),
    ...upcomingRequirements.map((item: any) => ({
      ...item,
      type: 'Requirement',
      dueDate: item.deadline
    })),
    ...upcomingActions.map((item: any) => ({
      ...item,
      type: 'Action',
      dueDate: item.due_date
    }))
  ]
    .sort((a: any, b: any) =>
      new Date(`${a.dueDate}T00:00:00`).getTime() -
      new Date(`${b.dueDate}T00:00:00`).getTime()
    )
    .slice(0, 8);

  const registerSources = Array.from(
    new Set(
      requirements.map((req: any) => req.obligation_source || 'General Policy')
    )
  ).sort((a: any, b: any) => String(a).localeCompare(String(b)));

  const registerPriorities = Array.from(
    new Set(
      requirements
        .map((req: any) => req.priority)
        .filter(Boolean)
    )
  ).sort((a: any, b: any) => String(a).localeCompare(String(b)));

  const filteredRequirements = requirements.filter((req: any) => {
    const search = registerSearch.trim().toLowerCase();

    const matchesSearch =
      !search ||
      [req.title, req.description, req.obligation_source].some(
        (value) => String(value || '').toLowerCase().includes(search)
      );

    const matchesStatus =
      registerStatusFilter === 'all' ||
      (req.status || 'Under Review') === registerStatusFilter;

    const matchesPriority =
      registerPriorityFilter === 'all' ||
      req.priority === registerPriorityFilter;

    const matchesSource =
      registerSourceFilter === 'all' ||
      (req.obligation_source || 'General Policy') === registerSourceFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesSource;
  });

  const evidenceTypes = Array.from(
    new Set(
      evidence
        .map((ev: any) => ev.document_type || 'Document')
        .filter(Boolean)
    )
  ).sort((a: any, b: any) => String(a).localeCompare(String(b)));

  const filteredEvidence = evidence.filter((ev: any) => {
    const search = evidenceSearch.trim().toLowerCase();
    const isLinked = Boolean(
      ev.requirement_id || ev.compliance_evidence_requirements?.length
    );

    const matchesSearch =
      !search ||
      [ev.file_name, ev.document_type, ev.compliance_summary].some(
        (value) => String(value || '').toLowerCase().includes(search)
      );

    const matchesType =
      evidenceTypeFilter === 'all' ||
      (ev.document_type || 'Document') === evidenceTypeFilter;

    const matchesLink =
      evidenceLinkFilter === 'all' ||
      (evidenceLinkFilter === 'linked' && isLinked) ||
      (evidenceLinkFilter === 'standalone' && !isLinked);

    return matchesSearch && matchesType && matchesLink;
  });

  const linkedEvidenceCount = evidence.filter((ev: any) =>
    Boolean(ev.requirement_id || ev.compliance_evidence_requirements?.length)
  ).length;

  const standaloneEvidenceCount = evidence.length - linkedEvidenceCount;

  const actionToday = new Date();
  const actionTodayString = [
    actionToday.getFullYear(),
    String(actionToday.getMonth() + 1).padStart(2, '0'),
    String(actionToday.getDate()).padStart(2, '0')
  ].join('-');

  const openActionsCount = actions.filter(
    (act: any) => (act.status || 'Open') === 'Open'
  ).length;

  const inProgressActionsCount = actions.filter(
    (act: any) => act.status === 'In Progress'
  ).length;

  const completedActionsCount = actions.filter(
    (act: any) => act.status === 'Completed'
  ).length;

  const overdueActionsCount = actions.filter(
    (act: any) =>
      act.status !== 'Completed' &&
      Boolean(act.due_date) &&
      act.due_date < actionTodayString
  ).length;

  const filteredActions = actions.filter((act: any) => {
    const linkedRequirement = requirements.find(
      (req: any) => req.id === act.requirement_id
    );
    const assignedMember = teamMembers.find(
      (member: any) => member.userId === act.assignee_id
    );
    const search = actionSearch.trim().toLowerCase();

    const matchesSearch =
      !search ||
      [
        act.title,
        act.description,
        linkedRequirement?.title,
        assignedMember?.name,
        assignedMember?.email
      ].some((value) => String(value || '').toLowerCase().includes(search));

    const matchesStatus =
      actionStatusFilter === 'all' ||
      (act.status || 'Open') === actionStatusFilter;

    const isAssigned = Boolean(act.assignee_id);
    const matchesAssignment =
      actionAssignmentFilter === 'all' ||
      (actionAssignmentFilter === 'assigned' && isAssigned) ||
      (actionAssignmentFilter === 'unassigned' && !isAssigned);

    return matchesSearch && matchesStatus && matchesAssignment;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/30 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white text-slate-800 shadow-xl shadow-slate-900/5 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-slate-100 px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900">
              ComplianceTracker
            </h1>
            <p className="text-xs text-slate-500">Compliance workspace</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="ml-auto rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-100 px-4 py-5">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Current workspace
          </p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="truncate text-sm font-semibold text-slate-800">
              {workspace?.name || 'Loading workspace...'}
            </p>

            {availableWorkspaces.length > 1 && (
              <select
                value={workspace?.id || ''}
                onChange={(e) => switchWorkspace(e.target.value)}
                disabled={loading}
                aria-label="Switch workspace"
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
              >
                {availableWorkspaces.map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.role})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'register', label: 'Compliance Register', icon: ShieldCheck },
            { id: 'evidence', label: 'Documents & Evidence', icon: FileText },
            { id: 'actions', label: 'Actions', icon: Clock },
            { id: 'reports', label: 'Reports', icon: BarChart3 },
            { id: 'settings', label: 'Workspace & Team', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (window.location.pathname !== '/') {
                    router.push('/dashboard' + window.location.search);
                  }
                  setActiveTab(tab.id as any);
                  setSidebarOpen(false);
                }}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${
                  selected
                    ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${
                  selected ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                }`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={() => {
              router.push('/settings' + window.location.search);
              setActiveTab('account');
              setSidebarOpen(false);
            }}
            className={`mb-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${
              activeTab === 'account'
                ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <UserRound className={`h-5 w-5 shrink-0 ${
              activeTab === 'account' ? 'text-blue-600' : 'text-slate-400'
            }`} />
            Account settings
          </button>
          <button
            type="button"
            onClick={() => {
              supabase.auth.signOut();
              router.push('/signin');
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white md:ml-64">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-slate-900">
                {[
                  { id: 'dashboard', label: 'Dashboard' },
                  { id: 'register', label: 'Compliance Register' },
                  { id: 'evidence', label: 'Documents & Evidence' },
                  { id: 'actions', label: 'Actions' },
                  { id: 'reports', label: 'Reports' },
                  { id: 'settings', label: 'Workspace & Team' },
                  { id: 'account', label: 'Account settings' },
                ].find((tab) => tab.id === activeTab)?.label}
              </h2>
              <p className="hidden truncate text-xs text-slate-500 sm:block">
                {workspace?.name || 'Loading workspace...'}
              </p>
            </div>

            {availableWorkspaces.length > 1 && (
              <select
                value={workspace?.id || ''}
                onChange={(e) => switchWorkspace(e.target.value)}
                disabled={loading}
                aria-label="Switch workspace"
                className="hidden max-w-[190px] rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 disabled:opacity-50 lg:block"
              >
                {availableWorkspaces.map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.role})
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:px-4"
          >
            <Upload className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span>Upload</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:ml-64">
        {loading ? (
          <div className="space-y-7" aria-label="Loading workspace" aria-busy="true">
            {activeTab === 'dashboard' && (
              <div className="space-y-7">
                <div className="space-y-3">
                  <SkeletonBlock className="h-4 w-36" />
                  <SkeletonBlock className="h-8 w-64 max-w-full" />
                  <SkeletonBlock className="h-4 w-80 max-w-full" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <SkeletonBlock className="h-4 w-28" />
                      <SkeletonBlock className="mt-4 h-9 w-20" />
                      <SkeletonBlock className="mt-3 h-3 w-32" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
                    <SkeletonBlock className="h-5 w-44" />
                    <div className="mt-6 flex items-center gap-6">
                      <SkeletonBlock className="h-40 w-40 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-4">
                        {[1, 2, 3, 4].map((item) => <SkeletonBlock key={item} className="h-4 w-full" />)}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                    <SkeletonBlock className="h-5 w-40" />
                    <div className="mt-6 space-y-5">
                      {[1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-12 w-full" />)}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <SkeletonBlock className="h-5 w-48" />
                  <div className="mt-6 space-y-4">
                    {[1, 2, 3, 4, 5].map((item) => <SkeletonBlock key={item} className="h-12 w-full" />)}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'register' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <SkeletonBlock className="h-8 w-64 max-w-full" />
                  <SkeletonBlock className="h-4 w-80 max-w-full" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <SkeletonBlock className="h-3 w-28" />
                      <SkeletonBlock className="mt-3 h-8 w-16" />
                      <SkeletonBlock className="mt-3 h-3 w-32" />
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => <SkeletonBlock key={item} className="h-10 w-full" />)}
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <SkeletonBlock className="h-5 w-48" />
                  <div className="mt-6 space-y-4">
                    {[1, 2, 3, 4, 5, 6].map((item) => <SkeletonBlock key={item} className="h-12 w-full" />)}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'evidence' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <SkeletonBlock className="h-4 w-36" />
                  <SkeletonBlock className="h-8 w-64 max-w-full" />
                  <SkeletonBlock className="h-4 w-80 max-w-full" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <SkeletonBlock className="h-4 w-32" />
                      <SkeletonBlock className="mt-4 h-9 w-16" />
                      <SkeletonBlock className="mt-3 h-3 w-36" />
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <SkeletonBlock className="h-5 w-44" />
                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {[1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-10 w-full" />)}
                  </div>
                  <div className="mt-6 space-y-4">
                    {[1, 2, 3, 4, 5].map((item) => <SkeletonBlock key={item} className="h-14 w-full" />)}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <SkeletonBlock className="h-8 w-64 max-w-full" />
                  <SkeletonBlock className="h-4 w-80 max-w-full" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <SkeletonBlock className="h-4 w-28" />
                      <SkeletonBlock className="mt-4 h-9 w-16" />
                      <SkeletonBlock className="mt-3 h-3 w-36" />
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <SkeletonBlock className="h-5 w-40" />
                  <div className="mt-6 space-y-4">
                    {[1, 2, 3, 4, 5].map((item) => <SkeletonBlock key={item} className="h-16 w-full" />)}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <SkeletonBlock className="h-4 w-36" />
                  <SkeletonBlock className="h-8 w-64 max-w-full" />
                  <SkeletonBlock className="h-4 w-80 max-w-full" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="space-y-4">
                      <SkeletonBlock className="h-4 w-48" />
                      <SkeletonBlock className="h-12 w-28" />
                      <SkeletonBlock className="h-3 w-full" />
                      <SkeletonBlock className="h-3 w-full" />
                    </div>
                    <SkeletonBlock className="h-32 w-full" />
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => <SkeletonBlock key={item} className="h-20 w-full" />)}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <SkeletonBlock className="h-4 w-36" />
                      <SkeletonBlock className="mt-4 h-9 w-20" />
                      <SkeletonBlock className="mt-4 h-3 w-full" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {[1, 2].map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <SkeletonBlock className="h-5 w-40" />
                      <div className="mt-5 space-y-4">
                        {[1, 2, 3, 4].map((row) => <SkeletonBlock key={row} className="h-10 w-full" />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="mx-auto max-w-5xl space-y-6">
                <div className="space-y-3">
                  <SkeletonBlock className="h-8 w-64 max-w-full" />
                  <SkeletonBlock className="h-4 w-80 max-w-full" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SkeletonBlock className="h-5 w-40" />
                  <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                    {[1, 2].map((item) => (
                      <div key={item} className="space-y-4">
                        <SkeletonBlock className="h-4 w-28" />
                        <SkeletonBlock className="h-11 w-full" />
                        <SkeletonBlock className="h-9 w-32" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
                    <SkeletonBlock className="h-5 w-44" />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {[1, 2, 3].map((item) => (
                        <SkeletonBlock key={item} className="h-11 w-full" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="mx-auto max-w-5xl space-y-6">
                <div className="space-y-3">
                  <SkeletonBlock className="h-8 w-64 max-w-full" />
                  <SkeletonBlock className="h-4 w-80 max-w-full" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SkeletonBlock className="h-5 w-40" />
                  <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <SkeletonBlock className="h-4 w-28" />
                      <SkeletonBlock className="h-12 w-full" />
                      <SkeletonBlock className="h-9 w-36" />
                    </div>
                    <div className="space-y-4">
                      <SkeletonBlock className="h-4 w-24" />
                      <SkeletonBlock className="h-12 w-full" />
                      <SkeletonBlock className="h-4 w-28" />
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SkeletonBlock className="h-5 w-44" />
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_190px_auto]">
                    {[1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-11 w-full" />)}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SkeletonBlock className="h-5 w-36" />
                  <div className="mt-6 space-y-4">
                    {[1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-14 w-full" />)}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
          <div className="space-y-7">

            {/* Dashboard heading */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                  <LayoutDashboard className="h-4 w-4" />
                  Workspace overview
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Compliance dashboard
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Monitor obligations, evidence, deadlines and outstanding actions.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CalendarDays className="h-4 w-4" />
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Total obligations</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950 tabular-nums">
                      {reports?.totalRequirements || 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">Tracked in your register</span>
                  <button onClick={() => setActiveTab('register')} className="text-xs font-semibold text-blue-700 hover:text-blue-900">
                    View register <ArrowUpRight className="ml-1 inline h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Compliance rate</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-blue-700 tabular-nums">
                      {reports?.progressPercentage || 0}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${reports?.progressPercentage || 0}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {reports?.compliantCount || 0} of {reports?.totalRequirements || 0} obligations compliant
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Open actions</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950 tabular-nums">
                      {reports?.openActionsCount || 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
                    <ListTodo className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">
                    {overdueActions.length} overdue
                  </span>
                  <button onClick={() => setActiveTab('actions')} className="text-xs font-semibold text-blue-700 hover:text-blue-900">
                    View actions <ArrowUpRight className="ml-1 inline h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Evidence coverage</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950 tabular-nums">
                      {reports?.evidenceCoveragePercentage || 0}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all"
                    style={{ width: `${reports?.evidenceCoveragePercentage || 0}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {reports?.requirementsWithEvidence || 0} obligations with linked evidence
                </p>
              </div>
            </div>

            {/* Charts and attention */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">

              {/* Compliance status chart */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Compliance status</h3>
                    <p className="mt-1 text-sm text-slate-500">Current distribution of registered obligations</p>
                  </div>
                  <button onClick={() => setActiveTab('register')} className="text-sm font-semibold text-blue-700 hover:text-blue-900">
                    Full register <ArrowUpRight className="ml-1 inline h-4 w-4" />
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:items-center">
                  <div className="flex items-center justify-center">
                    <div
                      className="relative flex h-44 w-44 items-center justify-center rounded-full"
                      style={{
                        background: `conic-gradient(
                          #059669 0% ${reports?.totalRequirements ? (reports.compliantCount / reports.totalRequirements) * 100 : 0}%,
                          #2563eb ${reports?.totalRequirements ? (reports.compliantCount / reports.totalRequirements) * 100 : 0}% ${reports?.totalRequirements ? ((reports.compliantCount + reports.inProgressCount) / reports.totalRequirements) * 100 : 0}%,
                          #d97706 ${reports?.totalRequirements ? ((reports.compliantCount + reports.inProgressCount) / reports.totalRequirements) * 100 : 0}% ${reports?.totalRequirements ? ((reports.compliantCount + reports.inProgressCount + reports.underReviewCount) / reports.totalRequirements) * 100 : 0}%,
                          #dc2626 ${reports?.totalRequirements ? ((reports.compliantCount + reports.inProgressCount + reports.underReviewCount) / reports.totalRequirements) * 100 : 0}% 100%
                        )`
                      }}
                    >
                      <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                        <span className="text-3xl font-bold tracking-tight text-slate-950">
                          {reports?.progressPercentage || 0}%
                        </span>
                        <span className="mt-1 text-xs text-slate-500">Compliant</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      { label: 'Compliant', count: reports?.compliantCount || 0, color: 'bg-emerald-600', dot: 'bg-emerald-600' },
                      { label: 'In progress', count: reports?.inProgressCount || 0, color: 'bg-blue-600', dot: 'bg-blue-600' },
                      { label: 'Under review', count: reports?.underReviewCount || 0, color: 'bg-amber-600', dot: 'bg-amber-600' },
                      { label: 'Non-compliant', count: reports?.nonCompliantCount || 0, color: 'bg-red-600', dot: 'bg-red-600' }
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
                            {item.label}
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-slate-900">{item.count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${item.color}`}
                            style={{
                              width: `${reports?.totalRequirements ? (item.count / reports.totalRequirements) * 100 : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Requirements with evidence</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {reports?.requirementsWithEvidence || 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Requirements missing evidence</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {requirementsWithoutEvidence.length}
                    </p>
                  </div>
                </div>
              </section>

              {/* Attention required */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Attention required</h3>
                    <p className="mt-1 text-sm text-slate-500">Items that may need your attention</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                    <CircleAlert className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <button
                    onClick={() => setActiveTab('register')}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-red-200 hover:bg-red-50/50"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="rounded-lg bg-red-50 p-2 text-red-700">
                        <CalendarDays className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-800">Overdue requirements</span>
                        <span className="mt-0.5 block text-xs text-slate-500">Past deadline and not compliant</span>
                      </span>
                    </span>
                    <span className="text-xl font-bold tabular-nums text-red-700">{overdueRequirements.length}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('evidence')}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-amber-200 hover:bg-amber-50/50"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="rounded-lg bg-amber-50 p-2 text-amber-700">
                        <FileWarning className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-800">Missing evidence</span>
                        <span className="mt-0.5 block text-xs text-slate-500">Requirements without linked documents</span>
                      </span>
                    </span>
                    <span className="text-xl font-bold tabular-nums text-amber-700">{requirementsWithoutEvidence.length}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('actions')}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-red-200 hover:bg-red-50/50"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="rounded-lg bg-red-50 p-2 text-red-700">
                        <ListTodo className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-800">Overdue actions</span>
                        <span className="mt-0.5 block text-xs text-slate-500">Open actions past their due date</span>
                      </span>
                    </span>
                    <span className="text-xl font-bold tabular-nums text-red-700">{overdueActions.length}</span>
                  </button>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">Open actions</span>
                    <span className="font-bold text-slate-950">{openReportActions.length}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{
                        width: `${reportActions.length ? (openReportActions.length / reportActions.length) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {reportActions.filter((item: any) => item.status === 'Completed').length} completed out of {reportActions.length} total actions
                  </p>
                </div>
              </section>
            </div>

            {/* Deadline table */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-950">Deadline overview</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Overdue and upcoming requirements and actions
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {overdueRequirements.length + overdueActions.length} overdue
                  </span>
                  <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    {upcomingRequirements.length + upcomingActions.length} upcoming
                  </span>
                </div>
              </div>

              {dashboardDeadlines.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-800">No immediate deadlines</p>
                  <p className="mt-1 text-sm text-slate-500">There are no overdue or upcoming items in the next 30 days.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left">
                    <thead className="bg-slate-50">
                      <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3">Item</th>
                        <th className="px-5 py-3">Type</th>
                        <th className="px-5 py-3">Priority</th>
                        <th className="px-5 py-3">Due date</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dashboardDeadlines.map((item: any) => {
                        const overdue = isReportDateOverdue(item.dueDate);
                        const statusClass =
                          item.status === 'Compliant' || item.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.status === 'Non-Compliant'
                              ? 'bg-red-50 text-red-700'
                              : item.status === 'Under Review'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-blue-50 text-blue-700';

                        return (
                          <tr key={`${item.type}-${item.id}`} className="transition hover:bg-slate-50">
                            <td className="max-w-[280px] px-5 py-4">
                              <p className="truncate text-sm font-semibold text-slate-900">{item.title || 'Untitled item'}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-xs font-medium text-slate-600">{item.type}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-xs font-medium text-slate-600">{item.priority || '—'}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`whitespace-nowrap text-sm font-medium ${overdue ? 'text-red-700' : 'text-slate-700'}`}>
                                {new Date(`${item.dueDate}T00:00:00`).toLocaleDateString(undefined, {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                                {overdue && <span className="ml-1 text-xs font-semibold">(Overdue)</span>}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
                                {item.status || 'Open'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                <span className="text-xs text-slate-500">Showing up to 8 items</span>
                <div className="flex gap-4">
                  <button onClick={() => setActiveTab('register')} className="text-xs font-semibold text-blue-700 hover:text-blue-900">
                    View requirements
                  </button>
                  <button onClick={() => setActiveTab('actions')} className="text-xs font-semibold text-blue-700 hover:text-blue-900">
                    View actions
                  </button>
                </div>
              </div>
            </section>

          </div>
        )}

        {activeTab === 'register' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Compliance Register
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Track your obligations, ownership, deadlines and compliance status.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-slate-500">
                  Showing {filteredRequirements.length} of {requirements.length} obligations
                </p>
                <button
                  type="button"
                  onClick={startCreateRequirement}
                  disabled={savingRequirement}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Create Requirement
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Obligations</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{reports?.totalRequirements || 0}</p>
                <p className="mt-1 text-xs text-slate-500">Registered requirements</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Compliant</p>
                <p className="mt-2 text-3xl font-bold text-emerald-700">{reports?.compliantCount || 0}</p>
                <p className="mt-1 text-xs text-slate-500">Requirements met</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">In Progress</p>
                <p className="mt-2 text-3xl font-bold text-blue-700">{reports?.inProgressCount || 0}</p>
                <p className="mt-1 text-xs text-slate-500">Work underway</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Under Review</p>
                <p className="mt-2 text-3xl font-bold text-amber-700">{reports?.underReviewCount || 0}</p>
                <p className="mt-1 text-xs text-slate-500">Awaiting review</p>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Non-Compliant</p>
                <p className="mt-2 text-3xl font-bold text-rose-700">{reports?.nonCompliantCount || 0}</p>
                <p className="mt-1 text-xs text-slate-500">Needs attention</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Find and filter obligations</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Search by requirement or description, or narrow the register using the filters.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="xl:col-span-1">
                  <label htmlFor="register-search" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Search
                  </label>
                  <input
                    id="register-search"
                    type="search"
                    value={registerSearch}
                    onChange={(event) => setRegisterSearch(event.target.value)}
                    placeholder="Search obligations..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label htmlFor="register-status" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Status
                  </label>
                  <select
                    id="register-status"
                    value={registerStatusFilter}
                    onChange={(event) => setRegisterStatusFilter(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All statuses</option>
                    <option value="Under Review">Under Review</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Compliant">Compliant</option>
                    <option value="Non-Compliant">Non-Compliant</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="register-priority" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Priority
                  </label>
                  <select
                    id="register-priority"
                    value={registerPriorityFilter}
                    onChange={(event) => setRegisterPriorityFilter(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All priorities</option>
                    {registerPriorities.map((priority: any) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="register-source" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Source / Framework
                  </label>
                  <select
                    id="register-source"
                    value={registerSourceFilter}
                    onChange={(event) => setRegisterSourceFilter(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All sources</option>
                    {registerSources.map((source: any) => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(registerSearch || registerStatusFilter !== 'all' || registerPriorityFilter !== 'all' || registerSourceFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setRegisterSearch('');
                    setRegisterStatusFilter('all');
                    setRegisterPriorityFilter('all');
                    setRegisterSourceFilter('all');
                  }}
                  className="mt-3 text-xs font-semibold text-blue-700 hover:text-blue-800"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {(editingRequirementId || creatingRequirement) && (
              <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h3 className="text-base font-semibold text-slate-900">
                    {creatingRequirement ? 'Create requirement' : 'Edit requirement'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {creatingRequirement
                      ? 'Add an obligation to your register. You can attach supporting evidence later.'
                      : 'Update the obligation details, ownership and compliance status.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      Requirement title *
                    </label>
                    <input
                      type="text"
                      value={requirementTitle}
                      onChange={(event) => setRequirementTitle(event.target.value)}
                      maxLength={500}
                      required
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      Description
                    </label>
                    <textarea
                      value={requirementDescription}
                      onChange={(event) => setRequirementDescription(event.target.value)}
                      rows={3}
                      maxLength={3000}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      Source / Framework
                    </label>
                    <input
                      type="text"
                      value={requirementSource}
                      onChange={(event) => setRequirementSource(event.target.value)}
                      maxLength={200}
                      placeholder="Optional"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      Priority
                    </label>
                    <select
                      value={requirementPriority}
                      onChange={(event) => setRequirementPriority(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Select priority (defaults to Medium)</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      Deadline
                    </label>
                    <input
                      type="date"
                      required
                      value={requirementDeadline}
                      onChange={(event) => setRequirementDeadline(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      Status
                    </label>
                    <select
                      value={requirementStatus}
                      onChange={(event) => setRequirementStatus(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="Under Review">Under Review</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Compliant">Compliant</option>
                      <option value="Non-Compliant">Non-Compliant</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      Responsible Person
                    </label>
                    <select
                      value={requirementOwnerId}
                      onChange={(event) => setRequirementOwnerId(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.name || member.email || member.userId}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={cancelEditRequirement}
                    disabled={savingRequirement}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveRequirement}
                    disabled={savingRequirement || !requirementTitle.trim()}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingRequirement
                      ? 'Saving...'
                      : creatingRequirement
                        ? 'Create Requirement'
                        : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Registered obligations</h3>
                  <p className="mt-1 text-xs text-slate-500">Review ownership, priority, deadlines and update compliance status.</p>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {filteredRequirements.length} results
                </span>
              </div>

              {filteredRequirements.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    {requirements.length === 0 ? 'No obligations registered yet' : 'No matching obligations'}
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                    {requirements.length === 0
                      ? 'Create a requirement directly, or upload a document to extract and confirm requirements.'
                      : 'Try changing your search or filters to see more results.'}
                  </p>
                  {requirements.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRegisterSearch('');
                        setRegisterStatusFilter('all');
                        setRegisterPriorityFilter('all');
                        setRegisterSourceFilter('all');
                      }}
                      className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-800"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-4">Requirement</th>
                        <th className="px-5 py-4">Source / Framework</th>
                        <th className="px-5 py-4">Responsible Person</th>
                        <th className="px-5 py-4">Priority</th>
                        <th className="px-5 py-4">Deadline</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRequirements.map((req: any) => {
                        const owner = teamMembers.find(
                          (member: any) => member.userId === req.owner_id
                        );
                        const status = req.status || 'Under Review';
                        const statusClass =
                          status === 'Compliant'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : status === 'In Progress'
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                              : status === 'Non-Compliant'
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700';
                        const priority = String(req.priority || '').toLowerCase();
                        const priorityClass =
                          priority === 'critical'
                            ? 'bg-rose-50 text-rose-700'
                            : priority === 'high'
                              ? 'bg-orange-50 text-orange-700'
                              : priority === 'medium'
                                ? 'bg-blue-50 text-blue-700'
                                : priority === 'low'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-slate-100 text-slate-600';
                        const deadlineDate = req.deadline
                          ? new Date(`${req.deadline}T00:00:00`)
                          : null;
                        const isOverdue =
                          deadlineDate !== null &&
                          !Number.isNaN(deadlineDate.getTime()) &&
                          deadlineDate < reportToday &&
                          status !== 'Compliant';

                        return (
                          <tr
                            key={req.id}
                            id={`requirement-${req.id}`}
                            className={`transition-colors duration-700 ${
                              deepLinkRequirementId === req.id
                                ? 'bg-[#edf7f1] shadow-[inset_4px_0_0_#398263] ring-1 ring-inset ring-[#398263]/20'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="max-w-[280px] px-5 py-4">
                              <p className="font-semibold text-slate-900">{req.title || 'Untitled requirement'}</p>
                              {req.description && (
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                  {req.description}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {req.obligation_source || 'General Policy'}
                            </td>
                            <td className="px-5 py-4">
                              <p className="font-medium text-slate-800">
                                {owner?.name || owner?.email || 'Unassigned'}
                              </p>
                              {owner?.name && owner?.email && (
                                <p className="mt-0.5 text-xs text-slate-500">{owner.email}</p>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClass}`}>
                                {req.priority || 'Not set'}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {req.deadline ? (
                                <div>
                                  <p className={`whitespace-nowrap text-sm font-medium ${isOverdue ? 'text-rose-700' : 'text-slate-700'}`}>
                                    {deadlineDate?.toLocaleDateString()}
                                  </p>
                                  {isOverdue && (
                                    <span className="mt-1 inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                                      Overdue
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">No deadline</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <select
                                value={status}
                                onChange={(event) =>
                                  updateRequirementStatus(req.id, event.target.value)
                                }
                                disabled={(!['Owner', 'Admin'].includes(workspace?.role) && req.created_by !== currentUserId) || updatingRequirementId === req.id}
                                title={!['Owner', 'Admin'].includes(workspace?.role) && req.created_by !== currentUserId ? 'You can only change the status of requirements you created.' : undefined}
                                aria-label={`Update status for ${req.title || 'requirement'}`}
                                className={`rounded-lg border px-3 py-2 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-50 ${statusClass}`}
                              >
                                <option value="Under Review">Under Review</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Compliant">Compliant</option>
                                <option value="Non-Compliant">Non-Compliant</option>
                              </select>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => startEditRequirement(req)}
                                  disabled={!['Owner', 'Admin'].includes(workspace?.role) && req.created_by !== currentUserId}
                                  title={!['Owner', 'Admin'].includes(workspace?.role) && req.created_by !== currentUserId ? 'You can only edit requirements you created.' : undefined}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteRequirement(req.id, req.title || 'this requirement')}
                                  disabled={!['Owner', 'Admin'].includes(workspace?.role) || deletingRequirementId === req.id}
                                  title={!['Owner', 'Admin'].includes(workspace?.role) ? 'Only workspace Owners and Admins can delete records.' : undefined}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 disabled:cursor-wait disabled:opacity-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {deletingRequirementId === req.id ? 'Deleting...' : 'Delete'}
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
            </div>
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                <FileCheck2 className="h-4 w-4" />
                Evidence management
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Documents & Evidence
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Store, review and access the documents supporting your compliance obligations.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">Total documents</p>
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{evidence.length}</p>
                <p className="mt-1 text-xs text-slate-500">Uploaded to this workspace</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">Linked evidence</p>
                  <FileCheck2 className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{linkedEvidenceCount}</p>
                <p className="mt-1 text-xs text-slate-500">Connected to requirements</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">Standalone documents</p>
                  <FileText className="h-5 w-5 text-slate-500" />
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{standaloneEvidenceCount}</p>
                <p className="mt-1 text-xs text-slate-500">Not linked to a requirement</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">Document types</p>
                  <BarChart3 className="h-5 w-5 text-violet-600" />
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{evidenceTypes.length}</p>
                <p className="mt-1 text-xs text-slate-500">Distinct types in your library</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">Document library</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Search and filter uploaded compliance evidence.
                    </p>
                  </div>
                  <p className="text-xs font-medium text-slate-500">
                    Showing {filteredEvidence.length} of {evidence.length} documents
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="md:col-span-1">
                    <label htmlFor="evidence-search" className="mb-1.5 block text-xs font-medium text-slate-600">
                      Search documents
                    </label>
                    <input
                      id="evidence-search"
                      type="search"
                      value={evidenceSearch}
                      onChange={(event) => setEvidenceSearch(event.target.value)}
                      placeholder="Search name, type or summary..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label htmlFor="evidence-type" className="mb-1.5 block text-xs font-medium text-slate-600">
                      Document type
                    </label>
                    <select
                      id="evidence-type"
                      value={evidenceTypeFilter}
                      onChange={(event) => setEvidenceTypeFilter(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="all">All document types</option>
                      {evidenceTypes.map((type: any) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="evidence-link" className="mb-1.5 block text-xs font-medium text-slate-600">
                      Requirement link
                    </label>
                    <select
                      id="evidence-link"
                      value={evidenceLinkFilter}
                      onChange={(event) => setEvidenceLinkFilter(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="all">All documents</option>
                      <option value="linked">Linked to a requirement</option>
                      <option value="standalone">Standalone evidence</option>
                    </select>
                  </div>
                </div>

                {(evidenceSearch || evidenceTypeFilter !== 'all' || evidenceLinkFilter !== 'all') && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      {filteredEvidence.length} matching documents
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEvidenceSearch('');
                        setEvidenceTypeFilter('all');
                        setEvidenceLinkFilter('all');
                      }}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>

              {evidence.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                    <FileText className="h-7 w-7 text-blue-600" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">No documents uploaded yet</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                    Upload your first document to build a central library of compliance evidence and AI document summaries.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(true)}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Evidence
                  </button>
                </div>
              ) : filteredEvidence.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <CircleAlert className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className="mt-3 text-sm font-semibold text-slate-900">No matching documents</h3>
                  <p className="mt-1 text-sm text-slate-500">Try changing your search or filters.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setEvidenceSearch('');
                      setEvidenceTypeFilter('all');
                      setEvidenceLinkFilter('all');
                    }}
                    className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-800"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Document</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Uploaded</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Requirement link</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">AI summary</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEvidence.map((ev: any) => {
                        const isLinked = Boolean(
                          ev.requirement_id || ev.compliance_evidence_requirements?.length
                        );

                        return (
                          <tr key={ev.id} className="transition-colors hover:bg-slate-50/80">
                            <td className="max-w-[250px] px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                </div>
                                <p className="truncate text-sm font-semibold text-slate-900" title={ev.file_name}>
                                  {ev.file_name || 'Untitled document'}
                                </p>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                {ev.document_type || 'Document'}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                              {ev.created_at ? new Date(ev.created_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-5 py-4">
                              {isLinked ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Linked to requirement
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-slate-500">Standalone evidence</span>
                              )}
                            </td>
                            <td className="max-w-[300px] px-5 py-4">
                              <p className="line-clamp-2 text-xs leading-5 text-slate-600">
                                {ev.compliance_summary || 'No AI summary available.'}
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEvidenceFile(ev)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  View document
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteEvidence(ev.id, ev.file_name || 'this document')}
                                  disabled={!['Owner', 'Admin'].includes(workspace?.role) || deletingEvidenceId === ev.id}
                                  title={!['Owner', 'Admin'].includes(workspace?.role) ? 'Only workspace Owners and Admins can delete evidence.' : undefined}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {deletingEvidenceId === ev.id ? 'Deleting...' : 'Delete'}
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
            </div>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Compliance Actions
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Assign, monitor and complete work required to maintain compliance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (showActionForm) {
                    setShowActionForm(false);
                    setEditingActionId(null);
                    setActionTitle('');
                    setActionDescription('');
                    setActionRequirementId('');
                    setActionAssigneeId('');
                    setActionDueDate('');
                  } else {
                    setEditingActionId(null);
                    setActionTitle('');
                    setActionDescription('');
                    setActionRequirementId('');
                    setActionAssigneeId('');
                    setActionDueDate('');
                    setShowActionForm(true);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Plus size={17} />
                {showActionForm ? 'Close form' : 'New Action'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">Total actions</p>
                  <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                    <ListTodo size={19} />
                  </div>
                </div>
                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{actions.length}</p>
                <p className="mt-1 text-xs text-slate-500">All recorded action items</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">Open</p>
                  <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                    <Clock size={19} />
                  </div>
                </div>
                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{openActionsCount}</p>
                <p className="mt-1 text-xs text-slate-500">Waiting to be started</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">In progress</p>
                  <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                    <Activity size={19} />
                  </div>
                </div>
                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{inProgressActionsCount}</p>
                <p className="mt-1 text-xs text-slate-500">Currently being worked on</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">Completed</p>
                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                    <CheckCircle2 size={19} />
                  </div>
                </div>
                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{completedActionsCount}</p>
                <p className="mt-1 text-xs text-slate-500">Successfully completed</p>
              </div>
            </div>

            {overdueActionsCount > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                <CircleAlert size={19} className="shrink-0 text-rose-600" />
                <p className="text-sm font-medium text-rose-800">
                  {overdueActionsCount} {overdueActionsCount === 1 ? 'action is' : 'actions are'} overdue and need attention.
                </p>
              </div>
            )}

            {showActionForm && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
                  <h3 className="font-semibold text-slate-900">{editingActionId ? "Edit compliance action" : "Create compliance action"}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Define the work, link a requirement and assign responsibility.
                  </p>
                </div>

                <div className="space-y-5 p-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Action title *</label>
                    <input
                      type="text"
                      value={actionTitle}
                      onChange={(e) => setActionTitle(e.target.value)}
                      maxLength={200}
                      placeholder="e.g. Update the employee data protection policy"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                    <textarea
                      value={actionDescription}
                      onChange={(e) => setActionDescription(e.target.value)}
                      rows={3}
                      placeholder="Describe what needs to be done..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Related requirement</label>
                      <select
                        value={actionRequirementId}
                        onChange={(e) => setActionRequirementId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">No linked requirement</option>
                        {requirements.map((req) => (
                          <option key={req.id} value={req.id}>{req.title}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Assign to</label>
                      <select
                        value={actionAssigneeId}
                        onChange={(e) => setActionAssigneeId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.name || member.email || member.userId}
                          </option>
                        ))}
                      </select>
                      {teamMembers.length === 0 && (
                        <p className="mt-1 text-xs text-slate-500">No team members available to assign.</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Due date</label>
                      <input
                        type="date"
                        required
                        value={actionDueDate}
                        onChange={(e) => setActionDueDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionForm(false);
                        setEditingActionId(null);
                        setActionTitle('');
                        setActionDescription('');
                        setActionRequirementId('');
                        setActionAssigneeId('');
                        setActionDueDate('');
                      }}
                      disabled={savingAction}
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={createAction}
                      disabled={savingAction || !actionTitle.trim()}
                      className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingAction ? 'Saving...' : editingActionId ? 'Save Changes' : 'Create Action'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Action register</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {filteredActions.length} of {actions.length} actions displayed
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="relative sm:col-span-1">
                      <input
                        type="search"
                        value={actionSearch}
                        onChange={(e) => setActionSearch(e.target.value)}
                        placeholder="Search actions..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <select
                      value={actionStatusFilter}
                      onChange={(e) => setActionStatusFilter(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                    >
                      <option value="all">All statuses</option>
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>

                    <select
                      value={actionAssignmentFilter}
                      onChange={(e) => setActionAssignmentFilter(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                    >
                      <option value="all">All assignments</option>
                      <option value="assigned">Assigned</option>
                      <option value="unassigned">Unassigned</option>
                    </select>
                  </div>
                </div>
              </div>

              {actions.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <ListTodo size={24} />
                  </div>
                  <h3 className="font-semibold text-slate-900">No compliance actions yet</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                    Create an action when a requirement needs work, remediation or follow-up.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowActionForm(true)}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Plus size={16} />
                    Create your first action
                  </button>
                </div>
              ) : filteredActions.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <FileText size={26} className="mx-auto mb-3 text-slate-400" />
                  <h3 className="font-semibold text-slate-800">No matching actions</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Try changing your search or filters.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActionSearch('');
                      setActionStatusFilter('all');
                      setActionAssignmentFilter('all');
                    }}
                    className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3.5">Action item</th>
                        <th className="px-5 py-3.5">Requirement</th>
                        <th className="px-5 py-3.5">Responsible</th>
                        <th className="px-5 py-3.5">Due date</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredActions.map((act: any) => {
                        const assignedMember = teamMembers.find(
                          (member) => member.userId === act.assignee_id
                        );
                        const linkedRequirement = requirements.find(
                          (req) => req.id === act.requirement_id
                        );
                        const isOverdue =
                          act.status !== 'Completed' &&
                          Boolean(act.due_date) &&
                          act.due_date < actionTodayString;

                        return (
                          <tr
                            key={act.id}
                            id={`action-${act.id}`}
                            className={`transition-colors duration-700 ${
                              deepLinkActionId === act.id
                                ? 'bg-[#edf7f1] shadow-[inset_4px_0_0_#398263] ring-1 ring-inset ring-[#398263]/20'
                                : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="px-5 py-4">
                              <div className="font-semibold text-slate-900">{act.title}</div>
                              {act.description && (
                                <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                                  {act.description}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {linkedRequirement?.title || (
                                <span className="text-slate-400">Not linked</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {assignedMember
                                ? assignedMember.name || assignedMember.email
                                : <span className="text-slate-400">Unassigned</span>}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              {act.due_date ? (
                                <div>
                                  <span className={isOverdue ? 'font-semibold text-rose-600' : 'text-slate-600'}>
                                    {act.due_date}
                                  </span>
                                  {isOverdue && (
                                    <span className="mt-1 block text-xs font-medium text-rose-600">
                                      Overdue
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">No due date</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <select
                                value={act.status || 'Open'}
                                onChange={(e) => updateActionStatus(act.id, e.target.value)}
                                disabled={(!['Owner', 'Admin'].includes(workspace?.role) && act.created_by !== currentUserId) || updatingActionId === act.id}
                                title={!['Owner', 'Admin'].includes(workspace?.role) && act.created_by !== currentUserId ? 'You can only change the status of actions you created.' : undefined}
                                className={`rounded-lg border px-2.5 py-2 text-xs font-semibold outline-none transition disabled:opacity-50 ${
                                  act.status === 'Completed'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : act.status === 'In Progress'
                                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                                      : 'border-amber-200 bg-amber-50 text-amber-700'
                                }`}
                              >
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>
                              {updatingActionId === act.id && (
                                <span className="mt-1 block text-xs text-slate-400">Updating...</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => editAction(act)}
                                  disabled={(!['Owner', 'Admin'].includes(workspace?.role) && act.created_by !== currentUserId) || Boolean(deletingActionId)}
                                  title={!['Owner', 'Admin'].includes(workspace?.role) && act.created_by !== currentUserId ? 'You can only edit actions you created.' : undefined}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                  aria-label={`Edit ${act.title}`}
                                >
                                  <Pencil size={14} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteAction(act.id)}
                                  disabled={!['Owner', 'Admin'].includes(workspace?.role) || deletingActionId === act.id}
                                  title={!['Owner', 'Admin'].includes(workspace?.role) ? 'Only workspace Owners and Admins can delete records.' : undefined}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                  aria-label={`Delete ${act.title}`}
                                >
                                  <Trash2 size={14} />
                                  {deletingActionId === act.id ? 'Deleting...' : 'Delete'}
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
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div id="compliance-report" className="space-y-6">
            <style>{`@media print {
              body * { visibility: hidden !important; }
              #compliance-report, #compliance-report * { visibility: visible !important; }
              #compliance-report { position: absolute; left: 0; top: 0; width: 100%; padding: 24px !important; background: white !important; color: #111827 !important; }
              #compliance-report * { color: #111827 !important; }
              #compliance-report .report-card { background: white !important; border-color: #d1d5db !important; break-inside: avoid; }
              #compliance-report .report-muted { color: #4b5563 !important; }
              #compliance-report .report-accent { color: #047857 !important; }
              #compliance-report .no-print { display: none !important; }
            }`}</style>

            {/* Report header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Workspace reporting
                </p>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                  Compliance Report
                </h2>
                <p className="text-sm text-slate-500 report-muted mt-1">
                  Compliance posture and audit readiness overview.
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-500 report-muted">
                  <span>Workspace: {workspace?.name || 'Workspace'}</span>
                  <span>Generated: {new Date().toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={() => window.print()}
                className="no-print inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm"
              >
                Print / Save PDF
              </button>
            </div>

            {/* Overall compliance posture */}
            <div className="report-card bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px] gap-6 items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-600 report-muted">
                    Overall compliance score
                  </p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-5xl font-bold tracking-tight text-slate-900">
                      {reports?.progressPercentage || 0}%
                    </p>
                    <span className="text-sm text-slate-500 report-muted">compliant</span>
                  </div>
                  <p className="text-sm text-slate-500 report-muted mt-2">
                    {reports?.compliantCount || 0} of {reports?.totalRequirements || 0} requirements marked compliant
                  </p>
                  <div
                    className="w-full bg-slate-100 rounded-full h-3 overflow-hidden mt-5"
                    role="progressbar"
                    aria-valuenow={reports?.progressPercentage || 0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Overall compliance score"
                  >
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${reports?.progressPercentage || 0}%` }}
                    />
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 report-muted">
                    Requirements tracked
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">
                    {reports?.totalRequirements || 0}
                  </p>
                  <p className="text-xs text-slate-500 report-muted mt-1">
                    Across this workspace
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
                {[
                  { label: 'Compliant', value: reports?.compliantCount || 0, tone: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
                  { label: 'In Progress', value: reports?.inProgressCount || 0, tone: 'bg-blue-50 border-blue-100 text-blue-700' },
                  { label: 'Under Review', value: reports?.underReviewCount || 0, tone: 'bg-amber-50 border-amber-100 text-amber-700' },
                  { label: 'Non-Compliant', value: reports?.nonCompliantCount || 0, tone: 'bg-rose-50 border-rose-100 text-rose-700' }
                ].map((item) => (
                  <div key={item.label} className={`report-card border rounded-xl p-4 ${item.tone}`}>
                    <p className="text-xs font-semibold">{item.label}</p>
                    <p className="text-2xl font-bold mt-2 tabular-nums">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence coverage */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="report-card lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-700">Evidence coverage</p>
                <p className="text-3xl font-bold text-slate-900 mt-3 tabular-nums">
                  {reports?.evidenceCoveragePercentage || 0}%
                </p>
                <div
                  className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mt-4"
                  role="progressbar"
                  aria-valuenow={reports?.evidenceCoveragePercentage || 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Evidence coverage"
                >
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full"
                    style={{ width: `${reports?.evidenceCoveragePercentage || 0}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 report-muted mt-3">
                  {reports?.requirementsWithEvidence || 0} of {reports?.totalRequirements || 0} requirements have linked evidence
                </p>
              </div>

              <div className="report-card bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-700">Evidence records</p>
                <p className="text-3xl font-bold text-slate-900 mt-3 tabular-nums">
                  {reports?.totalEvidence || 0}
                </p>
                <p className="text-xs text-slate-500 report-muted mt-2">
                  Uploaded supporting documents
                </p>
              </div>

              <div className="report-card bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-700">Requirements without evidence</p>
                <p className="text-3xl font-bold text-rose-700 mt-3 tabular-nums">
                  {reports?.requirementsWithoutEvidence || 0}
                </p>
                <p className="text-xs text-slate-500 report-muted mt-2">
                  Requirements needing supporting documentation
                </p>
              </div>
            </div>

            {/* Deadlines and actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="report-card bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">Deadline overview</h3>
                    <p className="text-xs text-slate-500 report-muted mt-1">Requirement deadlines</p>
                  </div>
                  <span className="text-xs font-medium text-slate-500 report-muted">30-day outlook</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                    <p className="text-xs text-rose-700">Overdue</p>
                    <p className="text-2xl font-bold text-rose-700 mt-1 tabular-nums">{overdueRequirements.length}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                    <p className="text-xs text-amber-700">Due soon</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">{upcomingRequirements.length}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs text-slate-600">No deadline</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1 tabular-nums">
                      {reportRequirements.filter((item: any) => !item.deadline).length}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 report-muted">
                  Overdue and upcoming counts exclude requirements marked compliant.
                </p>
              </div>

              <div className="report-card bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">Corrective actions</h3>
                    <p className="text-xs text-slate-500 report-muted mt-1">Action status and deadlines</p>
                  </div>
                  <span className="text-xs font-medium text-slate-500 report-muted">Current status</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                    <p className="text-xs text-blue-700">Open actions</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1 tabular-nums">{openReportActions.length}</p>
                  </div>
                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                    <p className="text-xs text-rose-700">Overdue</p>
                    <p className="text-2xl font-bold text-rose-700 mt-1 tabular-nums">{overdueActions.length}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                    <p className="text-xs text-amber-700">Due within 30 days</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">{upcomingActions.length}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                    <p className="text-xs text-emerald-700">Completed</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{reports?.completedActionsCount || 0}</p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{
                      width: `${reportActions.length ? (reports?.completedActionsCount || 0) / reportActions.length * 100 : 0}%`
                    }}
                  />
                </div>
                <p className="text-xs text-slate-500 report-muted">
                  Completed actions compared with all recorded corrective actions.
                </p>
              </div>
            </div>

            {/* Requirements needing attention */}
            <div className="report-card bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">Requirements needing attention</h3>
                    <p className="text-xs text-slate-500 report-muted mt-1">All requirements not currently marked compliant</p>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                    {reportRequirements.filter((item: any) => item.status !== 'Compliant').length} to review
                  </span>
                </div>
              </div>
              {reportRequirements.filter((item: any) => item.status !== 'Compliant').length === 0 ? (
                <p className="text-sm text-emerald-700 report-accent p-5">
                  All requirements are currently marked compliant.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[620px]">
                    <thead className="bg-slate-50">
                      <tr className="text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3 font-semibold">Requirement</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                        <th className="px-5 py-3 font-semibold">Priority</th>
                        <th className="px-5 py-3 font-semibold">Deadline</th>
                        <th className="px-5 py-3 font-semibold">Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportRequirements
                        .filter((item: any) => item.status !== 'Compliant')
                        .map((item: any) => (
                          <tr key={item.id} className="align-top">
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                                {item.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-600 report-muted">
                              {item.priority || 'Not set'}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-600 report-muted">
                              {item.deadline || 'Not set'}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-xs font-semibold ${evidenceRequirementIds.has(item.id) ? 'text-emerald-700 report-accent' : 'text-rose-700'}`}>
                                {evidenceRequirementIds.has(item.id) ? 'Linked' : 'Missing'}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Overdue corrective actions */}
            <div className="report-card bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">Overdue corrective actions</h3>
                    <p className="text-xs text-slate-500 report-muted mt-1">Open actions past their due date</p>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">
                    {overdueActions.length} overdue
                  </span>
                </div>
              </div>
              {overdueActions.length === 0 ? (
                <p className="text-sm text-emerald-700 report-accent p-5">
                  No overdue corrective actions.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {overdueActions.map((item: any) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500 report-muted mt-1">
                          Due: {item.due_date || 'Not set'}
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Requirements missing evidence */}
            <div className="report-card bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">Requirements missing evidence</h3>
                    <p className="text-xs text-slate-500 report-muted mt-1">Requirements without linked supporting documents</p>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                    {requirementsWithoutEvidence.length} missing
                  </span>
                </div>
              </div>
              {requirementsWithoutEvidence.length === 0 ? (
                <p className="text-sm text-emerald-700 report-accent p-5">
                  Every requirement has linked evidence.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {requirementsWithoutEvidence.map((item: any) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500 report-muted mt-1">
                          {item.status} · {item.priority || 'No priority'}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
                        Evidence missing
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4 text-xs text-slate-500 report-muted">
              <p className="font-medium text-slate-700">Report notes</p>
              <p className="mt-1">
                Report generated for {workspace?.name || 'this workspace'}. Figures reflect records currently stored in ComplianceTracker.
                Audit readiness should be confirmed by reviewing the actual evidence and applicable obligations.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Account settings
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage your personal details and account security.
              </p>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <h3 className="text-base font-semibold text-slate-900">
                  Account information
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Update your account details and account security.
                </p>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="min-w-0">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Full name
                    </label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      maxLength={100}
                      placeholder="Your full name"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      onClick={saveAccountName}
                      disabled={savingAccountName || !accountName.trim()}
                      className="mt-3 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingAccountName ? 'Saving...' : 'Save name'}
                    </button>
                  </div>

                  <div className="min-w-0">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={newAccountEmail}
                      onChange={(e) => setNewAccountEmail(e.target.value)}
                      maxLength={254}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      You'll need to confirm your new email address.
                    </p>
                    <button
                      onClick={saveAccountEmail}
                      disabled={savingAccountEmail || !newAccountEmail.trim()}
                      className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingAccountEmail ? 'Sending...' : 'Update email'}
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-900">
                      Password & security
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Verify your current password before setting a new one.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="min-w-0">
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Current password
                      </label>
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        New password
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Confirm new password
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        minLength={6}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <button
                    onClick={changeAccountPassword}
                    disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                    className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {changingPassword ? 'Changing password...' : 'Update password'}
                  </button>
                </div>
              </div>
            </section>

          </div>
        )}

        {activeTab === 'settings' && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Workspace & Team
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage your workspace, invite colleagues and control team access.
              </p>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Workspace profile</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Your organisation's shared compliance workspace.
                    </p>
                  </div>
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {workspace?.role || 'Unknown'} access
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Workspace name
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    disabled={!['Owner', 'Admin'].includes(workspace?.role)}
                    maxLength={100}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                  />
                  {['Owner', 'Admin'].includes(workspace?.role) && (
                    <button
                      onClick={saveWorkspaceName}
                      disabled={savingWorkspace || !workspaceName.trim() || workspaceName.trim() === workspace?.name}
                      className="mt-3 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingWorkspace ? 'Saving...' : 'Save workspace name'}
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Workspace ID
                    </p>
                    <p className="break-all rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-600">
                      {workspace?.id || 'Not available'}
                    </p>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Your access level
                    </p>
                    <p className="text-sm font-medium text-slate-800">
                      {workspace?.role || 'Unknown'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Your role determines which workspace and team settings you can manage.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {['Owner', 'Admin'].includes(workspace?.role) && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h3 className="text-base font-semibold text-slate-900">Invite a team member</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Give a colleague access to this compliance workspace.
                  </p>
                </div>

                <form onSubmit={sendInvitation}>
                  <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[minmax(0,1fr)_190px_auto]">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Email address
                      </label>
                      <input
                        type="email"
                        required
                        maxLength={254}
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Workspace role
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'Admin' | 'Member')}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="Member">Member</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={inviting || !inviteEmail.trim()}
                      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {inviting ? 'Sending invitation...' : 'Send invitation'}
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Admins can invite members. Only workspace owners can change member roles.
                  </p>
                </form>
              </section>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Team members</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    People who currently have access to this workspace.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
                </span>
              </div>

              {teamLoading ? (
                <div className="divide-y divide-slate-100 px-6" aria-label="Loading team members" aria-busy="true">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex items-center justify-between gap-4 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <SkeletonBlock className="h-4 w-36 max-w-full" />
                          <SkeletonBlock className="h-3 w-52 max-w-full" />
                        </div>
                      </div>
                      <SkeletonBlock className="h-8 w-20 shrink-0 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm font-medium text-slate-700">No team members found</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Team members will appear here when they join your workspace.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {teamMembers.map((member) => (
                    <div
                      key={member.userId}
                      className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                          {(member.name || member.email || 'M').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {member.name || 'Workspace member'}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {member.email || 'No email available'}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        {workspace?.role === 'Owner' && member.role !== 'Owner' ? (
                          <select
                            value={member.role}
                            disabled={updatingMemberId === member.userId}
                            onChange={(e) =>
                              updateMemberRole(
                                member.userId,
                                e.target.value as 'Admin' | 'Member'
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 disabled:opacity-50"
                          >
                            <option value="Member">Member</option>
                            <option value="Admin">Admin</option>
                          </select>
                        ) : (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                            {member.role}
                          </span>
                        )}

                        {(workspace?.role === 'Owner' ||
                          (workspace?.role === 'Admin' && member.role === 'Member')) &&
                          member.role !== 'Owner' && (
                            <button
                              type="button"
                              onClick={() => removeWorkspaceMember(member)}
                              disabled={
                                removingMemberId === member.userId ||
                                updatingMemberId === member.userId
                              }
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {removingMemberId === member.userId ? 'Removing...' : 'Remove'}
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

          </>
        )}

      </main>

      {deleteConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirmation-title"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 id="delete-confirmation-title" className="text-lg font-semibold text-slate-900">
                    Delete {deleteConfirmation.type}?
                  </h2>
                  <p className="mt-1 break-words text-sm font-medium text-slate-700">
                    {deleteConfirmation.title}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {deleteConfirmation.description}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const pending = deleteConfirmation;
                  if (!pending) return;
                  setDeleteConfirmation(null);

                  if (pending.type === 'action') {
                    void deleteAction(pending.id, true);
                  } else if (pending.type === 'evidence') {
                    void deleteEvidence(pending.id, pending.title, true);
                  } else {
                    void deleteRequirement(pending.id, pending.title, true);
                  }
                }}
                className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {workspace && (
        <UploadEvidenceModal
          isOpen={isUploadOpen}
          workspaceId={workspace.id}
          onClose={() => setIsUploadOpen(false)}
          onSuccess={() => {
            invalidateWorkspaceCache(workspace.id, 'evidence');
            return loadWorkspaceData(workspace.id, ['evidence']);
          }}
        />
      )}
    </div>
  );
}

