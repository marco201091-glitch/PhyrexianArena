import { describe, expect, it } from 'vitest';
import { getSafeRedirectPath } from '@/lib/safe-redirect';

describe('safe redirects', () => {
  it('allows local Expo Router paths and encoded parameters', () => {
    expect(getSafeRedirectPath('/(tabs)/arenas')).toBe('/(tabs)/arenas');
    expect(getSafeRedirectPath('/join/ABC%20123')).toBe('/join/ABC%20123');
  });

  it('rejects absolute, protocol-relative, and script-like destinations', () => {
    expect(getSafeRedirectPath('https://evil.example')).toBe('/(tabs)');
    expect(getSafeRedirectPath('//evil.example/path')).toBe('/(tabs)');
    expect(getSafeRedirectPath('/join/<script>')).toBe('/(tabs)');
    expect(getSafeRedirectPath('javascript:alert(1)')).toBe('/(tabs)');
  });

  it('uses the requested fallback for empty or whitespace-only input', () => {
    expect(getSafeRedirectPath(undefined, '/login')).toBe('/login');
    expect(getSafeRedirectPath('   ', '/login')).toBe('/login');
  });
});
