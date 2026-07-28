import { describe, expect, it } from 'vitest';
import { getLiveGameOrientationPolicy } from '@/lib/live-game-orientation';

describe('live-game orientation policy', () => {
  it('keeps phones portrait for table readability', () => {
    expect(getLiveGameOrientationPolicy('ios', false)).toBe('portrait');
    expect(getLiveGameOrientationPolicy('android', false)).toBe('portrait');
  });

  it('lets iPad follow portrait, landscape and Split View orientation', () => {
    expect(getLiveGameOrientationPolicy('ios', true)).toBe('unlocked');
  });
});
