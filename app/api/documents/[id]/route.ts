import { NextResponse } from 'next/server';
import { getAuthClient, supabaseAdmin } from '@/lib/supabase';
import { writeAuditLog } from '@/lib/audit';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const EDITABLE_FIELDS = [
'document_type',
'effective_date',
'expiration_date',
'auto_renewal',
'notice_period_days',
'financial_value',
'compliance_summary',
'liability_cap_amount',
'liability_cap_currency',
'liability_cap_basis',
'liability_cap_clause',
'parent_document_id',
'status',
] as const;

const ADMIN_ROLES = ['owner', 'admin'];

async function authenticate(req: Request) {
  const supabase = getAuthClient(
    req.headers.get('Authorization')
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase,
      user: null,
    };
  }

  return {
    supabase,
    user,
  };
}

export async function PUT(
  req: Request,
  { params }: RouteContext
) {
  try {
    const { supabase, user } = await authenticate(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Fetch the document to discover its actual workspace and uploader.
    const { data: document, error: documentError } =
      await supabase
        .from('compliance_documents')
        .select('id, user_id, workspace_id, document_type, status')
        .eq('id', id)
        .maybeSingle();

    if (documentError) {
      throw new Error(
        `Document lookup failed: ${documentError.message}`
      );
    }

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or you do not have access.' },
        { status: 404 }
      );
    }

    // Verify the caller's membership in this document's workspace.
    const { data: membership, error: membershipError } =
      await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', document.workspace_id)
        .eq('user_id', user.id)
        .maybeSingle();

    if (membershipError) {
      throw new Error(
        `Membership lookup failed: ${membershipError.message}`
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have access to this workspace.' },
        { status: 403 }
      );
    }

    const isAdmin = ADMIN_ROLES.includes(membership.role);
    const isUploader = document.user_id === user.id;

    if (!isAdmin && !(membership.role === 'member' && isUploader)) {
      return NextResponse.json(
        { error: 'Your workspace role does not allow editing this document.' },
        { status: 403 }
      );
    }

    const body: unknown = await req.json();

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 }
      );
    }

    const input = body as Record<string, unknown>;

    // Validate liability-cap fields before updating the database.
if (
Object.prototype.hasOwnProperty.call(input, 'liability_cap_amount')
) {
const amount = input.liability_cap_amount;

  if (
    amount !== null &&
    (
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount < 0
    )
  ) {
    return NextResponse.json(
      { error: 'Liability cap amount must be a non-negative number or null.' },
      { status: 400 }
    );
  }
}

if (
  Object.prototype.hasOwnProperty.call(input, 'liability_cap_currency')
) {
  const currency = input.liability_cap_currency;

  if (
    currency !== null &&
    (
      typeof currency !== 'string' ||
      !/^[A-Z]{3}$/.test(currency)
    )
  ) {
    return NextResponse.json(
      { error: 'Currency must be a three-letter uppercase code or null.' },
      { status: 400 }
    );
  }
}

if (
  Object.prototype.hasOwnProperty.call(input, 'liability_cap_basis')
) {
  const allowedBases = [
    'fixed_amount',
    'fees_paid',
    'multiple_of_fees',
    'uncapped',
    'unclear',
    'not_found',
  ];

  if (
    typeof input.liability_cap_basis !== 'string' ||
    !allowedBases.includes(input.liability_cap_basis)
  ) {
    return NextResponse.json(
      { error: 'Invalid liability cap basis.' },
      { status: 400 }
    );
  }
}

