import { describe, expect, it } from 'vitest';
import { getSessionLossRedirect, isPublicRoute } from '@/lib/auth-route-policy';

describe('auth-route-policy', () => {
  it('keeps registration and other public routes open after session loss', () => {
    expect(isPublicRoute('/auth/register')).toBe(true);
    expect(getSessionLossRedirect('/auth/register', '?redirect=%2Fdashboard')).toBeNull();
    expect(getSessionLossRedirect('/counter')).toBeNull();
    expect(getSessionLossRedirect('/game/join/token')).toBeNull();
  });

  it('redirects protected routes and preserves their query', () => {
    expect(getSessionLossRedirect('/table/arena-id', '?tab=stats')).toBe(
      '/auth/login?redirect=%2Ftable%2Farena-id%3Ftab%3Dstats',
    );
    expect(getSessionLossRedirect('/')).toBe('/auth/login');
  });
});
