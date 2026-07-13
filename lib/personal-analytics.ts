import { getDeckDisplayColors } from '@/lib/deck-metadata';

export interface PersonalDeckSnapshot {
  id: string;
  name: string;
  commander: string;
  commander_image: string | null;
  color_identity: string[] | null;
  bracket?: string | null;
  source_type: string | null;
  source_url: string | null;
  ownerUsername?: string | null;
}

export interface PersonalDeckAnalytics {
  id: string;
  name: string;
  commander: string;
  commanderImage: string | null;
  ownerUsername?: string | null;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  colors: string[];
}

export interface BracketWinStat {
  bracket: string;
  wins: number;
}

export interface ColorWinStat {
  color: string;
  gamesPlayed: number;
  wins: number;
  winRate: number;
}

export interface PersonalAnalytics {
  gamesPlayed: number;
  wins: number;
  uniqueDecks: number;
  topDecks: PersonalDeckAnalytics[];
  colorStats: Array<{ color: string; gamesPlayed: number; percentage: number }>;
  bracketWins: BracketWinStat[];
  colorWinStats: ColorWinStat[];
  longestWinStreak: number;
  currentWinStreak: number;
  bestDeck: PersonalDeckAnalytics | null;
}

export interface PersonalMatchParticipantRow {
  is_winner: boolean;
  deck_id: string;
  played_at?: string | null;
}

export interface DeckWinRateSnapshot {
  gamesPlayed: number;
  wins: number;
  winRate: number;
}

export const PERSONAL_BEST_DECK_MIN_GAMES = 3;

export function emptyPersonalAnalytics(): PersonalAnalytics {
  return {
    gamesPlayed: 0,
    wins: 0,
    uniqueDecks: 0,
    topDecks: [],
    colorStats: [],
    bracketWins: [],
    colorWinStats: [],
    longestWinStreak: 0,
    currentWinStreak: 0,
    bestDeck: null,
  };
}

export function buildDeckWinRateMap(
  participants: PersonalMatchParticipantRow[],
): Map<string, DeckWinRateSnapshot> {
  const deckMap = new Map<string, DeckWinRateSnapshot>();

  participants.forEach((row) => {
    if (!row.deck_id) return;

    const current = deckMap.get(row.deck_id) || { gamesPlayed: 0, wins: 0, winRate: 0 };
    current.gamesPlayed += 1;
    if (row.is_winner) current.wins += 1;
    current.winRate = current.gamesPlayed > 0
      ? Math.round((current.wins / current.gamesPlayed) * 100)
      : 0;
    deckMap.set(row.deck_id, current);
  });

  return deckMap;
}

export function resolveDeckColorsForAnalytics(
  deck: PersonalDeckSnapshot,
  colorOverrides: Map<string, string[]>,
) {
  const override = colorOverrides.get(deck.id);
  if (override && override.length > 0) return override;
  return getDeckDisplayColors(deck);
}

export function calculateWinStreaks(outcomes: boolean[]) {
  let longest = 0;
  let run = 0;

  outcomes.forEach((won) => {
    if (won) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  });

  let current = 0;
  for (let index = outcomes.length - 1; index >= 0; index -= 1) {
    if (!outcomes[index]) break;
    current += 1;
  }

  return { longest, current };
}

function sortParticipantsChronologically(participants: PersonalMatchParticipantRow[]) {
  return [...participants].sort((left, right) => {
    const leftTime = left.played_at ? Date.parse(left.played_at) : 0;
    const rightTime = right.played_at ? Date.parse(right.played_at) : 0;
    if (leftTime !== rightTime) return leftTime - rightTime;
    return 0;
  });
}

