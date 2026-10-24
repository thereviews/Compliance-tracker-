import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin, getAuthClient } from '@/lib/supabase';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_SIZE = 25 * 1024 * 1024;

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

function cleanFilename(filename: string) {
  return filename
    .replace(/[\/\\]/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-150);
}

export async function POST(request: NextRequest) {
let uploadedFilePath: string | null = null;
let documentId: string | null = null;

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

const formData = await request.formData();

const file = formData.get('file');
const workspaceId = String(formData.get('workspaceId') || '');
const vendorId = String(formData.get('vendorId') || '');
const evidenceType = String(formData.get('evidenceType') || '');
const frameworkValue = String(formData.get('framework') || '');
const issueDateValue = String(formData.get('issueDate') || '');
const expirationDateValue = String(
  formData.get('expirationDate') || ''
);
const verificationStatus = String(
  formData.get('verificationStatus') || 'unverified'
);
const notes = String(formData.get('notes') || '').trim();

const framework = frameworkValue || null;
const issueDate = issueDateValue || null;
const expirationDate = expirationDateValue || null;

if (!(file instanceof File)) {
  return NextResponse.json(
    { success: false, error: 'Select a PDF file.' },
    { status: 400 }
  );
}

if (
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId) ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(vendorId)
) {
  return NextResponse.json(
    { success: false, error: 'Invalid workspace or vendor.' },
    { status: 400 }
  );
}

if (!EVIDENCE_TYPES.includes(evidenceType as typeof EVIDENCE_TYPES[number])) {
  return NextResponse.json(
    { success: false, error: 'Invalid evidence type.' },
    { status: 400 }
  );
}

if (
  framework !== null &&
  !FRAMEWORKS.includes(framework as typeof FRAMEWORKS[number])
) {
  return NextResponse.json(
    { success: false, error: 'Invalid compliance framework.' },
    { status: 400 }
  );
}

if (
  !VERIFICATION_STATUSES.includes(
    verificationStatus as typeof VERIFICATION_STATUSES[number]
  )
) {
  return NextResponse.json(
    { success: false, error: 'Invalid verification status.' },
    { status: 400 }
  );
}

const isValidDate = (value: string | null) =>
  value === null ||
  (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) &&
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value);

if (
  !isValidDate(issueDate) ||
  !isValidDate(expirationDate) ||
  (issueDate && expirationDate && expirationDate < issueDate)
) {
  return NextResponse.json(
    { success: false, error: 'Check the issue and expiration dates.' },
    { status: 400 }
  );
}

if (notes.length > 10000) {
  return NextResponse.json(
    { success: false, error: 'Notes cannot exceed 10,000 characters.' },
    { status: 400 }
  );
}

if (
  file.size === 0 ||
  file.size > MAX_FILE_SIZE ||
  !file.name.toLowerCase().endsWith('.pdf') ||
  (file.type && file.type !== 'application/pdf')
) {
  return NextResponse.json(
    {
      success: false,
      error: 'Upload a non-empty PDF file no larger than 25 MB.',
    },
    { status: 400 }
  );
}

const fileBuffer = Buffer.from(await file.arrayBuffer());

