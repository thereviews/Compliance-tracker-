import { Resend } from 'resend';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.EXPIRATION_TEST_EMAIL;

  if (!apiKey) {
    return Response.json(
      { success: false, error: 'Email service is not configured.' },
      { status: 500 }
    );
  }

  if (!recipient) {
    return Response.json(
      { success: false, error: 'Email service is not configured.' },
      { status: 500 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return Response.json(
      { success: false, error: 'Email service is not configured.' },
      { status: 400 }
    );
  }

  console.log('Test recipient configured:', Boolean(recipient));
  console.log('Test recipient format valid:', true);

  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'delivered@resend.dev',
      subject: 'Compliance Tracker email test',
      html: '<p>Your Compliance Tracker email integration is working.</p>',
    });

    if (error) {
      console.error('Resend test email failed:', error);

      return Response.json(
        { success: false, error: 'Unable to send the test email. Please try again later.' },
        { status: 502 }
      );
    }

    return Response.json({
      success: true,
      message: 'Resend accepted the test email.',
      id: data?.id,
    });
  } catch (error) {
    console.error('Email test failed:', error);

    return Response.json(
      {
        success: false,
        error: 'Unable to send the test email. Please try again later.',
      },
      { status: 500 }
    );
  }
}
