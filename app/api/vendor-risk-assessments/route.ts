import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';
import { writeAuditLog } from '@/lib/audit';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const riskLevels = ['low', 'medium', 'high', 'critical'] as const;
const assessmentStatuses = ['draft', 'completed'] as const;

const riskFields = [
  'data_sensitivity',
  'system_access',
  'business_criticality',
  'regulatory_exposure',
  'security_controls',
  'incident_history',
] as const;

type RiskLevel = (typeof riskLevels)[number];

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

function validText(value: unknown, maxLength: number) {
  return (
    value === null ||
    (typeof value === 'string' && value.length <= maxLength)
  );
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

async function verifyVendor(
  supabase: NonNullable<
    Awaited<ReturnType<typeof authenticate>>['supabase']
  >,
  vendorId: string,
  workspaceId: string,
) {
  return supabase
    .from('vendors')
    .select('id, name')
    .eq('id', vendorId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
}

function calculateOverallRisk(values: Record<string, unknown>): RiskLevel {
  const levels: RiskLevel[] = riskFields.map((field) => {
    const value = values[field];
    return riskLevels.includes(value as RiskLevel)
      ? (value as RiskLevel)
      : 'medium';
  });

  const rank = { low: 0, medium: 1, high: 2, critical: 3 };

  return levels.reduce(
    (highest, current) =>
      rank[current] > rank[highest] ? current : highest,
    'low' as RiskLevel,
  );
}

export async function GET(req: Request) {
  try {
    const { user, supabase } = await authenticate(req);

    if (!user || !supabase) return jsonError('Unauthorized', 401);

    const params = new URL(req.url).searchParams;
    const workspaceId = params.get('workspaceId');
    const vendorId = params.get('vendorId');

    if (!workspaceId || !uuidPattern.test(workspaceId)) {
      return jsonError('A valid workspace ID is required', 400);
    }

    if (vendorId && !uuidPattern.test(vendorId)) {
      return jsonError('Invalid vendor ID', 400);
    }

    const { data: membership, error: membershipError } =
      await verifyWorkspace(supabase, workspaceId, user.id);

    if (membershipError) {
      return jsonError('Could not verify workspace access', 500);
    }

    if (!membership) {
      return jsonError('You do not have access to this workspace', 403);
    }

    let query = supabase
      .from('vendor_risk_assessments')
      .select('*, vendors!inner(name)')
      .eq('workspace_id', workspaceId);

    if (vendorId) query = query.eq('vendor_id', vendorId);

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      console.error('VENDOR RISK GET:', error.message);
      return jsonError('Could not load risk assessments', 500);
    }

    return NextResponse.json({
      assessments: data ?? [],
      role: membership.role,
    });
  } catch (error) {
    console.error('VENDOR RISK GET ERROR:', error);
    return jsonError('Could not load risk assessments', 500);
  }
}

export async function POST(req: Request) {
  try {
    const { user, supabase } = await authenticate(req);

    if (!user || !supabase) return jsonError('Unauthorized', 401);

    let body: Record<string, unknown>;

    try {
      const parsed: unknown = await req.json();

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return jsonError('Invalid request body', 400);
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return jsonError('Invalid JSON request body', 400);
    }

    const {
      workspace_id,
      vendor_id,
      assessment_date = null,
      next_review_date = null,
      data_sensitivity = 'medium',
      system_access = 'medium',
      business_criticality = 'medium',
      regulatory_exposure = 'medium',
      security_controls = 'medium',
      incident_history = 'medium',
      findings = null,
      remediation_actions = null,
      assessment_status = 'draft',
    } = body;

    if (
      typeof workspace_id !== 'string' ||
      !uuidPattern.test(workspace_id) ||
      typeof vendor_id !== 'string' ||
      !uuidPattern.test(vendor_id)
    ) {
      return jsonError('Valid workspace and vendor IDs are required', 400);
    }

    if (
      !validDate(assessment_date) ||
      !validDate(next_review_date)
    ) {
      return jsonError('Dates must be valid YYYY-MM-DD values', 400);
    }

    const ratings: Record<string, unknown> = {
      data_sensitivity,
      system_access,
      business_criticality,
      regulatory_exposure,
      security_controls,
      incident_history,
    };

    for (const [field, value] of Object.entries(ratings)) {
      if (!riskLevels.includes(value as RiskLevel)) {
        return jsonError(`Invalid risk rating for ${field}`, 400);
      }
    }

    if (!assessmentStatuses.includes(
      assessment_status as (typeof assessmentStatuses)[number],
    )) {
      return jsonError('Invalid assessment status', 400);
    }

    if (!validText(findings, 20000)) {
      return jsonError('Findings must be text under 20,000 characters', 400);
    }

    if (!validText(remediation_actions, 20000)) {
      return jsonError(
        'Remediation actions must be text under 20,000 characters',
        400,
      );
    }

    const { data: membership, error: membershipError } =
      await verifyWorkspace(supabase, workspace_id, user.id);

    if (membershipError) {
      return jsonError('Could not verify workspace access', 500);
    }

    if (
      !membership ||
      !['owner', 'admin', 'member'].includes(membership.role)
    ) {
      return jsonError('You cannot create assessments in this workspace', 403);
    }

    const { data: vendor, error: vendorError } = await verifyVendor(
      supabase,
      vendor_id,
      workspace_id,
    );

    if (vendorError) return jsonError('Could not validate vendor', 500);
    if (!vendor) return jsonError('Vendor not found in this workspace', 404);

    const overallRisk = calculateOverallRisk(ratings);

    const { data, error } = await supabase
      .from('vendor_risk_assessments')
      .insert({
        workspace_id,
        vendor_id,
        assessment_date: assessment_date || null,
        next_review_date: next_review_date || null,
        ...ratings,
        overall_risk: overallRisk,
        findings: findings || null,
        remediation_actions: remediation_actions || null,
        assessment_status,
        assessed_by: user.id,
      })
      .select('*, vendors!inner(name)')
      .single();

    if (error) {
      console.error('VENDOR RISK CREATE:', error.message);
      return jsonError('Could not create risk assessment', 500);
    }

    await writeAuditLog(supabase, {
      workspaceId: workspace_id,
      actorId: user.id,
      action: 'created',
      entityType: 'risk_assessment',
      entityId: data.id,
      entityName: vendor.name,
      details: {
        overall_risk: data.overall_risk,
        assessment_status: data.assessment_status,
      },
    });

    return NextResponse.json({ assessment: data }, { status: 201 });
  } catch (error) {
    console.error('VENDOR RISK POST ERROR:', error);
    return jsonError('Could not create risk assessment', 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const { user, supabase } = await authenticate(req);

    if (!user || !supabase) return jsonError('Unauthorized', 401);

    let body: Record<string, unknown>;

    try {
      const parsed: unknown = await req.json();

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return jsonError('Invalid request body', 400);
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return jsonError('Invalid JSON request body', 400);
    }

    const { id, workspace_id, ...changes } = body;

    if (
      typeof id !== 'string' ||
      !uuidPattern.test(id) ||
      typeof workspace_id !== 'string' ||
      !uuidPattern.test(workspace_id)
    ) {
      return jsonError('Valid assessment and workspace IDs are required', 400);
    }

    const allowedFields = [
      ...riskFields,
      'assessment_date',
      'next_review_date',
      'findings',
      'remediation_actions',
      'assessment_status',
    ];

    const keys = Object.keys(changes);

    if (
      keys.length === 0 ||
      keys.some((key) => !allowedFields.includes(key))
    ) {
      return jsonError('No valid assessment changes supplied', 400);
    }

    for (const field of riskFields) {
      if (
        field in changes &&
        !riskLevels.includes(changes[field] as RiskLevel)
      ) {
        return jsonError(`Invalid risk rating for ${field}`, 400);
      }
    }

    for (const field of ['assessment_date', 'next_review_date']) {
      if (field in changes && !validDate(changes[field])) {
        return jsonError(`Invalid ${field}`, 400);
      }
    }

    if (
      'assessment_status' in changes &&
      !assessmentStatuses.includes(
        changes.assessment_status as (typeof assessmentStatuses)[number],
      )
    ) {
      return jsonError('Invalid assessment status', 400);
    }

    for (const field of ['findings', 'remediation_actions']) {
      if (field in changes && !validText(changes[field], 20000)) {
        return jsonError(`Invalid ${field}`, 400);
      }
    }

    const { data: existing, error: existingError } = await supabase
      .from('vendor_risk_assessments')
      .select('id, vendor_id, workspace_id, data_sensitivity, system_access, business_criticality, regulatory_exposure, security_controls, incident_history')
      .eq('id', id)
      .eq('workspace_id', workspace_id)
      .maybeSingle();

    if (existingError) return jsonError('Could not load assessment', 500);
    if (!existing) return jsonError('Assessment not found', 404);

    const ratings: Record<string, unknown> = {};

    for (const field of riskFields) {
      ratings[field] = field in changes ? changes[field] : existing[field];
    }

    const update: Record<string, unknown> = {};

    for (const key of keys) {
      const value = changes[key];

      update[key] =
        ['assessment_date', 'next_review_date'].includes(key) && value === ''
          ? null
          : value;
    }

    if (riskFields.some((field) => field in changes)) {
      update.overall_risk = calculateOverallRisk(ratings);
    }

    const { data, error } = await supabase
      .from('vendor_risk_assessments')
      .update(update)
      .eq('id', id)
      .eq('workspace_id', workspace_id)
      .select('*, vendors!inner(name)')
      .maybeSingle();

    if (error) {
      console.error('VENDOR RISK UPDATE:', error.message);
      return jsonError('Could not update risk assessment', 500);
    }

    if (!data) {
      return jsonError('Assessment not found or update not permitted', 404);
    }

    await writeAuditLog(supabase, {
      workspaceId: workspace_id,
      actorId: user.id,
      action: 'updated',
      entityType: 'risk_assessment',
      entityId: data.id,
      entityName: data.vendors?.name ?? null,
      details: {
        changed_fields: keys,
        overall_risk: data.overall_risk,
        assessment_status: data.assessment_status,
      },
    });

    return NextResponse.json({ assessment: data });
  } catch (error) {
    console.error('VENDOR RISK PATCH ERROR:', error);
    return jsonError('Could not update risk assessment', 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const { user, supabase } = await authenticate(req);

    if (!user || !supabase) return jsonError('Unauthorized', 401);

    const params = new URL(req.url).searchParams;
    const id = params.get('id');
    const workspaceId = params.get('workspaceId');

    if (
      !id ||
      !uuidPattern.test(id) ||
      !workspaceId ||
      !uuidPattern.test(workspaceId)
    ) {
      return jsonError('Valid assessment and workspace IDs are required', 400);
    }

    const { data: membership, error: membershipError } =
      await verifyWorkspace(supabase, workspaceId, user.id);

    if (membershipError) {
      return jsonError('Could not verify workspace access', 500);
    }

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return jsonError(
        'Only workspace owners and admins can delete assessments',
        403,
      );
    }

    const { data, error } = await supabase
      .from('vendor_risk_assessments')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('VENDOR RISK DELETE:', error.message);
      return jsonError('Could not delete assessment', 500);
    }

    if (!data) return jsonError('Assessment not found', 404);

    await writeAuditLog(supabase, {
      workspaceId: workspaceId,
      actorId: user.id,
      action: 'deleted',
      entityType: 'risk_assessment',
      entityId: data.id,
      entityName: `Risk assessment ${data.id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('VENDOR RISK DELETE ERROR:', error);
    return jsonError('Could not delete risk assessment', 500);
  }
}
