import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';
import { writeAuditLog } from '@/lib/audit';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const implementationStatuses = [
  'not_started',
  'in_progress',
  'implemented',
  'not_applicable',
] as const;

const effectivenessStatuses = [
  'not_assessed',
  'effective',
  'needs_improvement',
  'ineffective',
] as const;

type ControlInput = {
  title?: unknown;
  controlCode?: unknown;
  description?: unknown;
  category?: unknown;
  implementationStatus?: unknown;
  effectivenessStatus?: unknown;
  owner?: unknown;
  reviewDate?: unknown;
  notes?: unknown;
  requirementIds?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function optionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > maxLength) return undefined;
  return value.trim() || null;
}

function validDate(value: unknown): boolean {
  if (value === null || value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

function validRequirementIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 200 &&
    value.every((id) => typeof id === 'string' && uuidPattern.test(id)) &&
    new Set(value).size === value.length
  );
}

async function authenticate(req: Request) {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return { error: jsonError('Unauthorized', 401) };
  }

  const supabase = getAuthClient(authHeader);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: jsonError('Unauthorized', 401) };
  }

  return { supabase, user };
}

async function verifyWorkspace(
  supabase: Awaited<ReturnType<typeof getAuthClient>>,
  workspaceId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('SECURITY CONTROLS MEMBERSHIP:', error.message);
    return { error: jsonError('Could not verify workspace access.', 500) };
  }

  if (!data) {
    return { error: jsonError('You do not have access to this workspace.', 403) };
  }

  return { role: data.role as string };
}

function canManage(role: string) {
  return role === 'owner' || role === 'admin';
}

async function validateRequirements(
  supabase: Awaited<ReturnType<typeof getAuthClient>>,
  workspaceId: string,
  requirementIds: string[],
) {
  if (requirementIds.length === 0) return true;

  const { data, error } = await supabase
    .from('security_requirements')
    .select('id')
    .eq('workspace_id', workspaceId)
    .in('id', requirementIds);

  if (error) {
    console.error('SECURITY CONTROL REQUIREMENTS:', error.message);
    return false;
  }

  return (data?.length ?? 0) === requirementIds.length;
}

function parseControlInput(
  body: ControlInput,
  partial: boolean,
):
  | { data: Record<string, unknown>; error?: never }
  | { error: string; data?: never } {
  const data: Record<string, unknown> = {};

  if (!partial || body.title !== undefined) {
    if (
      typeof body.title !== 'string' ||
      !body.title.trim() ||
      body.title.trim().length > 200
    ) {
      return { error: 'A control title of up to 200 characters is required.' };
    }
    data.title = body.title.trim();
  }

  const textFields = [
    ['controlCode', 'control_code', 80],
    ['description', 'description', 10000],
    ['category', 'category', 120],
    ['owner', 'owner', 200],
    ['notes', 'notes', 10000],
  ] as const;

  for (const [inputKey, dbKey, maxLength] of textFields) {
    if (body[inputKey] === undefined && partial) continue;

    const value = optionalText(body[inputKey], maxLength);
    if (value === undefined) {
      return { error: `Invalid ${inputKey} value.` };
    }
    data[dbKey] = value;
  }

  if (!partial || body.implementationStatus !== undefined) {
    if (
      typeof body.implementationStatus !== 'string' ||
      !implementationStatuses.includes(
        body.implementationStatus as (typeof implementationStatuses)[number],
      )
    ) {
      return { error: 'Invalid implementation status.' };
    }
    data.implementation_status = body.implementationStatus;
  }

  if (!partial || body.effectivenessStatus !== undefined) {
    if (
      typeof body.effectivenessStatus !== 'string' ||
      !effectivenessStatuses.includes(
        body.effectivenessStatus as (typeof effectivenessStatuses)[number],
      )
    ) {
      return { error: 'Invalid effectiveness status.' };
    }
    data.effectiveness_status = body.effectivenessStatus;
  }

  if (body.reviewDate !== undefined || !partial) {
    if (!validDate(body.reviewDate)) {
      return { error: 'Review date must be a valid YYYY-MM-DD date.' };
    }
    data.review_date = body.reviewDate || null;
  }

  return { data };
}

