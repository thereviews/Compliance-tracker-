import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const reminderDays = [30, 7, 1, 0];

function formatDate(date: string) {
  const [year, month, day] = date.split('-');
  return `${month}/${day}/${year}`;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail =
      process.env.EXPIRATION_FROM_EMAIL ||
      'onboarding@resend.dev';

    if (
      !cronSecret ||
      req.headers.get('Authorization') !==
        `Bearer ${cronSecret}`
    ) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!resendKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const resend = new Resend(resendKey);

    // Use UTC consistently for the daily expiration check.
    const today = new Date();
    const todayStr = dateString(today);
    const thirtyDaysStr = dateString(addDays(today, 30));

    // 1. Update expired documents.
    const { error: expiredError } = await supabaseAdmin
      .from('compliance_documents')
      .update({ status: 'Expired' })
      .lt('expiration_date', todayStr)
      .neq('status', 'Expired');

    if (expiredError) {
      throw new Error(
        `Failed to update expired documents: ${expiredError.message}`
      );
    }

    // 2. Update documents expiring within 30 days.
    const { error: expiringError } = await supabaseAdmin
      .from('compliance_documents')
      .update({ status: 'Expiring Soon' })
      .gte('expiration_date', todayStr)
      .lte('expiration_date', thirtyDaysStr)
      .neq('status', 'Expiring Soon');

    if (expiringError) {
      throw new Error(
        `Failed to update expiring documents: ${expiringError.message}`
      );
    }

    // 3. Mark future documents as active.
    const { error: activeError } = await supabaseAdmin
      .from('compliance_documents')
      .update({ status: 'Active' })
      .gt('expiration_date', thirtyDaysStr)
      .neq('status', 'Active');

    if (activeError) {
      throw new Error(
        `Failed to update active documents: ${activeError.message}`
      );
    }

    // 4. Fetch documents expiring today or within 30 days.
    const { data: documents, error: documentsError } =
      await supabaseAdmin
        .from('compliance_documents')
        .select(
          'id, user_id, expiration_date, vendors!inner(name)'
        )
        .gte('expiration_date', todayStr)
        .lte('expiration_date', thirtyDaysStr);

    if (documentsError) {
      throw new Error(
        `Failed to fetch documents: ${documentsError.message}`
      );
    }

    let emailsSent = 0;
    let skipped = 0;
    const failures: string[] = [];

    for (const document of documents || []) {
      const expirationDate = document.expiration_date as string;

      const daysUntilExpiration = Math.round(
        (
          Date.parse(`${expirationDate}T00:00:00Z`) -
          Date.parse(`${todayStr}T00:00:00Z`)
        ) / 86400000
      );

      // Send only on the four designated reminder days.
      if (!reminderDays.includes(daysUntilExpiration)) {
        continue;
      }

      const vendorRelation = document.vendors as unknown as
        | { name: string }
        | { name: string }[]
        | null;

      const vendorName = Array.isArray(vendorRelation)
        ? vendorRelation[0]?.name
        : vendorRelation?.name;

      // Find the account that owns this document.
      const {
        data: userData,
        error: userError,
      } = await supabaseAdmin.auth.admin.getUserById(
        document.user_id
      );

      if (userError || !userData.user?.email) {
        failures.push(
          `Document ${document.id}: owner email not found`
        );
        continue;
      }

      const recipient = userData.user.email;

      // Check whether this particular reminder was already sent.
      const {
        data: existing,
        error: notificationLookupError,
      } = await supabaseAdmin
        .from('expiration_notifications')
        .select('id, status')
        .eq('document_id', document.id)
        .eq('days_before_expiration', daysUntilExpiration)
        .maybeSingle();

      if (notificationLookupError) {
        failures.push(
          `Document ${document.id}: ${notificationLookupError.message}`
        );
        continue;
      }

      if (existing?.status === 'sent') {
        skipped++;
        continue;
      }

      // Create or reset a notification record.
      if (existing) {
        const { error: resetError } = await supabaseAdmin
          .from('expiration_notifications')
          .update({ status: 'pending' })
          .eq('id', existing.id);

        if (resetError) {
          failures.push(
            `Document ${document.id}: ${resetError.message}`
          );
          continue;
        }
      } else {
        const { error: insertError } = await supabaseAdmin
          .from('expiration_notifications')
          .insert({
            document_id: document.id,
            user_id: document.user_id,
            days_before_expiration: daysUntilExpiration,
            status: 'pending',
          });

        if (insertError) {
          failures.push(
            `Document ${document.id}: ${insertError.message}`
          );
          continue;
        }
      }

      const vendorLabel = vendorName || 'Your vendor';
      const formattedExpiration = formatDate(expirationDate);

      const subject =
        daysUntilExpiration === 0
          ? `Contract expiration notice: ${vendorLabel}`
          : `Contract expires in ${daysUntilExpiration} day${
              daysUntilExpiration === 1 ? '' : 's'
            }: ${vendorLabel}`;

      const message =
        daysUntilExpiration === 0
          ? `Your compliance document associated with ${vendorLabel} expires today (${formattedExpiration}). Please review it and take any necessary action.`
          : `Your compliance document associated with ${vendorLabel} expires in ${daysUntilExpiration} day${
              daysUntilExpiration === 1 ? '' : 's'
            }, on ${formattedExpiration}. Please review it and take any necessary action.`;

      try {
        const { error: emailError } = await resend.emails.send({
          from: fromEmail,
          to: recipient,
          subject,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
              <h2>Compliance Tracker — Expiration Reminder</h2>
              <p>Hello,</p>
              <p>${message}</p>
              <p>
                <strong>Vendor:</strong> ${vendorLabel}<br />
                <strong>Expiration date:</strong> ${formattedExpiration}
              </p>
              <p>Please sign in to your Compliance Tracker account to review this document.</p>
              <p>— Compliance Tracker</p>
            </div>
          `,
        });

        if (emailError) {
          throw new Error(emailError.message);
        }

        const { error: sentUpdateError } = await supabaseAdmin
          .from('expiration_notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('document_id', document.id)
          .eq('days_before_expiration', daysUntilExpiration);

        if (sentUpdateError) {
          failures.push(
            `Email sent for ${document.id}, but tracking failed: ${sentUpdateError.message}`
          );
          continue;
        }

        emailsSent++;
      } catch (emailError: unknown) {
        const message =
          emailError instanceof Error
            ? emailError.message
            : String(emailError);

        await supabaseAdmin
          .from('expiration_notifications')
          .update({ status: 'failed' })
          .eq('document_id', document.id)
          .eq('days_before_expiration', daysUntilExpiration);

        failures.push(
          `Email for document ${document.id}: ${message}`
        );
      }
    }

    return NextResponse.json({
      success: failures.length === 0,
      date: todayStr,
      documentsChecked: documents?.length || 0,
      emailsSent,
      remindersAlreadySent: skipped,
      failures,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error('EXPIRATION CRON ERROR:', message);

    return NextResponse.json(
      {
        error: 'Expiration check failed',
        details: message,
      },
      { status: 500 }
    );
  }
}
