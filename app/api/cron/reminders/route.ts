import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';


export const runtime = 'nodejs';

const TIME_ZONE = 'Africa/Nairobi';
const REMINDER_DAYS = [30, 7, 1, 0];

async function sendReminderEmail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ||
        'ComplianceTracker <noreply@compliancetracker-app.com>',
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.message || `Resend API request failed: HTTP ${response.status}`
    );
  }
}


function getTodayInEAT(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value || '';

  return `${part('year')}-${part('month')}-${part('day')}`;
}

function getDaysUntil(deadline: string, today: string): number {
  const [year, month, day] = deadline.split('-').map(Number);
  const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);

  const deadlineTime = Date.UTC(year, month - 1, day);
  const todayTime = Date.UTC(todayYear, todayMonth - 1, todayDay);

  return Math.round((deadlineTime - todayTime) / 86400000);
}

function escapeHtml(value: string): string {
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

async function claimReminder(
  reminder: {
    workspace_id: string;
    requirement_id: string;
    recipient_user_id: string;
    reminder_days: number;
    deadline: string;
    recipient_email: string;
  }
): Promise<string | null> {
  // The unique database constraint ensures only one cron execution
  // can create the initial reminder record.
  const inserted = await supabaseAdmin
    .from('compliance_reminder_logs')
    .insert(reminder)
    .select('id')
    .maybeSingle();

  if (!inserted.error && inserted.data?.id) {
    return inserted.data.id;
  }

  // A duplicate means this reminder was already claimed or sent.
  if (inserted.error?.code !== '23505') {
    throw new Error(inserted.error?.message || 'Could not create reminder log');
  }

  // Retry a previously failed reminder. The status condition makes
  // the retry claim exclusive between concurrent cron executions.
  const retried = await supabaseAdmin
    .from('compliance_reminder_logs')
    .update({
      status: 'pending',
      recipient_email: reminder.recipient_email,
      error_message: null,
      sent_at: null,
    })
    .eq('requirement_id', reminder.requirement_id)
    .eq('deadline', reminder.deadline)
    .eq('reminder_days', reminder.reminder_days)
    .eq('recipient_user_id', reminder.recipient_user_id)
    .eq('status', 'failed')
    .select('id')
    .maybeSingle();

  if (retried.error) {
    throw new Error(retried.error.message);
  }

  return retried.data?.id || null;
}

async function claimActionReminder(
  reminder: {
    workspace_id: string;
    action_id: string;
    recipient_user_id: string;
    reminder_days: number;
    deadline: string;
    recipient_email: string;
  }
): Promise<string | null> {
  const inserted = await supabaseAdmin
    .from('compliance_action_reminder_logs')
    .insert(reminder)
    .select('id')
    .maybeSingle();

  if (!inserted.error && inserted.data?.id) {
    return inserted.data.id;
  }

  if (inserted.error?.code !== '23505') {
    throw new Error(
      inserted.error?.message || 'Could not create action reminder log'
    );
  }

  const retried = await supabaseAdmin
    .from('compliance_action_reminder_logs')
    .update({
      status: 'pending',
      recipient_email: reminder.recipient_email,
      error_message: null,
      sent_at: null,
    })
    .eq('action_id', reminder.action_id)
    .eq('deadline', reminder.deadline)
    .eq('reminder_days', reminder.reminder_days)
    .eq('recipient_user_id', reminder.recipient_user_id)
    .eq('status', 'failed')
    .select('id')
    .maybeSingle();

  if (retried.error) {
    throw new Error(retried.error.message);
  }

  return retried.data?.id || null;
}

export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('Authorization');

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = getTodayInEAT();

    const { data: requirements, error: requirementsError } =
      await supabaseAdmin
        .from('compliance_requirements')
        .select(
          'id, title, description, priority, status, deadline, workspace_id, owner_id'
        )
        .not('deadline', 'is', null);

    if (requirementsError) {
      throw new Error(requirementsError.message);
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let checked = 0;

    for (const requirement of requirements || []) {
      if (!requirement.deadline || requirement.status === 'Compliant') {
        continue;
      }

      checked++;

      const daysUntil = getDaysUntil(requirement.deadline, today);

      let reminderDays: number | null = null;

      if (daysUntil < 0) {
        reminderDays = -1;
      } else if (REMINDER_DAYS.includes(daysUntil)) {
        reminderDays = daysUntil;
      }

      if (reminderDays === null) {
        continue;
      }

      // Assigned requirements go to their responsible workspace member.
      // Unassigned requirements go to the workspace Owner members.
      let memberships: { user_id: string }[] = [];

      if (requirement.owner_id) {
        const { data, error } = await supabaseAdmin
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', requirement.workspace_id)
          .eq('user_id', requirement.owner_id)
          .maybeSingle();

        if (error) {
          console.error('[REMINDER MEMBERSHIP ERROR]', error);
          failed++;
          continue;
        }

        if (data) memberships = [data];
      } else {
        const { data, error } = await supabaseAdmin
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', requirement.workspace_id)
          .eq('role', 'Owner');

        if (error) {
          console.error('[REMINDER OWNER LOOKUP ERROR]', error);
          failed++;
          continue;
        }

        memberships = data || [];
      }

      if (memberships.length === 0) {
        skipped++;
        continue;
      }

      for (const membership of memberships) {
        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.getUserById(membership.user_id);

        const recipientEmail = authData?.user?.email;

        if (authError || !recipientEmail) {
          console.error(
            '[REMINDER RECIPIENT ERROR]',
            membership.user_id,
            authError?.message || 'No registered email'
          );
          skipped++;
          continue;
        }

        const logId = await claimReminder({
          workspace_id: requirement.workspace_id,
          requirement_id: requirement.id,
          recipient_user_id: membership.user_id,
          reminder_days: reminderDays,
          deadline: requirement.deadline,
          recipient_email: recipientEmail,
        });

        // Already sent, pending, or claimed by another cron execution.
        if (!logId) {
          continue;
        }

        const title = requirement.title || 'Compliance requirement';
        const deadline = requirement.deadline;
        const status = requirement.status || 'Not set';
        const priority = requirement.priority || 'Not set';

        const fullName =
          typeof authData?.user?.user_metadata?.full_name === 'string'
            ? authData.user.user_metadata.full_name.trim()
            : '';
        const firstName = fullName ? fullName.split(/\s+/)[0] : '';
        const greeting = firstName
          ? `Hello ${firstName},`
          : 'Hello,';

        let timing = '';

        if (reminderDays === -1) {
          timing = 'This requirement is overdue.';
        } else if (reminderDays === 0) {
          timing = 'This requirement is due today.';
        } else {
          timing = `This requirement is due in ${reminderDays} days.`;
        }

        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

        const dashboardUrl = appUrl
          ? `${appUrl.replace(/\/$/, '')}/dashboard/compliance-register?workspaceId=${encodeURIComponent(requirement.workspace_id)}`
          : null;

        const safeGreeting = escapeHtml(greeting);
        const safeTitle = escapeHtml(title);
        const safeStatus = escapeHtml(status);
        const safePriority = escapeHtml(priority);
        const safeDeadline = escapeHtml(deadline);
        const safeTiming = escapeHtml(timing);

        const text = [
          greeting,
          '',
          timing,
          '',
          `Requirement: ${title}`,
          `Deadline: ${deadline}`,
          `Status: ${status}`,
          `Priority: ${priority}`,
          dashboardUrl ? `Review requirement: ${dashboardUrl}` : '',
          '',
          'ComplianceTracker',
        ].filter(Boolean).join('\n');

        const html = `
          <div style="margin:0;padding:32px 16px;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#263238;">
            <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e5e9ed;border-radius:12px;overflow:hidden;">
              <div style="padding:24px 32px;background-color:#ffffff;border-bottom:1px solid #edf0f2;">
                <div style="font-size:22px;font-weight:700;letter-spacing:-0.4px;color:#16845b;">ComplianceTracker</div>
                <div style="margin-top:5px;font-size:13px;color:#718096;">Stay on top of your compliance</div>
              </div>
              <div style="padding:30px 32px;">
                <p style="margin:0 0 20px;font-size:15px;">${safeGreeting}</p>
                <h1 style="margin:0 0 14px;font-size:23px;line-height:1.3;color:#1f2937;">Compliance requirement reminder</h1>
                <div style="margin:0 0 24px;padding:14px 16px;background-color:#f0f8f4;border-left:4px solid #16845b;border-radius:4px;">
                  <p style="margin:0;font-size:15px;font-weight:600;color:#245b43;">${safeTiming}</p>
                </div>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#536170;">Here are the details of the requirement that needs your attention:</p>
                <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
                  <tr>
                    <td style="padding:12px 0;border-bottom:1px solid #edf0f2;color:#718096;width:110px;">Requirement</td>
                    <td style="padding:12px 0;border-bottom:1px solid #edf0f2;color:#263238;font-weight:600;">${safeTitle}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0;border-bottom:1px solid #edf0f2;color:#718096;">Deadline</td>
                    <td style="padding:12px 0;border-bottom:1px solid #edf0f2;color:#263238;font-weight:600;">${safeDeadline}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0;border-bottom:1px solid #edf0f2;color:#718096;">Status</td>
                    <td style="padding:12px 0;border-bottom:1px solid #edf0f2;color:#263238;">${safeStatus}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0;color:#718096;">Priority</td>
                    <td style="padding:12px 0;color:#263238;">${safePriority}</td>
                  </tr>
                </table>
                ${dashboardUrl ? `
                  <div style="margin:28px 0 8px;text-align:center;">
                    <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:13px 24px;background-color:#16845b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:6px;">Review requirement</a>
                  </div>
                ` : ''}
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#718096;">Please review this requirement and take any necessary action before the deadline.</p>
              </div>
              <div style="padding:20px 32px;background-color:#f8faf9;border-top:1px solid #edf0f2;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#87939d;">This is an automated reminder from ComplianceTracker. You are receiving it because of your workspace membership.</p>
              </div>
            </div>
          </div>
        `;

        try {
          await sendReminderEmail({
            to: recipientEmail,
            subject: `Compliance reminder: ${title}`,
            text,
            html,
          });
        } catch (emailError: unknown) {
          const message = emailError instanceof Error
            ? emailError.message
            : 'Email delivery failed';

          const { error: failureUpdateError } = await supabaseAdmin
            .from('compliance_reminder_logs')
            .update({
              status: 'failed',
              error_message: message.slice(0, 1000),
            })
            .eq('id', logId);

          if (failureUpdateError) {
            console.error('[REMINDER FAILURE LOG UPDATE ERROR]', failureUpdateError);
          }

          console.error('[REMINDER EMAIL FAILED]', emailError);
          failed++;
          continue;
        }

        const { error: sentUpdateError } = await supabaseAdmin
          .from('compliance_reminder_logs')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', logId);

        if (sentUpdateError) {
          console.error('[REMINDER SENT STATUS UPDATE ERROR]', sentUpdateError);
          failed++;
          continue;
        }

        sent++;
      }
    }

    // Process reminders for compliance actions.
    const { data: actions, error: actionsError } = await supabaseAdmin
      .from('compliance_actions')
      .select('id, workspace_id, title, description, assignee_id, due_date, status')
      .not('due_date', 'is', null);

    if (actionsError) {
      throw new Error(actionsError.message);
    }

    let checkedActions = 0;
    let sentActionReminders = 0;
    let failedActionReminders = 0;
    let skippedActionReminders = 0;

    for (const action of actions || []) {
      if (!action.due_date || action.status === 'Completed') {
        continue;
      }

      checkedActions++;

      const daysUntil = getDaysUntil(action.due_date, today);

      let reminderDays: number | null = null;

      if (daysUntil < 0) {
        reminderDays = -1;
      } else if (REMINDER_DAYS.includes(daysUntil)) {
        reminderDays = daysUntil;
      }

      if (reminderDays === null) {
        continue;
      }

      let memberships: { user_id: string }[] = [];

      if (action.assignee_id) {
        const { data, error } = await supabaseAdmin
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', action.workspace_id)
          .eq('user_id', action.assignee_id)
          .maybeSingle();

        if (error) {
          console.error('[ACTION REMINDER MEMBERSHIP ERROR]', error);
          failed++;
          failedActionReminders++;
          continue;
        }

        if (data) memberships = [data];
      } else {
        const { data, error } = await supabaseAdmin
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', action.workspace_id)
          .eq('role', 'Owner');

        if (error) {
          console.error('[ACTION REMINDER OWNER LOOKUP ERROR]', error);
          failed++;
          failedActionReminders++;
          continue;
        }

        memberships = data || [];
      }

      if (memberships.length === 0) {
        skipped++;
        skippedActionReminders++;
        continue;
      }

      for (const membership of memberships) {
        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.getUserById(membership.user_id);

        const recipientEmail = authData?.user?.email;

        if (authError || !recipientEmail) {
          console.error(
            '[ACTION REMINDER RECIPIENT ERROR]',
            membership.user_id,
            authError?.message || 'No registered email'
          );
          skipped++;
          skippedActionReminders++;
          continue;
        }

        const logId = await claimActionReminder({
          workspace_id: action.workspace_id,
          action_id: action.id,
          recipient_user_id: membership.user_id,
          reminder_days: reminderDays,
          deadline: action.due_date,
          recipient_email: recipientEmail,
        });

        if (!logId) {
          continue;
        }

        const title = action.title || 'Compliance action';
        const deadline = action.due_date;
        const status = action.status || 'Open';
        const description = action.description || '';

        const fullName =
          typeof authData?.user?.user_metadata?.full_name === 'string'
            ? authData.user.user_metadata.full_name.trim()
            : '';
        const firstName = fullName ? fullName.split(/\s+/)[0] : '';
        const greeting = firstName
          ? `Hello ${firstName},`
          : 'Hello,';

        let timing = '';

        if (reminderDays === -1) {
          timing = 'This action is overdue.';
        } else if (reminderDays === 0) {
          timing = 'This action is due today.';
        } else {
          timing = `This action is due in ${reminderDays} days.`;
        }

        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

        const dashboardUrl = appUrl
          ? `${appUrl.replace(/\/$/, '')}/dashboard/corrective-actions?workspaceId=${encodeURIComponent(action.workspace_id)}`
          : null;

        const safeGreeting = escapeHtml(greeting);
        const safeTitle = escapeHtml(title);
        const safeStatus = escapeHtml(status);
        const safeDeadline = escapeHtml(deadline);
        const safeDescription = escapeHtml(description);
        const safeTiming = escapeHtml(timing);

        const text = [
          greeting,
          '',
          timing,
          '',
          `Action: ${title}`,
          description ? `Description: ${description}` : '',
          `Due date: ${deadline}`,
          `Status: ${status}`,
          dashboardUrl ? `Review action: ${dashboardUrl}` : '',
          '',
          'ComplianceTracker',
        ].filter(Boolean).join('\n');

        const html = `
          <div style="margin:0;padding:32px 16px;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#263238;">
            <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e5e9ed;border-radius:12px;overflow:hidden;">
              <div style="padding:24px 32px;background-color:#ffffff;border-bottom:1px solid #edf0f2;">
                <div style="font-size:22px;font-weight:700;letter-spacing:-0.4px;color:#16845b;">ComplianceTracker</div>
                <div style="margin-top:5px;font-size:13px;color:#718096;">Stay on top of your compliance</div>
              </div>
              <div style="padding:30px 32px;">
                <p style="margin:0 0 20px;font-size:15px;">${safeGreeting}</p>
                <h1 style="margin:0 0 14px;font-size:23px;line-height:1.3;color:#1f2937;">Corrective action reminder</h1>
                <div style="margin:0 0 24px;padding:14px 16px;background-color:#f0f8f4;border-left:4px solid #16845b;border-radius:4px;">
                  <p style="margin:0;font-size:15px;font-weight:600;color:#245b43;">${safeTiming}</p>
                </div>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#536170;">Here are the details of the action that needs your attention:</p>
                <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
                  <tr>
                    <td style="padding:12px 0;border-bottom:1px solid #edf0f2;color:#718096;width:110px;">Action</td>
                    <td style="padding:12px 0;border-bottom:1px solid #edf0f2;color:#263238;font-weight:600;">${safeTitle}</td>
                  </tr>
                  ${description ? `
                    <tr>
                      <td style="padding:12px 0;border-bottom:1px solid #edf0f2;color:#718096;">Description</td>
                      <td style="padding:12px 0;border-bottom:1px solid #edf0f2;color:#263238;">${safeDescription}</td>
                    </tr>
                  ` : ''}
                  <tr>
                    <td style="padding:12px 0;border-bottom:1px solid #edf0f2;color:#718096;">Due date</td>
                    <td style="padding:12px 0;border-bottom:1px solid #edf0f2;color:#263238;font-weight:600;">${safeDeadline}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0;color:#718096;">Status</td>
                    <td style="padding:12px 0;color:#263238;">${safeStatus}</td>
                  </tr>
                </table>
                ${dashboardUrl ? `
                  <div style="margin:28px 0 8px;text-align:center;">
                    <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:13px 24px;background-color:#16845b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:6px;">Review action</a>
                  </div>
                ` : ''}
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#718096;">Please review this action and update its progress as needed.</p>
              </div>
              <div style="padding:20px 32px;background-color:#f8faf9;border-top:1px solid #edf0f2;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#87939d;">This is an automated reminder from ComplianceTracker. You are receiving it because of your workspace membership.</p>
              </div>
            </div>
          </div>
        `;

        try {
          await sendReminderEmail({
            to: recipientEmail,
            subject: `Compliance action reminder: ${title}`,
            text,
            html,
          });
        } catch (emailError: unknown) {
          const message = emailError instanceof Error
            ? emailError.message
            : 'Email delivery failed';

          const { error: failureUpdateError } = await supabaseAdmin
            .from('compliance_action_reminder_logs')
            .update({
              status: 'failed',
              error_message: message.slice(0, 1000),
            })
            .eq('id', logId);

          if (failureUpdateError) {
            console.error('[ACTION REMINDER FAILURE LOG UPDATE ERROR]', failureUpdateError);
          }

          console.error('[ACTION REMINDER EMAIL FAILED]', emailError);
          failed++;
          failedActionReminders++;
          continue;
        }

        const { error: sentUpdateError } = await supabaseAdmin
          .from('compliance_action_reminder_logs')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', logId);

        if (sentUpdateError) {
          console.error('[ACTION REMINDER SENT STATUS UPDATE ERROR]', sentUpdateError);
          failed++;
          failedActionReminders++;
          continue;
        }

        sent++;
        sentActionReminders++;
      }
    }

    return NextResponse.json({
      success: true,
      checkedDate: today,
      checkedRequirements: checked,
      checkedActions,
      sent,
      failed,
      skipped,
      sentActionReminders,
      failedActionReminders,
      skippedActionReminders,
    });
  } catch (error: unknown) {
    console.error('[REMINDER CRON ERROR]', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Reminder cron execution failed',
      },
      { status: 500 }
    );
  }
}
