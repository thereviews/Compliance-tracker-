import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { getAuthClient, supabaseAdmin } from '@/lib/supabase';
import { sendResendEmail } from '@/lib/resend';

export const runtime = 'nodejs';

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


async function readJsonObject(
  req: Request
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return null;
    }

    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}


const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  let invitationId: string | null = null;

  try {
    // Authenticate the requester.
    const supabase = getAuthClient(
      req.headers.get('Authorization')
    );

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await readJsonObject(req);

    if (!body) {
      return NextResponse.json(
        { error: 'A valid JSON object is required.' },
        { status: 400 }
      );
    }

    const workspaceId =
      typeof body.workspaceId === 'string'
        ? body.workspaceId
        : '';

    const email =
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';

    const role =
      typeof body.role === 'string'
        ? body.role
        : '';

    if (!UUID_REGEX.test(workspaceId)) {
      return NextResponse.json(
        { error: 'Valid workspaceId required' },
        { status: 400 }
      );
    }

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400 }
      );
    }

    if (!['Admin', 'Member'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be Admin or Member' },
        { status: 400 }
      );
    }

    // Verify the requester belongs to this workspace.
    const { data: membership, error: membershipError } =
      await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    if (!membership) {
      return NextResponse.json(
        { error: 'Workspace access denied' },
        { status: 403 }
      );
    }

    if (!['Owner', 'Admin'].includes(membership.role || '')) {
      return NextResponse.json(
        { error: 'Only Owners and Admins can invite members' },
        { status: 403 }
      );
    }

    // Generate a secure random invitation token.
    const token = randomBytes(32).toString('hex');

    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex');

    const configuredSiteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.APP_URL ||
      (process.env.NODE_ENV !== 'production'
        ? 'http://localhost:3000'
        : '');

    if (!configuredSiteUrl) {
      return NextResponse.json(
        { error: 'Invitation email service is not configured.' },
        { status: 500 }
      );
    }

    let siteUrl: URL;

    try {
      siteUrl = new URL(configuredSiteUrl);

      const isLocalDevelopment =
        process.env.NODE_ENV !== 'production' &&
        ['localhost', '127.0.0.1'].includes(siteUrl.hostname);

      if (
        !['https:', 'http:'].includes(siteUrl.protocol) ||
        siteUrl.username ||
        siteUrl.password ||
        (process.env.NODE_ENV === 'production' &&
          siteUrl.protocol !== 'https:') ||
        (siteUrl.protocol === 'http:' && !isLocalDevelopment)
      ) {
        throw new Error('Invalid invitation site URL.');
      }
    } catch {
      return NextResponse.json(
        { error: 'Invitation email service is not configured correctly.' },
        { status: 500 }
      );
    }

    const invitationUrl = new URL('/invite', siteUrl);
    invitationUrl.searchParams.set('token', token);

    // Save the invitation before sending the email.
    const { data: invitation, error: insertError } =
      await supabaseAdmin
        .from('workspace_invitations')
        .insert({
          workspace_id: workspaceId,
          email,
          role,
          token_hash: tokenHash,
          invited_by: user.id,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString()
        })
        .select('id')
        .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    invitationId = invitation.id;

    // Use one invitation link for both new and existing users.
    const emailLink = invitationUrl.toString();
    const safeLink = escapeHtml(emailLink);
    const greeting = 'Hello,';
    const recipientInstructions = 'Open this invitation link. If you are new to ComplianceTracker, create your account; if you already have an account, sign in with this email address.';

    const text =
      `${greeting}\\n\\n` +
      `You have been invited to join a ComplianceTracker workspace as a ${role}.\\n\\n` +
      `${recipientInstructions}\\n\\n` +
      `Accept invitation: ${emailLink}\\n\\n` +
      'This invitation expires in 7 days. If you were not expecting it, you can ignore this email.';

    await sendResendEmail({
      to: email,
      subject: "You're invited to join a ComplianceTracker workspace",
      text,
      html: `
        <div style="background:#f8fafc;padding:36px 16px;font-family:Arial,sans-serif;color:#0f172a">
          <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:36px">
            <h1 style="margin:0 0 24px;font-size:23px;color:#047857">ComplianceTracker</h1>
            <p style="font-size:16px">${greeting}</p>
            <p style="font-size:15px;line-height:1.7;color:#475569">
              You have been invited to join a ComplianceTracker workspace as a <strong>${escapeHtml(role)}</strong>.
            </p>
            <p style="font-size:15px;line-height:1.7;color:#475569">
              ${recipientInstructions}
            </p>
            <p style="margin:28px 0">
              <a href="${safeLink}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:8px;font-weight:600">
                View workspace invitation
              </a>
            </p>
            <p style="font-size:13px;line-height:1.6;color:#64748b">
              If the button does not work, copy and paste this link into your browser:<br>
              <a href="${safeLink}" style="color:#047857;word-break:break-all">${safeLink}</a>
            </p>
            <p style="font-size:13px;color:#64748b">
              This invitation expires in 7 days. If you were not expecting it, you can ignore this email.
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0">
            <p style="font-size:12px;color:#94a3b8">ComplianceTracker</p>
          </div>
        </div>
      `
    });

    // Revoke older invitations only after the new email was sent.
    const { error: revokeOldError } = await supabaseAdmin
      .from('workspace_invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .neq('id', invitation.id)
      .is('accepted_at', null)
      .is('revoked_at', null);

    if (revokeOldError) {
      console.error('Could not revoke older invitations:', revokeOldError);
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation email sent',
      invitationId
    });

  } catch (error: unknown) {
    console.error('[WORKSPACE INVITATION ERROR]', error);

    // Remove the pending record if email delivery failed.
    if (invitationId) {
      try {
        const { error: cleanupError } = await supabaseAdmin
          .from('workspace_invitations')
          .delete()
          .eq('id', invitationId);

        if (cleanupError) {
          console.error('[INVITATION CLEANUP ERROR]', cleanupError);
        }
      } catch (cleanupError) {
        console.error('[INVITATION CLEANUP ERROR]', cleanupError);
      }
    }

    return NextResponse.json(
      { error: 'Failed to send workspace invitation. Please try again.' },
      { status: 500 }
    );
  }
}
