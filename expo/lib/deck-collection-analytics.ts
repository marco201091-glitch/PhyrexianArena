import { getCommanderOptions, getDeckDisplayColors, type DeckColorRecord } from '@/lib/deck-metadata';
import { buildAverageStoredCommanderCmc } from '@/lib/deck-commander-cmc';
import { getPlayableManaColors, MANA_COLOR_ORDER } from '@/lib/mana-colors-core';

export interface DeckCollectionSnapshot extends DeckColorRecord {
  id: string;
  commander: string;
  bracket: string | null;
  commander_cmc?: number | string | null;
  source_type?: string | null;
}

export interface DeckCollectionColorStat {
  color: string;
  count: number;
  percentage: number;
}

export interface DeckCollectionCombinationStat {
  key: string;
  colors: string[];
  count: number;
  percentage: number;
}

export interface DeckCollectionSourceStat {
  source: string;
  count: number;
  percentage: number;
}

export interface DeckCollectionBracketStat {
  bracket: string;
  count: number;
  percentage: number;
}

export interface DeckCollectionAnalytics {
  deckCount: number;
  averageBracket: number | null;
  bracketKnownCount: number;
  averageColorCount: number | null;
  topColor: DeckCollectionColorStat | null;
  colorStats: DeckCollectionColorStat[];
  topCombination: DeckCollectionCombinationStat | null;
  combinationStats: DeckCollectionCombinationStat[];
  sourceStats: DeckCollectionSourceStat[];
  bracketStats: DeckCollectionBracketStat[];
}

function parseBracket(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSourceType(sourceType: string | null | undefined) {
  const normalized = (sourceType || 'manual').trim().toLowerCase();
  if (normalized === 'moxfield' || normalized === 'archidekt' || normalized === 'manual') {
    return normalized;
  }
  return 'other';
}

export function getDeckCommanderNames(deck: Pick<DeckCollectionSnapshot, 'commander' | 'commander_options'>) {
  const optionNames = getCommanderOptions(deck)
    .map((option) => option.name.trim())
    .filter(Boolean);

  if (optionNames.length > 0) {
    return Array.from(new Set(optionNames));
  }

  return deck.commander
    .split('//')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function buildDeckColorCombination(colors: string[]) {
  const normalized = MANA_COLOR_ORDER.filter((color) => colors.includes(color));
  const combination = normalized.length > 0 ? normalized : ['C'];
  return {
    key: combination.join('-'),
    colors: combination,
  };
}

export function buildDeckCollectionAnalytics(decks: DeckCollectionSnapshot[]): DeckCollectionAnalytics {
  const deckCount = decks.length;
  const colorMap = new Map<string, number>();
  const combinationMap = new Map<string, { colors: string[]; count: number }>();
  const sourceMap = new Map<string, number>();
  const bracketMap = new Map<string, number>();

  let bracketTotal = 0;
  let bracketKnownCount = 0;
  let colorCountTotal = 0;
  let colorCountSamples = 0;

  decks.forEach((deck) => {
    const bracket = parseBracket(deck.bracket);
    if (bracket != null) {
      bracketTotal += bracket;
      bracketKnownCount += 1;
      const bracketKey = String(bracket);
      bracketMap.set(bracketKey, (bracketMap.get(bracketKey) || 0) + 1);
    }

    const colors = getDeckDisplayColors(deck);
    const playableColors = getPlayableManaColors(colors);
    colorCountTotal += playableColors.length > 0 ? playableColors.length : 1;
    colorCountSamples += 1;

    colors.forEach((color) => {
      colorMap.set(color, (colorMap.get(color) || 0) + 1);
    });

    const combination = buildDeckColorCombination(colors);
    const currentCombination = combinationMap.get(combination.key) || { colors: combination.colors, count: 0 };
    combinationMap.set(combination.key, {
      colors: currentCombination.colors,
      count: currentCombination.count + 1,
    });

    const source = normalizeSourceType(deck.source_type);
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
  });

  const colorTotal = Array.from(colorMap.values()).reduce((sum, count) => sum + count, 0);
  const colorStats = MANA_COLOR_ORDER
    .map((color) => {
      const count = colorMap.get(color) || 0;
      return {
        color,
        count,
        percentage: colorTotal > 0 ? Math.round((count / colorTotal) * 100) : 0,
      };
    })
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);

  const combinationStats = Array.from(combinationMap.entries())
    .map(([key, entry]) => ({
      key,
      colors: entry.colors,
      count: entry.count,
      percentage: deckCount > 0 ? Math.round((entry.count / deckCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || b.colors.length - a.colors.length);

  const sourceStats = Array.from(sourceMap.entries())
    .map(([source, count]) => ({
      source,
      count,
      percentage: deckCount > 0 ? Math.round((count / deckCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const bracketStats = Array.from(bracketMap.entries())
    .map(([bracket, count]) => ({
      bracket,
      count,
      percentage: bracketKnownCount > 0 ? Math.round((count / bracketKnownCount) * 100) : 0,
    }))
    .sort((a, b) => Number.parseFloat(a.bracket) - Number.parseFloat(b.bracket));

  return {
    deckCount,
    averageBracket: bracketKnownCount > 0
      ? Math.round((bracketTotal / bracketKnownCount) * 10) / 10
      : null,
    bracketKnownCount,
    averageColorCount: colorCountSamples > 0
      ? Math.round((colorCountTotal / colorCountSamples) * 10) / 10
      : null,
    topColor: colorStats[0] || null,
    colorStats,
    topCombination: combinationStats[0] || null,
    combinationStats,
    sourceStats,
    bracketStats,
  };
}

export function buildAverageCommanderCmc(decks: DeckCollectionSnapshot[]) {
  return buildAverageStoredCommanderCmc(decks);
}
