import { getDeckCommanderNames } from '@/lib/deck-collection-analytics';
import type { DeckColorRecord } from '@/lib/deck-metadata';

export interface DeckCommanderCmcRecord {
  commander_cmc?: number | string | null;
}

export function parseStoredCommanderCmc(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function resolveCommanderCmcFromMap(commanderName: string, commanderCmcs: Record<string, number | null>) {
  const normalizedName = commanderName.trim().toLowerCase();
  if (normalizedName in commanderCmcs) {
    return commanderCmcs[normalizedName];
  }

  const matchedEntry = Object.entries(commanderCmcs).find(
    ([name]) => name.trim().toLowerCase() === normalizedName,
  );
  return matchedEntry?.[1] ?? null;
}

export function buildDeckCommanderCmcFromCmcs(
  deck: Pick<DeckColorRecord, 'commander_options'> & { commander: string },
  commanderCmcs: Record<string, number | null>,
): number | null {
  const names = getDeckCommanderNames(deck);
  if (names.length === 0) return null;

  const resolvedValues = names
    .map((name) => resolveCommanderCmcFromMap(name, commanderCmcs))
    .filter((value): value is number => value != null && Number.isFinite(value));

  if (resolvedValues.length === 0) return null;
  return Math.round((resolvedValues.reduce((sum, value) => sum + value, 0) / resolvedValues.length) * 10) / 10;
}

export function deckNeedsCommanderCmc(
  deck: DeckCommanderCmcRecord & { commander?: string | null },
) {
  return parseStoredCommanderCmc(deck.commander_cmc) == null && Boolean(deck.commander?.trim());
}

export function buildAverageStoredCommanderCmc(decks: DeckCommanderCmcRecord[]): number | null {
  const values = decks
    .map((deck) => parseStoredCommanderCmc(deck.commander_cmc))
    .filter((value): value is number => value != null);

  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export async function resolveDeckCommanderCmc(
  deck: Pick<DeckColorRecord, 'commander_options'> & { commander: string },
  lookup: (name: string) => Promise<number | null>,
): Promise<number | null> {
  const names = getDeckCommanderNames(deck);
  if (names.length === 0) return null;

  const commanderCmcs: Record<string, number | null> = {};
  for (const name of names) {
    commanderCmcs[name] = await lookup(name);
  }

  return buildDeckCommanderCmcFromCmcs(deck, commanderCmcs);
}