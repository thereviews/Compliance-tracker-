import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';
import { getPersonalWorkspaceId } from '@/lib/workspaces';

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
'status',
] as const;

export async function PUT(
req: Request,
{ params }: RouteContext
) {
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

const workspaceId = await getPersonalWorkspaceId(
  authHeader,
  user.id
);

const { id } = await params;
const body: unknown = await req.json();

if (
  !body ||
  typeof body !== 'object' ||
  Array.isArray(body)
) {
  return NextResponse.json(
    { error: 'Invalid request body' },
    { status: 400 }
  );
}

const input = body as Record<string, unknown>;
const updates: Record<string, unknown> = {};

for (const field of EDITABLE_FIELDS) {
  if (Object.prototype.hasOwnProperty.call(input, field)) {
    updates[field] = input[field];
  }
}

if (Object.keys(updates).length === 0) {
  return NextResponse.json(
    { error: 'No editable fields provided' },
    { status: 400 }
  );
}

const { data, error } = await supabase
  .from('compliance_documents')
  .update(updates)
  .eq('id', id)
  .eq('user_id', user.id)
  .eq('workspace_id', workspaceId)
  .select()
  .maybeSingle();

if (error) {
  throw new Error(error.message);
}

if (!data) {
  return NextResponse.json(
    { error: 'Document not found in your personal workspace' },
    { status: 404 }
  );
}

return NextResponse.json({
  success: true,
  updatedRecord: data,
});

} catch (error: unknown) {
const message =
error instanceof Error
? error.message
: String(error);

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

const workspaceId = await getPersonalWorkspaceId(
  authHeader,
  user.id
);

const { id } = await params;

const { data: doc, error: docError } = await supabase
  .from('compliance_documents')
  .select('file_path')
  .eq('id', id)
  .eq('user_id', user.id)
  .eq('workspace_id', workspaceId)
  .maybeSingle();

if (docError) {
  throw new Error(docError.message);
}

if (!doc) {
  return NextResponse.json(
    { error: 'Document not found in your personal workspace' },
    { status: 404 }
  );
}

const { error: deleteError } = await supabase
  .from('compliance_documents')
  .delete()
  .eq('id', id)
  .eq('user_id', user.id)
  .eq('workspace_id', workspaceId);

if (deleteError) {
  throw new Error(deleteError.message);
}

if (doc.file_path) {
  const { error: storageError } = await supabase.storage
    .from('compliance-files')
    .remove([doc.file_path]);

  if (storageError) {
    console.error(
      'Storage deletion error:',
      storageError.message
    );
  }
}

return NextResponse.json({
  success: true,
});

} catch (error: unknown) {
const message =
error instanceof Error
? error.message
: String(error);

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
