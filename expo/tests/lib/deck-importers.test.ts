import { describe, expect, it } from 'vitest';
import {
  buildArchidektBatchCommanderSelections,
  getDefaultImportedCommanderOption,
  importedCommanderOptionsNeedImageRepair,
  isImportedCommanderOptionSelected,
  repairImportedCommanderOptions,
  resolveImportedCommanderAfterArtsLoad,
} from '@/lib/deck-importers';

const partnerDeck = {
  sourceUrl: 'https://archidekt.com/decks/123',
  commander: 'Eirdu, Carrier of Dawn // Isilu, Carrier of Twilight',
  commanderImageUrl: 'https://example.com/eirdu.jpg',
  commanderOptions: [
    { name: 'Eirdu, Carrier of Dawn', imageUrl: 'https://example.com/eirdu.jpg', colorIdentity: ['W'] },
    { name: 'Isilu, Carrier of Twilight', imageUrl: 'https://example.com/isilu.jpg', colorIdentity: ['B'] },
  ],
  colorIdentity: ['W', 'B'],
};

describe('expo deck-importers commander helpers', () => {
  it('defaults partner imports to the first commander option', () => {
    expect(getDefaultImportedCommanderOption(partnerDeck)).toEqual(partnerDeck.commanderOptions[0]);
  });

  it('rejects the old combined-label selection bug in bulk Archidekt imports', () => {
    const brokenSelection = {
      name: partnerDeck.commander,
      imageUrl: partnerDeck.commanderImageUrl,
    };

    expect(isImportedCommanderOptionSelected(brokenSelection, partnerDeck.commanderOptions[0])).toBe(false);
    expect(buildArchidektBatchCommanderSelections([partnerDeck])).toEqual({
      [partnerDeck.sourceUrl]: partnerDeck.commanderOptions[0],
    });
  });

  it('preserves the selected printing after art lookup', () => {
    const commander = partnerDeck.commanderOptions[1];
    const arts = [
      { imageUrl: 'https://example.com/isilu.jpg' },
      { imageUrl: 'https://example.com/isilu-alt.jpg' },
    ];

    expect(resolveImportedCommanderAfterArtsLoad(commander, arts)).toEqual(commander);
  });

  it('repairs duplicate commander image URLs from stale Archidekt imports', async () => {
    const brokenOptions = [
      { name: 'Eirdu, Carrier of Dawn', imageUrl: 'https://example.com/same.jpg', colorIdentity: ['W'] },
      { name: 'Isilu, Carrier of Twilight', imageUrl: 'https://example.com/same.jpg', colorIdentity: ['B'] },
    ];

    expect(importedCommanderOptionsNeedImageRepair(brokenOptions)).toBe(true);

    const repaired = await repairImportedCommanderOptions(
      brokenOptions,
      async (name) => (
        name === 'Eirdu, Carrier of Dawn'
          ? 'https://example.com/eirdu.jpg'
          : 'https://example.com/isilu.jpg'
      ),
    );

    expect(repaired[1]?.imageUrl).toBe('https://example.com/isilu.jpg');
  });
});