export async function verifyHCaptcha(token: string, remoteIp: string | null) {
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) {
    throw new Error('HCAPTCHA_SECRET_KEY is not configured');
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  if (remoteIp) {
    body.set('remoteip', remoteIp);
  }

  try {
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) return false;

    const data = await response.json() as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error('hCaptcha verification failed:', error);
    return false;
  }
}

export function getRequestRemoteIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  return forwardedFor?.split(',')[0]?.trim() || null;
}