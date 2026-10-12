import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createHash, randomBytes } from 'node:crypto';
import { getAuthClient, supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const INVITATION_HOURS = 48;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return value.replace(/[&<>"']/g, (char: string) => entities[char]);
}

function getAppUrl() {
  const configuredUrl = process.env.APP_URL;

  if (!configuredUrl) {
    throw new Error('APP_URL is not configured');
  }

  const url = new URL(configuredUrl);

  if (
    process.env.NODE_ENV === 'production' &&
    url.protocol !== 'https:'
  ) {
    throw new Error('APP_URL must use HTTPS in production');
  }

  return url.origin;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return jsonError('Unauthorized', 401);
    }

    const supabase = getAuthClient(authHeader);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError('Unauthorized', 401);
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return jsonError('Invalid JSON request body', 400);
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonError('Invalid request body', 400);
    }

    const input = body as Record<string, unknown>;
    const workspaceId = input.workspaceId;
    const emailInput = input.email;
    const roleInput = input.role ?? 'member';

    if (
      typeof workspaceId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        workspaceId
      )
    ) {
      return jsonError('A valid workspace ID is required', 400);
    }

    if (typeof emailInput !== 'string') {
      return jsonError('A valid email address is required', 400);
    }

    const email = normalizeEmail(emailInput);

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return jsonError('A valid email address is required', 400);
    }

    if (roleInput !== 'member' && roleInput !== 'viewer') {
      return jsonError('Role must be member or viewer', 400);
    }

    // Verify the caller's membership using the authenticated user.
    const { data: membership, error: membershipError } =
      await supabaseAdmin
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (membershipError) {
      console.error('INVITATION MEMBERSHIP CHECK FAILED');
      return jsonError('Could not verify workspace permissions', 500);
    }

    if (
      !membership ||
      !['owner', 'admin'].includes(membership.role)
    ) {
      return jsonError(
        'Only workspace owners and admins can invite members',
        403
      );
    }

        // Confirm that this is a company workspace.
    const { data: workspace, error: workspaceError } =
      await supabaseAdmin
        .from('workspaces')
        .select('id, name, type')
        .eq('id', workspaceId)
        .maybeSingle();

    if (workspaceError) {
      console.error('INVITATION WORKSPACE LOOKUP FAILED');
      return jsonError('Could not verify workspace', 500);
    }

    if (!workspace || workspace.type !== 'company') {
      return jsonError(
        'Invitations are available only for company workspaces',
        400
      );
    }

    // Fetch membership emails securely from Auth, rather than trusting
    // email addresses supplied by the browser.
    const { data: authUsers, error: authUsersError } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (authUsersError) {
      console.error('INVITATION USER LOOKUP FAILED');
      return jsonError('Could not validate invitee', 500);
    }

    const invitedUser = authUsers.users.find(
      (candidate) =>
        candidate.email &&
        normalizeEmail(candidate.email) === email
    );

    if (invitedUser) {
      const { data: memberRecord, error: memberRecordError } =
        await supabaseAdmin
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', invitedUser.id)
          .maybeSingle();

      if (memberRecordError) {
        console.error('INVITATION DUPLICATE CHECK FAILED');
        return jsonError('Could not validate invitation', 500);
      }

      if (memberRecord) {
        return jsonError(
          'This person is already a workspace member',
          409
        );
      }
    }

    // Prevent the caller from inviting their own account.
    if (
      user.email &&
      normalizeEmail(user.email) === email
    ) {
      return jsonError('You cannot invite your own account', 400);
    }

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.EXPIRATION_FROM_EMAIL;

    if (
      !smtpUser ||
      !smtpPass ||
      !fromEmail ||
      ![465, 587].includes(smtpPort)
    ) {
      console.error('INVITATION SMTP CONFIGURATION IS INCOMPLETE');
      return jsonError('Email service is not configured', 500);
    }

    const appUrl = getAppUrl();

    // Generate a one-time, high-entropy invitation token.
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex');

    const expiresAt = new Date(
      Date.now() + INVITATION_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { data: invitation, error: insertError } =
      await supabaseAdmin
        .from('workspace_invitations')
        .insert({
          workspace_id: workspaceId,
          invited_email: email,
          token_hash: tokenHash,
          role: roleInput,
          status: 'revoked',
          invited_by: user.id,
          expires_at: expiresAt,
        })
        .select('id')
        .single();

    if (insertError || !invitation) {
      console.error('INVITATION DATABASE INSERT FAILED');
      return jsonError('Could not create invitation', 500);
    }

    const invitationUrl = new URL(
      '/invite',
      appUrl
    );

    invitationUrl.searchParams.set('token', token);

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

    // Activate the replacement before sending the email.
    const { data: activation, error: activationError } =
      await supabaseAdmin.rpc('activate_workspace_invitation', {
        p_invitation_id: invitation.id,
        p_workspace_id: workspaceId,
        p_invited_email: email,
      });

    if (
      activationError ||
      !activation ||
      activation.success !== true
    ) {
      const { error: cleanupError } = await supabaseAdmin
        .from('workspace_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitation.id);

      if (cleanupError) {
        console.error('FAILED INVITATION CLEANUP AFTER ACTIVATION ERROR');
      }

      console.error('INVITATION ACTIVATION FAILED');
      return jsonError('Could not activate invitation', 500);
    }

    const previousInvitationId: string | null =
      activation.previous_invitation_id ?? null;

    try {
      await transporter.sendMail({
        from: {
          name: 'Compliance Tracker',
          address: fromEmail,
        },
        to: email,
        subject: `Invitation to join ${workspace.name}`,
        text: `You have been invited to join ${workspace.name} on Compliance Tracker.

Your assigned role is: ${roleInput}.

Accept the invitation within 48 hours using this link:
${invitationUrl.toString()}

If you were not expecting this invitation, you can ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
            <h2>Compliance Tracker invitation</h2>
            <p>You have been invited to join <strong>${escapeHtml(workspace.name)}</strong>.</p>
            <p>Your assigned role is <strong>${roleInput}</strong>.</p>
            <p>This invitation expires in 48 hours.</p>
            <p><a href="${invitationUrl.toString()}">Accept invitation</a></p>
            <p>If you were not expecting this invitation, you can ignore this email.</p>
          </div>
        `,
      });
    } catch {
      // Roll back the replacement if email sending fails.
      const { error: rollbackError } = await supabaseAdmin.rpc(
        'rollback_workspace_invitation',
        {
          p_invitation_id: invitation.id,
          p_previous_invitation_id: previousInvitationId,
          p_workspace_id: workspaceId,
          p_invited_email: email,
        }
      );

      if (rollbackError) {
        console.error('INVITATION ROLLBACK FAILED');
      }

      console.error('INVITATION EMAIL DELIVERY FAILED');
      return jsonError('Could not send invitation email', 502);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Invitation sent',
        invitation: {
          id: invitation.id,
          email,
          role: roleInput,
          expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error(
      'WORKSPACE INVITATION API ERROR:',
      error instanceof Error ? error.message : 'Unknown error'
    );

    return jsonError('Could not create invitation', 500);
  }
}
