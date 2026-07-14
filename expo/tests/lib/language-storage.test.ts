import { describe, expect, it, vi } from 'vitest';
import {
  LANGUAGE_STORAGE_KEY,
  LEGACY_LANGUAGE_STORAGE_KEY,
  readLanguagePreference,
  writeLanguagePreference,
} from '@/lib/language-storage-core';

function createDriver(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    driver: {
      getItem: vi.fn(async (key: string) => values.get(key) ?? null),
      setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
      removeItem: vi.fn(async (key: string) => { values.delete(key); }),
    },
  };
}

describe('language storage', () => {
  it('reads the canonical language preference', async () => {
    const { driver } = createDriver({ [LANGUAGE_STORAGE_KEY]: 'it' });
    await expect(readLanguagePreference(driver)).resolves.toBe('it');
    expect(driver.getItem).toHaveBeenCalledTimes(1);
  });

  it('migrates the legacy preference without losing it', async () => {
    const { driver, values } = createDriver({ [LEGACY_LANGUAGE_STORAGE_KEY]: 'en' });
    await expect(readLanguagePreference(driver)).resolves.toBe('en');
    expect(values.get(LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(values.has(LEGACY_LANGUAGE_STORAGE_KEY)).toBe(false);
  });

  it('falls back safely when storage is unavailable', async () => {
    const unavailable = {
      getItem: vi.fn(async () => { throw new Error('unavailable'); }),
      setItem: vi.fn(async () => { throw new Error('unavailable'); }),
      removeItem: vi.fn(async () => { throw new Error('unavailable'); }),
    };
    await expect(readLanguagePreference(unavailable)).resolves.toBeNull();
    await expect(writeLanguagePreference(unavailable, 'it')).resolves.toBeUndefined();
  });
});
