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

const VALID_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const VALID_STATUSES = [
  'Compliant',
  'In Progress',
  'Non-Compliant',
  'Under Review'
];

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const cleanText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  if (!cleaned || cleaned === 'Not found in document') return null;
  return cleaned;
};

const isValidISODate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export async function GET(req: Request) {
  try {
    const supabase = getAuthClient(req.headers.get('Authorization'));

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const status = searchParams.get('status');

    if (!isUuid(workspaceId)) {
      return NextResponse.json(
        { error: 'workspaceId required' },
        { status: 400 }
      );
    }

    if (status && status !== 'all' && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status filter.' }, { status: 400 });
    }

    let query = supabase
      .from('compliance_requirements')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order(
      'created_at',
      { ascending: false }
    );

    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      requirements: data
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'Failed to fetch compliance register',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const supabase = getAuthClient(req.headers.get('Authorization'));
  let createdRequirementId: string | null = null;

  try {
    // 1. Authenticate requester.
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

    // 2. Validate submitted review.
    const body = await readJsonObject(req);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const {
      workspaceId,
      evidenceId,
      title,
      description,
      obligationSource,
      priority,
      deadline,
      status,
      responsibleUserId,
      appliesTo,
      confirmed
    } = body;

    if (
      !isUuid(workspaceId) ||
      (evidenceId != null && evidenceId !== '' && !isUuid(evidenceId))
    ) {
      return NextResponse.json(
        { error: 'A valid workspaceId and, when supplied, evidenceId are required.' },
        { status: 400 }
      );
    }

    const hasEvidence = isUuid(evidenceId);

    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Requirement title is required.' },
        { status: 400 }
      );
    }

    if (title.trim().length > 500) {
      return NextResponse.json({ error: 'Requirement title must be 500 characters or fewer.' }, { status: 400 });
    }

    if (description != null && (typeof description !== 'string' || description.length > 3000)) {
      return NextResponse.json({ error: 'Description must be 3,000 characters or fewer.' }, { status: 400 });
    }

    if (obligationSource != null && (typeof obligationSource !== 'string' || obligationSource.length > 200)) {
      return NextResponse.json({ error: 'Obligation source must be 200 characters or fewer.' }, { status: 400 });
    }

    if (deadline != null && typeof deadline !== 'string') {
      return NextResponse.json({ error: 'Invalid deadline.' }, { status: 400 });
    }

    if (confirmed !== true) {
      return NextResponse.json(
        { error: 'User confirmation is required.' },
        { status: 400 }
      );
    }

    if (typeof appliesTo !== 'string' || !['our_organization', 'shared'].includes(appliesTo)) {
      return NextResponse.json(
        { error: 'This proposal is not confirmed as applicable to your organization.' },
        { status: 400 }
      );
    }

    const cleanPriority = cleanText(priority) || 'Medium';
    const cleanStatus = cleanText(status);
    const cleanDeadline = cleanText(deadline);

    if (cleanPriority && !VALID_PRIORITIES.includes(cleanPriority)) {
      return NextResponse.json(
        { error: 'Invalid priority value.' },
        { status: 400 }
      );
    }

    if (!cleanStatus) {
      return NextResponse.json(
        { error: 'A compliance status must be selected.' },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(cleanStatus)) {
      return NextResponse.json(
        { error: 'Invalid status value.' },
        { status: 400 }
      );
    }

    if (!cleanDeadline) {
      return NextResponse.json(
        { error: 'A requirement deadline is required.' },
        { status: 400 }
      );
    }

    if (!isValidISODate(cleanDeadline)) {
      return NextResponse.json(
        { error: 'Deadline must use YYYY-MM-DD format.' },
        { status: 400 }
      );
    }

    if (
      responsibleUserId !== null &&
      responsibleUserId !== undefined &&
      responsibleUserId !== '' &&
      !isUuid(responsibleUserId)
    ) {
      return NextResponse.json(
        { error: 'Invalid responsible person.' },
        { status: 400 }
      );
    }

    // 3. Verify requester belongs to this workspace.
    const { data: requesterMembership, error: requesterError } =
      await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .limit(1);

    if (requesterError) throw new Error(requesterError.message);

    if (!requesterMembership?.length) {
      return NextResponse.json(
        { error: 'Workspace access denied.' },
        { status: 403 }
      );
    }

    // 4. Verify evidence only when one was supplied.
    if (hasEvidence) {
      const { data: evidence, error: evidenceError } =
        await supabase
          .from('compliance_evidence')
          .select('id')
          .eq('id', evidenceId)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

      if (evidenceError) throw new Error(evidenceError.message);

      if (!evidence) {
        return NextResponse.json(
          { error: 'Evidence document not found in this workspace.' },
          { status: 404 }
        );
      }
    }

    // 5. Verify responsible person is a workspace member.
    let ownerId: string | null = null;

    if (isUuid(responsibleUserId)) {
      const { data: ownerMembership, error: ownerError } =
        await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', responsibleUserId)
          .limit(1);

      if (ownerError) throw new Error(ownerError.message);

      if (!ownerMembership?.length) {
        return NextResponse.json(
          { error: 'Responsible person is not a member of this workspace.' },
          { status: 400 }
        );
      }

      ownerId = responsibleUserId;
    }

    // 6. Create the confirmed requirement.
    const { data: requirement, error: insertError } =
      await supabase
        .from('compliance_requirements')
        .insert({
          workspace_id: workspaceId,
          title: title.trim(),
          description: cleanText(description),
          obligation_source: cleanText(obligationSource) || 'N/A',
          priority: cleanPriority,
          deadline: cleanDeadline,
          status: cleanStatus,
          owner_id: ownerId,
          created_by: user.id
        })
        .select()
        .single();

    if (insertError || !requirement) {
      throw new Error(
        insertError?.message || 'Requirement creation failed.'
      );
    }

    createdRequirementId = requirement.id;

    // 7. Link evidence only when one was supplied.
    if (hasEvidence) {
      const { error: linkError } = await supabase
        .from('compliance_evidence_requirements')
        .insert({
          workspace_id: workspaceId,
          evidence_id: evidenceId,
          requirement_id: requirement.id
        });

      if (linkError) {
        console.error('[REGISTER EVIDENCE LINK ERROR]', linkError);

        return NextResponse.json(
          {
            success: false,
            requirementSaved: true,
            requirement,
            error:
              'The requirement was saved, but linking its evidence failed. ' +
              'The requirement remains in the register and can be linked again.'
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: hasEvidence
        ? 'Requirement saved and evidence linked.'
        : 'Requirement created successfully.',
      requirement
    });

  } catch (error: unknown) {
    console.error('[REGISTER SAVE ERROR]', error);

    return NextResponse.json(
      {
        error: 'Failed to save compliance requirement.',
      },
      { status: 500 }
    );
  }
}



export async function PATCH(req: Request) {
  try {
    const supabase = getAuthClient(req.headers.get('Authorization'));

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await readJsonObject(req);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const {
      workspaceId,
      requirementId,
      status,
      title,
      description,
      obligationSource,
      priority,
      deadline,
      responsibleUserId
    } = body;

    if (!isUuid(workspaceId) || !isUuid(requirementId)) {
      return NextResponse.json(
        { error: 'Valid workspaceId and requirementId are required.' },
        { status: 400 }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) throw new Error(membershipError.message);

    if (!membership) {
      return NextResponse.json(
        { error: 'Workspace access denied.' },
        { status: 403 }
      );
    }

    const { data: existingRequirement, error: existingError } = await supabase
      .from('compliance_requirements')
      .select('id, created_by')
      .eq('id', requirementId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);

    if (!existingRequirement) {
      return NextResponse.json(
        { error: 'Requirement not found in this workspace.' },
        { status: 404 }
      );
    }

    const isPrivileged =
      membership.role === 'Owner' || membership.role === 'Admin';

    if (!isPrivileged && existingRequirement.created_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit requirements you created.' },
        { status: 403 }
      );
    }

    // Preserve the existing status-only update behaviour.
    const isFullEdit = [
      'title',
      'description',
      'obligationSource',
      'priority',
      'deadline',
      'responsibleUserId'
    ].some((field) => Object.prototype.hasOwnProperty.call(body, field));

    let updates: Record<string, any>;

    if (!isFullEdit) {
      if (typeof status !== 'string' || !VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid compliance status.' },
          { status: 400 }
        );
      }

      updates = { status };
    } else {
      if (typeof title !== 'string' || !title.trim()) {
        return NextResponse.json(
          { error: 'Requirement title is required.' },
          { status: 400 }
        );
      }

      if (title.trim().length > 500) {
        return NextResponse.json(
          { error: 'Requirement title must be 500 characters or fewer.' },
          { status: 400 }
        );
      }

      if (description != null && (typeof description !== 'string' || description.length > 3000)) {
        return NextResponse.json(
          { error: 'Description must be 3,000 characters or fewer.' },
          { status: 400 }
        );
      }

      if (obligationSource != null && (typeof obligationSource !== 'string' || obligationSource.length > 200)) {
        return NextResponse.json(
          { error: 'Obligation source must be 200 characters or fewer.' },
          { status: 400 }
        );
      }

      if (typeof status !== 'string' || !VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid compliance status.' },
          { status: 400 }
        );
      }

      const cleanPriority = cleanText(priority) || 'Medium';
      const cleanDeadline = cleanText(deadline);

      if (!VALID_PRIORITIES.includes(cleanPriority)) {
        return NextResponse.json(
          { error: 'Invalid priority value.' },
          { status: 400 }
        );
      }

      if (!cleanDeadline) {
        return NextResponse.json(
          { error: 'A requirement deadline is required.' },
          { status: 400 }
        );
      }

      if (!isValidISODate(cleanDeadline)) {
        return NextResponse.json(
          { error: 'Deadline must use YYYY-MM-DD format.' },
          { status: 400 }
        );
      }

      let ownerId: string | null = null;

      if (
        responsibleUserId !== null &&
        responsibleUserId !== undefined &&
        responsibleUserId !== '' &&
        !isUuid(responsibleUserId)
      ) {
        return NextResponse.json(
          { error: 'Invalid responsible person.' },
          { status: 400 }
        );
      }

      if (isUuid(responsibleUserId)) {
        const { data: ownerMembership, error: ownerError } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', responsibleUserId)
          .maybeSingle();

        if (ownerError) throw new Error(ownerError.message);

        if (!ownerMembership) {
          return NextResponse.json(
            { error: 'Responsible person is not a member of this workspace.' },
            { status: 400 }
          );
        }

        ownerId = responsibleUserId;
      }

      updates = {
        title: title.trim(),
        description: cleanText(description),
        obligation_source: cleanText(obligationSource) || 'N/A',
        priority: cleanPriority,
        deadline: cleanDeadline,
        status,
        owner_id: ownerId
      };
    }

    const { data: requirement, error: updateError } = await supabase
      .from('compliance_requirements')
      .update(updates)
      .eq('id', requirementId)
      .eq('workspace_id', workspaceId)
      .select()
      .maybeSingle();

    if (updateError) throw new Error(updateError.message);

    if (!requirement) {
      return NextResponse.json(
        { error: 'Requirement not found in this workspace.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, requirement });
  } catch (error: unknown) {
    console.error('[REGISTER UPDATE ERROR]', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update compliance requirement.'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = getAuthClient(req.headers.get('Authorization'));

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await readJsonObject(req);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const { workspaceId, requirementId } = body;

    if (!isUuid(workspaceId) || !isUuid(requirementId)) {
      return NextResponse.json(
        { error: 'Valid workspaceId and requirementId are required.' },
        { status: 400 }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) throw new Error(membershipError.message);

    if (!membership) {
      return NextResponse.json(
        { error: 'Workspace access denied.' },
        { status: 403 }
      );
    }

    if (membership.role !== 'Owner' && membership.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Only workspace Owners and Admins can delete requirements.' },
        { status: 403 }
      );
    }

    const { data: requirement, error: deleteError } = await supabase
      .from('compliance_requirements')
      .delete()
      .eq('id', requirementId)
      .eq('workspace_id', workspaceId)
      .select('id')
      .maybeSingle();

    if (deleteError) throw new Error(deleteError.message);

    if (!requirement) {
      return NextResponse.json(
        { error: 'Requirement not found in this workspace.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Requirement and its linked records were deleted.'
    });
  } catch (error: unknown) {
    console.error('[REGISTER DELETE ERROR]', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete compliance requirement.'
      },
      { status: 500 }
    );
  }
}