if (
  fileBuffer.length < 5 ||
  fileBuffer.subarray(0, 5).toString('ascii') !== '%PDF-'
) {
  return NextResponse.json(
    { success: false, error: 'The uploaded file is not a valid PDF.' },
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
  console.error('Evidence upload membership check failed:', membershipError);
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

if (!['owner', 'admin', 'member'].includes(membership.role)) {
  return NextResponse.json(
    { success: false, error: 'You cannot upload evidence in this workspace.' },
    { status: 403 }
  );
}

const { data: vendor, error: vendorError } = await supabaseAdmin
  .from('vendors')
  .select('id, name, workspace_id')
  .eq('id', vendorId)
  .eq('workspace_id', workspaceId)
  .maybeSingle();

if (vendorError) {
  console.error('Evidence upload vendor check failed:', vendorError);
  return NextResponse.json(
    { success: false, error: 'Could not verify the vendor.' },
    { status: 500 }
  );
}

if (!vendor) {
  return NextResponse.json(
    { success: false, error: 'Vendor not found in this workspace.' },
    { status: 404 }
  );
}

const safeFilename = cleanFilename(file.name);

if (!safeFilename) {
  return NextResponse.json(
    { success: false, error: 'Invalid filename.' },
    { status: 400 }
  );
}

uploadedFilePath =
  `${workspaceId}/${user.id}/${Date.now()}_${randomUUID()}_${safeFilename}`;

const { error: storageError } = await supabaseAdmin.storage
  .from('compliance-files')
  .upload(uploadedFilePath, fileBuffer, {
    contentType: 'application/pdf',
    upsert: false,
  });

if (storageError) {
  console.error('Evidence storage upload failed:', storageError);
  return NextResponse.json(
    { success: false, error: 'Could not upload the evidence PDF.' },
    { status: 500 }
  );
}

const documentType = `Compliance Evidence: ${evidenceType}`;

const { data: document, error: documentError } = await supabaseAdmin
  .from('compliance_documents')
  .insert({
    user_id: user.id,
    workspace_id: workspaceId,
    vendor_id: vendorId,
    file_path: uploadedFilePath,
    document_type: documentType,
    effective_date: issueDate,
    expiration_date: expirationDate,
    auto_renewal: false,
    notice_period_days: null,
    financial_value: null,
    compliance_summary: notes || null,
    status: expirationDate && expirationDate < new Date().toISOString().slice(0, 10)
      ? 'Expired'
      : 'Active',
  })
  .select('id')
  .single();

if (documentError || !document) {
  console.error('Evidence document record creation failed:', documentError);
  throw new Error('Could not save the evidence document.');
}

documentId = document.id;

const { data: evidence, error: evidenceError } = await supabaseAdmin
  .from('vendor_compliance_evidence')
  .insert({
    workspace_id: workspaceId,
    vendor_id: vendorId,
    document_id: document.id,
    evidence_type: evidenceType,
    framework,
    issue_date: issueDate,
    expiration_date: expirationDate,
    verification_status: verificationStatus,
    notes: notes || null,
    uploaded_by: user.id,
  })
  .select('id, document_id, evidence_type, framework, issue_date, expiration_date, verification_status, notes, created_at')
  .single();

if (evidenceError || !evidence) {
  console.error('Evidence metadata creation failed:', evidenceError);
  throw new Error('Could not save the evidence metadata.');
}

await writeAuditLog(authClient, {
  workspaceId,
  actorId: user.id,
  action: 'uploaded',
  entityType: 'compliance_evidence',
  entityId: evidence.id,
  entityName: `${evidenceType} — ${vendor.name}`,
  details: {
    vendor_id: vendorId,
    document_id: document.id,
    evidence_type: evidenceType,
    framework,
    verification_status: verificationStatus,
    source: 'compliance_evidence_upload',
  },
});

return NextResponse.json(
  {
    success: true,
    evidence: {
      ...evidence,
      vendor_id: vendorId,
      vendor_name: vendor.name,
      document_type: documentType,
      file_path: uploadedFilePath,
    },
  },
  { status: 201 }
);

} catch (error) {
console.error('Compliance evidence upload failed:', error);

if (documentId) {
  const { error: deleteError } = await supabaseAdmin
    .from('compliance_documents')
    .delete()
    .eq('id', documentId);

  if (deleteError) {
    console.error('Evidence rollback document cleanup failed:', deleteError);
  }
}

if (uploadedFilePath) {
  const { error: storageCleanupError } = await supabaseAdmin.storage
    .from('compliance-files')
    .remove([uploadedFilePath]);

  if (storageCleanupError) {
    console.error('Evidence rollback storage cleanup failed:', storageCleanupError);
  }
}

return NextResponse.json(
  { success: false, error: 'The evidence upload could not be completed.' },
  { status: 500 }
);

}
}
