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

  it('keeps phone live-game layouts portrait', () => {
    expect(getLiveGameOrientationPolicy('ios', false)).toBe('portrait');
    expect(getLiveGameOrientationPolicy('android', false)).toBe('portrait');
  });

  it('keeps the previous unlocked iPad behavior', () => {
    expect(getLiveGameOrientationPolicy('ios', true)).toBe('unlocked');
  });

  it('locks a four-player phone game to portrait and restores the device default afterwards', async () => {
    const portraitUp = 1;
    const orientationModule = {
      OrientationLock: { PORTRAIT_UP: portraitUp },
      lockAsync,
      unlockAsync,
    } as unknown as NonNullable<Parameters<typeof applyLiveGameOrientationLock>[2]>;

    await applyLiveGameOrientationLock(
      4,
      { platform: 'android', isPad: false },
      orientationModule,
    );
    expect(lockAsync).toHaveBeenCalledWith(portraitUp);

    await clearLiveGameOrientationLock(orientationModule);
    expect(unlockAsync).toHaveBeenCalledOnce();
  });

  it('does not force an orientation on iPad', async () => {
    const orientationModule = {
      OrientationLock: { PORTRAIT_UP: 1 },
      lockAsync,
      unlockAsync,
    } as unknown as NonNullable<Parameters<typeof applyLiveGameOrientationLock>[2]>;

    await applyLiveGameOrientationLock(
      4,
      { platform: 'ios', isPad: true },
      orientationModule,
    );

    expect(lockAsync).not.toHaveBeenCalled();
    expect(unlockAsync).toHaveBeenCalledOnce();
  });
});
