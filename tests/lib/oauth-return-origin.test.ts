import { afterEach, describe, expect, it, vi } from 'vitest';
import { TESTDEV_PREVIEW_ORIGIN } from '@/lib/canonical-host';
import {
  buildOAuthOriginBounceUrl,
  clearOAuthReturnOrigin,
  getOAuthOriginBounceUrl,
  getOAuthReturnOrigin,
  PRODUCTION_SITE_ORIGIN,
  readOAuthReturnOrigin,
  setOAuthReturnOrigin,
  shouldOAuthOriginBounce,
} from '@/lib/oauth-return-origin';

const storage = new Map<string, string>();

const testdevOrigin = TESTDEV_PREVIEW_ORIGIN;
const productionOrigin = PRODUCTION_SITE_ORIGIN;
const teamDeploymentOrigin = 'https://phyrexian-arena-marco201091-9595s-projects.vercel.app';

function stubWindow(origin: string, search = `?code=abc&next=%2F&return_origin=${encodeURIComponent(productionOrigin)}`) {
  vi.stubGlobal('window', {
    sessionStorage: {
      setItem: (key: string, value: string) => storage.set(key, value),
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
    },
    location: {
      origin,
      pathname: '/auth/callback',
      search,
      hash: '',
    },
  });
}

afterEach(() => {
  storage.clear();
  vi.unstubAllGlobals();
});

describe('oauth-return-origin', () => {
  it('always bounces from a protected team deployment URL back to production', () => {
    const currentUrl = new URL(
      `${teamDeploymentOrigin}/auth/callback?code=abc&next=%2F`,
    );

    expect(shouldOAuthOriginBounce(teamDeploymentOrigin, null)).toBe(true);
    expect(buildOAuthOriginBounceUrl(currentUrl, null)).toBe(
      `${productionOrigin}/auth/callback?code=abc&next=%2F`,
    );
  });

  it('does not bounce from preview deployments', () => {
    const deploymentPreviewOrigin = 'https://phyrexian-arena-6w08k61au-marco201091-9595s-projects.vercel.app';

    for (const origin of [testdevOrigin, deploymentPreviewOrigin]) {
      const currentUrl = new URL(`${origin}/auth/callback?code=abc&next=%2Fdashboard`);

      expect(shouldOAuthOriginBounce(origin, null)).toBe(false);
      expect(buildOAuthOriginBounceUrl(currentUrl, null)).toBeNull();
    }

    expect(readOAuthReturnOrigin(new URLSearchParams(`return_origin=${encodeURIComponent(testdevOrigin)}`))).toBe(testdevOrigin);
  });

  it('does not bounce from production to preview deployments', () => {
    const currentUrl = new URL(
      `${productionOrigin}/auth/callback?code=abc&next=%2F&return_origin=${encodeURIComponent(testdevOrigin)}`,
    );

    expect(shouldOAuthOriginBounce(productionOrigin, testdevOrigin)).toBe(false);
    expect(buildOAuthOriginBounceUrl(currentUrl, testdevOrigin)).toBeNull();
  });

  it('does not bounce to protected team deployment URLs', () => {
    const currentUrl = new URL(
      `${productionOrigin}/auth/callback?code=abc&next=%2F&return_origin=${encodeURIComponent(teamDeploymentOrigin)}`,
    );

    expect(readOAuthReturnOrigin(currentUrl.searchParams)).toBeNull();
    expect(buildOAuthOriginBounceUrl(currentUrl, teamDeploymentOrigin)).toBeNull();
  });

  it('falls back to session storage only for non-protected origins', () => {
    stubWindow(productionOrigin, '?code=abc&next=%2Fdashboard');
    setOAuthReturnOrigin(productionOrigin);

    stubWindow(teamDeploymentOrigin, '?code=abc&next=%2Fdashboard');
    expect(getOAuthReturnOrigin()).toBe(productionOrigin);
    expect(getOAuthOriginBounceUrl()).toBe(
      `${productionOrigin}/auth/callback?code=abc&next=%2Fdashboard`,
    );
  });

  it('does not bounce when callback stays on the same host', () => {
    stubWindow(productionOrigin);
    setOAuthReturnOrigin(productionOrigin);
    expect(getOAuthOriginBounceUrl()).toBeNull();
    clearOAuthReturnOrigin();
    expect(getOAuthReturnOrigin()).toBeNull();
  });
});