export async function GET(req: Request) {
  try {
    const auth = await authenticate(req);
    if ('error' in auth) return auth.error;

    const { supabase, user } = auth;
    const workspaceId = new URL(req.url).searchParams.get('workspaceId');

    if (!workspaceId || !uuidPattern.test(workspaceId)) {
      return jsonError('A valid workspace ID is required.', 400);
    }

    const membership = await verifyWorkspace(supabase, workspaceId, user.id);
    if ('error' in membership) return membership.error;

    const { data: controls, error: controlsError } = await supabase
      .from('security_controls')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (controlsError) {
      console.error('SECURITY CONTROLS GET:', controlsError.message);
      return jsonError('Could not load security controls.', 500);
    }

    const controlIds = (controls ?? []).map((control) => control.id);

    let links: { control_id: string; requirement_id: string }[] = [];

    if (controlIds.length > 0) {
      const { data, error } = await supabase
        .from('security_requirement_controls')
        .select('control_id, requirement_id')
        .eq('workspace_id', workspaceId)
        .in('control_id', controlIds);

      if (error) {
        console.error('SECURITY CONTROL LINKS GET:', error.message);
        return jsonError('Could not load control requirement links.', 500);
      }

      links = data ?? [];
    }

    const requirementIds = [...new Set(links.map((link) => link.requirement_id))];
    let requirements: {
      id: string;
      requirement_code: string;
      title: string;
      framework_id: string;
    }[] = [];

    if (requirementIds.length > 0) {
      const { data, error } = await supabase
        .from('security_requirements')
        .select('id, requirement_code, title, framework_id')
        .eq('workspace_id', workspaceId)
        .in('id', requirementIds);

      if (error) {
        console.error('SECURITY CONTROL REQUIREMENTS GET:', error.message);
        return jsonError('Could not load linked requirements.', 500);
      }

      requirements = data ?? [];
    }

    const frameworkIds = [...new Set(requirements.map((item) => item.framework_id))];
    let frameworks: { id: string; name: string; version: string | null }[] = [];

    if (frameworkIds.length > 0) {
      const { data, error } = await supabase
        .from('security_frameworks')
        .select('id, name, version')
        .eq('workspace_id', workspaceId)
        .in('id', frameworkIds);

      if (error) {
        console.error('SECURITY CONTROL FRAMEWORKS GET:', error.message);
        return jsonError('Could not load linked frameworks.', 500);
      }

      frameworks = data ?? [];
    }

    const enrichedControls = (controls ?? []).map((control) => {
      const linkedIds = links
        .filter((link) => link.control_id === control.id)
        .map((link) => link.requirement_id);

      return {
        ...control,
        requirementIds: linkedIds,
        requirements: requirements
          .filter((requirement) => linkedIds.includes(requirement.id))
          .map((requirement) => ({
            ...requirement,
            framework: frameworks.find(
              (framework) => framework.id === requirement.framework_id,
            ) ?? null,
          })),
      };
    });

    return NextResponse.json({
      controls: enrichedControls,
      role: membership.role,
    });
  } catch (error) {
    console.error('SECURITY CONTROLS GET ERROR:', error);
    return jsonError('Could not load security controls.', 500);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authenticate(req);
    if ('error' in auth) return auth.error;

    const { supabase, user } = auth;
    const body = (await req.json()) as ControlInput & {
      workspaceId?: unknown;
    };

    if (
      typeof body.workspaceId !== 'string' ||
      !uuidPattern.test(body.workspaceId)
    ) {
      return jsonError('A valid workspace ID is required.', 400);
    }

    const membership = await verifyWorkspace(
      supabase,
      body.workspaceId,
      user.id,
    );
    if ('error' in membership) return membership.error;
    if (!canManage(membership.role)) {
      return jsonError('Only workspace owners and admins can manage controls.', 403);
    }

    const parsed = parseControlInput(body, false);
    if (parsed.error) return jsonError(parsed.error, 400);

    const requirementIds = body.requirementIds ?? [];
    if (!validRequirementIds(requirementIds)) {
      return jsonError('Invalid requirement selection.', 400);
    }

    const requirementsValid = await validateRequirements(
      supabase,
      body.workspaceId,
      requirementIds,
    );
    if (!requirementsValid) {
      return jsonError('One or more selected requirements are not in this workspace.', 400);
    }

    const { data: control, error: insertError } = await supabase
      .from('security_controls')
      .insert({
        ...parsed.data,
        workspace_id: body.workspaceId,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (insertError || !control) {
      console.error('SECURITY CONTROL INSERT:', insertError?.message);
      return jsonError('Could not create security control.', 500);
    }

    if (requirementIds.length > 0) {
      const { error: linkError } = await supabase
        .from('security_requirement_controls')
        .insert(
          requirementIds.map((requirementId) => ({
            workspace_id: body.workspaceId,
            control_id: control.id,
            requirement_id: requirementId,
          })),
        );

      if (linkError) {
        console.error('SECURITY CONTROL LINK INSERT:', linkError.message);
        await supabase
          .from('security_controls')
          .delete()
          .eq('workspace_id', body.workspaceId)
          .eq('id', control.id);

        return jsonError('Could not link requirements. The control creation was rolled back.', 500);
      }
    }

    await writeAuditLog(supabase, {
      workspaceId: body.workspaceId,
      actorId: user.id,
      action: 'created',
      entityType: 'security_control',
      entityId: control.id,
      entityName: control.title,
      details: { requirementIds },
    });

    return NextResponse.json({ control }, { status: 201 });
  } catch (error) {
    console.error('SECURITY CONTROLS POST ERROR:', error);
    return jsonError('Could not create security control.', 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await authenticate(req);
    if ('error' in auth) return auth.error;

    const { supabase, user } = auth;
    const body = (await req.json()) as ControlInput & {
      id?: unknown;
      workspaceId?: unknown;
    };

    if (
      typeof body.id !== 'string' ||
      !uuidPattern.test(body.id) ||
      typeof body.workspaceId !== 'string' ||
      !uuidPattern.test(body.workspaceId)
    ) {
      return jsonError('Valid control and workspace IDs are required.', 400);
    }

    const membership = await verifyWorkspace(
      supabase,
      body.workspaceId,
      user.id,
    );
    if ('error' in membership) return membership.error;
    if (!canManage(membership.role)) {
      return jsonError('Only workspace owners and admins can manage controls.', 403);
    }

    const parsed = parseControlInput(body, true);
    if (parsed.error) return jsonError(parsed.error, 400);

    const { data: existing, error: existingError } = await supabase
      .from('security_controls')
      .select('id, title')
      .eq('workspace_id', body.workspaceId)
      .eq('id', body.id)
      .maybeSingle();

    if (existingError) {
      console.error('SECURITY CONTROL LOOKUP:', existingError.message);
      return jsonError('Could not verify the security control.', 500);
    }

    if (!existing) {
      return jsonError('Security control not found in this workspace.', 404);
    }

    let requirementIds: string[] | undefined;

    if (body.requirementIds !== undefined) {
      if (!validRequirementIds(body.requirementIds)) {
        return jsonError('Invalid requirement selection.', 400);
      }

      requirementIds = body.requirementIds;

      const requirementsValid = await validateRequirements(
        supabase,
        body.workspaceId,
        requirementIds,
      );
      if (!requirementsValid) {
        return jsonError('One or more selected requirements are not in this workspace.', 400);
      }
    }

    const { data: control, error: updateError } = await supabase
      .from('security_controls')
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', body.workspaceId)
      .eq('id', body.id)
      .select('*')
      .single();

    if (updateError || !control) {
      console.error('SECURITY CONTROL UPDATE:', updateError?.message);
      return jsonError('Could not update security control.', 500);
    }

    if (requirementIds !== undefined) {
      const { error: deleteLinksError } = await supabase
        .from('security_requirement_controls')
        .delete()
        .eq('workspace_id', body.workspaceId)
        .eq('control_id', body.id);

      if (deleteLinksError) {
        console.error('SECURITY CONTROL LINK DELETE:', deleteLinksError.message);
        return jsonError('Control updated, but its requirement links could not be replaced. Please retry.', 500);
      }

      if (requirementIds.length > 0) {
        const { error: insertLinksError } = await supabase
          .from('security_requirement_controls')
          .insert(
            requirementIds.map((requirementId) => ({
              workspace_id: body.workspaceId,
              control_id: body.id,
              requirement_id: requirementId,
            })),
          );

        if (insertLinksError) {
          console.error('SECURITY CONTROL LINK UPDATE:', insertLinksError.message);
          return jsonError('Control updated, but its requirement links could not be saved. Please edit the links again.', 500);
        }
      }
    }

    await writeAuditLog(supabase, {
      workspaceId: body.workspaceId,
      actorId: user.id,
      action: 'updated',
      entityType: 'security_control',
      entityId: control.id,
      entityName: control.title,
      details: {
        changedFields: Object.keys(parsed.data ?? {}),
        requirementIds,
      },
    });

    return NextResponse.json({ control });
  } catch (error) {
    console.error('SECURITY CONTROLS PATCH ERROR:', error);
    return jsonError('Could not update security control.', 500);
  }
}
