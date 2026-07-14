import { getTableOrientation } from '@/lib/live-game-table-layout';

type ScreenOrientationModule = typeof import('expo-screen-orientation');

let cachedModule: ScreenOrientationModule | null | undefined;

function getScreenOrientationModule(): ScreenOrientationModule | null {
  if (cachedModule !== undefined) return cachedModule;
  try {
    // Lazy require so play.tsx still loads when native code is not linked yet.
    cachedModule = require('expo-screen-orientation') as ScreenOrientationModule;
    return cachedModule;
  } catch {
    cachedModule = null;
    return null;
  }
}

export async function applyLiveGameOrientationLock(playerCount: number): Promise<void> {
  const module = getScreenOrientationModule();
  if (!module) return;

  try {
    const orientation = getTableOrientation(playerCount);
    const lock = orientation === 'portrait'
      ? module.OrientationLock.PORTRAIT_UP
      : module.OrientationLock.LANDSCAPE;
    await module.lockAsync(lock);
  } catch {
    // Native module missing until the dev client is rebuilt.
  }
}

export async function clearLiveGameOrientationLock(): Promise<void> {
  const module = getScreenOrientationModule();
  if (!module) return;

  try {
    await module.unlockAsync();
  } catch {
    // ignore
  }
}