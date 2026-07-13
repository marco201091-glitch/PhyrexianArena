import {
  buildDeckColorFields,
  deckHasColorIdentity,
  finalizeDeckColorIdentity,
  getCommanderOptions,
  mergeCommanderOptionColors,
  mergeDeckColorFields,
  normalizeDeckColorIdentity,
  type CommanderMetadataOption,
  type DeckColorRecord,
} from '@/lib/deck-metadata';
import { deckDataToColorFields } from '@/lib/deck-importers';
import { delay } from '@/lib/async-utils';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

const SCRYFALL_REQUEST_GAP_MS = 120;

export interface DeckColorSyncTarget extends DeckColorRecord {
  id: string;
  user_id: string;
  commander: string;
  source_type: string | null;
  source_url: string | null;
}

export interface DeckCommanderColorTarget {
  id: string;
  commander: string;
  source_type: string | null;
  source_url: string | null;
  color_identity?: string[] | null;
}

export function expandDeckCommanderNames(commander: string) {
  return Array.from(new Set(
    commander
      .split('//')
      .flatMap((part) => part.split('/').map((name) => name.trim()))
      .filter(Boolean)
  ));
}

async function lookupCommanderFromBrowser(name: string) {
  const queryText = name.trim().replace(/"/g, '');
  if (!queryText) return null;

  const request = (path: 'exact' | 'fuzzy') => fetch(
    `https://api.scryfall.com/cards/named?${path}=${encodeURIComponent(queryText)}`,
    { headers: { Accept: 'application/json' } }
  );

  const exactResponse = await request('exact');
  if (exactResponse.ok) {
    const card = await exactResponse.json() as { id: string; name: string; color_identity?: string[]; image_uris?: { art_crop?: string } };
    return {
      name: card.name,
      imageUrl: card.image_uris?.art_crop || null,
      colorIdentity: normalizeDeckColorIdentity(card.color_identity),
    };
  }

  const fuzzyResponse = await request('fuzzy');
  if (!fuzzyResponse.ok) return null;

  const card = await fuzzyResponse.json() as { id: string; name: string; color_identity?: string[]; image_uris?: { art_crop?: string } };
  return {
    name: card.name,
    imageUrl: card.image_uris?.art_crop || null,
    colorIdentity: normalizeDeckColorIdentity(card.color_identity),
  };
}

function uniqueCommanderOptions(options: CommanderMetadataOption[]) {
  return options.filter((option, index, allOptions) =>
    option.name &&
    allOptions.findIndex((candidate) => candidate.name.toLowerCase() === option.name.toLowerCase()) === index
  );
}

export async function resolveCommanderColorOptions(
  commander: string,
  existingOptions: CommanderMetadataOption[] = []
) {
  const commanderNames = expandDeckCommanderNames(commander);
  const resolved: CommanderMetadataOption[] = [];

  for (const name of commanderNames) {
    const existing = existingOptions.find((option) => option.name.toLowerCase() === name.toLowerCase());
    if (existing?.colorIdentity && existing.colorIdentity.length > 0) {
      resolved.push(existing);
      continue;
    }

    const match = await lookupCommanderFromBrowser(name);
    resolved.push(match ? {
      name: match.name,
      imageUrl: existing?.imageUrl ?? match.imageUrl,
      colorIdentity: match.colorIdentity,
    } : (existing || { name, imageUrl: null, colorIdentity: [] }));

    await delay(SCRYFALL_REQUEST_GAP_MS);
  }

  return uniqueCommanderOptions(resolved.filter((option) => option.name));
}

export function deckNeedsColorMetadata(deck: DeckColorRecord) {
  return !deckHasColorIdentity(deck);
}

export async function resolveDeckColorFields(deck: DeckColorSyncTarget) {
  if (deckHasColorIdentity(deck)) {
    return mergeDeckColorFields(deck, getCommanderOptions(deck));
  }

  if ((deck.source_type === 'archidekt' || deck.source_type === 'moxfield') && deck.source_url) {
    const response = await authenticatedFetch('/api/deck-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: deck.source_url }),
    });

    if (response.ok) {
      const imported = await response.json() as {
        commanderOptions?: CommanderMetadataOption[];
        colorIdentity?: string[];
      };
      return deckDataToColorFields({
        commanderOptions: imported.commanderOptions || [],
        colorIdentity: imported.colorIdentity || [],
      });
    }
  }

  if (deck.commander.trim()) {
    const commanderOptions = await resolveCommanderColorOptions(
      deck.commander,
      getCommanderOptions(deck)
    );
    return buildDeckColorFields(commanderOptions);
  }

  return null;
}

export async function resolveDeckCommanderColors(deck: DeckCommanderColorTarget): Promise<string[] | null> {
  if (deck.color_identity?.length) {
    return finalizeDeckColorIdentity(deck.color_identity);
  }

  if ((deck.source_type === 'archidekt' || deck.source_type === 'moxfield') && deck.source_url) {
    try {
      const response = await authenticatedFetch('/api/deck-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: deck.source_url }),
      });

      if (response.ok) {
        const imported = await response.json() as {
          commanderOptions?: CommanderMetadataOption[];
          colorIdentity?: string[];
        };
        const colors = finalizeDeckColorIdentity([
          ...(imported.colorIdentity || []),
          ...mergeCommanderOptionColors(imported.commanderOptions),
        ]);
        if (colors.length > 0) return colors;
      }
    } catch {
      // Fall back to Scryfall lookup below.
    }
  }

  if (!deck.commander.trim()) return null;

  const commanderOptions = await resolveCommanderColorOptions(deck.commander);
  const colors = finalizeDeckColorIdentity(mergeCommanderOptionColors(commanderOptions));
  return colors.length > 0 ? colors : null;
}

export async function syncDeckCommanderColors(
  decks: DeckCommanderColorTarget[],
  existingColors: Record<string, string[]> = {},
  maxDecks = decks.length,
) {
  const resolved = new Map<string, string[]>();
  const decksToSync = decks.slice(0, Math.max(0, maxDecks));

  for (const deck of decksToSync) {
    const cached = existingColors[deck.id];
    if (cached && cached.length > 0) {
      resolved.set(deck.id, cached);
      continue;
    }

    if (!deck.commander.trim() && !deck.color_identity?.length) continue;

    try {
      const colors = await resolveDeckCommanderColors(deck);
      if (colors && colors.length > 0) {
        resolved.set(deck.id, colors);
      }
    } catch {
      // Continue with the remaining decks.
    }

    await delay(SCRYFALL_REQUEST_GAP_MS);
  }

  return resolved;
}

export async function syncDecksColorMetadata(
  decks: DeckColorSyncTarget[],
  persistUpdate?: (deckId: string, fields: Pick<DeckColorRecord, 'color_identity' | 'commander_options'>) => Promise<boolean>,
) {
  const resolved = new Map<string, Pick<DeckColorRecord, 'color_identity' | 'commander_options'>>();

  for (const deck of decks) {
    if (!deckNeedsColorMetadata(deck)) continue;

    try {
      const fields = await resolveDeckColorFields(deck);
      if (!fields || !deckHasColorIdentity(fields)) continue;

      resolved.set(deck.id, fields);

      if (persistUpdate) {
        await persistUpdate(deck.id, fields);
      }
    } catch {
      // Continue with the remaining decks.
    }

    await delay(SCRYFALL_REQUEST_GAP_MS);
  }

  return resolved;
}