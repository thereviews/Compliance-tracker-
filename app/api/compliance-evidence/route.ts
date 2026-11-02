import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthClient } from '@/lib/supabase';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
try {
const authHeader = request.headers.get('authorization');

if (!authHeader?.startsWith('Bearer ')) {
  return NextResponse.json(
    { success: false, error: 'Authentication required.' },
    { status: 401 }
  );
}

const authClient = getAuthClient(authHeader);
const {
  data: { user },
  error: authError,
} = await authClient.auth.getUser();

if (authError || !user) {
  return NextResponse.json(
    { success: false, error: 'Invalid or expired session.' },
    { status: 401 }
  );
}

const workspaceId = request.nextUrl.searchParams.get('workspaceId');
const vendorId = request.nextUrl.searchParams.get('vendorId');

if (
  !workspaceId ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)
) {
  return NextResponse.json(
    { success: false, error: 'A valid workspace ID is required.' },
    { status: 400 }
  );
}

if (
  vendorId &&
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(vendorId)
) {
  return NextResponse.json(
    { success: false, error: 'Invalid vendor ID.' },
    { status: 400 }
  );
}

const { data: membership, error: membershipError } =
  await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();

if (membershipError) {
  console.error('Evidence membership lookup failed:', membershipError);

  return NextResponse.json(
    { success: false, error: 'Could not verify workspace access.' },
    { status: 500 }
  );
}

if (!membership) {
  return NextResponse.json(
    { success: false, error: 'You do not have access to this workspace.' },
    { status: 403 }
  );
}

let query = supabaseAdmin
  .from('vendor_compliance_evidence')
  .select(`
    id,
    workspace_id,
    vendor_id,
    document_id,
    evidence_type,
    framework,
    issue_date,
    expiration_date,
    verification_status,
    notes,
    uploaded_by,
    created_at,
    updated_at,
    vendors!inner(name),
    compliance_documents!inner(
      id,
      document_type,
      file_path,
      status
    )
  `)
  .eq('workspace_id', workspaceId)
  .order('created_at', { ascending: false });

if (vendorId) {
  query = query.eq('vendor_id', vendorId);
}

const { data: evidence, error: evidenceError } = await query;

if (evidenceError) {
  console.error('Evidence list query failed:', evidenceError);

  return NextResponse.json(
    { success: false, error: 'Could not load compliance evidence.' },
    { status: 500 }
  );
}

return NextResponse.json({
  success: true,
  evidence: evidence ?? [],
  role: membership.role,
});

} catch (error) {
console.error('Evidence list request failed:', error);

return NextResponse.json(
  { success: false, error: 'An unexpected error occurred.' },
  { status: 500 }
);

}
}

const EVIDENCE_TYPES = [
  'certificate',
  'audit_report',
  'questionnaire',
  'security_policy',
  'other',
] as const;

const FRAMEWORKS = [
  'SOC 2',
  'ISO 27001',
  'GDPR',
  'HIPAA',
  'PCI DSS',
  'Other',
] as const;

const VERIFICATION_STATUSES = [
  'unverified',
  'self_reported',
  'under_review',
  'verified',
  'rejected',
] as const;

