import { describe, expect, it } from 'vitest';
import {
  buildScryfallArtSearchUrl,
  buildScryfallCommanderSearchUrl,
  extractScryfallImageForName,
} from '@/lib/scryfall-search';

describe('scryfall-search', () => {
  it('builds a commander search URL for partial names', () => {
    const url = buildScryfallCommanderSearchUrl('tymna');
    expect(url).toContain('api.scryfall.com/cards/search');
    expect(decodeURIComponent(url || '')).toContain('tymna');
    expect(decodeURIComponent(url || '')).toContain('is:commander');
  });

  it('returns null for very short queries', () => {
    expect(buildScryfallCommanderSearchUrl('a')).toBeNull();
  });

  it('adds partner mode filters to the query', () => {
    const url = buildScryfallCommanderSearchUrl('thrasios', 'partner');
    expect(decodeURIComponent(url || '')).toContain('o:partner');
  });

  it('builds an exact-art search URL for commander printings', () => {
    const url = buildScryfallArtSearchUrl('Tymna the Weaver');
    expect(url).toContain('api.scryfall.com/cards/search');
    expect(decodeURIComponent(url || '')).toContain('!"Tymna the Weaver"');
    expect(url).toContain('unique=art');
  });

  it('selects the matching face art for a double-faced commander', () => {
    const card = {
      id: 'eirdu-isilu',
      name: 'Eirdu, Carrier of Dawn // Isilu, Carrier of Twilight',
      card_faces: [
        { name: 'Eirdu, Carrier of Dawn', image_uris: { art_crop: 'https://img/eirdu.jpg' } },
        { name: 'Isilu, Carrier of Twilight', image_uris: { art_crop: 'https://img/isilu.jpg' } },
      ],
    };

    expect(extractScryfallImageForName(card, 'Eirdu, Carrier of Dawn')).toBe('https://img/eirdu.jpg');
    expect(extractScryfallImageForName(card, 'Isilu, Carrier of Twilight')).toBe('https://img/isilu.jpg');
  });
});
