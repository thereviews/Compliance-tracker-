import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';

export const runtime = 'nodejs';

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function DELETE(req: Request) {
  try {
    const supabase = getAuthClient(req.headers.get('Authorization'));

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in again.' },
        { status: 401 }
      );
    }

    let body: Record<string, unknown>;

    try {
      const parsed: unknown = await req.json();

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return NextResponse.json(
          { success: false, error: 'Invalid JSON request body.' },
          { status: 400 }
        );
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request body.' },
        { status: 400 }
      );
    }

    const { workspaceId, evidenceId } = body;

    if (!isUuid(workspaceId) || !isUuid(evidenceId)) {
      return NextResponse.json(
        { success: false, error: 'Valid workspaceId and evidenceId are required.' },
        { status: 400 }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) throw membershipError;

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Workspace access denied.' },
        { status: 403 }
      );
    }

    // Check permission before touching Storage. Members cannot delete
    // evidence, including files they uploaded themselves.
    if (membership.role !== 'Owner' && membership.role !== 'Admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only workspace Owners and Admins can delete evidence.'
        },
        { status: 403 }
      );
    }

    const { data: evidence, error: lookupError } = await supabase
      .from('compliance_evidence')
      .select('id, file_path')
      .eq('id', evidenceId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (!evidence) {
      return NextResponse.json(
        { success: false, error: 'Evidence document not found in this workspace.' },
        { status: 404 }
      );
    }

    // Remove the Storage file first. If this fails, preserve the
    // database record so the user can safely retry the deletion.
    let storageDeleted = false;

    if (
      typeof evidence.file_path === 'string' &&
      evidence.file_path.startsWith(`${workspaceId}/`)
    ) {
      const { error: storageError } = await supabase.storage
        .from('compliance-evidence')
        .remove([evidence.file_path]);

      if (storageError) {
        console.error('[EVIDENCE STORAGE DELETE ERROR]', storageError);

        return NextResponse.json(
          {
            success: false,
            error: 'Could not remove the stored file. The evidence record was kept so you can retry.'
          },
          { status: 500 }
        );
      }

      storageDeleted = true;
    } else {
      console.error('[EVIDENCE STORAGE DELETE SKIPPED] Invalid or missing file path.');
    }

    // Delete the database record only after Storage removal succeeds.
    // Related evidence-link rows are handled by the foreign-key cascade.
    const { data: deleted, error: deleteError } = await supabase
      .from('compliance_evidence')
      .delete()
      .eq('id', evidenceId)
      .eq('workspace_id', workspaceId)
      .select('id')
      .maybeSingle();

    if (deleteError) throw deleteError;

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Evidence document could not be found or deleted.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      storageDeleted
    });
  } catch (error: unknown) {
    console.error('[EVIDENCE DELETE ERROR]', error);

    return NextResponse.json(
      { success: false, error: 'Could not delete evidence document.' },
      { status: 500 }
    );
  }
}
