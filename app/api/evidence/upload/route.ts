import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';
import { ai, complianceExtractionSchema } from '@/lib/gemini';

export const runtime = 'nodejs';

function isRetryableGeminiError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const details = error as {
    status?: unknown;
    code?: unknown;
    message?: unknown;
    name?: unknown;
  };

  const status = details.status;

  if (
    typeof status === 'number' &&
    (status === 408 || status === 429 || status >= 500)
  ) {
    return true;
  }

  const code = typeof details.code === 'string'
    ? details.code.toUpperCase()
    : '';

  const message = typeof details.message === 'string'
    ? details.message
    : '';

  const name = typeof details.name === 'string'
    ? details.name
    : '';

  return (
    [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EAI_AGAIN',
      'ENOTFOUND',
      'UND_ERR_CONNECT_TIMEOUT'
    ].includes(code) ||
    name === 'AbortError' ||
    /timeout|timed out|fetch failed|socket hang up/i.test(message)
  );
}

async function withGeminiRetries<T>(
  operation: () => Promise<T>
): Promise<T> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts || !isRetryableGeminiError(error)) {
        throw error;
      }

      const delayMs = attempt * 1000;

      console.warn('[GEMINI RETRY]', {
        attempt,
        nextAttempt: attempt + 1,
        maxAttempts,
        delayMs,
        error
      });

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('Gemini request failed after all retry attempts.');
}