export function buildPersonalAnalytics(
  participants: PersonalMatchParticipantRow[],
  decksById: Map<string, PersonalDeckSnapshot>,
  colorOverrides: Map<string, string[]> = new Map(),
): PersonalAnalytics {
  const deckMap = new Map<string, PersonalDeckAnalytics>();
  const colorMap = new Map<string, number>();
  const colorWinMap = new Map<string, { gamesPlayed: number; wins: number }>();
  const bracketWinMap = new Map<string, number>();

  participants.forEach((row) => {
    if (!row.deck_id) return;

    const deck = decksById.get(row.deck_id);
    if (!deck) return;

    const colors = resolveDeckColorsForAnalytics(deck, colorOverrides);
    const current = deckMap.get(deck.id) || {
      id: deck.id,
      name: deck.name,
      commander: deck.commander,
      commanderImage: deck.commander_image,
      ownerUsername: deck.ownerUsername ?? null,
      gamesPlayed: 0,
      wins: 0,
      winRate: 0,
      colors,
    };

    current.gamesPlayed += 1;
    if (row.is_winner) current.wins += 1;
    current.colors = colors;
    deckMap.set(deck.id, current);

    colors.forEach((color) => {
      colorMap.set(color, (colorMap.get(color) || 0) + 1);
      const colorEntry = colorWinMap.get(color) || { gamesPlayed: 0, wins: 0 };
      colorEntry.gamesPlayed += 1;
      if (row.is_winner) colorEntry.wins += 1;
      colorWinMap.set(color, colorEntry);
    });

    if (row.is_winner && deck.bracket) {
      bracketWinMap.set(deck.bracket, (bracketWinMap.get(deck.bracket) || 0) + 1);
    }
  });

  const playedDecks = Array.from(deckMap.values())
    .map((deck) => ({
      ...deck,
      winRate: deck.gamesPlayed > 0 ? Math.round((deck.wins / deck.gamesPlayed) * 100) : 0,
    }))
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed || b.wins - a.wins || b.winRate - a.winRate);

  const topDecks = playedDecks.slice(0, 10);
  const gamesPlayed = playedDecks.reduce((total, deck) => total + deck.gamesPlayed, 0);
  const wins = playedDecks.reduce((total, deck) => total + deck.wins, 0);
  const colorTotal = Array.from(colorMap.values()).reduce((total, count) => total + count, 0);
  const colorStats = Array.from(colorMap.entries())
    .map(([color, count]) => ({
      color,
      gamesPlayed: count,
      percentage: colorTotal > 0 ? Math.round((count / colorTotal) * 100) : 0,
    }))
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed);

  const colorWinStats = Array.from(colorWinMap.entries())
    .map(([color, stats]) => ({
      color,
      gamesPlayed: stats.gamesPlayed,
      wins: stats.wins,
      winRate: stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins || b.gamesPlayed - a.gamesPlayed);

  const bracketWins = Array.from(bracketWinMap.entries())
    .map(([bracket, winCount]) => ({ bracket, wins: winCount }))
    .sort((a, b) => b.wins - a.wins || a.bracket.localeCompare(b.bracket, undefined, { numeric: true }));

  const chronologicalParticipants = sortParticipantsChronologically(participants)
    .filter((row) => row.deck_id && decksById.has(row.deck_id));
  const hasChronologicalData = chronologicalParticipants.length > 0
    && chronologicalParticipants.every((row) => row.played_at);
  const { longest: longestWinStreak, current: currentWinStreak } = hasChronologicalData
    ? calculateWinStreaks(chronologicalParticipants.map((row) => row.is_winner))
    : { longest: 0, current: 0 };

  const bestDeck = playedDecks
    .filter((deck) => deck.gamesPlayed >= PERSONAL_BEST_DECK_MIN_GAMES)
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins || b.gamesPlayed - a.gamesPlayed)[0] || null;

  return {
    gamesPlayed,
    wins,
    uniqueDecks: deckMap.size,
    topDecks,
    colorStats,
    bracketWins,
    colorWinStats,
    longestWinStreak,
    currentWinStreak,
    bestDeck,
  };
}