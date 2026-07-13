import { describe, expect, it } from 'vitest';
import { isNativeApp } from '@/lib/capacitor';

describe('capacitor', () => {
  it('detects the native user agent token', () => {
    expect(isNativeApp('Mozilla/5.0 PhyrexianArenaNative/1.0')).toBe(true);
  });

  it('returns false for regular browsers', () => {
    expect(isNativeApp('Mozilla/5.0 Chrome/120.0.0.0')).toBe(false);
  });

  it('returns false when user agent is missing', () => {
    expect(isNativeApp('')).toBe(false);
    expect(isNativeApp(null)).toBe(false);
  });
});