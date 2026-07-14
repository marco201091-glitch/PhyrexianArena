import { beforeEach, describe, expect, it, vi } from 'vitest';

const setStatusBarHidden = vi.fn();

vi.mock('expo-status-bar', () => ({
  setStatusBarHidden,
}));

describe('live-game-immersive', () => {
  beforeEach(() => {
    setStatusBarHidden.mockClear();
  });

  it('hides only the status bar when live play starts', async () => {
    const { applyLiveGameImmersive } = await import('@/lib/live-game-immersive');
    applyLiveGameImmersive();
    expect(setStatusBarHidden).toHaveBeenCalledWith(true, 'fade');
  });

  it('restores the status bar when live play ends', async () => {
    const { clearLiveGameImmersive } = await import('@/lib/live-game-immersive');
    clearLiveGameImmersive();
    expect(setStatusBarHidden).toHaveBeenCalledWith(false, 'fade');
  });
});