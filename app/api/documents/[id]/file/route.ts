import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  req: Request,
  { params }: RouteContext
) {
  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    const { id } = await params;

    const { data: document, error: documentError } =
      await supabase
        .from('compliance_documents')
        .select('id, workspace_id, file_path')
        .eq('id', id)
        .maybeSingle();

    if (documentError) {
      console.error(
        'PDF DOCUMENT LOOKUP ERROR:',
        documentError.message
      );

      return NextResponse.json(
        { error: 'Could not retrieve document' },
        { status: 500 }
      );
    }

    if (!document || !document.file_path) {
      return NextResponse.json(
        { error: 'Document or PDF not found' },
        { status: 404 }
      );
    }

    if (document.workspace_id) {
      const { data: membership, error: membershipError } =
        await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', document.workspace_id)
          .eq('user_id', user.id)
          .maybeSingle();

      if (membershipError) {
        console.error(
          'PDF MEMBERSHIP CHECK ERROR:',
          membershipError.message
        );

        return NextResponse.json(
          { error: 'Could not verify workspace access' },
          { status: 500 }
        );
      }

      if (!membership) {
        return NextResponse.json(
          { error: 'You do not have access to this document' },
          { status: 403 }
        );
      }
    } else {
      // Legacy personal documents without a workspace.
      const { data: ownedDocument, error: ownershipError } =
        await supabase
          .from('compliance_documents')
          .select('id')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle();

      if (ownershipError || !ownedDocument) {
        return NextResponse.json(
          { error: 'You do not have access to this document' },
          { status: 403 }
        );
      }
    }

    const { data: signedUrl, error: signedUrlError } =
      await supabase.storage
        .from('compliance-files')
        .createSignedUrl(document.file_path, 60);

    if (signedUrlError || !signedUrl?.signedUrl) {
      console.error(
        'PDF SIGNED URL ERROR:',
        signedUrlError?.message
      );

      return NextResponse.json(
        { error: 'Could not generate PDF access link' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: signedUrl.signedUrl,
      expiresIn: 60,
    });
  } catch (error: unknown) {
    console.error('PDF ACCESS ERROR:', error);

    return NextResponse.json(
      { error: 'Could not open document PDF' },
      { status: 500 }
    );
  }
}
