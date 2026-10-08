ntsroute.ts
import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const supabase = getAuthClient(req.headers.get('Authorization'));
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' },>

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('compliance_documents')
      .select('*, vendors!inner(name)')
      .eq('user_id', user.id);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.ilike('vendors.name', `%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false >

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, documents: data });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch documents', details: err>
  }
