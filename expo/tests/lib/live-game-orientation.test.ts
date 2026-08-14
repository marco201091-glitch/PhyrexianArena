import { beforeEach, describe, expect, it, vi } from 'vitest';

const lockAsync = vi.fn(async () => undefined);
const unlockAsync = vi.fn(async () => undefined);

import {
  applyLiveGameOrientationLock,
  clearLiveGameOrientationLock,
  getLiveGameOrientationPolicy,
} from '@/lib/live-game-orientation';

describe('live-game orientation policy', () => {
  beforeEach(() => {
    lockAsync.mockClear();
    unlockAsync.mockClear();
  });

  it('locks phones to the primary landscape orientation', () => {
    expect(getLiveGameOrientationPolicy('ios', false)).toBe('landscape-primary');
    expect(getLiveGameOrientationPolicy('android', false)).toBe('landscape-primary');
  });

  it('uses the same fixed landscape policy on tablets', () => {
    expect(getLiveGameOrientationPolicy('ios', true)).toBe('landscape-primary');
  });

  it('locks the native screen for a live game and restores the device default afterwards', async () => {
    const landscapeRight = 4;
    const orientationModule = {
      OrientationLock: { LANDSCAPE_RIGHT: landscapeRight },
      lockAsync,
      unlockAsync,
    } as unknown as NonNullable<Parameters<typeof applyLiveGameOrientationLock>[2]>;

    await applyLiveGameOrientationLock(
      4,
      { platform: 'android', isPad: false },
      orientationModule,
    );
    expect(lockAsync).toHaveBeenCalledWith(landscapeRight);

    await clearLiveGameOrientationLock(orientationModule);
    expect(unlockAsync).toHaveBeenCalledOnce();
  });
});