if (
  Object.prototype.hasOwnProperty.call(input, 'liability_cap_clause')
) {
  const clause = input.liability_cap_clause;

  if (
    clause !== null &&
    (
      typeof clause !== 'string' ||
      clause.length > 10000
    )
  ) {
    return NextResponse.json(
      { error: 'Liability clause must be text of at most 10,000 characters or null.' },
      { status: 400 }
    );
  }
}

    // Validate parent-child contract relationships.
    if (
      Object.prototype.hasOwnProperty.call(
        input,
        'parent_document_id'
      )
    ) {
      const parentId = input.parent_document_id;

      if (
        parentId !== null &&
        (
          typeof parentId !== 'string' ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parentId)
        )
      ) {
        return NextResponse.json(
          { error: 'Invalid parent contract ID.' },
          { status: 400 }
        );
      }

      if (parentId !== null) {
        if (!document.workspace_id) {
          return NextResponse.json(
            { error: 'Parent-child relationships require a workspace.' },
            { status: 400 }
          );
        }

        const visited = new Set<string>();
        let ancestorId: string | null = parentId;

        while (ancestorId !== null) {
          if (ancestorId === id) {
            return NextResponse.json(
              { error: 'This relationship would create a circular contract hierarchy.' },
              { status: 400 }
            );
          }

          if (visited.has(ancestorId)) {
            return NextResponse.json(
              { error: 'The existing contract hierarchy contains a cycle.' },
              { status: 400 }
            );
          }

          visited.add(ancestorId);

             const ancestorResult: {
  data: {
    id: string;
    workspace_id: string;
    parent_document_id: string | null;
  } | null;
  error: unknown;
} = await supabase
            .from('compliance_documents')
            .select('id, workspace_id, parent_document_id')
            .eq('id', ancestorId)
            .maybeSingle();

          const ancestor = ancestorResult.data;
          const ancestorError = ancestorResult.error;

          if (ancestorError) {
            console.error(
              'PARENT CONTRACT LOOKUP ERROR:',
              ancestorError
            );

            return NextResponse.json(
              { error: 'Failed to validate the parent contract.' },
              { status: 500 }
            );
          }

          if (!ancestor) {
            return NextResponse.json(
              { error: 'Parent contract not found or inaccessible.' },
              { status: 400 }
            );
          }

          if (ancestor.workspace_id !== document.workspace_id) {
            return NextResponse.json(
              { error: 'Parent and child contracts must belong to the same workspace.' },
              { status: 400 }
            );
          }

          ancestorId = ancestor.parent_document_id;
        }
      }
    }

    const updates: Record<string, unknown> = {};

    for (const field of EDITABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(input, field)) {
        updates[field] = input[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No editable fields provided.' },
        { status: 400 }
      );
    }
        // Contract assignment is restricted to workspace owners and admins.
    if (Object.prototype.hasOwnProperty.call(input, 'assigned_to')) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Only workspace owners and admins can assign contracts.' },
          { status: 403 }
        );
      }

      const assignedTo = input.assigned_to;

      if (assignedTo !== null && (
        typeof assignedTo !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignedTo)
      )) {
        return NextResponse.json(
          { error: 'Invalid contract assignee.' },
          { status: 400 }
        );
      }

      if (assignedTo !== null) {
        if (!document.workspace_id) {
          return NextResponse.json(
            { error: 'Contract assignment requires a workspace.' },
            { status: 400 }
          );
        }

        const { data: assigneeMembership, error: assigneeError } =
          await supabaseAdmin
            .from('workspace_members')
            .select('user_id')
            .eq('workspace_id', document.workspace_id)
            .eq('user_id', assignedTo)
            .maybeSingle();

        if (assigneeError) {
          throw new Error('Could not validate contract assignee.');
        }

        if (!assigneeMembership) {
          return NextResponse.json(
            { error: 'The assignee must belong to this workspace.' },
            { status: 400 }
          );
        }
      }

      updates.assigned_to = assignedTo;
    }

    // Update only within the document's verified workspace.
    const { data, error } = await supabase
      .from('compliance_documents')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', document.workspace_id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(
        `Document update failed: ${error.message}`
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Document could not be updated.' },
        { status: 403 }
      );
    }

    await writeAuditLog(supabase, {
      workspaceId: document.workspace_id,
      actorId: user.id,
      action:
        Object.prototype.hasOwnProperty.call(updates, 'status') &&
        document.status !== data.status
          ? 'status_changed'
          : 'updated',
      entityType: 'document',
      entityId: data.id,
      entityName: data.document_type || `Document ${data.id}`,
      details: {
        changed_fields: Object.keys(updates),
      },
    });

    return NextResponse.json({
      success: true,
      updatedRecord: data,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error('DOCUMENT UPDATE ERROR:', message);

    return NextResponse.json(
      {
        error: 'Update failed',
        details: message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: RouteContext
) {
  try {
    const { supabase, user } = await authenticate(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Discover the document's workspace and storage path.
    const { data: document, error: documentError } =
      await supabase
        .from('compliance_documents')
        .select('id, user_id, workspace_id, file_path, document_type')
        .eq('id', id)
        .maybeSingle();

    if (documentError) {
      throw new Error(
        `Document lookup failed: ${documentError.message}`
      );
    }

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or you do not have access.' },
        { status: 404 }
      );
    }

    const { data: membership, error: membershipError } =
      await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', document.workspace_id)
        .eq('user_id', user.id)
        .maybeSingle();

    if (membershipError) {
      throw new Error(
        `Membership lookup failed: ${membershipError.message}`
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have access to this workspace.' },
        { status: 403 }
      );
    }

    if (!ADMIN_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only workspace owners and admins can delete documents.' },
        { status: 403 }
      );
    }

    // RLS independently enforces the delete permission.
    const { data: deletedDocuments, error: deleteError } =
      await supabase
        .from('compliance_documents')
        .delete()
        .eq('id', id)
        .eq('workspace_id', document.workspace_id)
        .select('id');

    if (deleteError) {
      throw new Error(
        `Document deletion failed: ${deleteError.message}`
      );
    }

    if (!deletedDocuments || deletedDocuments.length === 0) {
      return NextResponse.json(
        { error: 'Document could not be deleted.' },
        { status: 403 }
      );
    }

    await writeAuditLog(supabase, {
      workspaceId: document.workspace_id,
      actorId: user.id,
      action: 'deleted',
      entityType: 'document',
      entityId: document.id,
      entityName: document.document_type || `Document ${document.id}`,
    });

    // Remove the file only after the database deletion succeeds.
    if (document.file_path) {
      const { error: storageError } = await supabase.storage
        .from('compliance-files')
        .remove([document.file_path]);

      if (storageError) {
        // The database row is already deleted. Log the orphaned
        // file so it can be cleaned up without restoring the row.
        console.error(
          'STORAGE DELETION ERROR:',
          storageError.message
        );

        return NextResponse.json({
          success: true,
          warning: 'The document was deleted, but its stored file could not be removed.',
        });
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error('DOCUMENT DELETE ERROR:', message);

    return NextResponse.json(
      {
        error: 'Deletion failed',
        details: message,
      },
      { status: 500 }
    );
  }
}
