import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin, getAuthClient } from '@/lib/supabase';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const verificationStatuses = [
  'unverified',
  'self_reported',
  'under_review',
  'verified',
  'rejected',
] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function validDate(value: string) {
  return value === '' ||
    (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) &&
      new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value);
}

function cleanFilename(filename: string) {
  return filename
    .replace(/[\/\\]/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-150);
}

async function authenticate(request: Request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return { error: jsonError('Authentication required.', 401) };
  }

  const supabase = getAuthClient(authHeader);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: jsonError('Invalid or expired session.', 401) };
  }

  return { supabase, user };
}

async function verifyWorkspace(
  supabase: Awaited<ReturnType<typeof getAuthClient>>,
  workspaceId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('SECURITY EVIDENCE MEMBERSHIP:', error.message);
    return { error: jsonError('Could not verify workspace access.', 500) };
  }

  if (!data) {
    return { error: jsonError('You do not have access to this workspace.', 403) };
  }

  return { role: data.role as string };
}

function canManage(role: string) {
  return role === 'owner' || role === 'admin';
}

function validControlIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 200 &&
    value.every((id) => typeof id === 'string' && uuidPattern.test(id)) &&
    new Set(value).size === value.length
  );
}

async function validateControls(
  supabase: Awaited<ReturnType<typeof getAuthClient>>,
  workspaceId: string,
  controlIds: string[],
) {
  if (controlIds.length === 0) return true;

  const { data, error } = await supabase
    .from('security_controls')
    .select('id')
    .eq('workspace_id', workspaceId)
    .in('id', controlIds);

  if (error) {
    console.error('SECURITY EVIDENCE CONTROL VALIDATION:', error.message);
    return false;
  }

  return (data?.length ?? 0) === controlIds.length;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if ('error' in auth) return auth.error;

    const { supabase, user } = auth;
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');

    if (!workspaceId || !uuidPattern.test(workspaceId)) {
      return jsonError('A valid workspace ID is required.', 400);
    }

    const membership = await verifyWorkspace(supabase, workspaceId, user.id);
    if ('error' in membership) return membership.error;

    const { data: evidence, error } = await supabase
      .from('security_evidence')
      .select('id, workspace_id, file_name, file_type, file_size, description, evidence_date, expiration_date, verification_status, uploaded_by, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('SECURITY EVIDENCE GET:', error.message);
      return jsonError('Could not load evidence records.', 500);
    }

    const evidenceIds = (evidence ?? []).map((item) => item.id);
    let links: { evidence_id: string; control_id: string }[] = [];

    if (evidenceIds.length > 0) {
      const { data, error: linksError } = await supabase
        .from('security_control_evidence')
        .select('evidence_id, control_id')
        .eq('workspace_id', workspaceId)
        .in('evidence_id', evidenceIds);

      if (linksError) {
        console.error('SECURITY EVIDENCE LINKS GET:', linksError.message);
        return jsonError('Could not load evidence control links.', 500);
      }

      links = data ?? [];
    }

    const controlIds = [...new Set(links.map((link) => link.control_id))];
    let controls: { id: string; title: string; control_code: string | null }[] = [];

    if (controlIds.length > 0) {
      const { data, error: controlsError } = await supabase
        .from('security_controls')
        .select('id, title, control_code')
        .eq('workspace_id', workspaceId)
        .in('id', controlIds);

      if (controlsError) {
        console.error('SECURITY EVIDENCE CONTROLS GET:', controlsError.message);
        return jsonError('Could not load linked controls.', 500);
      }

      controls = data ?? [];
    }

    const records = (evidence ?? []).map((item) => {
      const linkedControlIds = links
        .filter((link) => link.evidence_id === item.id)
        .map((link) => link.control_id);

      return {
        ...item,
        controlIds: linkedControlIds,
        controls: controls.filter((control) =>
          linkedControlIds.includes(control.id),
        ),
      };
    });

    return NextResponse.json({ evidence: records, role: membership.role });
  } catch (error) {
    console.error('SECURITY EVIDENCE GET ERROR:', error);
    return jsonError('Could not load evidence records.', 500);
  }
}

