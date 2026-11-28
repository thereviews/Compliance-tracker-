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


export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (
      !workspaceId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId)
    ) {
      return NextResponse.json(
        { error: 'Valid workspaceId required' },
        { status: 400 }
      );
    }

    // Verify that the requesting user belongs to this workspace.
    const { data: requesterMembership, error: membershipError } =
      await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .limit(1);

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    if (!requesterMembership?.length) {
      return NextResponse.json(
        { error: 'Workspace access denied' },
        { status: 403 }
      );
    }

    // Retrieve only members of this workspace.
    const { data: memberships, error: membersError } =
      await supabase
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', workspaceId);

    if (membersError) {
      throw new Error(membersError.message);
    }

    const members = await Promise.all(
      (memberships || []).map(async (membership) => {
        const { data, error } =
          await supabaseAdmin.auth.admin.getUserById(
            membership.user_id
          );

        if (error || !data?.user) {
          return {
            userId: membership.user_id,
            role: membership.role,
            name: null,
            email: null
          };
        }

        const authUser = data.user;
        const metadata = authUser.user_metadata || {};

        const name =
          metadata.full_name ||
          metadata.name ||
          metadata.display_name ||
          null;

        return {
          userId: authUser.id,
          role: membership.role,
          name,
          email: authUser.email || null
        };
      })
    );

    return NextResponse.json({
      success: true,
      members
    });

  } catch (error: unknown) {
    console.error('[WORKSPACE MEMBERS ERROR]', error);

    return NextResponse.json(
      { error: 'Failed to retrieve workspace members.' },
      { status: 500 }
    );
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
    const targetUserId =
      typeof body.userId === 'string' ? body.userId : '';
    const role =
      typeof body.role === 'string' ? body.role : '';

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(workspaceId) || !uuidRegex.test(targetUserId)) {
      return NextResponse.json(
        { error: 'Valid workspace and user IDs are required' },
        { status: 400 }
      );
    }

    if (!['Admin', 'Member'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be Admin or Member' },
        { status: 400 }
      );
    }

    // Only the workspace Owner may change roles.
    const { data: requester, error: requesterError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (requesterError) throw new Error(requesterError.message);

    if (requester?.role !== 'Owner') {
      return NextResponse.json(
        { error: 'Only the workspace Owner can change member roles' },
        { status: 403 }
      );
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'You cannot change your own role' },
        { status: 400 }
      );
    }

    // Confirm the target belongs to this workspace.
    const { data: target, error: targetError } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (targetError) throw new Error(targetError.message);

    if (!target) {
      return NextResponse.json(
        { error: 'Workspace member not found' },
        { status: 404 }
      );
    }

    if (target.role === 'Owner') {
      return NextResponse.json(
        { error: 'Owner roles cannot be changed here' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('workspace_members')
      .update({ role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId);

    if (updateError) throw new Error(updateError.message);

    const { error: auditError } = await supabaseAdmin
      .from('activity_logs')
      .insert({
        workspace_id: workspaceId,
        actor_user_id: user.id,
        event_type: 'updated',
        entity_type: 'workspace_member',
        entity_id: targetUserId,
        details: { role: { from: target.role, to: role } }
      });

    if (auditError) {
      console.error('[MEMBER ROLE AUDIT ERROR]', auditError);
    }

    return NextResponse.json({
      success: true,
      userId: targetUserId,
      role
    });

  } catch (error: unknown) {
    console.error('[WORKSPACE ROLE UPDATE ERROR]', error);

    return NextResponse.json(
      { error: 'Failed to update member role.' },
      { status: 500 }
    );
  }
}


export async function DELETE(req: Request) {
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
    const targetUserId =
      typeof body.userId === 'string' ? body.userId : '';

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(workspaceId) || !uuidRegex.test(targetUserId)) {
      return NextResponse.json(
        { error: 'Valid workspace and user IDs are required' },
        { status: 400 }
      );
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'You cannot remove yourself from this workspace.' },
        { status: 400 }
      );
    }

    // Read the requester's role using their authenticated client.
    const { data: requester, error: requesterError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (requesterError) throw new Error(requesterError.message);

    if (!requester || !['Owner', 'Admin'].includes(requester.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to remove workspace members.' },
        { status: 403 }
      );
    }

    // Verify the target's membership and role using the admin client.
    const { data: target, error: targetError } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (targetError) throw new Error(targetError.message);

    if (!target) {
      return NextResponse.json(
        { error: 'Workspace member not found.' },
        { status: 404 }
      );
    }

    if (target.role === 'Owner') {
      return NextResponse.json(
        { error: 'The workspace Owner cannot be removed.' },
        { status: 403 }
      );
    }

    if (requester.role === 'Admin' && target.role !== 'Member') {
      return NextResponse.json(
        { error: 'Admins can only remove Members.' },
        { status: 403 }
      );
    }

    const { data: deleted, error: deleteError } = await supabaseAdmin
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .select('user_id')
      .maybeSingle();

    if (deleteError) throw new Error(deleteError.message);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Workspace member could not be removed.' },
        { status: 404 }
      );
    }

    const { error: auditError } = await supabaseAdmin
      .from('activity_logs')
      .insert({
        workspace_id: workspaceId,
        actor_user_id: user.id,
        event_type: 'deleted',
        entity_type: 'workspace_member',
        entity_id: targetUserId,
        details: { role: { from: target.role } }
      });

    if (auditError) {
      console.error('[MEMBER REMOVAL AUDIT ERROR]', auditError);
    }

    return NextResponse.json({
      success: true,
      userId: targetUserId
    });

  } catch (error: unknown) {
    console.error('[WORKSPACE MEMBER REMOVAL ERROR]', error);

    return NextResponse.json(
      { error: 'Failed to remove workspace member.' },
      { status: 500 }
    );
  }
}
