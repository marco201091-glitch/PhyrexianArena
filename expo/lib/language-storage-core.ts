import type { AppLanguage } from '@/lib/i18n/types';

export const LANGUAGE_STORAGE_KEY = 'phyrexian-arena-language';
export const LEGACY_LANGUAGE_STORAGE_KEY = 'phyrexian_app_language';

export type LanguageStorageDriver = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export function isAppLanguage(value: string | null): value is AppLanguage {
  return value === 'it' || value === 'en';
}

export async function readLanguagePreference(
  driver: LanguageStorageDriver,
): Promise<AppLanguage | null> {
  try {
    const current = await driver.getItem(LANGUAGE_STORAGE_KEY);
    if (isAppLanguage(current)) return current;

    const legacy = await driver.getItem(LEGACY_LANGUAGE_STORAGE_KEY);
    if (!isAppLanguage(legacy)) return null;

    await driver.setItem(LANGUAGE_STORAGE_KEY, legacy);
    await driver.removeItem(LEGACY_LANGUAGE_STORAGE_KEY);
    return legacy;
  } catch {
    return null;
  }
}

export async function writeLanguagePreference(
  driver: LanguageStorageDriver,
  language: AppLanguage,
): Promise<void> {
  try {
    await driver.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // A storage failure must never prevent changing language in the current session.
  }
}