export async function POST(request: NextRequest) {
  let uploadedFilePath: string | null = null;
  let evidenceId: string | null = null;

  try {
    const auth = await authenticate(request);
    if ('error' in auth) return auth.error;

    const { supabase, user } = auth;
    const formData = await request.formData();

    const file = formData.get('file');
    const workspaceId = String(formData.get('workspaceId') || '');
    const description = String(formData.get('description') || '').trim();
    const evidenceDate = String(formData.get('evidenceDate') || '');
    const expirationDate = String(formData.get('expirationDate') || '');
    const verificationStatus = String(
      formData.get('verificationStatus') || 'unverified',
    );

    let controlIds: unknown;
    try {
      controlIds = JSON.parse(String(formData.get('controlIds') || '[]'));
    } catch {
      return jsonError('Invalid control selection.', 400);
    }

    if (!(file instanceof File)) {
      return jsonError('Select a PDF file.', 400);
    }

    if (!uuidPattern.test(workspaceId)) {
      return jsonError('A valid workspace ID is required.', 400);
    }

    if (
      file.size === 0 ||
      file.size > MAX_FILE_SIZE ||
      !file.name.toLowerCase().endsWith('.pdf') ||
      (file.type && file.type !== 'application/pdf')
    ) {
      return jsonError('Upload a non-empty PDF no larger than 25 MB.', 400);
    }

    if (
      description.length > 10000 ||
      !validDate(evidenceDate) ||
      !validDate(expirationDate) ||
      (evidenceDate && expirationDate && expirationDate < evidenceDate)
    ) {
      return jsonError('Check the description and evidence dates.', 400);
    }

    if (
      !verificationStatuses.includes(
        verificationStatus as (typeof verificationStatuses)[number],
      )
    ) {
      return jsonError('Invalid verification status.', 400);
    }

    if (!validControlIds(controlIds)) {
      return jsonError('Invalid control selection.', 400);
    }

    const membership = await verifyWorkspace(supabase, workspaceId, user.id);
    if ('error' in membership) return membership.error;

    if (!canManage(membership.role)) {
      return jsonError('Only workspace owners and admins can upload evidence.', 403);
    }

    const controlsValid = await validateControls(
      supabase,
      workspaceId,
      controlIds,
    );

    if (!controlsValid) {
      return jsonError('One or more selected controls are not in this workspace.', 400);
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    if (
      fileBuffer.length < 5 ||
      fileBuffer.subarray(0, 5).toString('ascii') !== '%PDF-'
    ) {
      return jsonError('The uploaded file is not a valid PDF.', 400);
    }

    const safeFilename = cleanFilename(file.name);
    if (!safeFilename) return jsonError('Invalid filename.', 400);

    uploadedFilePath =
      `${workspaceId}/security-evidence/${user.id}/${Date.now()}_${randomUUID()}_${safeFilename}`;

    const { error: storageError } = await supabaseAdmin.storage
      .from('compliance-files')
      .upload(uploadedFilePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (storageError) {
      console.error('SECURITY EVIDENCE STORAGE UPLOAD:', storageError.message);
      return jsonError('Could not upload the evidence PDF.', 500);
    }

    const { data: evidence, error: insertError } = await supabase
      .from('security_evidence')
      .insert({
        workspace_id: workspaceId,
        file_name: safeFilename,
        file_path: uploadedFilePath,
        file_type: 'application/pdf',
        file_size: file.size,
        description: description || null,
        evidence_date: evidenceDate || null,
        expiration_date: expirationDate || null,
        verification_status: verificationStatus,
        uploaded_by: user.id,
      })
      .select('id, file_name, file_type, file_size, description, evidence_date, expiration_date, verification_status, uploaded_by, created_at')
      .single();

    if (insertError || !evidence) {
      console.error('SECURITY EVIDENCE INSERT:', insertError?.message);
      throw new Error('Could not save the evidence record.');
    }

    evidenceId = evidence.id;

    if (controlIds.length > 0) {
      const { error: linkError } = await supabase
        .from('security_control_evidence')
        .insert(
          controlIds.map((controlId) => ({
            workspace_id: workspaceId,
            control_id: controlId,
            evidence_id: evidence.id,
          })),
        );

      if (linkError) {
        console.error('SECURITY EVIDENCE LINK INSERT:', linkError.message);
        throw new Error('Could not link the evidence to the selected controls.');
      }
    }

    await writeAuditLog(supabase, {
      workspaceId,
      actorId: user.id,
      action: 'uploaded',
      entityType: 'security_evidence',
      entityId: evidence.id,
      entityName: evidence.file_name,
      details: {
        file_size: evidence.file_size,
        verification_status: evidence.verification_status,
        control_ids: controlIds,
      },
    });

    return NextResponse.json(
      { evidence: { ...evidence, controlIds } },
      { status: 201 },
    );
  } catch (error) {
    console.error('SECURITY EVIDENCE POST ERROR:', error);

    if (evidenceId) {
      const { error: linkCleanupError } = await supabaseAdmin
        .from('security_control_evidence')
        .delete()
        .eq('evidence_id', evidenceId);

      if (linkCleanupError) {
        console.error('SECURITY EVIDENCE LINK ROLLBACK:', linkCleanupError.message);
      }

      const { error: recordCleanupError } = await supabaseAdmin
        .from('security_evidence')
        .delete()
        .eq('id', evidenceId);

      if (recordCleanupError) {
        console.error('SECURITY EVIDENCE RECORD ROLLBACK:', recordCleanupError.message);
      }
    }

    if (uploadedFilePath) {
      const { error: storageCleanupError } = await supabaseAdmin.storage
        .from('compliance-files')
        .remove([uploadedFilePath]);

      if (storageCleanupError) {
        console.error('SECURITY EVIDENCE STORAGE ROLLBACK:', storageCleanupError.message);
      }
    }

    return jsonError('The evidence upload could not be completed.', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if ('error' in auth) return auth.error;

    const { supabase, user } = auth;
    const body = await request.json();

    const {
      evidenceId,
      workspaceId,
      description,
      evidenceDate,
      expirationDate,
      verificationStatus,
      controlIds,
    } = body;

    if (
      typeof evidenceId !== 'string' ||
      !uuidPattern.test(evidenceId) ||
      typeof workspaceId !== 'string' ||
      !uuidPattern.test(workspaceId)
    ) {
      return jsonError('Valid evidence and workspace IDs are required.', 400);
    }

    if (
      typeof description !== 'string' ||
      description.trim().length > 10000 ||
      typeof evidenceDate !== 'string' ||
      typeof expirationDate !== 'string' ||
      !validDate(evidenceDate) ||
      !validDate(expirationDate) ||
      (evidenceDate && expirationDate && expirationDate < evidenceDate) ||
      !verificationStatuses.includes(
        verificationStatus as (typeof verificationStatuses)[number],
      ) ||
      !validControlIds(controlIds)
    ) {
      return jsonError('Check the evidence details and selected controls.', 400);
    }

    const membership = await verifyWorkspace(supabase, workspaceId, user.id);
    if ('error' in membership) return membership.error;

    if (!canManage(membership.role)) {
      return jsonError('Only workspace owners and admins can edit evidence.', 403);
    }

    const { data: existing, error: lookupError } = await supabase
      .from('security_evidence')
      .select('id, workspace_id, file_name')
      .eq('id', evidenceId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (lookupError) {
      console.error('SECURITY EVIDENCE PATCH LOOKUP:', lookupError.message);
      return jsonError('Could not retrieve the evidence record.', 500);
    }

    if (!existing) {
      return jsonError('Evidence record not found.', 404);
    }

    const controlsValid = await validateControls(
      supabase,
      workspaceId,
      controlIds,
    );

    if (!controlsValid) {
      return jsonError('One or more selected controls are not in this workspace.', 400);
    }

    const { data: updated, error: updateError } = await supabase
      .from('security_evidence')
      .update({
        description: description.trim() || null,
        evidence_date: evidenceDate || null,
        expiration_date: expirationDate || null,
        verification_status: verificationStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', evidenceId)
      .eq('workspace_id', workspaceId)
      .select('id, file_name, file_type, file_size, description, evidence_date, expiration_date, verification_status, uploaded_by, created_at, updated_at')
      .single();

    if (updateError || !updated) {
      console.error('SECURITY EVIDENCE PATCH UPDATE:', updateError?.message);
      return jsonError('Could not update the evidence record.', 500);
    }

    const { error: deleteLinksError } = await supabase
      .from('security_control_evidence')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('evidence_id', evidenceId);

    if (deleteLinksError) {
      console.error('SECURITY EVIDENCE PATCH LINK DELETE:', deleteLinksError.message);
      return jsonError('Evidence details were saved, but control links could not be updated. Please retry.', 500);
    }

    if (controlIds.length > 0) {
      const { error: insertLinksError } = await supabase
        .from('security_control_evidence')
        .insert(
          controlIds.map((controlId) => ({
            workspace_id: workspaceId,
            control_id: controlId,
            evidence_id: evidenceId,
          })),
        );

      if (insertLinksError) {
        console.error('SECURITY EVIDENCE PATCH LINK INSERT:', insertLinksError.message);
        return jsonError('Evidence details were saved, but control links could not be updated. Please retry.', 500);
      }
    }

    await writeAuditLog(supabase, {
      workspaceId,
      actorId: user.id,
      action: 'updated',
      entityType: 'security_evidence',
      entityId: evidenceId,
      entityName: existing.file_name,
      details: {
        verification_status: verificationStatus,
        control_ids: controlIds,
      },
    });

    return NextResponse.json({
      success: true,
      evidence: { ...updated, controlIds },
    });
  } catch (error) {
    console.error('SECURITY EVIDENCE PATCH ERROR:', error);
    return jsonError('Could not update the evidence record.', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if ('error' in auth) return auth.error;

    const { supabase, user } = auth;
    const body = await request.json();
    const { evidenceId, workspaceId } = body;

    if (
      typeof evidenceId !== 'string' ||
      !uuidPattern.test(evidenceId) ||
      typeof workspaceId !== 'string' ||
      !uuidPattern.test(workspaceId)
    ) {
      return jsonError('Valid evidence and workspace IDs are required.', 400);
    }

    const membership = await verifyWorkspace(supabase, workspaceId, user.id);
    if ('error' in membership) return membership.error;

    if (!canManage(membership.role)) {
      return jsonError('Only workspace owners and admins can delete evidence.', 403);
    }

    const { data: evidence, error: lookupError } = await supabase
      .from('security_evidence')
      .select('id, workspace_id, file_path, file_name')
      .eq('id', evidenceId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (lookupError) {
      console.error('SECURITY EVIDENCE DELETE LOOKUP:', lookupError.message);
      return jsonError('Could not retrieve the evidence record.', 500);
    }

    if (!evidence) {
      return jsonError('Evidence record not found.', 404);
    }

    const { error: linksError } = await supabase
      .from('security_control_evidence')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('evidence_id', evidenceId);

    if (linksError) {
      console.error('SECURITY EVIDENCE DELETE LINKS:', linksError.message);
      return jsonError('Could not remove evidence control links.', 500);
    }

    const { error: recordError } = await supabase
      .from('security_evidence')
      .delete()
      .eq('id', evidenceId)
      .eq('workspace_id', workspaceId);

    if (recordError) {
      console.error('SECURITY EVIDENCE DELETE RECORD:', recordError.message);
      return jsonError('Could not delete the evidence record.', 500);
    }

    const { error: storageError } = await supabaseAdmin.storage
      .from('compliance-files')
      .remove([evidence.file_path]);

    if (storageError) {
      console.error('SECURITY EVIDENCE DELETE FILE:', storageError.message);
    }

    await writeAuditLog(supabase, {
      workspaceId,
      actorId: user.id,
      action: 'deleted',
      entityType: 'security_evidence',
      entityId: evidenceId,
      entityName: evidence.file_name,
      details: {
        storage_file_removed: !storageError,
      },
    });

    return NextResponse.json({
      success: true,
      storageFileRemoved: !storageError,
    });
  } catch (error) {
    console.error('SECURITY EVIDENCE DELETE ERROR:', error);
    return jsonError('Could not delete the evidence record.', 500);
  }
}
