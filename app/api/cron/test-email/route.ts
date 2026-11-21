import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const recipient = process.env.EXPIRATION_TEST_EMAIL;

  if (!recipient) {
    return NextResponse.json(
      { error: 'EXPIRATION_TEST_EMAIL is missing' },
      { status: 500 }
    );
  }

  try {
    await sendEmail({
      to: recipient,
      subject: 'ComplianceTracker SMTP test',
      text: 'Success! ComplianceTracker has successfully sent this test email using Gmail SMTP.',
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>ComplianceTracker email test</h2>
          <p>Success! Your application has successfully sent this test email using Gmail SMTP.</p>
          <p>Your email delivery configuration is working.</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      recipient,
    });
  } catch (error: unknown) {
    console.error('[SMTP TEST FAILED]', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Test email could not be sent',
      },
      { status: 500 }
    );
  }
}
