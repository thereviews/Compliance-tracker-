import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function GET(req: Request) {
  try {
    const supabase = getAuthClient(req.headers.get('Authorization'));

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!isUuid(workspaceId)) {
      return NextResponse.json(
        { success: false, error: 'Valid workspaceId is required.' },
        { status: 400 }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) throw membershipError;

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Workspace access denied.' },
        { status: 403 }
      );
    }

    const [
      requirementsResult,
      evidenceResult,
      evidenceLinksResult,
      actionsResult
    ] = await Promise.all([
      supabase
        .from('compliance_requirements')
        .select('id, title, status, priority, deadline')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false }),

      supabase
        .from('compliance_evidence')
        .select('id, requirement_id')
        .eq('workspace_id', workspaceId),

      supabase
        .from('compliance_evidence_requirements')
        .select('evidence_id, requirement_id')
        .eq('workspace_id', workspaceId),

      supabase
        .from('compliance_actions')
        .select('id, title, status, due_date, requirement_id, assignee_id')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
    ]);

    if (requirementsResult.error) throw requirementsResult.error;
    if (evidenceResult.error) throw evidenceResult.error;
    if (evidenceLinksResult.error) throw evidenceLinksResult.error;
    if (actionsResult.error) throw actionsResult.error;

    const requirements = requirementsResult.data || [];
    const evidence = evidenceResult.data || [];
    const evidenceLinks = evidenceLinksResult.data || [];
    const actions = actionsResult.data || [];

    const total = requirements.length;

    const normalizedStatus = (requirement: any) =>
      String(requirement.status || '').trim().toLowerCase();

    const compliant = requirements.filter(
      r => normalizedStatus(r) === 'compliant'
    ).length;

    const inProgress = requirements.filter(
      r => normalizedStatus(r) === 'in progress'
    ).length;

    const nonCompliant = requirements.filter(
      r => normalizedStatus(r) === 'non-compliant'
    ).length;

    const underReview = requirements.filter(
      r => normalizedStatus(r) === 'under review'
    ).length;

    const evidenceRequirementIds = new Set<string>();

    evidence.forEach(item => {
      if (item.requirement_id) {
        evidenceRequirementIds.add(item.requirement_id);
      }
    });

    evidenceLinks.forEach(link => {
      if (link.requirement_id) {
        evidenceRequirementIds.add(link.requirement_id);
      }
    });

    const requirementsWithEvidence = requirements.filter(
      r => evidenceRequirementIds.has(r.id)
    ).length;

    const openActions = actions.filter(
      a => a.status !== 'Completed'
    );

    const completedActions = actions.filter(
      a => a.status === 'Completed'
    ).length;

    const today = new Date().toISOString().slice(0, 10);

    const overdueActions = actions.filter(
      a =>
        a.status !== 'Completed' &&
        typeof a.due_date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(a.due_date) &&
        a.due_date < today
    ).length;

    return NextResponse.json({
      success: true,
      metrics: {
        totalRequirements: total,
        compliantCount: compliant,
        inProgressCount: inProgress,
        nonCompliantCount: nonCompliant,
        underReviewCount: underReview,
        progressPercentage: total > 0
          ? Math.round((compliant / total) * 100)
          : 0,
        totalEvidence: evidence.length,
        requirementsWithEvidence,
        requirementsWithoutEvidence: total - requirementsWithEvidence,
        evidenceCoveragePercentage: total > 0
          ? Math.round((requirementsWithEvidence / total) * 100)
          : 0,
        totalActions: actions.length,
        openActionsCount: openActions.length,
        completedActionsCount: completedActions,
        overdueActionsCount: overdueActions
      },
      requirements,
      evidence,
      evidenceLinks,
      actions
    });
  } catch (error: unknown) {
    console.error('Reports API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate report'
      },
      { status: 500 }
    );
  }
}
