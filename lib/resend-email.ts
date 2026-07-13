interface SendAuthEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendAuthEmail({ to, subject, html, text }: SendAuthEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY or RESEND_FROM_EMAIL is not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    console.error('Resend email failed:', payload);
    throw new Error('Failed to send email');
  }
}