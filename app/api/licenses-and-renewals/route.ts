import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';
import { writeAuditLog } from '@/lib/audit';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CATEGORIES = [
  'business_license',
  'insurance',
  'certification',
] as const;

const STATUSES = [
  'active',
  'renewed',
  'in_progress',
  'expired',
  'cancelled',
] as const;

const FIELDS = [
  'category',
  'name',
  'reference_number',
  'issuer',
  'jurisdiction',
  'renewal_type',
  'issue_date',
  'expiration_date',
  'renewal_deadline',
  'responsible_person',
  'status',
  'source_document_id',
  'notes',
  'completion_notes',
] as const;

type SupabaseClient = ReturnType<typeof getAuthClient>;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function authenticate(req: Request) {
  const header = req.headers.get('Authorization');

  if (!header?.startsWith('Bearer ')) {
    return { user: null, supabase: null };
  }

  const supabase = getAuthClient(header);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, supabase: null };
  }

  return { user, supabase };
}

async function verifyWorkspace(
  supabase: SupabaseClient,
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

function isValidDate(value: unknown): boolean {
  if (value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function validate(
  body: Record<string, unknown>,
  creating = false,
): string | null {
  if (
    creating || 'category' in body
  ) {
    if (
      typeof body.category !== 'string' ||
      !(CATEGORIES as readonly string[]).includes(body.category)
    ) {
      return 'Select a valid category.';
    }
  }

  if (creating || 'name' in body) {
    if (
      typeof body.name !== 'string' ||
      !body.name.trim() ||
      body.name.trim().length > 200
    ) {
      return 'Name is required and must not exceed 200 characters.';
    }
  }

  const textLimits: Record<string, number> = {
    reference_number: 200,
    issuer: 200,
    jurisdiction: 200,
    renewal_type: 100,
    responsible_person: 200,
    notes: 10000,
    completion_notes: 10000,
  };

  for (const [field, limit] of Object.entries(textLimits)) {
    const value = body[field];

    if (
      field in body &&
      value !== null &&
      value !== undefined &&
      (typeof value !== 'string' || value.length > limit)
    ) {
      return `${field.replaceAll('_', ' ')} is invalid or too long.`;
    }
  }

  for (const field of [
    'issue_date',
    'expiration_date',
    'renewal_deadline',
  ]) {
    if (field in body && !isValidDate(body[field])) {
      return `Invalid ${field.replaceAll('_', ' ')}. Use YYYY-MM-DD.`;
    }
  }

  if (
    'status' in body &&
    (
      typeof body.status !== 'string' ||
      !(STATUSES as readonly string[]).includes(body.status)
    )
  ) {
    return 'Select a valid status.';
  }

  if (
    'source_document_id' in body &&
    body.source_document_id !== null &&
    body.source_document_id !== '' &&
    (
      typeof body.source_document_id !== 'string' ||
      !UUID.test(body.source_document_id)
    )
  ) {
    return 'Invalid supporting document ID.';
  }

  if (
    typeof body.issue_date === 'string' &&
    typeof body.expiration_date === 'string' &&
    body.issue_date > body.expiration_date
  ) {
    return 'Issue date cannot be after expiration date.';
  }

  return null;
}

function prepareFields(body: Record<string, unknown>) {
  const result: Record<string, unknown> = {};

  for (const field of FIELDS) {
    if (!(field in body)) continue;

    let value = body[field];

    if (typeof value === 'string') {
      value = value.trim();
    }

    if (
      value === '' &&
      [
        'reference_number',
        'issuer',
        'jurisdiction',
        'renewal_type',
        'issue_date',
        'expiration_date',
        'renewal_deadline',
        'responsible_person',
        'source_document_id',
        'notes',
        'completion_notes',
      ].includes(field)
    ) {
      value = null;
    }

    result[field] = value;
  }

  return result;
}

async function verifyDocument(
  supabase: SupabaseClient,
  documentId: string,
  workspaceId: string,
) {
  return supabase
    .from('compliance_documents')
    .select('id')
    .eq('id', documentId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
}

export async function GET(req: Request) {
  try {
    const { user, supabase } = await authenticate(req);

    if (!user || !supabase) {
      return errorResponse('Unauthorized.', 401);
    }

    const params = new URL(req.url).searchParams;
    const workspaceId = params.get('workspaceId');
    const category = params.get('category');
    const status = params.get('status');

    if (!workspaceId || !UUID.test(workspaceId)) {
      return errorResponse('A valid workspace ID is required.', 400);
    }

    if (
      category &&
      !(CATEGORIES as readonly string[]).includes(category)
    ) {
      return errorResponse('Invalid category.', 400);
    }

    if (
      status &&
      !(STATUSES as readonly string[]).includes(status)
    ) {
      return errorResponse('Invalid status.', 400);
    }

    const { data: membership, error: membershipError } =
      await verifyWorkspace(supabase, workspaceId, user.id);

    if (membershipError) {
      console.error('RENEWALS MEMBERSHIP:', membershipError.message);
      return errorResponse('Could not verify workspace access.', 500);
    }

    if (!membership) {
      return errorResponse('Workspace access denied.', 403);
    }

    let query = supabase
      .from('licenses_and_renewals')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('expiration_date', {
        ascending: true,
        nullsFirst: false,
      });

    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) {
      console.error('RENEWALS GET:', error.message);
      return errorResponse('Could not load renewal records.', 500);
    }

    return NextResponse.json({
      records: data ?? [],
      role: membership.role,
    });
  } catch (error) {
    console.error('RENEWALS GET ERROR:', error);
    return errorResponse('Could not load renewal records.', 500);
  }
}

export async function POST(req: Request) {
  try {
    const { user, supabase } = await authenticate(req);

    if (!user || !supabase) {
      return errorResponse('Unauthorized.', 401);
    }

    let body: Record<string, unknown>;

    try {
      const parsed: unknown = await req.json();

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return errorResponse('Invalid request body.', 400);
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return errorResponse('Invalid JSON request body.', 400);
    }

    if (
      Object.keys(body).some(
        (key) => !['workspace_id', ...FIELDS].includes(key),
      )
    ) {
      return errorResponse('Unsupported request field.', 400);
    }

    const workspaceId = body.workspace_id;

    if (
      typeof workspaceId !== 'string' ||
      !UUID.test(workspaceId)
    ) {
      return errorResponse('A valid workspace ID is required.', 400);
    }

    const validationError = validate(body, true);
    if (validationError) {
      return errorResponse(validationError, 400);
    }

    const { data: membership, error: membershipError } =
      await verifyWorkspace(supabase, workspaceId, user.id);

    if (membershipError) {
      return errorResponse('Could not verify workspace access.', 500);
    }

    if (
      !membership ||
      !['owner', 'admin', 'member'].includes(membership.role)
    ) {
      return errorResponse('You cannot create records in this workspace.', 403);
    }

    const documentId = body.source_document_id;

    if (typeof documentId === 'string' && documentId) {
      const { data: document, error } = await verifyDocument(
        supabase,
        documentId,
        workspaceId,
      );

      if (error) {
        return errorResponse('Could not verify the supporting document.', 500);
      }

      if (!document) {
        return errorResponse(
          'The supporting document must belong to this workspace.',
          400,
        );
      }
    }

    const { data, error } = await supabase
      .from('licenses_and_renewals')
      .insert({
        ...prepareFields(body),
        workspace_id: workspaceId,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error) {
      console.error('RENEWALS CREATE:', error.message);
      return errorResponse('Could not create the renewal record.', 500);
    }

    await writeAuditLog(supabase, {
      workspaceId,
      actorId: user.id,
      action: 'created',
      entityType: 'license_and_renewal',
      entityId: data.id,
      entityName: data.name,
      details: {
        category: data.category,
        status: data.status,
        expiration_date: data.expiration_date,
      },
    });

    return NextResponse.json({ record: data }, { status: 201 });
  } catch (error) {
    console.error('RENEWALS POST ERROR:', error);
    return errorResponse('Could not create the renewal record.', 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const { user, supabase } = await authenticate(req);

    if (!user || !supabase) {
      return errorResponse('Unauthorized.', 401);
    }

    let body: Record<string, unknown>;

    try {
      const parsed: unknown = await req.json();

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return errorResponse('Invalid request body.', 400);
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return errorResponse('Invalid JSON request body.', 400);
    }

    const { id, workspace_id: workspaceId, ...changes } = body;

    if (
      typeof id !== 'string' ||
      !UUID.test(id) ||
      typeof workspaceId !== 'string' ||
      !UUID.test(workspaceId)
    ) {
      return errorResponse('Valid record and workspace IDs are required.', 400);
    }

    const keys = Object.keys(changes);

    if (
      keys.length === 0 ||
      keys.some(
        (key) => !(FIELDS as readonly string[]).includes(key),
      )
    ) {
      return errorResponse('No valid changes were supplied.', 400);
    }

    const validationError = validate(changes);
    if (validationError) {
      return errorResponse(validationError, 400);
    }

    const { data: membership, error: membershipError } =
      await verifyWorkspace(supabase, workspaceId, user.id);

    if (membershipError) {
      return errorResponse('Could not verify workspace access.', 500);
    }

    if (!membership) {
      return errorResponse('Workspace access denied.', 403);
    }

    const { data: existing, error: existingError } = await supabase
      .from('licenses_and_renewals')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (existingError) {
      return errorResponse('Could not load the renewal record.', 500);
    }

    if (!existing) {
      return errorResponse('Renewal record not found.', 404);
    }

    if (
      !['owner', 'admin'].includes(membership.role) &&
      !(
        membership.role === 'member' &&
        existing.created_by === user.id
      )
    ) {
      return errorResponse('You cannot edit this renewal record.', 403);
    }

    if (
      typeof changes.source_document_id === 'string' &&
      changes.source_document_id
    ) {
      const { data: document, error } = await verifyDocument(
        supabase,
        changes.source_document_id,
        workspaceId,
      );

      if (error) {
        return errorResponse('Could not verify the supporting document.', 500);
      }

      if (!document) {
        return errorResponse(
          'The supporting document must belong to this workspace.',
          400,
        );
      }
    }

    const update = prepareFields(changes);
    update.updated_at = new Date().toISOString();

    if (changes.status === 'renewed' && existing.status !== 'renewed') {
      update.renewed_at = new Date().toISOString();
    } else if (
      typeof changes.status === 'string' &&
      changes.status !== 'renewed' &&
      existing.status === 'renewed'
    ) {
      update.renewed_at = null;
    }

    const { data, error } = await supabase
      .from('licenses_and_renewals')
      .update(update)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('RENEWALS UPDATE:', error.message);
      return errorResponse('Could not update the renewal record.', 500);
    }

    if (!data) {
      return errorResponse('Renewal record not found or update denied.', 404);
    }

    await writeAuditLog(supabase, {
      workspaceId,
      actorId: user.id,
      action: 'status' in changes ? 'status_changed' : 'updated',
      entityType: 'license_and_renewal',
      entityId: data.id,
      entityName: data.name,
      details: {
        changed_fields: keys,
        category: data.category,
        status: data.status,
      },
    });

    return NextResponse.json({ record: data });
  } catch (error) {
    console.error('RENEWALS PATCH ERROR:', error);
    return errorResponse('Could not update the renewal record.', 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const { user, supabase } = await authenticate(req);

    if (!user || !supabase) {
      return errorResponse('Unauthorized.', 401);
    }

    const params = new URL(req.url).searchParams;
    const id = params.get('id');
    const workspaceId = params.get('workspaceId');

    if (
      !id ||
      !UUID.test(id) ||
      !workspaceId ||
      !UUID.test(workspaceId)
    ) {
      return errorResponse('Valid record and workspace IDs are required.', 400);
    }

    const { data: membership, error: membershipError } =
      await verifyWorkspace(supabase, workspaceId, user.id);

    if (membershipError) {
      return errorResponse('Could not verify workspace access.', 500);
    }

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return errorResponse(
        'Only workspace owners and admins can delete renewal records.',
        403,
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from('licenses_and_renewals')
      .select('id, name, category')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (existingError) {
      return errorResponse('Could not load the renewal record.', 500);
    }

    if (!existing) {
      return errorResponse('Renewal record not found.', 404);
    }

    const { error } = await supabase
      .from('licenses_and_renewals')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error('RENEWALS DELETE:', error.message);
      return errorResponse('Could not delete the renewal record.', 500);
    }

    await writeAuditLog(supabase, {
      workspaceId,
      actorId: user.id,
      action: 'deleted',
      entityType: 'license_and_renewal',
      entityId: existing.id,
      entityName: existing.name,
      details: { category: existing.category },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('RENEWALS DELETE ERROR:', error);
    return errorResponse('Could not delete the renewal record.', 500);
  }
}
