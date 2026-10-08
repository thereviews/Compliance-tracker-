import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getAuthClient(
      req.headers.get('Authorization')
    );

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

    const body = await req.json();

    const { error, data } = await supabase
      .from('compliance_documents')
      .update(body)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getAuthClient(
      req.headers.get('Authorization')
    );

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

    // Get the file path first
    const { data: doc, error: docError } = await supabase
      .from('compliance_documents')
      .select('file_path')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (docError && docError.code !== 'PGRST116') {
      throw new Error(docError.message);
    }

    // Delete the PDF from Supabase Storage
    if (doc?.file_path) {
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

    // Delete the database record
    const { error } = await supabase
      .from('compliance_documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(error.message);
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
