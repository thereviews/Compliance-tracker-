import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';
import { writeAuditLog } from '@/lib/audit';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const priorities = ['low', 'medium', 'high', 'critical'] as const;
const statuses = [
  'open',
  'in_progress',
  'blocked',
  'resolved',
  'closed',
] as const;

type ActionPriority = (typeof priorities)[number];
type ActionStatus = (typeof statuses)[number];

const editableFields = [
  'title',
  'description',
  'register_entry_id',
  'priority',
  'status',
  'assigned_to',
  'due_date',
  'resolution_notes',
] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function authenticate(req: Request) {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, supabase: null };
  }

  const supabase = getAuthClient(authHeader);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, supabase: null };
  }

  return { user, supabase };
}

function validDate(value: unknown): value is string | null {
  if (value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function validText(
  value: unknown,
  maxLength: number,
  required = false,
): value is string | null {
  if (value === null && !required) return true;
  if (typeof value !== 'string') return false;
  if (required && value.trim().length === 0) return false;
  if (value.length > maxLength) return false;

  return true;
}

function normalizeOptionalText(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }

  return value as string;
}

function validActionFields(
  body: Record<string, unknown>,
  requireTitle = false,
): string | null {
  if (
    (requireTitle || 'title' in body) &&
    !validText(body.title, 200, true)
  ) {
    return 'Title is required and must be no longer than 200 characters.';
  }

  if (
    'description' in body &&
    !validText(body.description, 10000)
  ) {
    return 'Description must be text no longer than 10,000 characters.';
  }

  if (
    'assigned_to' in body &&
    !validText(body.assigned_to, 200)
  ) {
    return 'Assigned person must be text no longer than 200 characters.';
  }

  if (
    'resolution_notes' in body &&
    !validText(body.resolution_notes, 10000)
  ) {
    return 'Resolution notes must be text no longer than 10,000 characters.';
  }

  if (
    'priority' in body &&
    !priorities.includes(body.priority as ActionPriority)
  ) {
    return 'Invalid priority.';
  }

  if (
    'status' in body &&
    !statuses.includes(body.status as ActionStatus)
  ) {
    return 'Invalid corrective-action status.';
  }

  if (
    'due_date' in body &&
    !validDate(body.due_date)
  ) {
    return 'Invalid due date. Use YYYY-MM-DD.';
  }

  if ('register_entry_id' in body) {
    const entryId = body.register_entry_id;

    if (
      entryId !== null &&
      entryId !== '' &&
      (typeof entryId !== 'string' || !uuidPattern.test(entryId))
    ) {
      return 'The linked register entry ID must be a valid UUID.';
    }
  }

  return null;
}

async function verifyWorkspace(
  supabase: NonNullable<
    Awaited<ReturnType<typeof authenticate>>['supabase']
  >,
  workspaceId: string,
  userId: string,
) {
  return supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();
}

async function verifyRegisterEntry(
  supabase: NonNullable<
    Awaited<ReturnType<typeof authenticate>>['supabase']
  >,
  registerEntryId: unknown,
  workspaceId: string,
): Promise<boolean> {
  if (registerEntryId === null || registerEntryId === '') {
    return true;
  }

  if (
    typeof registerEntryId !== 'string' ||
    !uuidPattern.test(registerEntryId)
  ) {
    return false;
  }

  const { data, error } = await supabase
    .from('compliance_register_entries')
    .select('id')
    .eq('id', registerEntryId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  return !error && !!data;
}

export async function GET(req: Request) {
  try {
    const { user, supabase } = await authenticate(req);

    if (!user || !supabase) {
      return jsonError('Unauthorized', 401);
    }

    const params = new URL(req.url).searchParams;
    const workspaceId = params.get('workspaceId');

    if (!workspaceId || !uuidPattern.test(workspaceId)) {
      return jsonError('A valid workspace ID is required.', 400);
    }

    const { data: membership, error: membershipError } =
      await verifyWorkspace(supabase, workspaceId, user.id);

    if (membershipError) {
      return jsonError('Could not verify workspace access.', 500);
    }

    if (!membership) {
      return jsonError('You do not have access to this workspace.', 403);
    }

    let query = supabase
      .from('corrective_actions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    const status = params.get('status');
    const priority = params.get('priority');

    if (status && !statuses.includes(status as ActionStatus)) {
      return jsonError('Invalid status filter.', 400);
    }

    if (priority && !priorities.includes(priority as ActionPriority)) {
      return jsonError('Invalid priority filter.', 400);
    }

    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);

    const { data, error } = await query;

    if (error) {
      console.error('CORRECTIVE ACTIONS LIST:', error.message);
      return jsonError('Could not load corrective actions.', 500);
    }

    return NextResponse.json({ actions: data ?? [] });
  } catch (error) {
    console.error('CORRECTIVE ACTIONS GET ERROR:', error);
    return jsonError('Could not load corrective actions.', 500);
  }
}

export async function POST(req: Request) {
  try {
    const { user, supabase } = await authenticate(req);

    if (!user || !supabase) {
      return jsonError('Unauthorized', 401);
    }

    let body: Record<string, unknown>;

    try {
      const parsed: unknown = await req.json();

      if (
        !parsed ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
      ) {
        return jsonError('Invalid request body.', 400);
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return jsonError('Invalid JSON request body.', 400);
    }

    const allowedFields = ['workspace_id', ...editableFields];

    if (Object.keys(body).some((key) => !allowedFields.includes(key))) {
      return jsonError('The request contains unsupported fields.', 400);
    }

    const workspaceId = body.workspace_id;

    if (
      typeof workspaceId !== 'string' ||
      !uuidPattern.test(workspaceId)
    ) {
      return jsonError('A valid workspace ID is required.', 400);
    }

    const validationError = validActionFields(body, true);

    if (validationError) {
      return jsonError(validationError, 400);
    }

    const { data: membership, error: membershipError } =
      await verifyWorkspace(supabase, workspaceId, user.id);

    if (membershipError) {
      return jsonError('Could not verify workspace access.', 500);
    }

    if (
      !membership ||
      !['owner', 'admin', 'member'].includes(membership.role)
    ) {
      return jsonError('You cannot create actions in this workspace.', 403);
    }

    if (
      'register_entry_id' in body &&
      !(await verifyRegisterEntry(
        supabase,
        body.register_entry_id,
        workspaceId,
      ))
    ) {
      return jsonError(
        'The linked register entry does not exist in this workspace.',
        400,
      );
    }

    const { data, error } = await supabase
      .from('corrective_actions')
      .insert({
        workspace_id: workspaceId,
        title: (body.title as string).trim(),
        description: normalizeOptionalText(body.description),
        register_entry_id: normalizeOptionalText(body.register_entry_id),
        priority: body.priority ?? 'medium',
        status: body.status ?? 'open',
        assigned_to: normalizeOptionalText(body.assigned_to),
        due_date: normalizeOptionalText(body.due_date),
        resolution_notes: normalizeOptionalText(body.resolution_notes),
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error) {
      console.error('CORRECTIVE ACTION CREATE:', error.message);
      return jsonError('Could not create corrective action.', 500);
    }

    await writeAuditLog(supabase, {
      workspaceId,
      actorId: user.id,
      action: 'created',
      entityType: 'corrective_action',
      entityId: data.id,
      entityName: data.title,
      details: {
        priority: data.priority,
        status: data.status,
        register_entry_id: data.register_entry_id,
      },
    });

    return NextResponse.json({ action: data }, { status: 201 });
  } catch (error) {
    console.error('CORRECTIVE ACTION POST ERROR:', error);
    return jsonError('Could not create corrective action.', 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const { user, supabase } = await authenticate(req);

    if (!user || !supabase) {
      return jsonError('Unauthorized', 401);
    }

    let body: Record<string, unknown>;

    try {
      const parsed: unknown = await req.json();

      if (
        !parsed ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
      ) {
        return jsonError('Invalid request body.', 400);
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return jsonError('Invalid JSON request body.', 400);
    }

    const { id, workspace_id: workspaceId, ...changes } = body;

    if (
      typeof id !== 'string' ||
      !uuidPattern.test(id) ||
      typeof workspaceId !== 'string' ||
      !uuidPattern.test(workspaceId)
    ) {
      return jsonError(
        'Valid corrective-action and workspace IDs are required.',
        400,
      );
    }

    const keys = Object.keys(changes);

    if (
      keys.length === 0 ||
      keys.some(
        (key) =>
          !editableFields.includes(
            key as (typeof editableFields)[number],
          ),
      )
    ) {
      return jsonError('No valid corrective-action changes supplied.', 400);
    }

    const validationError = validActionFields(changes);

    if (validationError) {
      return jsonError(validationError, 400);
    }

    const { data: membership, error: membershipError } =
      await verifyWorkspace(supabase, workspaceId, user.id);

    if (membershipError) {
      return jsonError('Could not verify workspace access.', 500);
    }

    if (!membership) {
      return jsonError('You do not have access to this workspace.', 403);
    }

    const { data: existing, error: existingError } = await supabase
      .from('corrective_actions')
      .select('id, title, status, priority, created_by')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (existingError) {
      return jsonError('Could not load the corrective action.', 500);
    }

    if (!existing) {
      return jsonError('Corrective action not found.', 404);
    }

    if (
      !['owner', 'admin'].includes(membership.role) &&
      !(membership.role === 'member' && existing.created_by === user.id)
    ) {
      return jsonError('You cannot edit this corrective action.', 403);
    }

    if (
      'register_entry_id' in changes &&
      !(await verifyRegisterEntry(
        supabase,
        changes.register_entry_id,
        workspaceId,
      ))
    ) {
      return jsonError(
        'The linked register entry does not exist in this workspace.',
        400,
      );
    }

    const update: Record<string, unknown> = {};

    for (const key of keys) {
      let value = changes[key];

      if (key === 'title' && typeof value === 'string') {
        value = value.trim();
      }

      if (
        [
          'description',
          'register_entry_id',
          'assigned_to',
          'due_date',
          'resolution_notes',
        ].includes(key)
      ) {
        value = normalizeOptionalText(value);
      }

      update[key] = value;
    }

    update.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('corrective_actions')
      .update(update)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('CORRECTIVE ACTION UPDATE:', error.message);
      return jsonError('Could not update corrective action.', 500);
    }

    if (!data) {
      return jsonError(
        'Corrective action not found or update not permitted.',
        404,
      );
    }

    await writeAuditLog(supabase, {
      workspaceId,
      actorId: user.id,
      action:
        'status' in changes && changes.status !== existing.status
          ? 'status_changed'
          : 'updated',
      entityType: 'corrective_action',
      entityId: data.id,
      entityName: data.title,
      details: {
        changed_fields: keys,
        previous_status: existing.status,
        status: data.status,
        previous_priority: existing.priority,
        priority: data.priority,
      },
    });

    return NextResponse.json({ action: data });
  } catch (error) {
    console.error('CORRECTIVE ACTION PATCH ERROR:', error);
    return jsonError('Could not update corrective action.', 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const { user, supabase } = await authenticate(req);

    if (!user || !supabase) {
      return jsonError('Unauthorized', 401);
    }

    const params = new URL(req.url).searchParams;
    const id = params.get('id');
    const workspaceId = params.get('workspaceId');

    if (
      !id ||
      !uuidPattern.test(id) ||
      !workspaceId ||
      !uuidPattern.test(workspaceId)
    ) {
      return jsonError(
        'Valid corrective-action and workspace IDs are required.',
        400,
      );
    }

    const { data: membership, error: membershipError } =
      await verifyWorkspace(supabase, workspaceId, user.id);

    if (membershipError) {
      return jsonError('Could not verify workspace access.', 500);
    }

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return jsonError(
        'Only workspace owners and admins can delete corrective actions.',
        403,
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from('corrective_actions')
      .select('id, title')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (existingError) {
      return jsonError('Could not load the corrective action.', 500);
    }

    if (!existing) {
      return jsonError('Corrective action not found.', 404);
    }

    const { error } = await supabase
      .from('corrective_actions')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error('CORRECTIVE ACTION DELETE:', error.message);
      return jsonError('Could not delete corrective action.', 500);
    }

    await writeAuditLog(supabase, {
      workspaceId,
      actorId: user.id,
      action: 'deleted',
      entityType: 'corrective_action',
      entityId: existing.id,
      entityName: existing.title,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CORRECTIVE ACTION DELETE ERROR:', error);
    return jsonError('Could not delete corrective action.', 500);
  }
}
