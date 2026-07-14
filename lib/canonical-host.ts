export const CANONICAL_SITE_ORIGIN = 'https://phyrexian-arena.vercel.app';

export const TESTDEV_PREVIEW_ORIGIN =
  'https://phyrexian-arena-git-testdev-marco201091-9595s-projects.vercel.app';

const VERCEL_TEAM_DEPLOYMENT_HOST_SUFFIX = '-marco201091-9595s-projects.vercel.app';

// Bare production team alias (no git branch / deployment hash segment).
const PRODUCTION_TEAM_DEPLOYMENT_HOST = 'phyrexian-arena-marco201091-9595s-projects.vercel.app';

export function isVercelTeamDeploymentHost(hostname: string) {
  return hostname.endsWith(VERCEL_TEAM_DEPLOYMENT_HOST_SUFFIX)
    && hostname !== 'phyrexian-arena.vercel.app';
}

export function isProtectedTeamDeploymentHost(hostname: string) {
  return hostname === PRODUCTION_TEAM_DEPLOYMENT_HOST;
}

export function getCanonicalRedirectUrl(url: URL) {
  if (!isProtectedTeamDeploymentHost(url.hostname)) {
    return null;
  }

  const canonical = new URL(url.toString());
  canonical.protocol = 'https:';
  canonical.host = new URL(CANONICAL_SITE_ORIGIN).host;
  return canonical;
}