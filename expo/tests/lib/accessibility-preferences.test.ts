import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  normalizeAccessibilityPreferences,
} from '@/lib/accessibility-preferences';

describe('accessibility preferences', () => {
  it('keeps animations enabled by default', () => {
    expect(DEFAULT_ACCESSIBILITY_PREFERENCES.reducedMotion).toBe(false);
  });

  it('migrates the old mistaken reduced-motion default', () => {
    expect(normalizeAccessibilityPreferences({
      reducedMotion: true,
      highContrast: true,
      largeText: false,
    })).toEqual({
      reducedMotion: false,
      highContrast: true,
      largeText: false,
    });
  });

  it('preserves an explicit v2 reduced-motion choice', () => {
    expect(normalizeAccessibilityPreferences({
      schemaVersion: 2,
      reducedMotion: true,
      highContrast: false,
      largeText: false,
    }).reducedMotion).toBe(true);
  });
});