const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isValidDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const authClient = getAuthClient(authHeader);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session.' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      evidenceId,
      workspaceId,
      vendorId,
      evidenceType,
      framework,
      issueDate,
      expirationDate,
      verificationStatus,
      notes,
    } = body;

    if (!isValidUuid(evidenceId) || !isValidUuid(workspaceId) || !isValidUuid(vendorId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid evidence, workspace, or vendor ID.' },
        { status: 400 }
      );
    }

    if (!EVIDENCE_TYPES.includes(evidenceType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid evidence type.' },
        { status: 400 }
      );
    }

    if (
      framework !== '' &&
      framework !== null &&
      !FRAMEWORKS.includes(framework)
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid compliance framework.' },
        { status: 400 }
      );
    }

    if (!VERIFICATION_STATUSES.includes(verificationStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification status.' },
        { status: 400 }
      );
    }

    if (issueDate && !isValidDate(issueDate)) {
      return NextResponse.json(
        { success: false, error: 'Invalid issue date.' },
        { status: 400 }
      );
    }

    if (expirationDate && !isValidDate(expirationDate)) {
      return NextResponse.json(
        { success: false, error: 'Invalid expiration date.' },
        { status: 400 }
      );
    }

    if (issueDate && expirationDate && expirationDate < issueDate) {
      return NextResponse.json(
        { success: false, error: 'Expiration date cannot be before issue date.' },
        { status: 400 }
      );
    }

    if (notes !== undefined && notes !== null &&
        (typeof notes !== 'string' || notes.length > 10000)) {
      return NextResponse.json(
        { success: false, error: 'Notes must be 10,000 characters or fewer.' },
        { status: 400 }
      );
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) {
      console.error('Evidence edit membership lookup failed:', membershipError);
      return NextResponse.json(
        { success: false, error: 'Could not verify workspace access.' },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this workspace.' },
        { status: 403 }
      );
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { success: false, error: 'Only workspace owners and admins can edit evidence.' },
        { status: 403 }
      );
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('vendor_compliance_evidence')
      .select('id, workspace_id, vendor_id, document_id, evidence_type, framework, issue_date, expiration_date, verification_status, notes')
      .eq('id', evidenceId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (existingError) {
      console.error('Evidence edit lookup failed:', existingError);
      return NextResponse.json(
        { success: false, error: 'Could not load the existing evidence record.' },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Evidence record not found.' },
        { status: 404 }
      );
    }

    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from('vendors')
      .select('id, name')
      .eq('id', vendorId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (vendorError || !vendor) {
      return NextResponse.json(
        { success: false, error: 'The selected vendor was not found in this workspace.' },
        { status: 400 }
      );
    }

    const { data: linkedDocument, error: documentLookupError } = await supabaseAdmin
      .from('compliance_documents')
      .select('id, vendor_id, document_type, effective_date, expiration_date, compliance_summary, status')
      .eq('id', existing.document_id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (documentLookupError || !linkedDocument) {
      console.error('Linked evidence document lookup failed:', documentLookupError);
      return NextResponse.json(
        { success: false, error: 'The linked document could not be found.' },
        { status: 500 }
      );
    }

    const normalizedIssueDate = issueDate || null;
    const normalizedExpirationDate = expirationDate || null;
    const normalizedFramework = framework || null;
    const normalizedNotes = notes || null;

    const documentStatus =
      normalizedExpirationDate &&
      normalizedExpirationDate < new Date().toISOString().slice(0, 10)
        ? 'Expired'
        : 'Active';

    const documentChanges = {
      vendor_id: vendorId,
      document_type: `Compliance Evidence: ${evidenceType}`,
      effective_date: normalizedIssueDate,
      expiration_date: normalizedExpirationDate,
      compliance_summary: normalizedNotes,
      status: documentStatus,
    };

    const evidenceChanges = {
      vendor_id: vendorId,
      evidence_type: evidenceType,
      framework: normalizedFramework,
      issue_date: normalizedIssueDate,
      expiration_date: normalizedExpirationDate,
      verification_status: verificationStatus,
      notes: normalizedNotes,
      updated_at: new Date().toISOString(),
    };

    const { error: documentUpdateError } = await supabaseAdmin
      .from('compliance_documents')
      .update(documentChanges)
      .eq('id', existing.document_id)
      .eq('workspace_id', workspaceId);

    if (documentUpdateError) {
      console.error('Linked document update failed:', documentUpdateError);
      return NextResponse.json(
        { success: false, error: 'Could not update the linked document.' },
        { status: 500 }
      );
    }

    const { data: updatedEvidence, error: evidenceUpdateError } = await supabaseAdmin
      .from('vendor_compliance_evidence')
      .update(evidenceChanges)
      .eq('id', evidenceId)
      .eq('workspace_id', workspaceId)
      .select('*')
      .single();

    if (evidenceUpdateError || !updatedEvidence) {
      console.error('Evidence update failed:', evidenceUpdateError);

      const { error: rollbackError } = await supabaseAdmin
        .from('compliance_documents')
        .update({
          vendor_id: linkedDocument.vendor_id,
          document_type: linkedDocument.document_type,
          effective_date: linkedDocument.effective_date,
          expiration_date: linkedDocument.expiration_date,
          compliance_summary: linkedDocument.compliance_summary,
          status: linkedDocument.status,
        })
        .eq('id', existing.document_id)
        .eq('workspace_id', workspaceId);

      if (rollbackError) {
        console.error('Linked document rollback failed:', rollbackError);
      }

      return NextResponse.json(
        { success: false, error: 'Could not save the evidence changes.' },
        { status: 500 }
      );
    }

    await writeAuditLog(supabaseAdmin, {
      workspaceId,
      actorId: user.id,
      action: 'updated',
      entityType: 'compliance_evidence',
      entityId: evidenceId,
      entityName: `${evidenceType} — ${vendor.name}`,
      details: {
        previous: {
          vendor_id: existing.vendor_id,
          evidence_type: existing.evidence_type,
          framework: existing.framework,
          verification_status: existing.verification_status,
        },
        updated: {
          vendor_id: vendorId,
          evidence_type: evidenceType,
          framework: normalizedFramework,
          verification_status: verificationStatus,
        },
      },
    });

    return NextResponse.json({
      success: true,
      evidence: {
        ...updatedEvidence,
        vendor_name: vendor.name,
        document_type: documentChanges.document_type,
        file_path: linkedDocument ? undefined : undefined,
      },
    });
  } catch (error) {
    console.error('Evidence update request failed:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
