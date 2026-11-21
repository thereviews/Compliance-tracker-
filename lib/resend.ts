export interface ResendEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendResendEmail(
  message: ResendEmail
): Promise<void> {
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
      from:
        process.env.RESEND_FROM_EMAIL ||
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
      result.message || `Resend request failed: HTTP ${response.status}`
    );
  }
}
