import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAuthClient } from '@/lib/supabase';
import { writeAuditLog } from '@/lib/audit';
import { ai, documentExtractionSchema } from '@/lib/gemini';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  let step = 'starting';
  let supabase: ReturnType<typeof getAuthClient> | null = null;
  let uploadedFilePath: string | null = null;
  let createdVendorId: string | null = null;

  try {
    // 1. Authenticate the user.
    step = 'authenticating';

    supabase = getAuthClient(req.headers.get('Authorization'));

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Read and validate the submitted form.
    step = 'validating form data';

    const formData = await req.formData();

    const fileEntry = formData.get('file');
    const workspaceIdEntry = formData.get('workspaceId');
    const vendorIdEntry = formData.get('vendorId');
    const newVendorNameEntry = formData.get('newVendorName');

    if (!(fileEntry instanceof File) || fileEntry.size === 0) {
      return NextResponse.json(
        { error: 'Please select a non-empty PDF file.' },
        { status: 400 }
      );
    }

    if (
      typeof workspaceIdEntry !== 'string' ||
      !UUID_REGEX.test(workspaceIdEntry)
    ) {
      return NextResponse.json(
        { error: 'A valid workspace ID is required.' },
        { status: 400 }
      );
    }

    const workspaceId = workspaceIdEntry;
    const file = fileEntry;

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'The PDF must be 25 MB or smaller.' },
        { status: 413 }
      );
    }

    if (
      !file.name.toLowerCase().endsWith('.pdf') ||
      (file.type && file.type !== 'application/pdf')
    ) {
      return NextResponse.json(
        { error: 'Only PDF files are supported.' },
        { status: 415 }
      );
    }

    let vendorId =
      typeof vendorIdEntry === 'string' && vendorIdEntry.trim()
        ? vendorIdEntry.trim()
        : null;

    const newVendorName =
      typeof newVendorNameEntry === 'string'
        ? newVendorNameEntry.trim()
        : '';

    if (vendorId && !UUID_REGEX.test(vendorId)) {
      return NextResponse.json(
        { error: 'Invalid vendor ID.' },
        { status: 400 }
      );
    }

    // 3. Confirm workspace membership and upload permission.
    step = 'checking workspace permissions';

    const { data: membership, error: membershipError } =
      await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (membershipError) {
      throw new Error(
        `Workspace membership lookup failed: ${membershipError.message}`
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have access to this workspace.' },
        { status: 403 }
      );
    }

    const allowedRoles = ['owner', 'admin', 'member'];

    if (!allowedRoles.includes(membership.role)) {
      return NextResponse.json(
        { error: 'Your workspace role does not allow uploads.' },
        { status: 403 }
      );
    }

    // 4. Extract the document metadata with Gemini.
    step = 'reading PDF';

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Check the PDF signature rather than trusting the MIME type alone.
    if (
      fileBuffer.length < 5 ||
      fileBuffer.subarray(0, 5).toString('ascii') !== '%PDF-'
    ) {
      return NextResponse.json(
        { error: 'The selected file is not a valid PDF.' },
        { status: 415 }
      );
    }

    step = 'calling Gemini';

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
              text: 'Extract structured compliance metadata from this document.',
            },
          ],
        },
      ],
      config: {
        systemInstruction: `You are a backend legal and procurement document parser.

Extract structured compliance metadata from this PDF.

GENERAL EXTRACTION RULES:

- vendor_name MUST be the legal company/entity identified as the VENDOR or SERVICE PROVIDER in the agreement.
- Do NOT use the CLIENT name as vendor_name.
- Do NOT use a person's name as vendor_name.
- Copy the vendor's legal company name exactly as written in the document.
- document_type should identify the type of agreement.
- effective_date and expiration_date must use YYYY-MM-DD when explicitly supported by the document.
- Never invent dates, monetary values, renewal terms, or contractual provisions.
- financial_value represents the total contract value, not the liability cap.
- If a value is missing or cannot be determined reliably, omit it when permitted by the schema.
- Extract compliance_summary as a concise summary of important obligations and contractual terms.

AUTO-RENEWAL DETECTION:

- Set auto_renewal to true ONLY when the contract explicitly states that it automatically renews or automatically extends at the end of its term, including automatic renewal for successive terms unless a party gives notice.
- Set auto_renewal to false when the contract has a fixed term but contains no explicit automatic-renewal or automatic-extension provision.
- A termination-for-convenience clause, a notice period, or a requirement to give advance notice does NOT by itself mean the contract automatically renews.
- Do not confuse the right to terminate a contract with automatic renewal.
- Do not infer automatic renewal from the contract's duration, expiration date, or notice_period_days.
- If the contract's renewal provisions are ambiguous or no automatic-renewal provision can be identified, set auto_renewal to false rather than inventing a renewal term.
- Extract auto_renewal from the actual contractual language, not from assumptions based on common contract practices.

LIABILITY CAP EXTRACTION:

- Identify the limitation-of-liability clause and any related provisions that restrict, exclude, or cap liability.
- liability_cap_amount must be the numeric monetary amount of an explicitly stated fixed liability cap. Do not use the total contract value as a substitute.
- liability_cap_currency must identify the currency of the extracted monetary cap, such as USD, EUR, or GBP. Do not guess the currency.
- liability_cap_basis must be one of: fixed_amount, fees_paid, multiple_of_fees, uncapped, unclear, or not_found.
- Use fixed_amount when the contract explicitly states a fixed monetary cap.
- Use fees_paid when the cap is calculated from fees paid or payable during a specified period.
- Use multiple_of_fees when the cap is a stated multiple of fees, such as two times annual fees.
- Use uncapped only when the contract explicitly states that the relevant liability is unlimited or uncapped. Do not infer unlimited liability merely because no cap was found.
- Use unclear when a liability provision exists but its cap or calculation cannot be determined reliably.
- Use not_found when no relevant liability limitation or cap provision can be identified.
- If the cap depends on fees, revenue, insurance, or another variable, do not invent a fixed monetary amount.
- liability_cap_clause should contain the relevant contractual wording or a faithful, concise summary of it.
- Distinguish the general liability cap from exceptions, exclusions, indemnities, confidentiality breaches, data protection violations, fraud, and willful misconduct. Do not assume that every exception is subject to the general cap.
- If different caps apply to different types of claims, describe the relevant distinctions in liability_cap_clause rather than combining them into a single invented amount.
- If the contract is ambiguous, preserve that uncertainty.

Return strictly valid JSON matching the provided schema.`,
        responseMimeType: 'application/json',
        responseSchema: documentExtractionSchema,
      },
    });

    step = 'parsing Gemini response';

    if (!response.text) {
      throw new Error('Gemini returned an empty response.');
    }

    const extraction = JSON.parse(response.text);

    // 5. Validate an explicitly selected vendor.
    step = 'validating vendor';

    if (vendorId) {
      const { data: selectedVendor, error: selectedVendorError } =
        await supabase
          .from('vendors')
          .select('id')
          .eq('id', vendorId)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

      if (selectedVendorError) {
        throw new Error(
          `Vendor validation failed: ${selectedVendorError.message}`
        );
      }

      if (!selectedVendor) {
        return NextResponse.json(
          { error: 'The selected vendor does not belong to this workspace.' },
          { status: 403 }
        );
      }
    } else {
      // 6. Find or create a vendor in the selected workspace.
      const vendorName =
        newVendorName ||
        extraction.vendor_name ||
        'Unknown Vendor';

      const { data: existingVendor, error: existingVendorError } =
        await supabase
          .from('vendors')
          .select('id')
          .eq('name', vendorName)
          .eq('workspace_id', workspaceId)
          .limit(1)
          .maybeSingle();

      if (existingVendorError) {
        throw new Error(
          `Vendor lookup failed: ${existingVendorError.message}`
        );
      }

      if (existingVendor) {
        vendorId = existingVendor.id;
      } else {
        const { data: newVendor, error: vendorError } =
          await supabase
            .from('vendors')
            .insert({
              name: vendorName,
              user_id: user.id,
              workspace_id: workspaceId,
            })
            .select('id')
            .single();

        if (vendorError) {
          throw new Error(
            `Vendor creation failed: ${vendorError.message}`
          );
        }

        vendorId = newVendor.id;
        createdVendorId = newVendor.id;
      }
    }

    // 7. Upload to a workspace-aware Storage path.
    step = 'uploading PDF to Storage';

    const safeFilename = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-120);

    const filePath =
      `${workspaceId}/${user.id}/${Date.now()}_${randomUUID()}_${safeFilename}`;

    const { error: uploadError } = await supabase.storage
      .from('compliance-files')
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `Storage upload failed: ${uploadError.message}`
      );
    }

    uploadedFilePath = filePath;

    // 8. Save the extracted metadata.
    step = 'saving document to database';

    const { data: newDocument, error: docError } =
      await supabase
        .from('compliance_documents')
        .insert({
          user_id: user.id,
          workspace_id: workspaceId,
          vendor_id: vendorId,
          file_path: filePath,
          document_type: extraction.document_type,
          effective_date: extraction.effective_date,
          expiration_date: extraction.expiration_date,
          auto_renewal: extraction.auto_renewal,
          notice_period_days: extraction.notice_period_days,
          financial_value: extraction.financial_value,
          compliance_summary: extraction.compliance_summary,
          liability_cap_amount: extraction.liability_cap_amount ?? null,
          liability_cap_currency: extraction.liability_cap_currency ?? null,
          liability_cap_basis: extraction.liability_cap_basis ?? null,
         liability_cap_clause: extraction.liability_cap_clause ?? null,
         status: 'Active',
        })
        .select()
        .single();

    if (docError) {
      throw new Error(
        `Document database insert failed: ${docError.message}`
      );
    }

    // 9. Record vendor creation after the upload fully succeeds.
    if (createdVendorId) {
      await writeAuditLog(supabase, {
        workspaceId,
        actorId: user.id,
        action: 'created',
        entityType: 'vendor',
        entityId: createdVendorId,
        entityName: newVendorName || extraction.vendor_name || 'Unknown Vendor',
        details: {
          source: 'document_upload',
          document_id: newDocument.id,
        },
      });
    }

    // Record the successful document upload.
    await writeAuditLog(supabase, {
      workspaceId,
      actorId: user.id,
      action: 'uploaded',
      entityType: 'document',
      entityId: newDocument.id,
      entityName: `${newDocument.document_type || 'Document'} — ${newDocument.vendor_name || 'Vendor'}`,
      details: {
        vendor_id: vendorId,
        document_type: newDocument.document_type,
        source: 'document_upload',
      },
    });

    // 11. Success.
    return NextResponse.json({
      success: true,
      data: newDocument,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error(
      `DOCUMENT UPLOAD ERROR at step "${step}":`,
      message
    );

    // Remove the uploaded file if a later operation failed.
    if (supabase && uploadedFilePath) {
      const { error: cleanupError } = await supabase.storage
        .from('compliance-files')
        .remove([uploadedFilePath]);

      if (cleanupError) {
        console.error(
          'STORAGE CLEANUP ERROR:',
          cleanupError.message
        );
      }
    }

    // Best-effort cleanup for a vendor created by this request.
    // RLS may prevent deletion for members; do not bypass it.
    if (supabase && createdVendorId) {
      const { error: vendorCleanupError } = await supabase
        .from('vendors')
        .delete()
        .eq('id', createdVendorId);

      if (vendorCleanupError) {
        console.error(
          'VENDOR CLEANUP ERROR:',
          vendorCleanupError.message
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Upload failed',
        details: message,
        step,
      },
      { status: 500 }
    );
  }
}
