import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
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
  const startedAt = Date.now();

  try {
    const cronSecret = process.env.CRON_SECRET;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.EXPIRATION_FROM_EMAIL;

    if (
      !cronSecret ||
      req.headers.get('Authorization') !== `Bearer ${cronSecret}`
    ) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!smtpUser || !smtpPass || !fromEmail) {
      throw new Error(
        'SMTP_USER, SMTP_PASS, and EXPIRATION_FROM_EMAIL must be configured'
      );
    }

    if (![465, 587].includes(smtpPort)) {
      throw new Error('SMTP_PORT must be 465 or 587');
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

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
        .select('id, user_id, expiration_date, vendors!inner(name)')
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

      // Find or create the unique notification record.
      const {
        data: existing,
        error: notificationLookupError,
      } = await supabaseAdmin
        .from('expiration_notifications')
        .select('id, status')
        .eq('document_id', document.id)
        .eq('reminder_type', 'expiration')
        .eq('days_before_expiration', daysUntilExpiration)
        .maybeSingle();

      if (notificationLookupError) {
        failures.push(
          `Document ${document.id}: Could not check notification history`
        );
        continue;
      }

      let notificationId: string;

      if (existing) {
        notificationId = existing.id;

        if (existing.status === 'sent' || existing.status === 'sending') {
          skipped++;
          continue;
        }

        if (!['pending', 'failed'].includes(existing.status)) {
          failures.push(
            `Document ${document.id}: Unexpected notification status`
          );
          continue;
        }
      } else {
        const { data: inserted, error: insertError } =
          await supabaseAdmin
            .from('expiration_notifications')
            .insert({
              document_id: document.id,
              user_id: document.user_id,
              reminder_type: 'expiration',
              days_before_expiration: daysUntilExpiration,
              status: 'pending',
            })
            .select('id')
            .single();

        if (insertError || !inserted) {
          // Another execution may have inserted this unique reminder first.
          if (insertError?.code === '23505') {
            skipped++;
            continue;
          }

          failures.push(
            `Document ${document.id}: Could not create notification record`
          );
          continue;
        }

        notificationId = inserted.id;
      }

      // Atomically claim the reminder. Only one execution can change
      // a pending/failed record to sending.
      const { data: claimed, error: claimError } =
        await supabaseAdmin
          .from('expiration_notifications')
          .update({ status: 'sending' })
          .eq('id', notificationId)
          .in('status', ['pending', 'failed'])
          .select('id')
          .maybeSingle();

      if (claimError) {
        failures.push(
          `Document ${document.id}: Could not claim notification`
        );
        continue;
      }

      if (!claimed) {
        skipped++;
        continue;
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
        await transporter.sendMail({
          from: {
            name: 'Compliance Tracker',
            address: fromEmail,
          },
          to: recipient,
          subject,
          text: `Hello,

${message}

Vendor: ${vendorLabel}
Expiration date: ${formattedExpiration}

Please sign in to your Compliance Tracker account to review this document.

— Compliance Tracker`,
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

        const { error: sentUpdateError } = await supabaseAdmin
          .from('expiration_notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', notificationId);

        if (sentUpdateError) {
          console.error(
            'Expiration email sent, but notification tracking failed:',
            { documentId: document.id, error: sentUpdateError.message }
          );
          failures.push(
            `Email sent for document ${document.id}, but tracking failed`
          );
          continue;
        }

        emailsSent++;
      } catch (emailError: unknown) {
        const message =
          emailError instanceof Error
            ? emailError.message
            : String(emailError);

        console.error('Expiration reminder email failed:', {
          documentId: document.id,
          error: message,
        });

        const { error: failedUpdateError } = await supabaseAdmin
          .from('expiration_notifications')
          .update({ status: 'failed' })
          .eq('id', notificationId);

        if (failedUpdateError) {
          console.error('Could not mark expiration reminder as failed:', {
            documentId: document.id,
            error: failedUpdateError.message,
          });
        }

        failures.push(
          `Email delivery failed for document ${document.id}`
        );
      }
    }

    // Diagnostic only: old rows still marked "sending" may need investigation.
    // created_at is not the time the row entered "sending", so do not auto-retry.
    const staleSendingCutoff = new Date(
      Date.now() - 30 * 60 * 1000
    ).toISOString();

    const {
      data: oldSendingRows,
      error: oldSendingError,
    } = await supabaseAdmin
      .from('expiration_notifications')
      .select('id')
      .eq('status', 'sending')
      .eq('reminder_type', 'expiration')
      .lt('created_at', staleSendingCutoff);

    const oldSendingCount = oldSendingRows?.length ?? 0;

    if (oldSendingError) {
      console.error(
        'Could not inspect old sending notifications:',
        oldSendingError.message
      );
    } else if (oldSendingCount > 0) {
      console.warn(
        'Old notification rows remain in sending status; investigate before retrying:',
        { count: oldSendingCount }
      );
    }

    const result = {
      success: failures.length === 0,
      oldSendingCount,
      date: todayStr,
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      documentsChecked: documents?.length || 0,
      emailsSent,
      remindersAlreadySent: skipped,
      failures,
    };

    console.info('Expiration cron completed:', {
      success: result.success,
      date: result.date,
      durationMs: result.durationMs,
      documentsChecked: result.documentsChecked,
      emailsSent: result.emailsSent,
      remindersAlreadySent: result.remindersAlreadySent,
      failureCount: failures.length,
      oldSendingCount,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error('EXPIRATION CRON ERROR:', message);

    return NextResponse.json(
      { error: 'Expiration check failed' },
      { status: 500 }
    );
  }
}
