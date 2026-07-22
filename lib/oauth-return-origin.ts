export const OAUTH_RETURN_ORIGIN_KEY = 'phyrexian_oauth_return_origin';

import {
  CANONICAL_SITE_ORIGIN,
  DEV_SITE_ORIGIN,
  isProtectedTeamDeploymentHost,
  TEST_SITE_ORIGIN,
} from '@/lib/canonical-host';

export const PRODUCTION_SITE_ORIGIN = CANONICAL_SITE_ORIGIN;

export const ALLOWED_OAUTH_RETURN_ORIGINS = [
  PRODUCTION_SITE_ORIGIN,
  TEST_SITE_ORIGIN,
  DEV_SITE_ORIGIN,
  'http://localhost:3000',
] as const;

export function isVercelTeamDeploymentOrigin(origin: string | null | undefined) {
  if (!origin) return false;

  try {
    return isProtectedTeamDeploymentHost(new URL(origin).hostname);
  } catch {
    return false;
  }
}

export function getOAuthCallbackOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (configured && !isVercelTeamDeploymentOrigin(configured)) {
    return configured;
  }

  if (typeof window !== 'undefined') {
    const current = window.location.origin;
    if (!isVercelTeamDeploymentOrigin(current)) {
      return current;
    }
  }

  return PRODUCTION_SITE_ORIGIN;
}

export function getSafeOAuthReturnOrigin(origin: string | null | undefined) {
  if (!origin) return null;

  try {
    const normalized = new URL(origin).origin;
    if (isVercelTeamDeploymentOrigin(normalized)) {
      return null;
    }

    return ALLOWED_OAUTH_RETURN_ORIGINS.includes(
      normalized as (typeof ALLOWED_OAUTH_RETURN_ORIGINS)[number],
    )
      ? normalized
      : null;
  } catch {
    return null;
  }
}

export function setOAuthReturnOrigin(origin: string) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(OAUTH_RETURN_ORIGIN_KEY, origin);
}

export function getOAuthReturnOrigin() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(OAUTH_RETURN_ORIGIN_KEY);
}

export function clearOAuthReturnOrigin() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(OAUTH_RETURN_ORIGIN_KEY);
}

export function readOAuthReturnOrigin(searchParams: URLSearchParams) {
  return getSafeOAuthReturnOrigin(searchParams.get('return_origin'))
    ?? getSafeOAuthReturnOrigin(getOAuthReturnOrigin());
}

export function shouldOAuthOriginBounce(
  currentOrigin: string,
  returnOrigin: string | null | undefined,
) {
  if (isVercelTeamDeploymentOrigin(currentOrigin)) {
    return true;
  }

  const safeOrigin = getSafeOAuthReturnOrigin(returnOrigin);
  if (!safeOrigin || safeOrigin === currentOrigin) {
    return false;
  }

  if (isVercelTeamDeploymentOrigin(safeOrigin)) {
    return false;
  }

  if (currentOrigin === PRODUCTION_SITE_ORIGIN) {
    return false;
  }

  return false;
}

export function buildOAuthOriginBounceUrl(
  currentUrl: URL,
  returnOrigin: string | null | undefined,
) {
  if (!shouldOAuthOriginBounce(currentUrl.origin, returnOrigin)) {
    return null;
  }

  const safeOrigin = isVercelTeamDeploymentOrigin(currentUrl.origin)
    ? PRODUCTION_SITE_ORIGIN
    : getSafeOAuthReturnOrigin(returnOrigin);

  if (!safeOrigin || safeOrigin === currentUrl.origin) {
    return null;
  }

  return new URL(
    `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
    safeOrigin,
  ).toString();
}

export function getOAuthOriginBounceUrl() {
  if (typeof window === 'undefined') return null;

  const currentUrl = new URL(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
    window.location.origin,
  );

  return buildOAuthOriginBounceUrl(
    currentUrl,
    readOAuthReturnOrigin(currentUrl.searchParams),
  );
}
