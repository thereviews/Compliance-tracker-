import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';
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

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Invalid request.' },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    let email =
      typeof data.email === 'string'
        ? data.email.trim().toLowerCase()
        : '';
    const invitationToken =
      typeof data.invitationToken === 'string'
        ? data.invitationToken.trim()
        : '';
    const password =
      typeof data.password === 'string' ? data.password : '';

    if (!name || name.length > 100) {
      return NextResponse.json(
        { error: 'Please enter a valid name.' },
        { status: 400 }
      );
    }

    if (invitationToken) {
      if (!/^[a-f0-9]{64}$/i.test(invitationToken)) {
        return NextResponse.json(
          { error: 'This invitation link is invalid.' },
          { status: 400 }
        );
      }

      const tokenHash = createHash('sha256')
        .update(invitationToken)
        .digest('hex');

      const { data: invitation, error: invitationError } =
        await supabaseAdmin
          .from('workspace_invitations')
          .select('email, expires_at, accepted_at, revoked_at')
          .eq('token_hash', tokenHash)
          .maybeSingle();

      if (invitationError || !invitation) {
        return NextResponse.json(
          { error: 'This invitation link is invalid or no longer available.' },
          { status: 400 }
        );
      }

      if (
        invitation.accepted_at ||
        invitation.revoked_at ||
        !invitation.expires_at ||
        new Date(invitation.expires_at).getTime() <= Date.now()
      ) {
        return NextResponse.json(
          { error: 'This invitation has expired or has already been used.' },
          { status: 400 }
        );
      }

      email = invitation.email.trim().toLowerCase();
    }

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (password.length < 6 || password.length > 128) {
      return NextResponse.json(
        { error: 'Password must be between 6 and 128 characters.' },
        { status: 400 }
      );
    }

    const appUrl = process.env.APP_URL;

    if (!appUrl) {
      throw new Error('APP_URL is not configured.');
    }

    const callbackUrl = new URL('/auth/callback', appUrl);
    callbackUrl.searchParams.set(
      'next',
      invitationToken
        ? `/invite?token=${encodeURIComponent(invitationToken)}`
        : '/signin?confirmed=1'
    );


    const { data: generated, error: generateError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email,
        password,
        options: {
          data: { full_name: name },
          redirectTo: callbackUrl.toString(),
        },
      });

    if (generateError) {
      const message = generateError.message.toLowerCase();

      const alreadyRegistered =
        message.includes('already registered') ||
        message.includes('already been registered') ||
        message.includes('already exists');

      if (alreadyRegistered && invitationToken) {
        return NextResponse.json(
          { error: 'An account already exists for this invited email address. Please sign in to accept the invitation.' },
          { status: 409 }
        );
      }

      if (alreadyRegistered) {
        return NextResponse.json({
          success: true,
          message: 'If this address can be registered, confirmation instructions will be sent.',
        });
      }

      throw generateError;
    }

    const actionLink = generated.properties?.action_link;

    if (!actionLink) {
      throw new Error('Supabase did not return a signup confirmation link.');
    }


    const firstName = name.split(/\s+/)[0];
    const safeName = escapeHtml(firstName);
    const safeLink = escapeHtml(actionLink);


    await sendResendEmail({
      to: email,
      subject: invitationToken
        ? 'Confirm your account to join a ComplianceTracker workspace'
        : 'Confirm your ComplianceTracker account',
      text:
        `Hello ${firstName},\n\n` +
        (invitationToken
          ? 'Thanks for creating a ComplianceTracker account. Confirm your email to continue joining your invited workspace. '
          : 'Thanks for creating a ComplianceTracker account. Confirm your email address using this link:\n\n') +
        `${actionLink}\n\n` +
        'If you did not create this account, you can ignore this email.',
      html: `
        <div style="background:#f8fafc;padding:36px 16px;font-family:Arial,sans-serif;color:#0f172a">
          <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:36px">
            <h1 style="margin:0 0 24px;font-size:23px;color:#047857">ComplianceTracker</h1>
            <p style="font-size:16px">Hello ${safeName},</p>
            <p style="font-size:15px;line-height:1.7;color:#475569">
              {invitationToken
                ? 'Thanks for creating a ComplianceTracker account. Please confirm your email address to continue joining your invited workspace.'
                : 'Thanks for creating a ComplianceTracker account. Please confirm your email address to activate your account.'}
            </p>
            <p style="margin:28px 0">
              <a href="${safeLink}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:8px;font-weight:600">
                Confirm email address
              </a>
            </p>
            <p style="font-size:13px;line-height:1.6;color:#64748b">
              If the button does not work, copy and paste this link into your browser:<br>
              <a href="${safeLink}" style="color:#047857;word-break:break-all">${safeLink}</a>
            </p>
            <p style="font-size:13px;color:#64748b">If you did not create this account, you can safely ignore this email.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0">
            <p style="font-size:12px;color:#94a3b8">ComplianceTracker</p>
          </div>
        </div>
      `,
    });


    return NextResponse.json({
      success: true,
      message: invitationToken
        ? 'Account registration submitted. Check your email to confirm your address and continue joining the workspace.'
        : 'Account registration submitted. Check your email for confirmation.',
    });
  } catch (error: unknown) {

    return NextResponse.json(
      { error: 'Unable to submit registration. Please try again.' },
      { status: 500 }
    );
  }
}
