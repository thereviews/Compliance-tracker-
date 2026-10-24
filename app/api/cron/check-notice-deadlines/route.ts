import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type NoticeDocument = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  expiration_date: string;
  notice_period_days: number;
  auto_renewal: boolean;
  vendors:
    | { name: string | null }
    | { name: string | null }[]
    | null;
};

type WorkspaceReminderSetting = {
  workspace_id: string;
  notice_reminder_days: number[] | null;
  enabled: boolean;
};

type ReminderSettingsValue = {
  days: number[];
  enabled: boolean;
};

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${month}/${day}/${year}`;
}

export async function GET(req: Request) {
  const startedAt = Date.now();

  try {
    // Authenticate the scheduled cron request.
    const cronSecret = process.env.CRON_SECRET;

    if (
      !cronSecret ||
      req.headers.get('Authorization') !== `Bearer ${cronSecret}`
    ) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Configure email delivery.
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail =
      process.env.EXPIRATION_FROM_EMAIL || smtpUser;

    if (!smtpUser || !smtpPass || !fromEmail) {
      console.error('NOTICE DEADLINE SMTP CONFIGURATION MISSING');

      return NextResponse.json(
        { error: 'Email service is not configured' },
        { status: 500 }
      );
    }

    if (![465, 587].includes(smtpPort)) {
      console.error('NOTICE DEADLINE SMTP PORT INVALID');

      return NextResponse.json(
        { error: 'Invalid email service configuration' },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });

    const today = new Date();
    const todayStr = dateString(today);

    // Find contracts that require advance notice before expiration.
    const { data: documents, error: documentsError } =
      await supabaseAdmin
        .from('compliance_documents')
        .select(
          'id, user_id, workspace_id, expiration_date, notice_period_days, auto_renewal, vendors!inner(name)'
        )
        .eq('auto_renewal', true)
        .not('expiration_date', 'is', null)
        .not('notice_period_days', 'is', null)
        .gt('notice_period_days', 0)
        .gte('expiration_date', todayStr);

    if (documentsError) {
      console.error('NOTICE DEADLINE DOCUMENT QUERY FAILED');

      return NextResponse.json(
        { error: 'Could not retrieve contracts' },
        { status: 500 }
      );
    }

    // Load workspace-specific reminder preferences.
    const {
      data: reminderSettings,
      error: settingsError,
    } = await supabaseAdmin
      .from('workspace_reminder_settings')
      .select('workspace_id, notice_reminder_days, enabled');

    if (settingsError) {
      console.error('NOTICE REMINDER SETTINGS QUERY FAILED');

      return NextResponse.json(
        { error: 'Could not retrieve reminder settings' },
        { status: 500 }
      );
    }

    const settingsByWorkspace = new Map<
      string,
      ReminderSettingsValue
    >();

    for (
      const setting of (reminderSettings ??
        []) as WorkspaceReminderSetting[]
    ) {
      settingsByWorkspace.set(setting.workspace_id, {
        days: Array.isArray(setting.notice_reminder_days)
          ? setting.notice_reminder_days.filter(
              (day) =>
                Number.isInteger(day) &&
                day > 0
            )
          : [90, 60, 30, 7],
        enabled: setting.enabled,
      });
    }

    // Workspaces without saved settings use these defaults.
    const defaultReminderDays: number[] = [90, 60, 30, 7];

    let emailsSent = 0;
    let skipped = 0;
    const failures: string[] = [];

    for (
      const document of (documents ?? []) as NoticeDocument[]
    ) {
      const expirationDate = document.expiration_date;
      const noticePeriodDays = document.notice_period_days;

      if (
        !Number.isInteger(noticePeriodDays) ||
        noticePeriodDays <= 0
      ) {
        continue;
      }

      const expirationTimestamp = Date.parse(
        `${expirationDate}T00:00:00Z`
      );

      if (Number.isNaN(expirationTimestamp)) {
        failures.push(
          `Invalid expiration date for document ${document.id}`
        );
        continue;
      }

      // Calculate the last date on which notice must be given.
      const noticeDeadline = addDays(
        new Date(`${expirationDate}T00:00:00Z`),
        -noticePeriodDays
      );

      const noticeDeadlineStr = dateString(noticeDeadline);

      const daysBeforeNoticeDeadline = Math.round(
        (
          Date.parse(`${noticeDeadlineStr}T00:00:00Z`) -
          Date.parse(`${todayStr}T00:00:00Z`)
        ) / 86400000
      );

      // Use workspace preferences when available.
      // Contracts without a workspace retain the default schedule.
      const workspaceSettings = document.workspace_id
        ? settingsByWorkspace.get(document.workspace_id)
        : undefined;

      const reminderDaysForDocument = workspaceSettings
        ? workspaceSettings.enabled
          ? workspaceSettings.days
          : []
        : defaultReminderDays;

      if (
        !reminderDaysForDocument.includes(
          daysBeforeNoticeDeadline
        )
      ) {
        continue;
      }

      // Resolve the linked vendor name.
      const vendorRelation = document.vendors;

      const vendorName = Array.isArray(vendorRelation)
        ? vendorRelation[0]?.name
        : vendorRelation?.name;

      const vendorLabel = vendorName || 'Your vendor';

      // The initial implementation sends to the contract uploader.
      const { data: userData, error: userError } =
        await supabaseAdmin.auth.admin.getUserById(
          document.user_id
        );

      if (userError || !userData.user?.email) {
        failures.push(
          `Could not find recipient for document ${document.id}`
        );
        continue;
      }

      // Find or create the unique notice-deadline reminder.
      const {
        data: existing,
        error: lookupError,
      } = await supabaseAdmin
        .from('expiration_notifications')
        .select('id, status')
        .eq('document_id', document.id)
        .eq('reminder_type', 'notice_deadline')
        .eq(
          'days_before_expiration',
          daysBeforeNoticeDeadline
        )
        .maybeSingle();

      if (lookupError) {
        console.error('Notice reminder history lookup failed:', {
          documentId: document.id,
          error: lookupError.message,
        });
        failures.push(
          `Could not check notification history for document ${document.id}`
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
            `Unexpected notification status for document ${document.id}`
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
              days_before_expiration: daysBeforeNoticeDeadline,
              reminder_type: 'notice_deadline',
              status: 'pending',
            })
            .select('id')
            .single();

        if (insertError || !inserted) {
          if (insertError?.code === '23505') {
            skipped++;
            continue;
          }

          console.error('Could not create notice reminder:', {
            documentId: document.id,
            error: insertError?.message ?? 'No record returned',
          });
          failures.push(
            `Could not record reminder for document ${document.id}`
          );
          continue;
        }

        notificationId = inserted.id;
      }

      // Atomically claim the reminder before sending the email.
      const { data: claimed, error: claimError } =
        await supabaseAdmin
          .from('expiration_notifications')
          .update({ status: 'sending' })
          .eq('id', notificationId)
          .in('status', ['pending', 'failed'])
          .select('id')
          .maybeSingle();

      if (claimError) {
        console.error('Could not claim notice reminder:', {
          documentId: document.id,
          error: claimError.message,
        });
        failures.push(
          `Could not claim reminder for document ${document.id}`
        );
        continue;
      }

      if (!claimed) {
        skipped++;
        continue;
      }

      const formattedDeadline = formatDate(
        noticeDeadlineStr
      );

      const formattedExpiration =
        formatDate(expirationDate);

      try {
        await transporter.sendMail({
          from: {
            name: 'Compliance Tracker',
            address: fromEmail,
          },
          to: userData.user.email,
          subject:
            `Non-renewal notice deadline in ` +
            `${daysBeforeNoticeDeadline} days: ${vendorLabel}`,
          text: `Hello,

