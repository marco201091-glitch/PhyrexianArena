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

export async function applyLiveGameOrientationLock(_playerCount: number): Promise<void> {
  const orientationModule = getScreenOrientationModule();
  if (!orientationModule) return;

  try {
    await orientationModule.lockAsync(orientationModule.OrientationLock.PORTRAIT_UP);
  } catch {
    // Native module missing until the dev client is rebuilt.
  }
}

export async function clearLiveGameOrientationLock(): Promise<void> {
  const orientationModule = getScreenOrientationModule();
  if (!orientationModule) return;

  try {
    await orientationModule.unlockAsync();
  } catch {
    // ignore
  }
}
