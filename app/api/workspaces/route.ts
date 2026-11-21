import { NextResponse } from 'next/server';
import { getAuthClient, supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

async function readJsonObject(
  req: Request
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return null;
    }

    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}


export async function PATCH(req: Request) {
  try {
    const supabase = getAuthClient(
      req.headers.get('Authorization')
    );

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await readJsonObject(req);

    if (!body) {
      return NextResponse.json(
        { error: 'A valid JSON object is required.' },
        { status: 400 }
      );
    }

    const workspaceId =
      typeof body.workspaceId === 'string' ? body.workspaceId : '';
    const name =
      typeof body.name === 'string' ? body.name.trim() : '';

    if (
      !workspaceId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId)
    ) {
      return NextResponse.json(
        { error: 'Valid workspaceId required' },
        { status: 400 }
      );
    }

    if (!name || name.length > 100) {
      return NextResponse.json(
        { error: 'Workspace name must be between 1 and 100 characters' },
        { status: 400 }
      );
    }

    const { data: membership, error: membershipError } =
      await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    if (!membership) {
      return NextResponse.json(
        { error: 'Workspace access denied' },
        { status: 403 }
      );
    }

    if (!['Owner', 'Admin'].includes(membership.role || '')) {
      return NextResponse.json(
        { error: 'Only workspace owners and admins can rename the workspace' },
        { status: 403 }
      );
    }

    const { data: workspace, error: updateError } =
      await supabaseAdmin
        .from('workspaces')
        .update({ name })
        .eq('id', workspaceId)
        .select('id, name')
        .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      success: true,
      workspace
    });

  } catch (error: unknown) {
    console.error('[WORKSPACE UPDATE ERROR]', error);

    return NextResponse.json(
      { error: 'Failed to update workspace' },
      { status: 500 }
    );
  }
}
