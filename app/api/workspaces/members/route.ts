import { NextResponse } from 'next/server';
import { getAuthClient, supabaseAdmin } from '@/lib/supabase';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function authenticate(req: Request) {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: jsonError('Unauthorized', 401) };
  }

  const supabase = getAuthClient(authHeader);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: jsonError('Unauthorized', 401) };
  }

  return { user, error: null };
}

async function getMembership(workspaceId: string, userId: string) {
  return supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();
}

async function getCompanyWorkspace(workspaceId: string) {
  return supabaseAdmin
    .from('workspaces')
    .select('id, type')
    .eq('id', workspaceId)
    .maybeSingle();
}

export async function GET(req: Request) {
  try {
    const { user, error: authResponse } = await authenticate(req);

    if (authResponse || !user) {
      return authResponse ?? jsonError('Unauthorized', 401);
    }

    const workspaceId = new URL(req.url).searchParams.get('workspaceId');

    if (!workspaceId || !uuidPattern.test(workspaceId)) {
      return jsonError('A valid workspace ID is required', 400);
    }

    const { data: membership, error: membershipError } =
      await getMembership(workspaceId, user.id);

    if (membershipError) {
      return jsonError('Could not verify workspace permissions', 500);
    }

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return jsonError('Only workspace owners and admins can view members', 403);
    }

    const { data: workspace, error: workspaceError } =
      await getCompanyWorkspace(workspaceId);

    if (workspaceError) {
      return jsonError('Could not verify workspace', 500);
    }

    if (!workspace || workspace.type !== 'company') {
      return jsonError('Members are available only for company workspaces', 400);
    }

    const { data: rows, error: membersError } = await supabaseAdmin
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId)
      .order('role', { ascending: true });

    if (membersError) {
      console.error('WORKSPACE MEMBERS FETCH ERROR:', membersError.message);
      return jsonError('Could not load workspace members', 500);
    }

    const members = await Promise.all(
      (rows ?? []).map(async (row) => {
        const { data, error } =
          await supabaseAdmin.auth.admin.getUserById(row.user_id);

        return {
          userId: row.user_id,
          role: row.role,
          email: error ? null : data.user?.email ?? null,
        };
      })
    );

    return NextResponse.json({ members });
  } catch (error) {
    console.error('WORKSPACE MEMBERS GET ERROR:', error);
    return jsonError('Could not load workspace members', 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const { user, error: authResponse } = await authenticate(req);

    if (authResponse || !user) {
      return authResponse ?? jsonError('Unauthorized', 401);
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return jsonError('Invalid JSON request body', 400);
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonError('Invalid request body', 400);
    }

    const input = body as Record<string, unknown>;
    const { workspaceId, userId, role } = input;

    if (
      typeof workspaceId !== 'string' ||
      !uuidPattern.test(workspaceId) ||
      typeof userId !== 'string' ||
      !uuidPattern.test(userId)
    ) {
      return jsonError('Valid workspace and user IDs are required', 400);
    }

    if (!['admin', 'member', 'viewer'].includes(String(role))) {
      return jsonError('Invalid role', 400);
    }

    const { data: actorMembership, error: actorError } =
      await getMembership(workspaceId, user.id);

    if (actorError) {
      return jsonError('Could not verify workspace permissions', 500);
    }

    if (!actorMembership || actorMembership.role !== 'owner') {
      return jsonError('Only the workspace owner can change member roles', 403);
    }

    if (userId === user.id) {
      return jsonError('You cannot change your own role', 400);
    }

    const { data: workspace, error: workspaceError } =
      await getCompanyWorkspace(workspaceId);

    if (workspaceError) {
      return jsonError('Could not verify workspace', 500);
    }

    if (!workspace || workspace.type !== 'company') {
      return jsonError('Members are available only for company workspaces', 400);
    }

    const { data: target, error: targetError } =
      await getMembership(workspaceId, userId);

    if (targetError) {
      return jsonError('Could not verify target member', 500);
    }

    if (!target) {
      return jsonError('Member not found in this workspace', 404);
    }

    if (target.role === 'owner') {
      return jsonError('The owner role cannot be changed here', 400);
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('workspace_members')
      .update({ role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .select('user_id, role')
      .maybeSingle();

    if (updateError) {
      console.error('WORKSPACE MEMBER ROLE UPDATE ERROR:', updateError.message);
      return jsonError('Could not update member role', 500);
    }

    if (!updated) {
      return jsonError('Member role was not updated', 404);
    }

    return NextResponse.json({ success: true, member: updated });
  } catch (error) {
    console.error('WORKSPACE MEMBERS PATCH ERROR:', error);
    return jsonError('Could not update member role', 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const { user, error: authResponse } = await authenticate(req);

    if (authResponse || !user) {
      return authResponse ?? jsonError('Unauthorized', 401);
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return jsonError('Invalid JSON request body', 400);
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonError('Invalid request body', 400);
    }

    const input = body as Record<string, unknown>;
    const { workspaceId, userId } = input;

    if (
      typeof workspaceId !== 'string' ||
      !uuidPattern.test(workspaceId) ||
      typeof userId !== 'string' ||
      !uuidPattern.test(userId)
    ) {
      return jsonError('Valid workspace and user IDs are required', 400);
    }

    if (userId === user.id) {
      return jsonError('You cannot remove yourself from the workspace', 400);
    }

    const { data: actorMembership, error: actorError } =
      await getMembership(workspaceId, user.id);

    if (actorError) {
      return jsonError('Could not verify workspace permissions', 500);
    }

    if (!actorMembership || !['owner', 'admin'].includes(actorMembership.role)) {
      return jsonError('Only workspace owners and admins can remove members', 403);
    }

    const { data: workspace, error: workspaceError } =
      await getCompanyWorkspace(workspaceId);

    if (workspaceError) {
      return jsonError('Could not verify workspace', 500);
    }

    if (!workspace || workspace.type !== 'company') {
      return jsonError('Members are available only for company workspaces', 400);
    }

    const { data: target, error: targetError } =
      await getMembership(workspaceId, userId);

    if (targetError) {
      return jsonError('Could not verify target member', 500);
    }

    if (!target) {
      return jsonError('Member not found in this workspace', 404);
    }

    if (target.role === 'owner') {
      return jsonError('The workspace owner cannot be removed', 400);
    }

    if (actorMembership.role !== 'owner' && target.role === 'admin') {
      return jsonError('Only the owner can remove an admin', 403);
    }

    const { data: removed, error: deleteError } = await supabaseAdmin
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .select('user_id')
      .maybeSingle();

    if (deleteError) {
      console.error('WORKSPACE MEMBER REMOVE ERROR:', deleteError.message);
      return jsonError('Could not remove workspace member', 500);
    }

    if (!removed) {
      return jsonError('Member was not removed', 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('WORKSPACE MEMBERS DELETE ERROR:', error);
    return jsonError('Could not remove workspace member', 500);
  }
}
