import { describe, expect, it } from 'vitest';
import {
  buildCanonicalDeckSourceUrl,
  extractDeckId,
  getDefaultImportedCommanderOption,
  isImportedDeckSource,
} from '@/lib/deck-importers';

describe('deck-importers', () => {
  it('detects imported deck sources', () => {
    expect(isImportedDeckSource('archidekt')).toBe(true);
    expect(isImportedDeckSource('moxfield')).toBe(true);
    expect(isImportedDeckSource('manual')).toBe(false);
    expect(isImportedDeckSource(null)).toBe(false);
  });

  it('extracts Archidekt deck ids', () => {
    expect(extractDeckId('https://archidekt.com/decks/123456')).toEqual({
      source: 'archidekt',
      deckId: '123456',
    });
    expect(extractDeckId('https://archidekt.com/playtester-v2/789')).toEqual({
      source: 'archidekt',
      deckId: '789',
    });
  });

  it('extracts Moxfield deck ids', () => {
    expect(extractDeckId('https://www.moxfield.com/decks/abc_12-XY')).toEqual({
      source: 'moxfield',
      deckId: 'abc_12-XY',
    });
  });

  it('builds canonical source urls', () => {
    expect(buildCanonicalDeckSourceUrl('archidekt', '42')).toBe('https://archidekt.com/decks/42');
    expect(buildCanonicalDeckSourceUrl('moxfield', 'deck-id')).toBe('https://www.moxfield.com/decks/deck-id');
  });

  it('returns null for unsupported urls', () => {
    expect(extractDeckId('https://example.com/decks/1')).toBeNull();
  });

  it('defaults imported commander selection to the first option', () => {
    const deck = {
      commander: 'Eirdu, Carrier of Dawn // Isilu, Carrier of Twilight',
      commanderImageUrl: 'https://example.com/eirdu.jpg',
      commanderOptions: [
        { name: 'Eirdu, Carrier of Dawn', imageUrl: 'https://example.com/eirdu.jpg', colorIdentity: ['W'] },
        { name: 'Isilu, Carrier of Twilight', imageUrl: 'https://example.com/isilu.jpg', colorIdentity: ['B'] },
      ],
      colorIdentity: ['W', 'B'],
    };

    expect(getDefaultImportedCommanderOption(deck)).toEqual(deck.commanderOptions[0]);
  });

  it('falls back to deck commander when no options exist', () => {
    const deck = {
      commander: "Be'lakor, the Dark Master",
      commanderImageUrl: 'https://example.com/belakor.jpg',
      commanderOptions: [],
      colorIdentity: ['B'],
    };

    expect(getDefaultImportedCommanderOption(deck)).toEqual({
      name: "Be'lakor, the Dark Master",
      imageUrl: 'https://example.com/belakor.jpg',
      colorIdentity: ['B'],
    });
  });
});