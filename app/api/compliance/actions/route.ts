import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';

async function readJsonObject(req: Request): Promise<Record<string, any> | null> {
  try {
    const value: unknown = await req.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, any>;
  } catch {
    return null;
  }
}

const VALID_STATUSES = ['Open', 'In Progress', 'Completed'];

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const cleanText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned || null;
};

const isValidISODate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

async function authenticate(req: Request) {
  const supabase = getAuthClient(req.headers.get('Authorization'));

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, response: NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    ) };
  }

  return { supabase, user, response: null };
}

async function getWorkspaceRole(
  supabase: ReturnType<typeof getAuthClient>,
  workspaceId: string,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.role ?? null;
}

async function isWorkspaceMember(
  supabase: ReturnType<typeof getAuthClient>,
  workspaceId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function GET(req: Request) {
  try {
    const { supabase, user, response } = await authenticate(req);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!isUuid(workspaceId)) {
      return NextResponse.json(
        { success: false, error: 'Valid workspaceId is required.' },
        { status: 400 }
      );
    }

    if (!await isWorkspaceMember(supabase, workspaceId, user!.id)) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this workspace.' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('compliance_actions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      actions: data || []
    });
  } catch (error: unknown) {
    console.error('Actions GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Could not load actions.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { supabase, user, response } = await authenticate(req);
    if (response) return response;

    const body = await readJsonObject(req);
    if (!body) {
      return NextResponse.json({ success: false, error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const {
      workspaceId,
      title,
      description,
      requirementId,
      assigneeId,
      dueDate
    } = body;

    if (!isUuid(workspaceId)) {
      return NextResponse.json(
        { success: false, error: 'Valid workspaceId is required.' },
        { status: 400 }
      );
    }

    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Action title is required.' },
        { status: 400 }
      );
    }

    if (title.trim().length > 200) {
      return NextResponse.json(
        { success: false, error: 'Action title must be 200 characters or fewer.' },
        { status: 400 }
      );
    }

    if (description != null && typeof description !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid description.' },
        { status: 400 }
      );
    }

    if (description != null && description.length > 3000) {
      return NextResponse.json(
        { success: false, error: 'Description must be 3,000 characters or fewer.' },
        { status: 400 }
      );
    }

    if (requirementId != null && !isUuid(requirementId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid compliance requirement.' },
        { status: 400 }
      );
    }

    if (assigneeId != null && !isUuid(assigneeId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid assignee.' },
        { status: 400 }
      );
    }

    if (typeof dueDate !== 'string' || !dueDate.trim() || !isValidISODate(dueDate)) {
      return NextResponse.json(
        { success: false, error: 'A valid action due date is required.' },
        { status: 400 }
      );
    }

    if (!await isWorkspaceMember(supabase, workspaceId, user!.id)) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this workspace.' },
        { status: 403 }
      );
    }

    if (assigneeId &&
      !await isWorkspaceMember(supabase, workspaceId, assigneeId)) {
      return NextResponse.json(
        { success: false, error: 'The assignee must be a member of this workspace.' },
        { status: 400 }
      );
    }

    if (requirementId) {
      const { data: requirement, error } = await supabase
        .from('compliance_requirements')
        .select('id')
        .eq('id', requirementId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (error || !requirement) {
        return NextResponse.json(
          { success: false, error: 'The selected requirement was not found in this workspace.' },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('compliance_actions')
      .insert({
        workspace_id: workspaceId,
        requirement_id: requirementId || null,
        title: title.trim(),
        description: cleanText(description),
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
        status: 'Open',
        created_by: user!.id
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      action: data
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Actions POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Could not create action.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { supabase, user, response } = await authenticate(req);
    if (response) return response;

    const body = await readJsonObject(req);
    if (!body) {
      return NextResponse.json({ success: false, error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const { workspaceId, actionId, status, title, description, requirementId, assigneeId, dueDate } = body;

    if (!isUuid(workspaceId) || !isUuid(actionId)) {
      return NextResponse.json(
        { success: false, error: 'Valid workspaceId and actionId are required.' },
        { status: 400 }
      );
    }

    if (!await isWorkspaceMember(supabase, workspaceId, user!.id)) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this workspace.' },
        { status: 403 }
      );
    }

    const updates: Record<string, string | null> = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim() || title.trim().length > 200) {
        return NextResponse.json({ success: false, error: 'Title must be between 1 and 200 characters.' }, { status: 400 });
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      if (description !== null && (typeof description !== 'string' || description.length > 3000)) {
        return NextResponse.json({ success: false, error: 'Description must be 3000 characters or fewer.' }, { status: 400 });
      }
      updates.description = typeof description === 'string' ? description.trim() || null : null;
    }

    if (requirementId !== undefined) {
      if (requirementId !== null && !isUuid(requirementId)) {
        return NextResponse.json({ success: false, error: 'Invalid requirement.' }, { status: 400 });
      }

      if (requirementId) {
        const { data: requirement, error: requirementError } = await supabase
          .from('compliance_requirements')
          .select('id')
          .eq('id', requirementId)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (requirementError) throw requirementError;
        if (!requirement) {
          return NextResponse.json({ success: false, error: 'Requirement not found in this workspace.' }, { status: 400 });
        }
      }
      updates.requirement_id = requirementId;
    }

    if (status !== undefined) {
      if (typeof status !== 'string' || !VALID_STATUSES.includes(status)) {
        return NextResponse.json({ success: false, error: 'Invalid action status.' }, { status: 400 });
      }
      updates.status = status;
    }

    if (assigneeId !== undefined) {
      if (assigneeId !== null && !isUuid(assigneeId)) {
        return NextResponse.json({ success: false, error: 'Invalid assignee.' }, { status: 400 });
      }

      if (assigneeId && !await isWorkspaceMember(supabase, workspaceId, assigneeId)) {
        return NextResponse.json(
          { success: false, error: 'The assignee must be a member of this workspace.' },
          { status: 400 }
        );
      }
      updates.assignee_id = assigneeId;
    }

    if (dueDate !== undefined) {
      if (typeof dueDate !== 'string' || !dueDate.trim() || !isValidISODate(dueDate)) {
        return NextResponse.json(
          { success: false, error: 'A valid action due date is required.' },
          { status: 400 }
        );
      }
      updates.due_date = dueDate;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid changes were supplied.' }, { status: 400 });
    }

    const { data: existing, error: lookupError } = await supabase
      .from('compliance_actions')
      .select('id, created_by')
      .eq('id', actionId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Action not found in this workspace.' }, { status: 404 });
    }

    const role = await getWorkspaceRole(supabase, workspaceId, user!.id);
    const isPrivileged = role === 'Owner' || role === 'Admin';

    if (!isPrivileged && existing.created_by !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'You can only edit actions you created.' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('compliance_actions')
      .update(updates)
      .eq('id', actionId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, action: data });
  } catch (error: unknown) {
    console.error('Actions PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Could not update action.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { supabase, user, response } = await authenticate(req);
    if (response) return response;

    const body = await readJsonObject(req);
    if (!body) {
      return NextResponse.json({ success: false, error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const { workspaceId, actionId } = body;
    if (!isUuid(workspaceId) || !isUuid(actionId)) {
      return NextResponse.json(
        { success: false, error: 'Valid workspaceId and actionId are required.' },
        { status: 400 }
      );
    }

    if (!await isWorkspaceMember(supabase, workspaceId, user!.id)) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this workspace.' },
        { status: 403 }
      );
    }

    const role = await getWorkspaceRole(supabase, workspaceId, user!.id);

    if (role !== 'Owner' && role !== 'Admin') {
      return NextResponse.json(
        { success: false, error: 'Only workspace Owners and Admins can delete actions.' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('compliance_actions')
      .delete()
      .eq('id', actionId)
      .eq('workspace_id', workspaceId)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ success: false, error: 'Action not found in this workspace.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Actions DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Could not delete action.' }, { status: 500 });
  }
}
