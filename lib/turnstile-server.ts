type TurnstileResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
};

export async function verifyTurnstile(token: string, remoteIp: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new Error('TURNSTILE_SECRET_KEY is not configured');
  if (!token || token.length > 2048) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return false;
    return (await response.json() as TurnstileResponse).success === true;
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return false;
  }
}

export function getRequestRemoteIp(request: Request) {
  const cloudflareIp = request.headers.get('cf-connecting-ip');
  if (cloudflareIp) return cloudflareIp;
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
}
