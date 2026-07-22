import { describe, expect, it } from 'vitest';
import {
  getCanonicalRedirectUrl,
  isProtectedTeamDeploymentHost,
  isVercelTeamDeploymentHost,
  TEST_SITE_ORIGIN,
} from '@/lib/canonical-host';

describe('canonical-host', () => {
  const testHost = new URL(TEST_SITE_ORIGIN).hostname;
  const deploymentPreviewHost = 'phyrexian-arena-6w08k61au-marco201091-9595s-projects.vercel.app';

  it('detects Vercel team deployment hosts', () => {
    expect(isVercelTeamDeploymentHost('phyrexian-arena-marco201091-9595s-projects.vercel.app')).toBe(true);
    expect(isVercelTeamDeploymentHost(testHost)).toBe(false);
    expect(isVercelTeamDeploymentHost(deploymentPreviewHost)).toBe(true);
    expect(isVercelTeamDeploymentHost('phyrexian-arena.vercel.app')).toBe(false);
  });

  it('allows preview hosts without redirecting to production', () => {
    expect(isProtectedTeamDeploymentHost(testHost)).toBe(false);
    expect(isProtectedTeamDeploymentHost(deploymentPreviewHost)).toBe(false);

    const testUrl = new URL(`${TEST_SITE_ORIGIN}/auth/login`);
    expect(getCanonicalRedirectUrl(testUrl)).toBeNull();

    const deploymentUrl = new URL(`https://${deploymentPreviewHost}/auth/login`);
    expect(getCanonicalRedirectUrl(deploymentUrl)).toBeNull();
  });

  it('redirects only the bare production team alias to the public production domain', () => {
    expect(isProtectedTeamDeploymentHost('phyrexian-arena-marco201091-9595s-projects.vercel.app')).toBe(true);

    const teamUrl = new URL('https://phyrexian-arena-marco201091-9595s-projects.vercel.app/auth/callback?code=abc');
    const canonical = getCanonicalRedirectUrl(teamUrl);

    expect(canonical?.toString()).toBe('https://app.phyrexianarena.dpdns.org/auth/callback?code=abc');
  });
});
