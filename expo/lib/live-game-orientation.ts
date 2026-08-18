type ScreenOrientationModule = typeof import('expo-screen-orientation');
type ScreenOrientationApi = Pick<ScreenOrientationModule, 'OrientationLock' | 'lockAsync' | 'unlockAsync'>;

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

export function getLiveGameOrientationPolicy(platform: string, isPad: boolean) {
  return platform === 'ios' && isPad ? 'unlocked' : 'portrait';
}

export async function applyLiveGameOrientationLock(
  _playerCount: number,
  device: { platform?: string; isPad?: boolean } = {},
  moduleOverride?: ScreenOrientationApi,
): Promise<void> {
  const orientationModule = moduleOverride ?? getScreenOrientationModule();
  if (!orientationModule) return;

  try {
    if (getLiveGameOrientationPolicy(device.platform ?? '', device.isPad ?? false) === 'unlocked') {
      await orientationModule.unlockAsync();
      return;
    }
    await orientationModule.lockAsync(orientationModule.OrientationLock.PORTRAIT_UP);
  } catch {
    // Native module missing until the dev client is rebuilt.
  }
}

export async function clearLiveGameOrientationLock(
  moduleOverride?: ScreenOrientationApi,
): Promise<void> {
  const orientationModule = moduleOverride ?? getScreenOrientationModule();
  if (!orientationModule) return;

  try {
    await orientationModule.unlockAsync();
  } catch {
    // ignore
  }
}
