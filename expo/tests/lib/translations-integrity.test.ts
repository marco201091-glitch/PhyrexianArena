import { describe, expect, it } from 'vitest';
import { translations } from '@/lib/i18n/translations';

describe('translations integrity', () => {
  it('keeps Italian and English keysets identical and non-empty', () => {
    const englishKeys = Object.keys(translations.en).sort();
    const italianKeys = Object.keys(translations.it).sort();
    expect(italianKeys).toEqual(englishKeys);
    for (const key of englishKeys) {
      expect(translations.en[key as keyof typeof translations.en].trim()).not.toBe('');
      expect(translations.it[key as keyof typeof translations.it].trim()).not.toBe('');
    }
  });
});
