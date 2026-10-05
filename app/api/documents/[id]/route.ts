import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getAuthClient(req.headers.get('Authorization'));
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { error, data } = await supabase
      .from('compliance_documents')
      .update(body)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, updatedRecord: data });
  } catch (error: any) {
    return NextResponse.json({ error: 'Update failed', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getAuthClient(req.headers.get('Authorization'));
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get file path first
    const { data: doc } = await supabase
      .from('compliance_documents')
      .select('file_path')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (doc?.file_path) {
      await supabase.storage.from('compliance-files').remove([doc.file_path]);
    }

    const { error } = await supabase
      .from('compliance_documents')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Deletion failed', details: error.message }, { status: 500 });
  }
}

