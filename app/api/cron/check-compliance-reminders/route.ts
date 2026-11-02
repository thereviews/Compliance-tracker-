
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ReminderType =
  | 'renewal_deadline'
  | 'expiration'
  | 'evidence_expiration'
  | 'certificate_expiration'
  | 'assessment_review'
  | 'corrective_action_due'
  | 'compliance_review'
  | 'security_control_review';

type RecordType =
  | 'license_renewal'
  | 'compliance_evidence'
  | 'vendor_assessment'
  | 'corrective_action'
  | 'compliance_register'
  | 'security_control';

type ReminderRecord = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  title: string;
  deadline_date: string;
  record_type: RecordType;
  reminder_type: ReminderType;
};

type WorkspaceSettings = {
  notice_reminder_days: number[] | null;
};

type ReminderRow = {
  id: string;
  status: string;
};

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function daysBetween(from: string, to: string) {
  return Math.round(
    (
      Date.parse(`${to}T00:00:00.000Z`) -
      Date.parse(`${from}T00:00:00.000Z`)
    ) / 86400000
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${month}/${day}/${year}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function textField(
  row: Record<string, unknown>,
  field: string,
  fallback: string
) {
  const value = row[field];
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : fallback;
}

function recordFields(
  row: Record<string, unknown>,
  recordType: RecordType,
  title: string,
  dates: Array<{ field: string; type: ReminderType }>
): ReminderRecord[] {
  const id = row.id;
  const workspaceId = row.workspace_id;
  const userId =
    typeof row.created_by === 'string'
      ? row.created_by
      : typeof row.uploaded_by === 'string'
        ? row.uploaded_by
        : null;

  if (
    typeof id !== 'string' ||
    typeof workspaceId !== 'string' ||
    !userId
  ) {
    return [];
  }

  const results: ReminderRecord[] = [];

  for (const dateField of dates) {
    const deadline = row[dateField.field];

    if (!isDate(deadline)) continue;

    results.push({
      id,
      workspace_id: workspaceId,
      user_id: userId,
      title,
      deadline_date: deadline,
      record_type: recordType,
      reminder_type: dateField.type,
    });
  }

  return results;
}

function getReminderDays(value: unknown): number[] {
  const allowed = new Set([1, 3, 7, 14, 30, 45, 60, 90, 120, 180]);

  if (!Array.isArray(value)) return [90, 60, 30, 7];

  return [...new Set(
    value.filter(
      (day): day is number =>
        typeof day === 'number' &&
        Number.isInteger(day) &&
        allowed.has(day)
    )
  )];
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      auth: { user: smtpUser, pass: smtpPass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    const today = dateString(new Date());
    const yesterday = dateString(addDays(new Date(), -1));

    const [settingsResult, licensesResult, evidenceResult, assessmentsResult,
      actionsResult, registerResult, securityControlsResult] = await Promise.all([
      supabaseAdmin
        .from('workspace_reminder_settings')
        .select('workspace_id, notice_reminder_days'),

      supabaseAdmin
        .from('licenses_and_renewals')
        .select(
          'id, workspace_id, created_by, name, status, expiration_date'
        )
        .in('status', ['active', 'in_progress']),

      supabaseAdmin
        .from('vendor_compliance_evidence')
        .select(
          'id, workspace_id, uploaded_by, evidence_type, expiration_date'
        )
        .not('expiration_date', 'is', null),

      supabaseAdmin
        .from('vendor_compliance_assessments')
        .select(
          'id, workspace_id, created_by, framework, status, next_review_date, certificate_expiration_date'
        ),

      supabaseAdmin
        .from('corrective_actions')
        .select('id, workspace_id, created_by, title, status, due_date')
        .in('status', ['open', 'in_progress', 'blocked'])
        .not('due_date', 'is', null),

      supabaseAdmin
        .from('compliance_register_entries')
        .select('id, workspace_id, created_by, title, status, review_date')
        .in('status', ['not_started', 'in_progress', 'non_compliant'])
        .not('review_date', 'is', null),

      supabaseAdmin
        .from('security_controls')
        .select('id, workspace_id, created_by, title, review_date')
        .not('review_date', 'is', null),
    ]);

    const queryErrors = [
      settingsResult.error,
      licensesResult.error,
      evidenceResult.error,
      assessmentsResult.error,
      actionsResult.error,
      registerResult.error,
      securityControlsResult.error,
    ].filter(Boolean);

    if (queryErrors.length) {
      throw new Error(
        `Failed to load reminder data: ${queryErrors.map((e) => e?.message).join('; ')}`
      );
    }

    const records: ReminderRecord[] = [];

    for (const item of licensesResult.data ?? []) {
      const row = asObject(item);
      const name = textField(row, 'name', 'License or renewal');

      records.push(
        ...recordFields(row, 'license_renewal', name, [
          { field: 'expiration_date', type: 'expiration' },
        ])
      );
    }

    for (const item of evidenceResult.data ?? []) {
      const row = asObject(item);
      const label = textField(row, 'evidence_type', 'Vendor compliance evidence');

      records.push(
        ...recordFields(row, 'compliance_evidence', label, [
          { field: 'expiration_date', type: 'evidence_expiration' },
        ])
      );
    }

    for (const item of assessmentsResult.data ?? []) {
      const row = asObject(item);
      const framework = textField(row, 'framework', 'Vendor assessment');

      records.push(
        ...recordFields(row, 'vendor_assessment', framework, [
          { field: 'certificate_expiration_date', type: 'certificate_expiration' },
          { field: 'next_review_date', type: 'assessment_review' },
        ])
      );
    }

    for (const item of actionsResult.data ?? []) {
      const row = asObject(item);

      records.push(
        ...recordFields(
          row,
          'corrective_action',
          textField(row, 'title', 'Corrective action'),
          [{ field: 'due_date', type: 'corrective_action_due' }]
        )
      );
    }

    for (const item of registerResult.data ?? []) {
      const row = asObject(item);

      records.push(
        ...recordFields(
          row,
          'compliance_register',
          textField(row, 'title', 'Compliance register review'),
          [{ field: 'review_date', type: 'compliance_review' }]
        )
      );
    }

    for (const item of securityControlsResult.data ?? []) {
      const row = asObject(item);

      records.push(
        ...recordFields(
          row,
          'security_control',
          textField(row, 'title', 'Security control review'),
          [{ field: 'review_date', type: 'security_control_review' }]
        )
      );
    }

    const settingsByWorkspace = new Map<string, WorkspaceSettings>();

    for (const item of settingsResult.data ?? []) {
      const row = asObject(item);
      if (typeof row.workspace_id !== 'string') continue;

      settingsByWorkspace.set(row.workspace_id, {
        notice_reminder_days: getReminderDays(row.notice_reminder_days),
      });
    }

    let emailsSent = 0;
    let skipped = 0;
    const failures: string[] = [];

    for (const record of records) {
      const settings = settingsByWorkspace.get(record.workspace_id);

      // Workspaces without a settings row use the same defaults as the UI.
      const reminderDays = settings?.notice_reminder_days ?? [90, 60, 30, 7];
      const daysUntilDue = daysBetween(today, record.deadline_date);

      let daysBeforeDue: number;

      if (daysUntilDue > 0 && reminderDays.includes(daysUntilDue)) {
        daysBeforeDue = daysUntilDue;
      } else if (daysUntilDue === 0) {
        daysBeforeDue = 0;
      } else {
        // Do not send reminders after the deadline has passed.
        continue;
      }

      const userId = record.user_id;
      if (!userId) {
        skipped++;
        continue;
      }

      // Do not email a creator/uploader who has left the workspace.
      const { data: membership, error: membershipError } =
        await supabaseAdmin
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', record.workspace_id)
          .eq('user_id', userId)
          .maybeSingle();

      if (membershipError) {
        failures.push(`${record.record_type} ${record.id}: membership lookup failed`);
        continue;
      }

      if (!membership) {
        skipped++;
        continue;
      }

      const { data: userData, error: userError } =
        await supabaseAdmin.auth.admin.getUserById(userId);

      const recipient = userData.user?.email;

      if (userError || !recipient) {
        failures.push(`${record.record_type} ${record.id}: recipient email not found`);
        continue;
      }

      const { data: existing, error: lookupError } = await supabaseAdmin
        .from('compliance_record_reminders')
        .select('id, status')
        .eq('workspace_id', record.workspace_id)
        .eq('record_type', record.record_type)
        .eq('record_id', record.id)
        .eq('reminder_type', record.reminder_type)
        .eq('deadline_date', record.deadline_date)
        .eq('days_before_due', daysBeforeDue)
        .maybeSingle();

      if (lookupError) {
        failures.push(`${record.record_type} ${record.id}: reminder history lookup failed`);
        continue;
      }

      let reminderId: string;

      if (existing) {
        if (!['pending', 'failed'].includes(existing.status)) {
          skipped++;
          continue;
        }
        reminderId = existing.id;
      } else {
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from('compliance_record_reminders')
          .insert({
            workspace_id: record.workspace_id,
            record_type: record.record_type,
            record_id: record.id,
            reminder_type: record.reminder_type,
            deadline_date: record.deadline_date,
            days_before_due: daysBeforeDue,
            user_id: userId,
            status: 'pending',
          })
          .select('id')
          .single();

        if (insertError || !inserted) {
          if (insertError?.code === '23505') {
            skipped++;
            continue;
          }
          failures.push(
            `${record.record_type} ${record.id}: reminder record creation failed` +
            ` [${insertError?.code ?? 'NO_CODE'}] ${insertError?.message ?? 'No insert error details'}`
          );
          continue;
        }

        reminderId = inserted.id;
      }

      const { data: claimed, error: claimError } = await supabaseAdmin
        .from('compliance_record_reminders')
        .update({
          status: 'sending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reminderId)
        .in('status', ['pending', 'failed'])
        .select('id')
        .maybeSingle();

      if (claimError || !claimed) {
        if (claimError) {
          failures.push(`${record.record_type} ${record.id}: could not claim reminder`);
        } else {
          skipped++;
        }
        continue;
      }

      const dueDate = formatDate(record.deadline_date);
      const label = escapeHtml(record.title);
      const overdue = daysBeforeDue === -1;
      const dueToday = daysBeforeDue === 0;

      const timing = overdue
        ? `was due yesterday (${dueDate})`
        : dueToday
          ? `is due today (${dueDate})`
          : `is due in ${daysBeforeDue} day${daysBeforeDue === 1 ? '' : 's'} (${dueDate})`;

      const subject = overdue
        ? `Overdue compliance reminder: ${record.title}`
        : dueToday
          ? `Compliance deadline today: ${record.title}`
          : `Compliance deadline in ${daysBeforeDue} days: ${record.title}`;

      const message = `${record.title} ${timing}. Please sign in to Compliance Tracker to review the record and take any necessary action.`;

      try {
        await transporter.sendMail({
          from: { name: 'Compliance Tracker', address: fromEmail },
          to: recipient,
          subject,
          text: `Hello,

${message}

Record type: ${record.record_type.replace(/_/g, ' ')}
Deadline: ${dueDate}

— Compliance Tracker`,
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
              <h2>Compliance Tracker — Reminder</h2>
              <p>Hello,</p>
              <p>${escapeHtml(message)}</p>
              <p><strong>Record type:</strong> ${escapeHtml(record.record_type.replace(/_/g, ' '))}<br />
              <strong>Deadline:</strong> ${dueDate}</p>
              <p>Please sign in to Compliance Tracker to review this record and take any necessary action.</p>
              <p>— Compliance Tracker</p>
            </div>
          `,
        });

        const { error: sentError } = await supabaseAdmin
          .from('compliance_record_reminders')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', reminderId);

        if (sentError) {
          failures.push(`${record.record_type} ${record.id}: email sent but tracking update failed`);
        } else {
          emailsSent++;
        }
      } catch (emailError: unknown) {
        console.error('Compliance record reminder email failed:', {
          recordType: record.record_type,
          recordId: record.id,
          error: emailError instanceof Error ? emailError.message : String(emailError),
        });

        await supabaseAdmin
          .from('compliance_record_reminders')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', reminderId);

        failures.push(`${record.record_type} ${record.id}: email delivery failed`);
      }
    }

    const result = {
      success: failures.length === 0,
      date: today,
      recordsChecked: records.length,
      emailsSent,
      skipped,
      failureCount: failures.length,
      failures,
      durationMs: Date.now() - startedAt,
    };

    console.info('Compliance record reminders completed:', result);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('COMPLIANCE RECORD REMINDERS CRON ERROR:', message);
    return NextResponse.json(
      { error: 'Compliance record reminders failed', details: message },
      { status: 500 }
    );
  }
}
