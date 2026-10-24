import { NextResponse } from 'next/server';
import { getAuthClient, supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = getAuthClient(authHeader);

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

    // Ensure the authenticated user has a personal workspace.
    // Existing personal workspaces are never renamed.
    const {
      data: existingPersonalWorkspace,
      error: personalWorkspaceLookupError,
    } = await supabaseAdmin
      .from('workspaces')
      .select('id')
      .eq('created_by', user.id)
      .eq('type', 'personal')
      .maybeSingle();

    if (personalWorkspaceLookupError) {
      console.error(
        'PERSONAL WORKSPACE LOOKUP ERROR:',
        personalWorkspaceLookupError.message
      );

      return NextResponse.json(
        { error: 'Could not check personal workspace' },
        { status: 500 }
      );
    }

    let personalWorkspaceId = existingPersonalWorkspace?.id;

    if (!personalWorkspaceId) {
      const metadataName =
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name.trim()
          : '';

      const emailPrefix = user.email?.split('@')[0]?.trim() || '';
      const displayName = (metadataName || emailPrefix || 'Personal').slice(0, 100);
      const personalWorkspaceName = `${displayName}'s Workspace`;

      const {
        data: newPersonalWorkspace,
        error: personalWorkspaceCreateError,
      } = await supabaseAdmin
        .from('workspaces')
        .insert({
          name: personalWorkspaceName,
          type: 'personal',
          created_by: user.id,
        })
        .select('id')
        .single();

      if (personalWorkspaceCreateError || !newPersonalWorkspace) {
        console.error(
          'PERSONAL WORKSPACE CREATION ERROR:',
          personalWorkspaceCreateError?.message
        );

        return NextResponse.json(
          { error: 'Could not create personal workspace' },
          { status: 500 }
        );
      }

      personalWorkspaceId = newPersonalWorkspace.id;
    }

    // Ensure the user belongs to their personal workspace.
    const {
      data: existingPersonalMembership,
      error: personalMembershipLookupError,
    } = await supabaseAdmin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', personalWorkspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (personalMembershipLookupError) {
      console.error(
        'PERSONAL MEMBERSHIP LOOKUP ERROR:',
        personalMembershipLookupError.message
      );

      return NextResponse.json(
        { error: 'Could not check personal workspace membership' },
        { status: 500 }
      );
    }

    if (!existingPersonalMembership) {
      const { error: personalMembershipCreateError } = await supabaseAdmin
        .from('workspace_members')
        .insert({
          workspace_id: personalWorkspaceId,
          user_id: user.id,
          role: 'owner',
        });

      if (personalMembershipCreateError) {
        console.error(
          'PERSONAL MEMBERSHIP CREATION ERROR:',
          personalMembershipCreateError.message
        );

        return NextResponse.json(
          { error: 'Could not create personal workspace membership' },
          { status: 500 }
        );
      }
    }

    const { data: memberships, error: membershipError } =
      await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', user.id);

    if (membershipError) {
      console.error(
        'WORKSPACE MEMBERSHIP FETCH ERROR:',
        membershipError.message
      );

      return NextResponse.json(
        { error: 'Could not retrieve workspace memberships' },
        { status: 500 }
      );
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ workspaces: [] });
    }

    const workspaceIds = memberships.map(
      (membership) => membership.workspace_id
    );

    const { data: workspaces, error: workspaceError } =
      await supabase
        .from('workspaces')
        .select('id, name, type, created_by, created_at')
        .in('id', workspaceIds);

    if (workspaceError) {
      console.error(
        'WORKSPACE FETCH ERROR:',
        workspaceError.message
      );

      return NextResponse.json(
        { error: 'Could not retrieve workspaces' },
        { status: 500 }
      );
    }

    const roleByWorkspaceId = new Map(
      memberships.map((membership) => [
        membership.workspace_id,
        membership.role,
      ])
    );

    const result = (workspaces || []).map((workspace) => ({
      ...workspace,
      role: roleByWorkspaceId.get(workspace.id) || 'member',
    }));

    return NextResponse.json({ workspaces: result });
  } catch (error: unknown) {
    console.error('WORKSPACE GET API ERROR:', error);

    return NextResponse.json(
      { error: 'Could not retrieve workspaces' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = getAuthClient(authHeader);

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

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: 'A company name is required' },
        { status: 400 }
      );
    }

    const name = (body as Record<string, unknown>).name;

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'A company name is required' },
        { status: 400 }
      );
    }

    const companyName = name.trim();

    if (companyName.length > 120) {
      return NextResponse.json(
        { error: 'Company name must be 120 characters or fewer' },
        { status: 400 }
      );
    }

    const { data: workspace, error: workspaceError } =
      await supabaseAdmin
        .from('workspaces')
        .insert({
          name: companyName,
          type: 'company',
          created_by: user.id,
        })
        .select('id, name, type, created_by, created_at')
        .single();

    if (workspaceError || !workspace) {
      console.error(
        'COMPANY WORKSPACE CREATION ERROR:',
        workspaceError?.message
      );

      return NextResponse.json(
        { error: 'Could not create company workspace' },
        { status: 500 }
      );
    }

    const { error: membershipError } = await supabaseAdmin
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      });

    if (membershipError) {
      console.error(
        'COMPANY OWNER ASSIGNMENT ERROR:',
        membershipError.message
      );

      const { error: cleanupError } = await supabaseAdmin
        .from('workspaces')
        .delete()
        .eq('id', workspace.id)
        .eq('created_by', user.id)
        .eq('type', 'company');

      if (cleanupError) {
        console.error(
          'WORKSPACE CLEANUP ERROR:',
          cleanupError.message
        );
      }

      return NextResponse.json(
        { error: 'Could not assign company owner' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        workspace,
        membership: {
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'owner',
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('WORKSPACE API ERROR:', error);

    return NextResponse.json(
      { error: 'Company workspace creation failed' },
      { status: 500 }
    );
  }
}
