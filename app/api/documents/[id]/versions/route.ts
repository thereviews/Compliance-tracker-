import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAuthClient } from '@/lib/supabase';
import { ai, documentExtractionSchema } from '@/lib/gemini';
import { writeAuditLog } from '@/lib/audit';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function authenticate(req: Request) {
  const supabase = getAuthClient(req.headers.get('Authorization'));
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user: error ? null : user };
}

async function getDocumentAccess(
  req: Request,
  documentId: string,
) {
  const { supabase, user } = await authenticate(req);

  if (!user) {
    return {
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      ),
    };
  }

  const { data: document, error } = await supabase
    .from('compliance_documents')
    .select('id, user_id, workspace_id, vendor_id, file_path, document_type')
    .eq('id', documentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Document lookup failed: ${error.message}`);
  }

  if (!document || !document.workspace_id) {
    return {
      response: NextResponse.json(
        { error: 'Document not found or unavailable.' },
        { status: 404 },
      ),
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', document.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Membership lookup failed: ${membershipError.message}`);
  }

  if (!membership) {
    return {
      response: NextResponse.json(
        { error: 'You do not have access to this workspace.' },
        { status: 403 },
      ),
    };
  }

  return {
    supabase,
    user,
    document,
    role: membership.role,
    isAdmin: ['owner', 'admin'].includes(membership.role),
    isUploader: document.user_id === user.id,
  };
}

