import { NextResponse } from 'next/server';
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
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    const email =
      typeof data.email === 'string'
        ? data.email.trim().toLowerCase()
        : '';

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

    const appUrl = process.env.APP_URL;

    if (!appUrl) {
      throw new Error('APP_URL is not configured.');
    }

    const callbackUrl = new URL('/auth/callback', appUrl);
    callbackUrl.searchParams.set('next', '/reset-password');

    const { data: generated, error: generateError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

    if (generateError) {
      const message = generateError.message.toLowerCase();

      if (
        message.includes('user not found') ||
        message.includes('no user')
      ) {
        return NextResponse.json({
          success: true,
          message: 'If an account exists for this address, reset instructions will be sent.',
        });
      }

      throw generateError;
    }

    const resetLink = generated.properties?.action_link;

    if (!resetLink) {
      throw new Error('Supabase did not return a password recovery link.');
    }
    const safeLink = escapeHtml(resetLink);

    await sendResendEmail({
      to: email,
      subject: 'Reset your ComplianceTracker password',
      text:
        'Hello,\n\n' +
        'We received a request to reset your ComplianceTracker password.\n\n' +
        `Use this link to reset your password:\n${resetLink}\n\n` +
        'If you did not request a password reset, you can ignore this email.',
      html: `
        <div style="background:#f8fafc;padding:36px 16px;font-family:Arial,sans-serif;color:#0f172a">
          <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:36px">
            <h1 style="margin:0 0 24px;font-size:23px;color:#047857">ComplianceTracker</h1>
            <p style="font-size:16px">Hello,</p>
            <p style="font-size:15px;line-height:1.7;color:#475569">
              We received a request to reset your ComplianceTracker password. Use the button below to choose a new password.
            </p>
            <p style="margin:28px 0">
              <a href="${safeLink}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:8px;font-weight:600">
                Reset password
              </a>
            </p>
            <p style="font-size:13px;line-height:1.6;color:#64748b">
              If the button does not work, copy and paste this link into your browser:<br>
              <a href="${safeLink}" style="color:#047857;word-break:break-all">${safeLink}</a>
            </p>
            <p style="font-size:13px;color:#64748b">
              If you did not request a password reset, you can safely ignore this email.
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0">
            <p style="font-size:12px;color:#94a3b8">ComplianceTracker</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'If an account exists for this address, reset instructions will be sent.',
    });
  } catch (error: unknown) {
    console.error('[PASSWORD RESET EMAIL ERROR]', error);

    return NextResponse.json(
      { error: 'Unable to send the reset email. Please try again.' },
      { status: 500 }
    );
  }
}
