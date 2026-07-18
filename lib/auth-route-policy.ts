const PUBLIC_ROUTE_PREFIXES = ['/auth', '/arena', '/counter', '/game/join', '/join', '/legal'];

export function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function getSessionLossRedirect(pathname: string, search = '') {
  if (isPublicRoute(pathname)) return null;
  const returnPath = `${pathname}${search}`;
  return returnPath && returnPath !== '/'
    ? `/auth/login?redirect=${encodeURIComponent(returnPath)}`
    : '/auth/login';
}
