import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const actions = [
  'created',
  'updated',
  'deleted',
  'uploaded',
  'viewed',
  'downloaded',
  'status_changed',
] as const;

const entityTypes = [
  'vendor',
  'document',
  'compliance_assessment',
  'compliance_evidence',
  'risk_assessment',
  'workspace_member',
  'compliance_register_entry',
  'corrective_action',
] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function validDate(value: string | null): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
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

    const params = new URL(req.url).searchParams;
    const workspaceId = params.get('workspaceId');
    const action = params.get('action');
    const entityType = params.get('entityType');
    const fromDate = params.get('fromDate');
    const toDate = params.get('toDate');
    const search = (params.get('search') ?? '').trim().slice(0, 100);

    const requestedPage = Number(params.get('page') ?? '1');
    const requestedPageSize = Number(params.get('pageSize') ?? '25');

    if (!workspaceId || !uuidPattern.test(workspaceId)) {
      return jsonError('A valid workspace ID is required', 400);
    }

    if (
      action &&
      !actions.includes(action as (typeof actions)[number])
    ) {
      return jsonError('Invalid action filter', 400);
    }

    if (
      entityType &&
      !entityTypes.includes(entityType as (typeof entityTypes)[number])
    ) {
      return jsonError('Invalid entity type filter', 400);
    }

    if (!validDate(fromDate) || !validDate(toDate)) {
      return jsonError('Invalid date filter', 400);
    }

    if (fromDate && toDate && fromDate > toDate) {
      return jsonError('Start date must not be after end date', 400);
    }

    if (
      !Number.isSafeInteger(requestedPage) ||
      requestedPage < 1 ||
      !Number.isSafeInteger(requestedPageSize) ||
      ![10, 25, 50].includes(requestedPageSize)
    ) {
      return jsonError('Invalid pagination parameters', 400);
    }

    const { data: membership, error: membershipError } =
      await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (membershipError) {
      console.error('AUDIT LOG MEMBERSHIP:', membershipError.message);
      return jsonError('Could not verify workspace access', 500);
    }

    if (!membership) {
      return jsonError(
        'You do not have access to this workspace',
        403,
      );
    }

    let query = supabase
      .from('audit_logs')
      .select(
        'id, workspace_id, actor_id, action, entity_type, entity_id, entity_name, details, created_at',
        { count: 'exact' },
      )
      .eq('workspace_id', workspaceId);

    if (action) {
      query = query.eq('action', action);
    }

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    if (fromDate) {
      query = query.gte(
        'created_at',
        `${fromDate}T00:00:00.000Z`,
      );
    }

    if (toDate) {
      query = query.lt(
        'created_at',
        new Date(
          new Date(`${toDate}T00:00:00.000Z`).getTime() +
            24 * 60 * 60 * 1000,
        ).toISOString(),
      );
    }

    if (search) {
      const safeSearch = search.replace(/[%,()]/g, '');
      const searchUuid = uuidPattern.test(safeSearch);

      if (safeSearch) {
        if (searchUuid) {
          query = query.or(
            `entity_name.ilike.%${safeSearch}%,entity_id.eq.${safeSearch}`,
          );
        } else {
          query = query.ilike('entity_name', `%${safeSearch}%`);
        }
      }
    }

    const offset = (requestedPage - 1) * requestedPageSize;

    const { data: logs, error: logsError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + requestedPageSize - 1);

    if (logsError) {
      console.error('AUDIT LOGS GET:', logsError.message);
      return jsonError('Could not load audit logs', 500);
    }

    return NextResponse.json({
      logs: logs ?? [],
      total: count ?? 0,
      page: requestedPage,
      pageSize: requestedPageSize,
      totalPages: Math.ceil((count ?? 0) / requestedPageSize),
      role: membership.role,
    });
  } catch (error) {
    console.error('AUDIT LOGS GET ERROR:', error);
    return jsonError('Could not load audit logs', 500);
  }
}
