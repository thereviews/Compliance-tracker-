import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Gap = {
  id: string;
  category:
    | 'unmapped_requirement'
    | 'not_implemented'
    | 'in_progress'
    | 'effectiveness'
    | 'missing_evidence'
    | 'expired_evidence'
    | 'rejected_evidence';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  requirementId: string | null;
  controlId: string | null;
  evidenceId: string | null;
  action: {
    id: string;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
  } | null;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return jsonError('Unauthorized', 401);
    }

    const supabase = getAuthClient(authHeader);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError('Unauthorized', 401);
    }

    const workspaceId = new URL(req.url).searchParams.get('workspaceId');

    if (!workspaceId || !uuidPattern.test(workspaceId)) {
      return jsonError('A valid workspace ID is required.', 400);
    }

    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) {
      console.error('CYBERSECURITY GAPS MEMBERSHIP:', membershipError.message);
      return jsonError('Could not verify workspace access.', 500);
    }

    if (!membership) {
      return jsonError('You do not have access to this workspace.', 403);
    }

    const [
      frameworksResult,
      requirementsResult,
      controlsResult,
      requirementLinksResult,
      evidenceResult,
      evidenceLinksResult,
      actionsResult,
    ] = await Promise.all([
      supabase
        .from('security_frameworks')
        .select('id, name, version')
        .eq('workspace_id', workspaceId),

      supabase
        .from('security_requirements')
        .select('id, framework_id, requirement_code, title, priority')
        .eq('workspace_id', workspaceId),

      supabase
        .from('security_controls')
        .select('id, control_code, title, implementation_status, effectiveness_status')
        .eq('workspace_id', workspaceId),

      supabase
        .from('security_requirement_controls')
        .select('requirement_id, control_id')
        .eq('workspace_id', workspaceId),

      supabase
        .from('security_evidence')
        .select('id, file_name, expiration_date, verification_status')
        .eq('workspace_id', workspaceId),

      supabase
        .from('security_control_evidence')
        .select('control_id, evidence_id')
        .eq('workspace_id', workspaceId),

      supabase
        .from('corrective_actions')
        .select('id, security_control_id, title, status, priority, due_date')
        .eq('workspace_id', workspaceId)
        .not('security_control_id', 'is', null),
    ]);

    const errors = [
      frameworksResult.error,
      requirementsResult.error,
      controlsResult.error,
      requirementLinksResult.error,
      evidenceResult.error,
      evidenceLinksResult.error,
      actionsResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error(
        'CYBERSECURITY GAPS QUERY:',
        errors.map((error) => error?.message),
      );
      return jsonError('Could not calculate cybersecurity gaps.', 500);
    }

    const frameworks = frameworksResult.data ?? [];
    const requirements = requirementsResult.data ?? [];
    const controls = controlsResult.data ?? [];
    const requirementLinks = requirementLinksResult.data ?? [];
    const evidence = evidenceResult.data ?? [];
    const evidenceLinks = evidenceLinksResult.data ?? [];
    const actions = actionsResult.data ?? [];

    const frameworkById = new Map(
      frameworks.map((framework) => [framework.id, framework]),
    );

    const controlIdsByRequirement = new Map<string, string[]>();

    for (const link of requirementLinks) {
      const ids = controlIdsByRequirement.get(link.requirement_id) ?? [];
      ids.push(link.control_id);
      controlIdsByRequirement.set(link.requirement_id, ids);
    }

    const evidenceIdsByControl = new Map<string, string[]>();

    for (const link of evidenceLinks) {
      const ids = evidenceIdsByControl.get(link.control_id) ?? [];
      ids.push(link.evidence_id);
      evidenceIdsByControl.set(link.control_id, ids);
    }

    const evidenceById = new Map(
      evidence.map((item) => [item.id, item]),
    );

    const actionsByControl = new Map<
      string,
      (typeof actions)[number][]
    >();

    for (const action of actions) {
      if (!action.security_control_id) continue;

      const existing = actionsByControl.get(action.security_control_id) ?? [];
      existing.push(action);
      actionsByControl.set(action.security_control_id, existing);
    }

    const gaps: Gap[] = [];

    function linkedAction(controlId: string | null) {
      if (!controlId) return null;

      const matching = actionsByControl.get(controlId) ?? [];

      const active = matching.find(
        (action) => !['resolved', 'closed'].includes(action.status),
      );

      const action = active ?? matching[0];

      return action
        ? {
            id: action.id,
            title: action.title,
            status: action.status,
            priority: action.priority,
            due_date: action.due_date,
          }
        : null;
    }

    for (const requirement of requirements) {
      const linkedControlIds =
        controlIdsByRequirement.get(requirement.id) ?? [];

      if (linkedControlIds.length > 0) continue;

      const framework = frameworkById.get(requirement.framework_id);

      gaps.push({
        id: `unmapped:${requirement.id}`,
        category: 'unmapped_requirement',
        severity:
          requirement.priority === 'critical'
            ? 'critical'
            : requirement.priority === 'high'
              ? 'high'
              : 'medium',
        title: `${requirement.requirement_code}: ${requirement.title}`,
        description: `This requirement in ${framework?.name ?? 'its framework'} has no linked security control.`,
        requirementId: requirement.id,
        controlId: null,
        evidenceId: null,
        action: null,
      });
    }

    for (const control of controls) {
      const controlName = control.control_code
        ? `${control.control_code}: ${control.title}`
        : control.title;

      const action = linkedAction(control.id);

      if (control.implementation_status === 'not_started') {
        gaps.push({
          id: `not-implemented:${control.id}`,
          category: 'not_implemented',
          severity: 'high',
          title: `${controlName} — not implemented`,
          description: 'This security control has not been started.',
          requirementId: null,
          controlId: control.id,
          evidenceId: null,
          action,
        });
      } else if (control.implementation_status === 'in_progress') {
        gaps.push({
          id: `in-progress:${control.id}`,
          category: 'in_progress',
          severity: 'medium',
          title: `${controlName} — implementation in progress`,
          description: 'This security control is not yet fully implemented.',
          requirementId: null,
          controlId: control.id,
          evidenceId: null,
          action,
        });
      }

      if (
        control.effectiveness_status === 'needs_improvement' ||
        control.effectiveness_status === 'ineffective'
      ) {
        gaps.push({
          id: `effectiveness:${control.id}`,
          category: 'effectiveness',
          severity:
            control.effectiveness_status === 'ineffective'
              ? 'critical'
              : 'high',
          title: `${controlName} — effectiveness issue`,
          description:
            control.effectiveness_status === 'ineffective'
              ? 'This control has been assessed as ineffective.'
              : 'This control needs improvement based on its effectiveness assessment.',
          requirementId: null,
          controlId: control.id,
          evidenceId: null,
          action,
        });
      }

      const linkedEvidenceIds = evidenceIdsByControl.get(control.id) ?? [];

      if (
        control.implementation_status === 'implemented' &&
        linkedEvidenceIds.length === 0
      ) {
        gaps.push({
          id: `missing-evidence:${control.id}`,
          category: 'missing_evidence',
          severity: 'high',
          title: `${controlName} — missing evidence`,
          description: 'This implemented control has no supporting evidence linked to it.',
          requirementId: null,
          controlId: control.id,
          evidenceId: null,
          action,
        });
      }
    }

    const today = new Date().toISOString().slice(0, 10);

    for (const item of evidence) {
      const linkedControlIds = evidenceLinks
        .filter((link) => link.evidence_id === item.id)
        .map((link) => link.control_id);

      const evidenceControls = linkedControlIds.length > 0
        ? linkedControlIds
        : [null];

      if (item.expiration_date && item.expiration_date < today) {
        for (const controlId of evidenceControls) {
          gaps.push({
            id: `expired-evidence:${item.id}:${controlId ?? 'unlinked'}`,
            category: 'expired_evidence',
            severity: 'high',
            title: `${item.file_name} — expired evidence`,
            description: `This evidence expired on ${item.expiration_date}.`,
            requirementId: null,
            controlId,
            evidenceId: item.id,
            action: linkedAction(controlId),
          });
        }
      }

      if (item.verification_status === 'rejected') {
        for (const controlId of evidenceControls) {
          gaps.push({
            id: `rejected-evidence:${item.id}:${controlId ?? 'unlinked'}`,
            category: 'rejected_evidence',
            severity: 'high',
            title: `${item.file_name} — rejected evidence`,
            description: 'This evidence has been rejected and should be reviewed or replaced.',
            requirementId: null,
            controlId,
            evidenceId: item.id,
            action: linkedAction(controlId),
          });
        }
      }
    }

    const severityOrder = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    gaps.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    );

    const counts = {
      total: gaps.length,
      critical: gaps.filter((gap) => gap.severity === 'critical').length,
      high: gaps.filter((gap) => gap.severity === 'high').length,
      medium: gaps.filter((gap) => gap.severity === 'medium').length,
      low: gaps.filter((gap) => gap.severity === 'low').length,
      unmappedRequirements: gaps.filter(
        (gap) => gap.category === 'unmapped_requirement',
      ).length,
      implementation: gaps.filter(
        (gap) =>
          gap.category === 'not_implemented' ||
          gap.category === 'in_progress',
      ).length,
      effectiveness: gaps.filter(
        (gap) => gap.category === 'effectiveness',
      ).length,
      evidence: gaps.filter(
        (gap) =>
          gap.category === 'missing_evidence' ||
          gap.category === 'expired_evidence' ||
          gap.category === 'rejected_evidence',
      ).length,
      withOpenActions: gaps.filter(
        (gap) =>
          gap.action &&
          !['resolved', 'closed'].includes(gap.action.status),
      ).length,
    };

    return NextResponse.json({
      gaps,
      counts,
      role: membership.role,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('CYBERSECURITY GAPS GET ERROR:', error);
    return jsonError('Could not calculate cybersecurity gaps.', 500);
  }
}
