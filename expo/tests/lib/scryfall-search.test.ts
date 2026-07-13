import { describe, expect, it } from 'vitest';
import { buildScryfallArtSearchUrl, buildScryfallCommanderSearchUrl } from '@/lib/scryfall-search';

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
});