export async function GET(
  req: Request,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid document ID.' },
        { status: 400 },
      );
    }

    const access = await getDocumentAccess(req, id);

    if ('response' in access) {
      return access.response;
    }

    const { supabase, document } = access;

    const { data: versions, error } = await supabase
      .from('contract_versions')
      .select(
        'id, document_id, version_number, file_path, change_summary, created_by, created_at',
      )
      .eq('document_id', document.id)
      .eq('workspace_id', document.workspace_id)
      .order('version_number', { ascending: false });

    if (error) {
      throw new Error(`Version history lookup failed: ${error.message}`);
    }

    const history = await Promise.all(
      (versions ?? []).map(async (version) => {
        const { data } = await supabase.storage
          .from('compliance-files')
          .createSignedUrl(version.file_path, 60);

        return {
          ...version,
          download_url: data?.signedUrl ?? null,
          is_current: version.file_path === document.file_path,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      documentId: document.id,
      currentFilePath: document.file_path,
      versions: history,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error('CONTRACT VERSION HISTORY ERROR:', message);

    return NextResponse.json(
      { error: 'Could not retrieve contract version history.' },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: RouteContext,
) {
  let uploadedFilePath: string | null = null;
  let supabaseForCleanup:
    | ReturnType<typeof getAuthClient>
    | null = null;

  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid document ID.' },
        { status: 400 },
      );
    }

    const access = await getDocumentAccess(req, id);

    if ('response' in access) {
      return access.response;
    }

    const {
      supabase,
      user,
      document,
      isAdmin,
      isUploader,
    } = access;

    supabaseForCleanup = supabase;

    if (!isAdmin && !(access.role === 'member' && isUploader)) {
      return NextResponse.json(
        { error: 'Your role does not allow creating contract versions.' },
        { status: 403 },
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const workspaceId = formData.get('workspaceId');
    const changeSummary = formData.get('changeSummary');

    if (workspaceId !== document.workspace_id) {
      return NextResponse.json(
        { error: 'Workspace does not match the contract.' },
        { status: 400 },
      );
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: 'Select a non-empty PDF file.' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'The PDF must be 25 MB or smaller.' },
        { status: 413 },
      );
    }

    if (
      !file.name.toLowerCase().endsWith('.pdf') ||
      (file.type && file.type !== 'application/pdf')
    ) {
      return NextResponse.json(
        { error: 'Only PDF files are supported.' },
        { status: 415 },
      );
    }

    if (
      changeSummary !== null &&
      (typeof changeSummary !== 'string' || changeSummary.length > 2000)
    ) {
      return NextResponse.json(
        { error: 'Change summary must be at most 2,000 characters.' },
        { status: 400 },
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    if (
      fileBuffer.length < 5 ||
      fileBuffer.subarray(0, 5).toString('ascii') !== '%PDF-'
    ) {
      return NextResponse.json(
        { error: 'The selected file is not a valid PDF.' },
        { status: 415 },
      );
    }
     
    // Extract metadata from the new contract version.
// Extraction failure must not prevent the PDF version from being saved.
let extractedMetadata: Record<string, unknown> | null = null;

try {
  const base64File = fileBuffer.toString('base64');

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64File,
            },
          },
          {
            text: 'Extract structured compliance metadata from this updated contract. Extract the terms from this PDF only. Never invent missing dates, monetary values, renewal provisions, or liability terms. financial_value must be the explicitly supported total contract value, not the liability cap or an assumed sum of fees. Identify the legal vendor, not the client. Set auto_renewal to true only if automatic renewal or extension is explicitly stated. Distinguish fixed liability caps from caps based on fees paid, and preserve uncertainty.',
          },
        ],
      },
    ],
    config: {
      systemInstruction:
        'You are a precise legal and procurement document parser. Extract only information supported by the supplied contract. Dates must use YYYY-MM-DD when explicitly supported. Do not invent missing information. For liability_cap_basis, use fixed_amount, fees_paid, multiple_of_fees, uncapped, unclear, or not_found. Distinguish the general liability cap from exceptions and exclusions. Return strictly valid JSON matching the schema.',
      responseMimeType: 'application/json',
      responseSchema: documentExtractionSchema,
    },
  });

  if (!response.text) {
    throw new Error('Gemini returned an empty response.');
  }

  const parsed: unknown = JSON.parse(response.text);

  if (
    parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed)
  ) {
    const candidate = parsed as Record<string, unknown>;

    if (
      typeof candidate.document_type === 'string' &&
      candidate.document_type.trim() &&
      typeof candidate.auto_renewal === 'boolean' &&
      typeof candidate.compliance_summary === 'string' &&
      candidate.compliance_summary.trim()
    ) {
      extractedMetadata = candidate;
      console.log(
  'VERSION METADATA EXTRACTED:',
  Object.keys(candidate),
);
    } else {
      throw new Error('Gemini returned incomplete required metadata.');
    }
  } else {
    throw new Error('Gemini returned an invalid JSON object.');
  }
} catch (extractionError: unknown) {
  const message =
    extractionError instanceof Error
      ? extractionError.message
      : String(extractionError);

  console.error('CONTRACT VERSION METADATA EXTRACTION ERROR:', message);
}

    const { data: existingVersions, error: versionsError } = await supabase
      .from('contract_versions')
      .select('version_number, file_path')
      .eq('document_id', document.id)
      .eq('workspace_id', document.workspace_id)
      .order('version_number', { ascending: false })
      .limit(1);

    if (versionsError) {
      throw new Error(`Version lookup failed: ${versionsError.message}`);
    }

    const latest = existingVersions?.[0];

    // Preserve the original file as version 1 when versioning begins.
    if (!latest) {
      const { error: initialVersionError } = await supabase
        .from('contract_versions')
        .insert({
          workspace_id: document.workspace_id,
          document_id: document.id,
          version_number: 1,
          file_path: document.file_path,
          change_summary: 'Original contract before version history was enabled.',
          created_by: document.user_id,
        });

      if (initialVersionError) {
        throw new Error(
          `Could not preserve the original contract: ${initialVersionError.message}`,
        );
      }
    }

    const currentVersionNumber = latest?.version_number ?? 1;

    // Avoid silently overwriting a version if the database has an unexpected state.
    if (
      !Number.isSafeInteger(currentVersionNumber) ||
      currentVersionNumber < 1
    ) {
      throw new Error('Invalid existing contract version number.');
    }

    const newVersionNumber = currentVersionNumber + 1;

    const safeFilename = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-120);

    const newFilePath =
      `${document.workspace_id}/${user.id}/${Date.now()}_${randomUUID()}_${safeFilename}`;

    const { error: uploadError } = await supabase.storage
      .from('compliance-files')
      .upload(newFilePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    uploadedFilePath = newFilePath;

    const { data: newVersion, error: insertError } = await supabase
      .from('contract_versions')
      .insert({
        workspace_id: document.workspace_id,
        document_id: document.id,
        version_number: newVersionNumber,
        file_path: newFilePath,
        change_summary:
          typeof changeSummary === 'string' && changeSummary.trim()
            ? changeSummary.trim()
            : null,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Could not save version: ${insertError.message}`);
    }

    // Point the contract record at the latest file.
    const { data: updatedDocument, error: updateError } = await supabase
      .from('compliance_documents')
      .update((() => {
const updates: Record<string, any> = {
file_path: newFilePath,
};

    if (extractedMetadata) {
      const metadata = extractedMetadata;

      if (
        typeof metadata.document_type === 'string' &&
        metadata.document_type.trim()
      ) {
        updates.document_type = metadata.document_type.trim();
      }

      if (typeof metadata.auto_renewal === 'boolean') {
        updates.auto_renewal = metadata.auto_renewal;
      }

      if (
        typeof metadata.compliance_summary === 'string' &&
        metadata.compliance_summary.trim()
      ) {
        updates.compliance_summary = metadata.compliance_summary.trim();
      }

      if (
        typeof metadata.effective_date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(metadata.effective_date) &&
        !Number.isNaN(Date.parse(metadata.effective_date))
      ) {
        updates.effective_date = metadata.effective_date;
      }

      if (
        typeof metadata.expiration_date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(metadata.expiration_date) &&
        !Number.isNaN(Date.parse(metadata.expiration_date))
      ) {
        updates.expiration_date = metadata.expiration_date;
      }

      if (
        typeof metadata.notice_period_days === 'number' &&
        Number.isInteger(metadata.notice_period_days) &&
        metadata.notice_period_days >= 0
      ) {
        updates.notice_period_days = metadata.notice_period_days;
      }

      if (
        typeof metadata.financial_value === 'number' &&
        Number.isFinite(metadata.financial_value) &&
        metadata.financial_value >= 0
      ) {
        updates.financial_value = metadata.financial_value;
      }

      if (
        typeof metadata.liability_cap_amount === 'number' &&
        Number.isFinite(metadata.liability_cap_amount) &&
        metadata.liability_cap_amount >= 0
      ) {
        updates.liability_cap_amount = metadata.liability_cap_amount;
      }

      if (
        typeof metadata.liability_cap_currency === 'string' &&
        metadata.liability_cap_currency.trim()
      ) {
        updates.liability_cap_currency =
          metadata.liability_cap_currency.trim();
      }

      const validLiabilityBases = [
        'fixed_amount',
        'fees_paid',
        'multiple_of_fees',
        'uncapped',
        'unclear',
        'not_found',
      ];

      if (
        typeof metadata.liability_cap_basis === 'string' &&
        validLiabilityBases.includes(metadata.liability_cap_basis)
      ) {
        updates.liability_cap_basis = metadata.liability_cap_basis;
      }

      if (
        typeof metadata.liability_cap_clause === 'string' &&
        metadata.liability_cap_clause.trim()
      ) {
        updates.liability_cap_clause =
          metadata.liability_cap_clause.trim();
      }
    }
console.log(
  'VERSION METADATA UPDATE FIELDS:',
  Object.keys(updates),
);

    return updates;
  })())
              .eq('id', document.id)
              .eq('workspace_id', document.workspace_id)
              .select('*')
              .maybeSingle();
console.log(
  'VERSION UPDATE RESULT:',
  updateError
    ? { error: updateError.message }
    : updatedDocument
      ? {
          document_type: updatedDocument.document_type,
          effective_date: updatedDocument.effective_date,
          expiration_date: updatedDocument.expiration_date,
          auto_renewal: updatedDocument.auto_renewal,
          financial_value: updatedDocument.financial_value,
          notice_period_days: updatedDocument.notice_period_days,
          compliance_summary: updatedDocument.compliance_summary,
          liability_cap_amount: updatedDocument.liability_cap_amount,
          liability_cap_currency: updatedDocument.liability_cap_currency,
          liability_cap_basis: updatedDocument.liability_cap_basis,
        }
      : null,
);

    if (updateError || !updatedDocument) {
      // Preserve the successfully recorded version for recovery.
      console.error(
        'CONTRACT CURRENT FILE UPDATE ERROR:',
        updateError?.message ?? 'Document update returned no row.',
      );

      return NextResponse.json(
        {
          success: true,
          warning:
            'The version was saved, but the contract record could not be updated to point to the latest file. Please contact an administrator.',
          version: newVersion,
        },
        { status: 202 },
      );
    }

    uploadedFilePath = null;

    await writeAuditLog(supabase, {
      workspaceId: document.workspace_id,
      actorId: user.id,
      action: 'uploaded',
      entityType: 'document',
      entityId: document.id,
      entityName: document.document_type || `Document ${document.id}`,
      details: {
        source: 'contract_version_upload',
        metadata_extraction_status: extractedMetadata
  ? 'succeeded'
  : 'failed',
metadata_updated: Boolean(extractedMetadata),
        version_number: newVersionNumber,
        version_id: newVersion.id,
        change_summary: newVersion.change_summary,
      },
    });


    return NextResponse.json(
      {
        success: true,
        version: newVersion,
        metadataUpdated: Boolean(extractedMetadata),
        metadataWarning: extractedMetadata
          ? null
          : 'The PDF was saved, but metadata extraction failed. Existing metadata was preserved.',
      },
      { status: 201 },
    );
    
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error('CONTRACT VERSION UPLOAD ERROR:', message);

    if (supabaseForCleanup && uploadedFilePath) {
      const { error: cleanupError } = await supabaseForCleanup.storage
        .from('compliance-files')
        .remove([uploadedFilePath]);

      if (cleanupError) {
        console.error(
          'CONTRACT VERSION FILE CLEANUP ERROR:',
          cleanupError.message,
        );
      }
    }

    return NextResponse.json(
      { error: 'Could not create contract version.' },
      { status: 500 },
    );
  }
}
