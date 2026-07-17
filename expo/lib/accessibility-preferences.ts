import AsyncStorage from '@react-native-async-storage/async-storage';

export const ACCESSIBILITY_PREFERENCES_KEY = 'phyrexian:accessibility:v1';

export type AccessibilityPreferences = {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
};

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  reducedMotion: true,
  highContrast: false,
  largeText: false,
};

export async function loadAccessibilityPreferences() {
  try {
    const raw = await AsyncStorage.getItem(ACCESSIBILITY_PREFERENCES_KEY);
    if (!raw) return DEFAULT_ACCESSIBILITY_PREFERENCES;
    return { ...DEFAULT_ACCESSIBILITY_PREFERENCES, ...JSON.parse(raw) } as AccessibilityPreferences;
  } catch {
    return DEFAULT_ACCESSIBILITY_PREFERENCES;
  }
}

export async function saveAccessibilityPreferences(value: AccessibilityPreferences) {
  await AsyncStorage.setItem(ACCESSIBILITY_PREFERENCES_KEY, JSON.stringify(value));
}