Your contract with ${vendorLabel} requires attention.

Notice deadline: ${formattedDeadline}
Contract expiration: ${formattedExpiration}
Required notice period: ${noticePeriodDays} days

Please review your contract and take any necessary action before the notice deadline.

— Compliance Tracker`,
        });

        const { error: updateError } =
          await supabaseAdmin
            .from('expiration_notifications')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', notificationId);

        if (updateError) {
          console.error(
            'Notice email sent, but notification tracking failed:',
            {
              documentId: document.id,
              notificationId,
              error: updateError.message,
            }
          );
          failures.push(
            `Email sent but tracking failed for document ${document.id}`
          );
          continue;
        }

        emailsSent++;
      } catch (emailError: unknown) {
        const message = emailError instanceof Error
          ? emailError.message
          : String(emailError);

        console.error('Notice reminder email failed:', {
          documentId: document.id,
          error: message,
        });

        const { error: failedUpdateError } = await supabaseAdmin
          .from('expiration_notifications')
          .update({ status: 'failed' })
          .eq('id', notificationId);

        if (failedUpdateError) {
          console.error('Could not mark notice reminder as failed:', {
            documentId: document.id,
            error: failedUpdateError.message,
          });
        }

        failures.push(
          `Email delivery failed for document ${document.id}`
        );
      }
    }

    // Diagnostic only: inspect old "sending" rows without retrying them.
    // created_at is not the time the row entered "sending".
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
      .eq('reminder_type', 'notice_deadline')
      .lt('created_at', staleSendingCutoff);

    const oldSendingCount = oldSendingRows?.length ?? 0;

    if (oldSendingError) {
      console.error(
        'Could not inspect old notice reminders:',
        oldSendingError.message
      );
    } else if (oldSendingCount > 0) {
      console.warn(
        'Old notice reminders remain in sending status; investigate before retrying:',
        { count: oldSendingCount }
      );
    }

    const result = {
      success: failures.length === 0,
      date: todayStr,
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      documentsChecked: documents?.length ?? 0,
      emailsSent,
      remindersAlreadySent: skipped,
      oldSendingCount,
      failures,
    };

    console.info('Notice deadline cron completed:', {
      success: result.success,
      date: result.date,
      durationMs: result.durationMs,
      documentsChecked: result.documentsChecked,
      emailsSent: result.emailsSent,
      remindersAlreadySent: result.remindersAlreadySent,
      oldSendingCount: result.oldSendingCount,
      failureCount: result.failures.length,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error(
      'NOTICE DEADLINE CRON ERROR:',
      error instanceof Error
        ? error.message
        : 'Unknown error'
    );

    return NextResponse.json(
      { error: 'Notice deadline check failed' },
      { status: 500 }
    );
  }
}
