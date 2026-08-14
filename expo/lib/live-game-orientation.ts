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

export function getLiveGameOrientationPolicy(_platform: string, _isPad: boolean) {
  return 'landscape-primary';
}

export async function applyLiveGameOrientationLock(
  _playerCount: number,
  device: { platform?: string; isPad?: boolean } = {},
  moduleOverride?: ScreenOrientationApi,
): Promise<void> {
  const orientationModule = moduleOverride ?? getScreenOrientationModule();
  if (!orientationModule) return;

  try {
    getLiveGameOrientationPolicy(device.platform ?? '', device.isPad ?? false);
    await orientationModule.lockAsync(orientationModule.OrientationLock.LANDSCAPE_RIGHT);
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
