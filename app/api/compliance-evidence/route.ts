import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
try {
const authHeader = request.headers.get('authorization');

if (!authHeader?.startsWith('Bearer ')) {
  return NextResponse.json(
    { success: false, error: 'Authentication required.' },
    { status: 401 }
  );
}

const authClient = getAuthClient(authHeader);
const {
  data: { user },
  error: authError,
} = await authClient.auth.getUser();

if (authError || !user) {
  return NextResponse.json(
    { success: false, error: 'Invalid or expired session.' },
    { status: 401 }
  );
}

const workspaceId = request.nextUrl.searchParams.get('workspaceId');
const vendorId = request.nextUrl.searchParams.get('vendorId');

if (
  !workspaceId ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)
) {
  return NextResponse.json(
    { success: false, error: 'A valid workspace ID is required.' },
    { status: 400 }
  );
}

if (
  vendorId &&
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(vendorId)
) {
  return NextResponse.json(
    { success: false, error: 'Invalid vendor ID.' },
    { status: 400 }
  );
}

const { data: membership, error: membershipError } =
  await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();

if (membershipError) {
  console.error('Evidence membership lookup failed:', membershipError);

  return NextResponse.json(
    { success: false, error: 'Could not verify workspace access.' },
    { status: 500 }
  );
}

if (!membership) {
  return NextResponse.json(
    { success: false, error: 'You do not have access to this workspace.' },
    { status: 403 }
  );
}

let query = supabaseAdmin
  .from('vendor_compliance_evidence')
  .select(`
    id,
    workspace_id,
    vendor_id,
    document_id,
    evidence_type,
    framework,
    issue_date,
    expiration_date,
    verification_status,
    notes,
    uploaded_by,
    created_at,
    updated_at,
    vendors!inner(name),
    compliance_documents!inner(
      id,
      document_type,
      file_path,
      status
    )
  `)
  .eq('workspace_id', workspaceId)
  .order('created_at', { ascending: false });

if (vendorId) {
  query = query.eq('vendor_id', vendorId);
}

const { data: evidence, error: evidenceError } = await query;

if (evidenceError) {
  console.error('Evidence list query failed:', evidenceError);

  return NextResponse.json(
    { success: false, error: 'Could not load compliance evidence.' },
    { status: 500 }
  );
}

return NextResponse.json({
  success: true,
  evidence: evidence ?? [],
  role: membership.role,
});

} catch (error) {
console.error('Evidence list request failed:', error);

return NextResponse.json(
  { success: false, error: 'An unexpected error occurred.' },
  { status: 500 }
);

}
}
