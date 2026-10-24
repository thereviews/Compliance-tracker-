import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';
import { writeAuditLog } from '@/lib/audit';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const statuses = [
  'not_started',
  'in_progress',
  'compliant',
  'non_compliant',
  'not_applicable',
] as const;

const priorities = [
  'low',
  'medium',
  'high',
  'critical',
] as const;

const editableFields = [
  'title',
  'framework',
  'category',
  'description',
  'responsible_person',
  'status',
  'priority',
  'review_date',
  'notes',
] as const;

type EntryStatus = (typeof statuses)[number];
type EntryPriority = (typeof priorities)[number];

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

function normalizeOptionalText(value: unknown) {
  if (value === null || value === '') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

function validEntryFields(
  body: Record<string, unknown>,
  requireCoreFields = false,
) {
  const coreFields = ['title', 'framework', 'category'] as const;

  for (const field of coreFields) {
    if (requireCoreFields || field in body) {
      const maxLength = field === 'title' ? 200 : 100;

      if (!validText(body[field], maxLength, true)) {
        return `${field} is required and must be within its length limit.`;
      }
    }
  }

  if ('description' in body && !validText(body.description, 10000)) {
    return 'Description must be text no longer than 10,000 characters.';
  }

  if (
    'responsible_person' in body &&
    !validText(body.responsible_person, 200)
  ) {
    return 'Responsible person must be text no longer than 200 characters.';
  }

  if ('notes' in body && !validText(body.notes, 10000)) {
    return 'Notes must be text no longer than 10,000 characters.';
  }

  if (
    'status' in body &&
    !statuses.includes(body.status as EntryStatus)
  ) {
    return 'Invalid compliance status.';
  }

  if (
    'priority' in body &&
    !priorities.includes(body.priority as EntryPriority)
  ) {
    return 'Invalid priority.';
  }

  if ('review_date' in body && !validDate(body.review_date)) {
    return 'Invalid review date.';
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
      console.error('COMPLIANCE REGISTER MEMBERSHIP:', membershipError.message);
      return jsonError('Could not verify workspace access.', 500);
    }

    if (!membership) {
      return jsonError('You do not have access to this workspace.', 403);
    }

    const { data, error } = await supabase
      .from('compliance_register_entries')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('COMPLIANCE REGISTER GET:', error.message);
      return jsonError('Could not load compliance register entries.', 500);
    }

    return NextResponse.json({
      entries: data ?? [],
      role: membership.role,
    });
  } catch (error) {
    console.error('COMPLIANCE REGISTER GET ERROR:', error);
    return jsonError('Could not load compliance register entries.', 500);
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

    const allowedFields = [
      'workspace_id',
      ...editableFields,
    ];

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

    const validationError = validEntryFields(body, true);

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
      return jsonError('You cannot create entries in this workspace.', 403);
    }

    const { data, error } = await supabase
      .from('compliance_register_entries')
      .insert({
        workspace_id: workspaceId,
        title: (body.title as string).trim(),
        framework: (body.framework as string).trim(),
        category: (body.category as string).trim(),
        description: normalizeOptionalText(body.description),
        responsible_person: normalizeOptionalText(body.responsible_person),
        status: body.status ?? 'not_started',
        priority: body.priority ?? 'medium',
        review_date: normalizeOptionalText(body.review_date),
        notes: normalizeOptionalText(body.notes),
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error) {
      console.error('COMPLIANCE REGISTER CREATE:', error.message);
      return jsonError('Could not create compliance register entry.', 500);
    }

    await writeAuditLog(supabase, {
      workspaceId,
      actorId: user.id,
      action: 'created',
      entityType: 'compliance_register_entry',
      entityId: data.id,
      entityName: data.title,
      details: {
        framework: data.framework,
        status: data.status,
        priority: data.priority,
      },
    });

    return NextResponse.json({ entry: data }, { status: 201 });
  } catch (error) {
    console.error('COMPLIANCE REGISTER POST ERROR:', error);
    return jsonError('Could not create compliance register entry.', 500);
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
      return jsonError('Valid entry and workspace IDs are required.', 400);
    }

    const keys = Object.keys(changes);

    if (
      keys.length === 0 ||
      keys.some((key) => !editableFields.includes(key as (typeof editableFields)[number]))
    ) {
      return jsonError('No valid entry changes supplied.', 400);
    }

    const validationError = validEntryFields(changes);

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
      .from('compliance_register_entries')
      .select('id, title, created_by')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (existingError) {
      return jsonError('Could not load the register entry.', 500);
    }

    if (!existing) {
      return jsonError('Register entry not found.', 404);
    }

    if (
      !['owner', 'admin'].includes(membership.role) &&
      !(membership.role === 'member' && existing.created_by === user.id)
    ) {
      return jsonError('You cannot edit this register entry.', 403);
    }

    const update: Record<string, unknown> = {};

    for (const key of keys) {
      let value = changes[key];

      if (
        ['title', 'framework', 'category'].includes(key) &&
        typeof value === 'string'
      ) {
        value = value.trim();
      }

      if (
        ['description', 'responsible_person', 'notes', 'review_date'].includes(key)
      ) {
        value = normalizeOptionalText(value);
      }

      update[key] = value;
    }

    update.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('compliance_register_entries')
      .update(update)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('COMPLIANCE REGISTER UPDATE:', error.message);
      return jsonError('Could not update compliance register entry.', 500);
    }

    if (!data) {
      return jsonError('Register entry not found or update not permitted.', 404);
    }

    await writeAuditLog(supabase, {
      workspaceId,
      actorId: user.id,
      action:
        'status' in changes && changes.status !== undefined
          ? 'status_changed'
          : 'updated',
      entityType: 'compliance_register_entry',
      entityId: data.id,
      entityName: data.title,
      details: {
        changed_fields: keys,
        status: data.status,
        priority: data.priority,
      },
    });

    return NextResponse.json({ entry: data });
  } catch (error) {
    console.error('COMPLIANCE REGISTER PATCH ERROR:', error);
    return jsonError('Could not update compliance register entry.', 500);
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
      return jsonError('Valid entry and workspace IDs are required.', 400);
    }

    const { data: membership, error: membershipError } =
      await verifyWorkspace(supabase, workspaceId, user.id);

    if (membershipError) {
      return jsonError('Could not verify workspace access.', 500);
    }

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return jsonError(
        'Only workspace owners and admins can delete register entries.',
        403,
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from('compliance_register_entries')
      .select('id, title')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (existingError) {
      return jsonError('Could not load the register entry.', 500);
    }

    if (!existing) {
      return jsonError('Register entry not found.', 404);
    }

    const { error } = await supabase
      .from('compliance_register_entries')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error('COMPLIANCE REGISTER DELETE:', error.message);
      return jsonError('Could not delete compliance register entry.', 500);
    }

    await writeAuditLog(supabase, {
      workspaceId,
      actorId: user.id,
      action: 'deleted',
      entityType: 'compliance_register_entry',
      entityId: existing.id,
      entityName: existing.title,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('COMPLIANCE REGISTER DELETE ERROR:', error);
    return jsonError('Could not delete compliance register entry.', 500);
  }
}
