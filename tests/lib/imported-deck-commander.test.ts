import { describe, expect, it } from 'vitest';
import {
  buildArchidektBatchCommanderSelections,
  getDefaultImportedCommanderOption,
  importedCommanderOptionsNeedImageRepair,
  isImportedCommanderOptionSelected,
  repairImportedCommanderOptions,
  resolveImportedCommanderAfterArtsLoad,
  resolveImportedDeckCommanderImage,
} from '@/lib/deck-importers';

const partnerDeck = {
  sourceUrl: 'https://archidekt.com/decks/123',
  name: 'Eirdu and Isilu - Double trouble',
  commander: 'Eirdu, Carrier of Dawn // Isilu, Carrier of Twilight',
  commanderImageUrl: 'https://example.com/eirdu.jpg',
  commanderOptions: [
    { name: 'Eirdu, Carrier of Dawn', imageUrl: 'https://example.com/eirdu.jpg', colorIdentity: ['W'] },
    { name: 'Isilu, Carrier of Twilight', imageUrl: 'https://example.com/isilu.jpg', colorIdentity: ['B'] },
  ],
  colorIdentity: ['W', 'B'],
};

const singleDeck = {
  sourceUrl: 'https://archidekt.com/decks/456',
  name: "Be'lakor army",
  commander: "Be'lakor, the Dark Master",
  commanderImageUrl: 'https://example.com/belakor.jpg',
  commanderOptions: [
    { name: "Be'lakor, the Dark Master", imageUrl: 'https://example.com/belakor.jpg', colorIdentity: ['B'] },
  ],
  colorIdentity: ['B'],
};

describe('imported deck commander selection', () => {
  it('defaults partner imports to the first commander option, not the combined label', () => {
    expect(getDefaultImportedCommanderOption(partnerDeck)).toEqual(partnerDeck.commanderOptions[0]);
  });

  it('does not highlight a partner option when the combined deck label is selected', () => {
    const brokenSelection = {
      name: partnerDeck.commander,
      imageUrl: partnerDeck.commanderImageUrl,
    };

    expect(isImportedCommanderOptionSelected(brokenSelection, partnerDeck.commanderOptions[0])).toBe(false);
    expect(isImportedCommanderOptionSelected(brokenSelection, partnerDeck.commanderOptions[1])).toBe(false);
  });

  it('highlights the active partner option after default selection', () => {
    const selected = getDefaultImportedCommanderOption(partnerDeck);

    expect(isImportedCommanderOptionSelected(selected, partnerDeck.commanderOptions[0])).toBe(true);
    expect(isImportedCommanderOptionSelected(selected, partnerDeck.commanderOptions[1])).toBe(false);
  });

  it('builds bulk Archidekt selections per deck url', () => {
    expect(buildArchidektBatchCommanderSelections([partnerDeck, singleDeck])).toEqual({
      [partnerDeck.sourceUrl]: partnerDeck.commanderOptions[0],
      [singleDeck.sourceUrl]: singleDeck.commanderOptions[0],
    });
  });

  it('keeps the current printing selected when arts include it', () => {
    const commander = partnerDeck.commanderOptions[0];
    const arts = [
      { imageUrl: 'https://example.com/eirdu.jpg' },
      { imageUrl: 'https://example.com/eirdu-alt.jpg' },
    ];

    expect(resolveImportedCommanderAfterArtsLoad(commander, arts)).toEqual({
      name: commander.name,
      imageUrl: commander.imageUrl,
      colorIdentity: commander.colorIdentity,
    });
  });

  it('falls back to the first Scryfall art when the current printing is not listed', () => {
    const commander = {
      name: 'Eirdu, Carrier of Dawn',
      imageUrl: 'https://archidekt.example/eirdu-print.jpg',
      colorIdentity: ['W'],
    };
    const arts = [
      { imageUrl: 'https://scryfall.example/eirdu-1.jpg' },
      { imageUrl: 'https://scryfall.example/eirdu-2.jpg' },
    ];

    expect(resolveImportedCommanderAfterArtsLoad(commander, arts)).toEqual({
      name: commander.name,
      imageUrl: 'https://archidekt.example/eirdu-print.jpg',
      colorIdentity: ['W'],
    });
  });

  it('uses the first art when the commander has no image yet', () => {
    const commander = {
      name: 'Eirdu, Carrier of Dawn',
      imageUrl: null,
      colorIdentity: ['W'],
    };
    const arts = [{ imageUrl: 'https://scryfall.example/eirdu-1.jpg' }];

    expect(resolveImportedCommanderAfterArtsLoad(commander, arts)).toEqual({
      name: commander.name,
      imageUrl: 'https://scryfall.example/eirdu-1.jpg',
      colorIdentity: ['W'],
    });
  });

  it('detects duplicate partner commander image URLs from stale imports', () => {
    const brokenOptions = [
      { name: 'Eirdu, Carrier of Dawn', imageUrl: 'https://example.com/same.jpg', colorIdentity: ['W'] },
      { name: 'Isilu, Carrier of Twilight', imageUrl: 'https://example.com/same.jpg', colorIdentity: ['B'] },
    ];

    expect(importedCommanderOptionsNeedImageRepair(brokenOptions)).toBe(true);
    expect(importedCommanderOptionsNeedImageRepair(partnerDeck.commanderOptions)).toBe(false);
  });

  it('resolves imported deck commander images with fallbacks before preserving the existing art', () => {
    const selected = { name: 'Volrath, the Shapestealer', imageUrl: null, colorIdentity: ['B'] };
    const deck = {
      commander: 'Volrath, the Shapestealer',
      commanderImageUrl: 'https://example.com/volrath-import.jpg',
      commanderOptions: [
        { name: 'Volrath, the Shapestealer', imageUrl: null, colorIdentity: ['B'] },
      ],
    };

    expect(resolveImportedDeckCommanderImage(selected, deck)).toBe('https://example.com/volrath-import.jpg');
    expect(resolveImportedDeckCommanderImage(selected, deck, {
      preserveImage: 'https://example.com/volrath-saved.jpg',
    })).toBe('https://example.com/volrath-import.jpg');
  });

  it('preserves the existing deck art on overwrite when the import has no image', () => {
    const selected = { ...partnerDeck.commanderOptions[1], imageUrl: null };
    const brokenDeck = {
      ...partnerDeck,
      commanderOptions: [
        { ...partnerDeck.commanderOptions[0], imageUrl: null },
        { ...partnerDeck.commanderOptions[1], imageUrl: null },
      ],
      commanderImageUrl: null,
    };

    expect(resolveImportedDeckCommanderImage(selected, brokenDeck, {
      preserveImage: 'https://example.com/isilu-saved.jpg',
    })).toBe('https://example.com/isilu-saved.jpg');
  });

  it('repairs duplicate partner commander image URLs per commander name', async () => {
    const brokenOptions = [
      { name: 'Eirdu, Carrier of Dawn', imageUrl: 'https://example.com/same.jpg', colorIdentity: ['W'] },
      { name: 'Isilu, Carrier of Twilight', imageUrl: 'https://example.com/same.jpg', colorIdentity: ['B'] },
    ];

    const repaired = await repairImportedCommanderOptions(
      brokenOptions,
      async (name) => (
        name === 'Eirdu, Carrier of Dawn'
          ? 'https://example.com/eirdu.jpg'
          : 'https://example.com/isilu.jpg'
      ),
    );

    expect(repaired[0]?.imageUrl).toBe('https://example.com/eirdu.jpg');
    expect(repaired[1]?.imageUrl).toBe('https://example.com/isilu.jpg');
  });
});