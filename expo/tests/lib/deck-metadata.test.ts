import { describe, expect, it } from 'vitest';
import {
  buildDeckColorFields,
  deckHasColorIdentity,
  filterSelectableCommanderOptions,
  finalizeDeckColorIdentity,
  getDeckDisplayColors,
  mergeDeckColorFields,
  normalizeDeckColorIdentity,
  resolveSelectedCommanderOption,
} from '@/lib/deck-metadata';

describe('deck metadata', () => {
  it('normalizes names, aliases, duplicates, invalid values, and colorless', () => {
    expect(normalizeDeckColorIdentity(['blue', 'U', ' green ', 'invalid', null])).toEqual(['U', 'G']);
    expect(finalizeDeckColorIdentity(['C', 'R'])).toEqual(['R']);
    expect(finalizeDeckColorIdentity([])).toEqual(['C']);
  });

  it('hides a combined partner label only when both individuals exist', () => {
    const options = filterSelectableCommanderOptions([
      { name: 'Tymna', imageUrl: 't' },
      { name: 'Tymna // Kraum', imageUrl: 'both' },
      { name: 'Kraum', imageUrl: 'k' },
      { name: ' tymna ', imageUrl: 'duplicate' },
    ]);
    expect(options.map((option) => option.name)).toEqual(['Tymna', 'Kraum']);

    expect(filterSelectableCommanderOptions([
      { name: 'Front // Back', imageUrl: 'dfc' },
      { name: 'Front', imageUrl: 'front' },
    ])).toHaveLength(2);
  });

  it('resolves exact, image, part, and first-option fallbacks', () => {
    const options = [{ name: 'Tymna', imageUrl: 't' }, { name: 'Kraum', imageUrl: 'k' }];
    expect(resolveSelectedCommanderOption(options, 'KRAUM')?.name).toBe('Kraum');
    expect(resolveSelectedCommanderOption(options, 'Tymna // Kraum', 'k')?.name).toBe('Kraum');
    expect(resolveSelectedCommanderOption(options, 'Tymna // Missing')?.name).toBe('Tymna');
    expect(resolveSelectedCommanderOption(options, 'Unknown')?.name).toBe('Tymna');
    expect(resolveSelectedCommanderOption([], 'Unknown')).toBeNull();
  });

  it('derives display colors and preserves explicit stored identity', () => {
    const derived = { commander_options: [
      { name: 'A', imageUrl: null, colorIdentity: ['W', 'C'] },
      { name: 'B', imageUrl: null, colorIdentity: ['U'] },
    ] };
    expect(deckHasColorIdentity(derived)).toBe(true);
    expect(getDeckDisplayColors(derived)).toEqual(['W', 'U']);
    expect(getDeckDisplayColors({ color_identity: ['R'], ...derived })).toEqual(['R']);
    expect(getDeckDisplayColors({})).toEqual([]);
  });

  it('builds and merges serializable color fields without losing known colors', () => {
    const options = [{ name: 'Partner', imageUrl: null, colorIdentity: ['U'] }];
    expect(buildDeckColorFields(options, ['R'])).toEqual({
      color_identity: ['R', 'U'], commander_options: options,
    });
    expect(buildDeckColorFields(undefined)).toEqual({ color_identity: ['C'], commander_options: null });
    expect(mergeDeckColorFields({ color_identity: ['G'] }, options)).toEqual({
      color_identity: ['G', 'U'], commander_options: options,
    });
  });
});
