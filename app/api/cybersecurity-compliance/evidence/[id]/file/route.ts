import { NextResponse } from 'next/server';
import { supabaseAdmin, getAuthClient } from '@/lib/supabase';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAuthClient(authHeader);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: evidence, error: evidenceError } = await supabase
      .from('security_evidence')
      .select('id, workspace_id, file_path, file_name')
      .eq('id', id)
      .maybeSingle();

    if (evidenceError) {
      console.error('SECURITY EVIDENCE FILE LOOKUP:', evidenceError.message);
      return NextResponse.json(
        { error: 'Could not retrieve evidence.' },
        { status: 500 },
      );
    }

    if (!evidence?.file_path) {
      return NextResponse.json(
        { error: 'Evidence PDF not found.' },
        { status: 404 },
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', evidence.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) {
      console.error('SECURITY EVIDENCE FILE MEMBERSHIP:', membershipError.message);
      return NextResponse.json(
        { error: 'Could not verify workspace access.' },
        { status: 500 },
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have access to this evidence.' },
        { status: 403 },
      );
    }

    const { data: signedUrl, error: signedUrlError } =
      await supabaseAdmin.storage
        .from('compliance-files')
        .createSignedUrl(evidence.file_path, 60);

    if (signedUrlError || !signedUrl?.signedUrl) {
      console.error('SECURITY EVIDENCE SIGNED URL:', signedUrlError?.message);
      return NextResponse.json(
        { error: 'Could not generate the PDF access link.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      url: signedUrl.signedUrl,
      fileName: evidence.file_name,
      expiresIn: 60,
    });
  } catch (error) {
    console.error('SECURITY EVIDENCE FILE ERROR:', error);
    return NextResponse.json(
      { error: 'Could not open the evidence PDF.' },
      { status: 500 },
    );
  }
}