export async function POST(req: Request) {
  const requestStartedAt = performance.now();
  let stageStartedAt = requestStartedAt;
  let storageDurationMs: number | null = null;
  let geminiDurationMs: number | null = null;
  let databaseDurationMs: number | null = null;
  let stage = 'initialization';
  let filePath: string | null = null;
  let uploadCompleted = false;
  let evidenceSaved = false;

  try {
    // 1. Authenticate user
    stage = 'authentication';

    const supabase = getAuthClient(
      req.headers.get('Authorization')
    );

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication failed. Please sign in again.' },
        { status: 401 }
      );
    }

    // 2. Receive and validate Storage upload metadata
    stage = 'upload metadata validation';

    const contentLength = req.headers.get('content-length');

    if (contentLength !== null) {
      const requestSize = Number(contentLength);

      if (!Number.isSafeInteger(requestSize) || requestSize < 0 || requestSize > 16 * 1024) {
        return NextResponse.json(
          { error: 'Invalid or oversized upload metadata.' },
          { status: 400 }
        );
      }
    }

    const payload = await req.json() as Record<string, unknown>;

    const workspaceId = payload.workspaceId;
    const requirementValue = payload.requirementId;
    const requestedFilePath = payload.filePath;
    const requestedFileName = payload.fileName;
    const requestedFileSize = payload.fileSize;
    const requestedContentType = payload.contentType;

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (typeof workspaceId !== 'string' || !uuidPattern.test(workspaceId)) {
      return NextResponse.json(
        { error: 'A valid workspace ID is required.' },
        { status: 400 }
      );
    }

    const requirementId =
      typeof requirementValue === 'string' && requirementValue.trim()
        ? requirementValue.trim()
        : null;

    if (requirementId && !uuidPattern.test(requirementId)) {
      return NextResponse.json(
        { error: 'Invalid requirement ID.' },
        { status: 400 }
      );
    }

    if (
      typeof requestedFilePath !== 'string' ||
      !requestedFilePath.startsWith(`${workspaceId}/`) ||
      requestedFilePath.split('/').length !== 2 ||
      !/^\d+-[0-9a-f-]{36}-[A-Za-z0-9._-]{1,120}$/.test(
        requestedFilePath.split('/')[1]
      )
    ) {
      return NextResponse.json(
        { error: 'Invalid evidence storage path.' },
        { status: 400 }
      );
    }

    if (
      typeof requestedFileName !== 'string' ||
      !requestedFileName.trim() ||
      requestedFileName.length > 255 ||
      requestedFileName.includes('\0')
    ) {
      return NextResponse.json(
        { error: 'Invalid filename.' },
        { status: 400 }
      );
    }

    if (
      typeof requestedFileSize !== 'number' ||
      !Number.isSafeInteger(requestedFileSize) ||
      requestedFileSize <= 0 ||
      requestedFileSize > 10 * 1024 * 1024
    ) {
      return NextResponse.json(
        { error: 'The file size is invalid or exceeds the 10 MB limit.' },
        { status: 413 }
      );
    }

    const fileName = requestedFileName;
    filePath = requestedFilePath;
    const extension = fileName.split('.').pop()?.toLowerCase();

    const isPdf =
      extension === 'pdf' &&
      (!requestedContentType || requestedContentType === 'application/pdf');

    const isTxt =
      extension === 'txt' &&
      (!requestedContentType || requestedContentType === 'text/plain');

    if (!isPdf && !isTxt) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only PDF and TXT files are supported.' },
        { status: 400 }
      );
    }

    // Check whether this exact Storage object has already been processed.
    stage = 'duplicate evidence check';

    const { data: existingEvidence, error: duplicateCheckError } =
      await supabase
        .from('compliance_evidence')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('file_path', requestedFilePath)
        .maybeSingle();

    if (duplicateCheckError) {
      throw new Error(
        `Duplicate evidence check failed: ${duplicateCheckError.message}`
      );
    }

    if (existingEvidence) {
      return NextResponse.json(
        {
          success: false,
          error: 'This uploaded file has already been processed. No new extraction was run. Please use the existing evidence record.'
        },
        { status: 409 }
      );
    }

    // 3. Verify selected requirement belongs to this workspace
    if (requirementId) {
      stage = 'requirement validation';

      const { data: requirement, error: requirementError } =
        await supabase
          .from('compliance_requirements')
          .select('id')
          .eq('id', requirementId)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

      if (requirementError || !requirement) {
        throw new Error(
          requirementError?.message ||
          'Selected requirement was not found in this workspace.'
        );
      }
    }

    // The browser has already uploaded this object. Enable cleanup
    // for any subsequent processing failure, including download failures.
    uploadCompleted = true;

    stageStartedAt = performance.now();

    // 4. Validate the stored file and prepare Gemini input.
    // PDFs use a short-lived signed URL so Vercel does not download
    // or Base64-encode the entire document.
    let geminiFileUri = '';
    let documentText = '';

    if (isPdf) {
      stage = 'PDF signed URL validation';

      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage
          .from('compliance-evidence')
          .createSignedUrl(filePath, 600);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error(
          `Could not create a secure document URL: ${signedUrlError?.message || 'No URL returned.'}`
        );
      }

      // Request only the first five bytes. Require a genuine partial
      // response and verify the actual stored size and PDF signature.
      const rangeResponse = await fetch(signedUrlData.signedUrl, {
        headers: { Range: 'bytes=0-4' },
        cache: 'no-store'
      });

      if (rangeResponse.status !== 206) {
        await rangeResponse.body?.cancel();
        throw new Error('Storage did not support safe PDF range validation.');
      }

      const contentRange = rangeResponse.headers.get('content-range');
      const rangeMatch = contentRange?.match(/^bytes 0-4\/(\d+)$/i);

      if (!rangeMatch || Number(rangeMatch[1]) !== requestedFileSize) {
        await rangeResponse.body?.cancel();
        throw new Error('The stored PDF size does not match the uploaded file.');
      }

      const rangeContentLength = rangeResponse.headers.get('content-length');

      if (rangeContentLength && Number(rangeContentLength) !== 5) {
        await rangeResponse.body?.cancel();
        throw new Error('Storage returned an unexpected PDF validation response.');
      }

      const signatureBytes = Buffer.from(await rangeResponse.arrayBuffer());

      if (
        signatureBytes.length !== 5 ||
        signatureBytes.toString('ascii') !== '%PDF-'
      ) {
        throw new Error('The uploaded file does not appear to be a valid PDF.');
      }

      geminiFileUri = signedUrlData.signedUrl;
    } else {
      // Keep full server-side validation for TXT files.
      stage = 'Storage download';

      const { data: storedFile, error: downloadError } = await supabase.storage
        .from('compliance-evidence')
        .download(filePath);

      if (downloadError || !storedFile) {
        throw new Error(
          `Storage download failed: ${downloadError?.message || 'File not found.'}`
        );
      }

      if (
        storedFile.size !== requestedFileSize ||
        storedFile.size > 10 * 1024 * 1024
      ) {
        throw new Error('The stored file size does not match the uploaded file.');
      }

      const fileBuffer = Buffer.from(await storedFile.arrayBuffer());

      try {
        documentText = new TextDecoder('utf-8', { fatal: true }).decode(fileBuffer);
      } catch {
        throw new Error('The text file must use valid UTF-8 encoding.');
      }

      if (fileBuffer.includes(0)) {
        throw new Error('The uploaded file is not valid plain text.');
      }
    }

    storageDurationMs = Math.round(performance.now() - stageStartedAt);

    // 5. Extract document content using Gemini.
    // Gemini fetches PDFs directly from the short-lived signed URL.
    stage = 'Gemini document analysis';

    const documentContent = isPdf
      ? {
          fileData: {
            fileUri: geminiFileUri,
            mimeType: 'application/pdf'
          }
        }
      : {
          text: `Document contents:\n${documentText}`
        };

    const geminiStartedAt = performance.now();
    const response = await withGeminiRetries(() => ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [{
        role: 'user',
        parts: [
          documentContent,
          {
            text:
              'Analyze this compliance document. It may be a policy, regulatory document, audit report, contract, security questionnaire, or vendor questionnaire. ' +
              'Extract its title, document type, obligation source, compliance summary, suggested actions, and proposed individual compliance requirements. ' +

              'REQUIREMENT EXTRACTION RULES: ' +
              '1. Include only specific obligations, controls, or actions supported by the document. Do not invent legal obligations, frameworks, deadlines, statuses, responsible persons, or control details. ' +
              '2. Set applies_to to our_organization, supplier, shared, or unclear. Only use our_organization when the document supports that the obligation applies to the organization using this tracker. Use unclear when applicability is uncertain. ' +
              '3. Supplier statements about their own security practices, certifications, encryption, policies, or incident response are supplier claims, not requirements or compliance achievements of our_organization. A question about a supplier control does not prove the control exists. Supplier assertions are not independent evidence of our_organization compliance. ' +
              '4. Extract all six register fields when supported: requirement title, source framework, priority, deadline, status, and responsible person. For missing fields other than priority, return exactly "Not found in document". Never infer a framework, deadline, status, or responsible person. ' +
              '5. Extract status only when explicitly stated and identify whose status it describes. Do not present supplier or audit finding status as our_organization status. Extract a responsible person only when explicitly named as responsible for that requirement. ' +
              '6. Suggest a priority of Critical, High, Medium, or Low based on potential impact, severity, legal or regulatory consequences, and risk of non-compliance. Briefly explain the reasoning in the reason field. This is an AI suggestion, not a priority assigned by the document. ' +
              '7. Include a short supporting source_excerpt and explain uncertainty in reason when possible. Keep requirements specific and avoid duplicates. Return an empty proposed_requirements array when no sufficiently supported obligations exist. ' +

              'Be accurate and distinguish document facts, supplier assertions, and obligations. Proposed requirements are suggestions for human review, not approved register entries.'
          }
        ]
      }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: complianceExtractionSchema
      }
    }));

    geminiDurationMs = Math.round(performance.now() - geminiStartedAt);

    const usage = response.usageMetadata;
    const candidate = response.candidates?.[0];

    console.log('[GEMINI TOKEN USAGE]', {
      promptTokens: usage?.promptTokenCount ?? null,
      outputTokens: usage?.candidatesTokenCount ?? null,
      thinkingTokens: usage?.thoughtsTokenCount ?? null,
      totalTokens: usage?.totalTokenCount ?? null,
      finishReason: candidate?.finishReason ?? null
    });

    // 6. Parse Gemini response
    stage = 'Gemini response parsing';

    const raw = response.text;

    if (!raw) {
      throw new Error('Gemini returned an empty response.');
    }

    const parsedExtraction: unknown = JSON.parse(raw);

    if (
      !parsedExtraction ||
      typeof parsedExtraction !== 'object' ||
      Array.isArray(parsedExtraction)
    ) {
      throw new Error('Gemini returned an invalid response structure.');
    }

    const extraction = parsedExtraction as Record<string, unknown>;

    const complianceSummary =
      typeof extraction.compliance_summary === 'string'
        ? extraction.compliance_summary.trim()
        : '';

    if (!complianceSummary || complianceSummary.length > 5000) {
      throw new Error('Gemini returned an invalid compliance summary.');
    }

    const proposedRequirements = Array.isArray(extraction.proposed_requirements)
      ? extraction.proposed_requirements.slice(0, 20)
      : [];

    console.log('[GEMINI EXTRACTION RESULT]', {
      documentType:
        typeof extraction.document_type === 'string'
          ? extraction.document_type.slice(0, 100)
          : null,
      proposedRequirementCount: proposedRequirements.length,
      applicability: proposedRequirements.map((item: unknown) => {
        if (!item || typeof item !== 'object') return null;
        const applicability = (item as Record<string, unknown>).applies_to;
        return typeof applicability === 'string'
          ? applicability.slice(0, 50)
          : null;
      })
    });

    // 7. Save evidence record in Supabase
    stage = 'evidence database insertion';

    const databaseStartedAt = performance.now();
    const { data: evidenceRecord, error: evidenceError } =
      await supabase
        .from('compliance_evidence')
        .insert({
          workspace_id: workspaceId,
          requirement_id: requirementId,
          file_name: fileName,
          file_path: filePath,
          document_type:
            typeof extraction.document_type === 'string' &&
            extraction.document_type.trim()
              ? extraction.document_type.trim().slice(0, 100)
              : 'Document',
          compliance_summary: complianceSummary,
          uploaded_by: user.id
        })
        .select()
        .single();

    if (evidenceError || !evidenceRecord) {
      throw new Error(
        `Evidence record insert failed: ${
          evidenceError?.message || 'No record returned.'
        }`
      );
    }

    databaseDurationMs = Math.round(performance.now() - databaseStartedAt);
    evidenceSaved = true;

    // 8. Save evidence only. Requirements and actions require user review.
    const savedEvidence = evidenceRecord;
    const createdRequirement: any = null;
    const requirementWarning: string | null = null;
    const createdActions: any[] = [];
    const actionsWarning: string | null = null;

    // 9. Return confirmed result
    console.log('[UPLOAD TIMINGS]', {
      fileType: isPdf ? 'pdf' : 'txt',
      storageValidationMs: storageDurationMs,
      geminiMs: geminiDurationMs,
      evidenceInsertMs: databaseDurationMs,
      totalApiMs: Math.round(performance.now() - requestStartedAt)
    });

    console.log('[UPLOAD SUCCESS]', {
      evidenceId: evidenceRecord.id,
      fileName: fileName,
      actionsCreated: createdActions.length
    });

    return NextResponse.json({
      success: true,
      message: 'Document uploaded, analyzed and saved successfully.',
      evidence: savedEvidence,
      extraction,
      requirement: createdRequirement,
      requirementWarning,
      actions: createdActions,
      actionsWarning
    });

  } catch (error: unknown) {
    console.error('[UPLOAD ERROR]', {
      stage,

      storageValidationMs: storageDurationMs,
      geminiMs: geminiDurationMs,
      evidenceInsertMs: databaseDurationMs,
      totalApiMs: Math.round(performance.now() - requestStartedAt),
      error
    });

    // Best-effort cleanup if storage succeeded but the evidence record did not.
    if (uploadCompleted && !evidenceSaved && filePath) {
      try {
        const { error: cleanupError } = await getAuthClient(
          req.headers.get('Authorization')
        )
          .storage
          .from('compliance-evidence')
          .remove([filePath]);

        if (cleanupError) {
          console.error('[UPLOAD CLEANUP ERROR]', cleanupError);
        }
      } catch (cleanupError) {
        console.error('[UPLOAD CLEANUP ERROR]', cleanupError);
      }
    }

    return NextResponse.json(
      { error: 'Document ingestion failed. Please try again.' },
      { status: 500 }
    );
  }
}
