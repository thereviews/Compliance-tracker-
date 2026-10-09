import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;

  if (
    !secret ||
    req.headers.get('Authorization') !== `Bearer ${secret}`
  ) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY is missing' },
      { status: 500 }
    );
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      console.log(
        'Test recipient configured:',
    Boolean(process.env.EXPIRATION_TEST_EMAIL),
        'Recipient matches expected 
format:',
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    process.env.EXPIRATION_TEST_EMAIL || ''
  )
);

      to: process.env.EXPIRATION_TEST_EMAIL!,
      subject: 'Compliance Tracker email test',
      html: '<p>Your Compliance Tracker email integration is working.</p>',
    });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Resend accepted the test email.',
      id: data?.id,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error
          ? error.message
          : String(error),
      },
      { status: 500 }
    );
  }
}
