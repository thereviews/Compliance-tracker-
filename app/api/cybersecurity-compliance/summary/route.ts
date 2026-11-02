import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      console.error('CYBERSECURITY MEMBERSHIP:', membershipError.message);
      return jsonError('Could not verify workspace access.', 500);
    }

    if (!membership) {
      return jsonError('You do not have access to this workspace.', 403);
    }

    const [
      frameworksResult,
      requirementsResult,
      controlsResult,
      evidenceResult,
      linksResult,
      requirementLinksResult,
      actionsResult,
    ] = await Promise.all([
      supabase
        .from('security_frameworks')
        .select('id, status')
        .eq('workspace_id', workspaceId),

      supabase
        .from('security_requirements')
        .select('id')
        .eq('workspace_id', workspaceId),

      supabase
        .from('security_controls')
        .select('id, implementation_status, effectiveness_status')
        .eq('workspace_id', workspaceId),

      supabase
        .from('security_evidence')
        .select('id, verification_status')
        .eq('workspace_id', workspaceId),

      supabase
        .from('security_control_evidence')
        .select('control_id')
        .eq('workspace_id', workspaceId),

      supabase
        .from('security_requirement_controls')
        .select('requirement_id')
        .eq('workspace_id', workspaceId),

      supabase
        .from('corrective_actions')
        .select('id, status')
        .eq('workspace_id', workspaceId)
        .not('security_control_id', 'is', null),
    ]);

    const errors = [
      frameworksResult.error,
      requirementsResult.error,
      controlsResult.error,
      evidenceResult.error,
      linksResult.error,
      requirementLinksResult.error,
      actionsResult.error,
    ].filter(Boolean);

    if (errors.length) {
      console.error(
        'CYBERSECURITY SUMMARY QUERY:',
        errors.map((error) => error?.message),
      );
      return jsonError('Could not load cybersecurity summary.', 500);
    }

    const frameworks = frameworksResult.data ?? [];
    const requirements = requirementsResult.data ?? [];
    const controls = controlsResult.data ?? [];
    const evidence = evidenceResult.data ?? [];
    const links = linksResult.data ?? [];
    const requirementLinks = requirementLinksResult.data ?? [];
    const actions = actionsResult.data ?? [];

    const controlsWithEvidence = new Set(
      links.map((link) => link.control_id),
    );

    const implementedControls = controls.filter(
      (control) => control.implementation_status === 'implemented',
    ).length;

    const evidenceBackedControls = controls.filter(
      (control) =>
        control.implementation_status === 'implemented' &&
        controlsWithEvidence.has(control.id),
    ).length;

    const mappedRequirementIds = new Set(
      requirementLinks.map((link) => link.requirement_id),
    );

    const unmappedRequirementCount = requirements.filter(
      (requirement) => !mappedRequirementIds.has(requirement.id),
    ).length;

    const controlGapCount = controls.filter((control) => {
      if (control.implementation_status === 'not_applicable') return false;

      return (
        control.implementation_status === 'not_started' ||
        control.implementation_status === 'in_progress' ||
        control.effectiveness_status === 'not_assessed' ||
        control.effectiveness_status === 'needs_improvement' ||
        control.effectiveness_status === 'ineffective' ||
        (control.implementation_status === 'implemented' &&
          !controlsWithEvidence.has(control.id))
      );
    }).length;

    const gaps = unmappedRequirementCount + controlGapCount;

    const openActions = actions.filter(
      (action) => !['resolved', 'closed'].includes(action.status),
    ).length;

    const readiness = controls.length
      ? Math.round((evidenceBackedControls / controls.length) * 100)
      : 0;

    return NextResponse.json({
      summary: {
        frameworkTotal: frameworks.length,
        activeFrameworks: frameworks.filter(
          (framework) => framework.status === 'active',
        ).length,
        requirementTotal: requirements.length,
        controlTotal: controls.length,
        implementedControls,
        evidenceTotal: evidence.length,
        verifiedEvidence: evidence.filter(
          (item) => item.verification_status === 'verified',
        ).length,
        gapTotal: gaps,
        openActions,
        evidenceBackedControls,
        readiness,
      },
      role: membership.role,
    });
  } catch (error) {
    console.error('CYBERSECURITY SUMMARY ERROR:', error);
    return jsonError('Could not load cybersecurity summary.', 500);
  }
}
