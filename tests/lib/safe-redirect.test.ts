import { describe, expect, it } from 'vitest';
import { getSafeRedirectPath } from '@/lib/safe-redirect';

describe('safe-redirect', () => {
  it('allows safe in-app paths', () => {
    expect(getSafeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(getSafeRedirectPath('/join/ABC123')).toBe('/join/ABC123');
  });

  it('blocks open redirects', () => {
    expect(getSafeRedirectPath('//evil.com')).toBe('/dashboard');
    expect(getSafeRedirectPath('https://evil.com')).toBe('/dashboard');
    expect(getSafeRedirectPath('/join/<script>')).toBe('/dashboard');
  });

  it('falls back when empty', () => {
    expect(getSafeRedirectPath(null)).toBe('/dashboard');
    expect(getSafeRedirectPath(undefined, '/profile')).toBe('/profile');
  });
});