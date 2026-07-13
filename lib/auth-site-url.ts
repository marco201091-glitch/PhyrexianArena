export function getAuthSiteUrl(request?: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    if (host) {
      return `${proto}://${host}`;
    }
  }

  return 'http://localhost:3000';
}

export function buildAuthCallbackUrl(siteUrl: string, nextPath = '/dashboard') {
  const callback = new URL('/auth/callback', siteUrl);
  callback.searchParams.set('next', nextPath);
  return callback.toString();
}

export function buildPasswordResetUrl(siteUrl: string) {
  return new URL('/auth/reset-password', siteUrl).toString();
}