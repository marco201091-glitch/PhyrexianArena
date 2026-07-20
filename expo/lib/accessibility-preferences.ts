import AsyncStorage from '@react-native-async-storage/async-storage';

export const ACCESSIBILITY_PREFERENCES_KEY = 'phyrexian:accessibility:v1';

export type AccessibilityPreferences = {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
};

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  reducedMotion: false,
  highContrast: false,
  largeText: false,
};

const ACCESSIBILITY_SCHEMA_VERSION = 2;
const accessibilityListeners = new Set<(value: AccessibilityPreferences) => void>();

export function normalizeAccessibilityPreferences(value: unknown): AccessibilityPreferences {
  if (!value || typeof value !== 'object') return DEFAULT_ACCESSIBILITY_PREFERENCES;
  const stored = value as Partial<AccessibilityPreferences> & { schemaVersion?: number };

  // v1 shipped with reduced motion enabled by mistake. Preserve the other
  // choices while migrating animation behavior to the intended default.
  if (stored.schemaVersion !== ACCESSIBILITY_SCHEMA_VERSION) {
    return {
      reducedMotion: false,
      highContrast: stored.highContrast === true,
      largeText: stored.largeText === true,
    };
  }

  return {
    reducedMotion: stored.reducedMotion === true,
    highContrast: stored.highContrast === true,
    largeText: stored.largeText === true,
  };
}

export async function loadAccessibilityPreferences() {
  try {
    const raw = await AsyncStorage.getItem(ACCESSIBILITY_PREFERENCES_KEY);
    if (!raw) return DEFAULT_ACCESSIBILITY_PREFERENCES;
    return normalizeAccessibilityPreferences(JSON.parse(raw));
  } catch {
    return DEFAULT_ACCESSIBILITY_PREFERENCES;
  }
}

export async function saveAccessibilityPreferences(value: AccessibilityPreferences) {
  await AsyncStorage.setItem(ACCESSIBILITY_PREFERENCES_KEY, JSON.stringify({
    schemaVersion: ACCESSIBILITY_SCHEMA_VERSION,
    ...value,
  }));
  accessibilityListeners.forEach((listener) => listener(value));
}

export function subscribeAccessibilityPreferences(
  listener: (value: AccessibilityPreferences) => void,
) {
  accessibilityListeners.add(listener);
  return () => accessibilityListeners.delete(listener);
}
