import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = getAuthClient(authHeader);

    // 1. Authenticate the current user.
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

    // 2. Require a workspace ID.
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const search = searchParams.get('search');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    // 3. Verify membership in the requested workspace.
    const { data: membership, error: membershipError } =
      await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (membershipError) {
      throw new Error(
        `Workspace membership check failed: ${membershipError.message}`
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have access to this workspace' },
        { status: 403 }
      );
    }

    // 4. Fetch workspace documents.
    // RLS controls which rows the authenticated user can access.
    let query = supabase
      .from('compliance_documents')
      .select(
        search?.trim()
          ? '*, vendors!inner(name)'
          : '*, vendors(name)'
      )
      .eq('workspace_id', workspaceId);

    if (search?.trim()) {
      query = query.ilike(
        'vendors.name',
        `%${search.trim()}%`
      );
    }

    const { data, error } = await query.order(
      'created_at',
      { ascending: false }
    );

    if (error) {
      throw new Error(
        `Document query failed: ${error.message}`
      );
    }

    return NextResponse.json({
      success: true,
      documents: data || [],
      role: membership.role,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error('DOCUMENTS FETCH ERROR:', message);

    return NextResponse.json(
      {
        error: 'Failed to fetch documents',
        details: message,
      },
      { status: 500 }
    );
  }
}
