import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Identify thresholds
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    const todayStr = today.toISOString().split('T')[0];
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

    // Update 'Expired' documents
    const { error: expiredError } = await supabaseAdmin
      .from('compliance_documents')
      .update({ status: 'Expired' })
      .lt('expiration_date', todayStr)
      .neq('status', 'Expired');

    if (expiredError) throw new Error(expiredError.message);

    // Update 'Expiring Soon' documents (between today and 30 days)
    const { data: expiringData, error: expiringError } = await supabaseAdmin
      .from('compliance_documents')
      .update({ status: 'Expiring Soon' })
      .gte('expiration_date', todayStr)
      .lte('expiration_date', thirtyDaysStr)
      .neq('status', 'Expiring Soon')
      .neq('status', 'Expired')
      .select('id');

    if (expiringError) throw new Error(expiringError.message);

    return NextResponse.json({ 
      success: true, 
      updatedCount: expiringData?.length || 0 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Cron job failed', details: error.message }, { status: 500 });
  }
}

