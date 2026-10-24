import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';
import { writeAuditLog } from '@/lib/audit';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const frameworks = [
  'SOC 2',
  'ISO 27001',
  'GDPR',
  'HIPAA',
  'PCI DSS',
] as const;

const statuses = [
  'not_assessed',
  'under_review',
  'compliant',
  'non_compliant',
  'expired',
] as const;

const verificationStatuses = [
  'self_reported',
  'under_review',
  'verified',
  'unverified',
] as const;

type AssessmentStatus = (typeof statuses)[number];
type VerificationStatus =
  (typeof verificationStatuses)[number];

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
      .from('vendor_compliance_assessments')
      .select('*, vendors!inner(name)')
      .eq('workspace_id', workspaceId);

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    const { data, error } = await query.order(
      'created_at',
      { ascending: false },
    );

    if (error) {
      console.error('COMPLIANCE ASSESSMENTS GET:', error.message);
      return jsonError('Could not load compliance assessments', 500);
    }

    return NextResponse.json({
      assessments: data ?? [],
      role: membership.role,
    });
  } catch (error) {
    console.error('COMPLIANCE ASSESSMENTS GET ERROR:', error);
    return jsonError('Could not load compliance assessments', 500);
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
        return jsonError('Invalid request body', 400);
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return jsonError('Invalid JSON request body', 400);
    }

    const {
      workspace_id,
      vendor_id,
      framework,
      status = 'not_assessed',
      verification_status = 'unverified',
      assessment_date = null,
      next_review_date = null,
      certificate_expiration_date = null,
      evidence_document_id = null,
      notes = null,
    } = body;

    if (
      typeof workspace_id !== 'string' ||
      !uuidPattern.test(workspace_id) ||
      typeof vendor_id !== 'string' ||
      !uuidPattern.test(vendor_id)
    ) {
      return jsonError('Valid workspace and vendor IDs are required', 400);
    }

    if (!frameworks.includes(framework as (typeof frameworks)[number])) {
      return jsonError('Unsupported compliance framework', 400);
    }

    if (!statuses.includes(status as AssessmentStatus)) {
      return jsonError('Invalid compliance status', 400);
    }

    if (
      !verificationStatuses.includes(
        verification_status as VerificationStatus,
      )
    ) {
      return jsonError('Invalid verification status', 400);
    }

    if (
      !validDate(assessment_date) ||
      !validDate(next_review_date) ||
      !validDate(certificate_expiration_date)
    ) {
      return jsonError('Dates must be valid YYYY-MM-DD values', 400);
    }

    if (
      evidence_document_id !== null &&
      (typeof evidence_document_id !== 'string' ||
        !uuidPattern.test(evidence_document_id))
    ) {
      return jsonError('Invalid evidence document ID', 400);
    }

    if (
      notes !== null &&
      (typeof notes !== 'string' || notes.length > 10000)
    ) {
      return jsonError('Notes must be text under 10,000 characters', 400);
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

    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id')
      .eq('id', vendor_id)
      .eq('workspace_id', workspace_id)
      .maybeSingle();

    if (vendorError) {
      return jsonError('Could not validate vendor', 500);
    }

    if (!vendor) {
      return jsonError('Vendor not found in this workspace', 404);
    }

    if (evidence_document_id) {
      const { data: evidence, error: evidenceError } = await supabase
        .from('compliance_documents')
        .select('id')
        .eq('id', evidence_document_id)
        .eq('vendor_id', vendor_id)
        .eq('workspace_id', workspace_id)
        .maybeSingle();

      if (evidenceError) {
        return jsonError('Could not validate evidence document', 500);
      }

      if (!evidence) {
        return jsonError(
          'Evidence must belong to the selected vendor and workspace',
          400,
        );
      }
    }

    const { data, error } = await supabase
      .from('vendor_compliance_assessments')
      .insert({
        workspace_id,
        vendor_id,
        framework,
        status,
        verification_status,
        assessment_date: assessment_date || null,
        next_review_date: next_review_date || null,
        certificate_expiration_date:
          certificate_expiration_date || null,
        evidence_document_id,
        notes: notes || null,
        created_by: user.id,
      })
      .select('*, vendors!inner(name)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return jsonError(
          'An assessment for this framework already exists for this vendor',
          409,
        );
      }

      console.error('COMPLIANCE ASSESSMENT CREATE:', error.message);
      return jsonError('Could not create compliance assessment', 500);
    }

    await writeAuditLog(supabase, {
      workspaceId: workspace_id,
      actorId: user.id,
      action: 'created',
      entityType: 'compliance_assessment',
      entityId: data.id,
      entityName: `${data.framework} compliance assessment`,
      details: {
        vendor_id,
        framework: data.framework,
        status: data.status,
        verification_status: data.verification_status,
      },
    });

    return NextResponse.json({ assessment: data }, { status: 201 });
  } catch (error) {
    console.error('COMPLIANCE ASSESSMENT POST ERROR:', error);
    return jsonError('Could not create compliance assessment', 500);
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
      'status',
      'verification_status',
      'assessment_date',
      'next_review_date',
      'certificate_expiration_date',
      'evidence_document_id',
      'notes',
    ];

    const keys = Object.keys(changes);

    if (
      keys.length === 0 ||
      keys.some((key) => !allowedFields.includes(key))
    ) {
      return jsonError('No valid assessment changes supplied', 400);
    }

    if (
      'status' in changes &&
      !statuses.includes(changes.status as AssessmentStatus)
    ) {
      return jsonError('Invalid compliance status', 400);
    }

    if (
      'verification_status' in changes &&
      !verificationStatuses.includes(
        changes.verification_status as VerificationStatus,
      )
    ) {
      return jsonError('Invalid verification status', 400);
    }

    for (const key of [
      'assessment_date',
      'next_review_date',
      'certificate_expiration_date',
    ]) {
      if (key in changes && !validDate(changes[key])) {
        return jsonError(`Invalid ${key}`, 400);
      }
    }

    if (
      'evidence_document_id' in changes &&
      changes.evidence_document_id !== null &&
      (typeof changes.evidence_document_id !== 'string' ||
        !uuidPattern.test(changes.evidence_document_id))
    ) {
      return jsonError('Invalid evidence document ID', 400);
    }

    if (
      'notes' in changes &&
      changes.notes !== null &&
      (typeof changes.notes !== 'string' ||
        changes.notes.length > 10000)
    ) {
      return jsonError('Invalid notes', 400);
    }

    const { data: existing, error: existingError } = await supabase
      .from('vendor_compliance_assessments')
      .select('id, vendor_id, workspace_id, framework, status')
      .eq('id', id)
      .eq('workspace_id', workspace_id)
      .maybeSingle();

    if (existingError) {
      return jsonError('Could not load assessment', 500);
    }

    if (!existing) {
      return jsonError('Assessment not found', 404);
    }

    if ('evidence_document_id' in changes && changes.evidence_document_id) {
      const { data: evidence, error: evidenceError } = await supabase
        .from('compliance_documents')
        .select('id')
        .eq('id', changes.evidence_document_id as string)
        .eq('vendor_id', existing.vendor_id)
        .eq('workspace_id', workspace_id)
        .maybeSingle();

      if (evidenceError) {
        return jsonError('Could not validate evidence document', 500);
      }

      if (!evidence) {
        return jsonError(
          'Evidence must belong to the selected vendor and workspace',
          400,
        );
      }
    }

    const update: Record<string, unknown> = {};

    for (const key of keys) {
      const value = changes[key];

      update[key] =
        [
          'assessment_date',
          'next_review_date',
          'certificate_expiration_date',
        ].includes(key) && value === ''
          ? null
          : value;
    }

    const { data, error } = await supabase
      .from('vendor_compliance_assessments')
      .update(update)
      .eq('id', id)
      .eq('workspace_id', workspace_id)
      .select('*, vendors!inner(name)')
      .maybeSingle();

    if (error) {
      console.error('COMPLIANCE ASSESSMENT UPDATE:', error.message);
      return jsonError('Could not update assessment', 500);
    }

    if (!data) {
      return jsonError('Assessment not found or update not permitted', 404);
    }

    await writeAuditLog(supabase, {
      workspaceId: workspace_id,
      actorId: user.id,
      action:
        'status' in changes && existing.status !== data.status
          ? 'status_changed'
          : 'updated',
      entityType: 'compliance_assessment',
      entityId: data.id,
      entityName: `${data.framework} compliance assessment`,
      details: {
        changed_fields: keys,
        status: data.status,
        verification_status: data.verification_status,
      },
    });

    return NextResponse.json({ assessment: data });
  } catch (error) {
    console.error('COMPLIANCE ASSESSMENT PATCH ERROR:', error);
    return jsonError('Could not update compliance assessment', 500);
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
      return jsonError('Valid assessment and workspace IDs are required', 400);
    }

    const { data: membership, error: membershipError } =
      await verifyWorkspace(supabase, workspaceId, user.id);

    if (membershipError) {
      return jsonError('Could not verify workspace access', 500);
    }

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return jsonError('Only workspace owners and admins can delete assessments', 403);
    }

    const { data, error } = await supabase
      .from('vendor_compliance_assessments')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('id, framework')
      .maybeSingle();

    if (error) {
      console.error('COMPLIANCE ASSESSMENT DELETE:', error.message);
      return jsonError('Could not delete assessment', 500);
    }

    if (!data) {
      return jsonError('Assessment not found', 404);
    }

    await writeAuditLog(supabase, {
      workspaceId: workspaceId,
      actorId: user.id,
      action: 'deleted',
      entityType: 'compliance_assessment',
      entityId: data.id,
      entityName: `${data.framework} compliance assessment`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('COMPLIANCE ASSESSMENT DELETE ERROR:', error);
    return jsonError('Could not delete compliance assessment', 500);
  }
}
