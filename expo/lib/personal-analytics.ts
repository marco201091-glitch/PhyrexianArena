import { getDeckDisplayColors } from '@/lib/deck-metadata';
import { buildMatchRecord, type MatchRecord } from '@/lib/win-rate';

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

export interface PersonalDeckAnalytics extends MatchRecord {
  id: string;
  name: string;
  commander: string;
  commanderImage: string | null;
  ownerUsername?: string | null;
  colors: string[];
}

export interface BracketWinStat {
  bracket: string;
  wins: number;
}

export interface ColorWinStat extends MatchRecord {
  color: string;
}

export interface PersonalAnalytics extends MatchRecord {
  uniqueDecks: number;
  topDecks: PersonalDeckAnalytics[];
  colorStats: Array<{ color: string; gamesPlayed: number; percentage: number }>;
  bracketWins: BracketWinStat[];
  colorWinStats: ColorWinStat[];
  longestWinStreak: number;
  currentWinStreak: number;
  bestDeck: PersonalDeckAnalytics | null;
  winConditions: Array<{ condition: string; wins: number; percentage: number }>;
}

export interface PersonalMatchParticipantRow {
  is_winner: boolean;
  deck_id: string;
  played_at?: string | null;
  is_draw?: boolean | null;
  win_condition?: string | null;
}

/** A draw is neutral: it neither extends nor breaks a run of wins. */
export type MatchOutcome = 'win' | 'loss' | 'draw';

export const PERSONAL_BEST_DECK_MIN_GAMES = 3;

export function emptyPersonalAnalytics(): PersonalAnalytics {
  return {
    ...buildMatchRecord({ gamesPlayed: 0, wins: 0 }),
    uniqueDecks: 0,
    topDecks: [],
    colorStats: [],
    bracketWins: [],
    colorWinStats: [],
    longestWinStreak: 0,
    currentWinStreak: 0,
    bestDeck: null,
    winConditions: [],
  };
}

export function resolveDeckColorsForAnalytics(
  deck: PersonalDeckSnapshot,
  colorOverrides: Map<string, string[]>,
) {
  const override = colorOverrides.get(deck.id);
  if (override && override.length > 0) return override;
  return getDeckDisplayColors(deck);
}

export function calculateWinStreaks(outcomes: MatchOutcome[]) {
  let longest = 0;
  let run = 0;

  outcomes.forEach((outcome) => {
    if (outcome === 'draw') return;
    if (outcome === 'win') {
      run += 1;
      longest = Math.max(longest, run);
      return;
    }
    run = 0;
  });

  let current = 0;
  for (let index = outcomes.length - 1; index >= 0; index -= 1) {
    const outcome = outcomes[index];
    if (outcome === 'draw') continue;
    if (outcome !== 'win') break;
    current += 1;
  }

  return { longest, current };
}

function toMatchOutcome(row: PersonalMatchParticipantRow): MatchOutcome {
  if (row.is_winner) return 'win';
  return row.is_draw ? 'draw' : 'loss';
}

/** Running counters; the derived fields arrive together in `buildMatchRecord`. */
type DeckAccumulator = Omit<
  PersonalDeckAnalytics,
  'losses' | 'draws' | 'decisiveGames' | 'winRate'
> & { gamesPlayed: number; wins: number; draws: number };

type ColorAccumulator = { gamesPlayed: number; wins: number; draws: number };

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
  const deckMap = new Map<string, DeckAccumulator>();
  const colorMap = new Map<string, number>();
  const colorWinMap = new Map<string, ColorAccumulator>();
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
      draws: 0,
      colors,
    };

    current.gamesPlayed += 1;
    if (row.is_draw) current.draws += 1;
    if (row.is_winner) current.wins += 1;
    current.colors = colors;
    deckMap.set(deck.id, current);

    colors.forEach((color) => {
      colorMap.set(color, (colorMap.get(color) || 0) + 1);
      const colorEntry = colorWinMap.get(color) || { gamesPlayed: 0, wins: 0, draws: 0 };
      colorEntry.gamesPlayed += 1;
      if (row.is_draw) colorEntry.draws += 1;
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
      ...buildMatchRecord(deck),
    }))
    .sort((a, b) => b.winRate - a.winRate || b.gamesPlayed - a.gamesPlayed || b.wins - a.wins);

  const topDecks = playedDecks.slice(0, 10);
  const totals = playedDecks.reduce(
    (total, deck) => ({
      gamesPlayed: total.gamesPlayed + deck.gamesPlayed,
      wins: total.wins + deck.wins,
      draws: total.draws + deck.draws,
    }),
    { gamesPlayed: 0, wins: 0, draws: 0 },
  );
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
      ...buildMatchRecord(stats),
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
    ? calculateWinStreaks(chronologicalParticipants.map(toMatchOutcome))
    : { longest: 0, current: 0 };

  const bestDeck = playedDecks
    .filter((deck) => deck.gamesPlayed >= PERSONAL_BEST_DECK_MIN_GAMES)
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins || b.gamesPlayed - a.gamesPlayed)[0] || null;
  const winConditionMap = new Map<string, number>();
  participants.forEach((row) => {
    if (!row.is_winner || !row.win_condition) return;
    winConditionMap.set(row.win_condition, (winConditionMap.get(row.win_condition) ?? 0) + 1);
  });
  const trackedWinConditions = Array.from(winConditionMap.values()).reduce((sum, value) => sum + value, 0);
  const winConditions = Array.from(winConditionMap.entries())
    .map(([condition, conditionWins]) => ({
      condition,
      wins: conditionWins,
      percentage: trackedWinConditions > 0 ? Math.round((conditionWins / trackedWinConditions) * 100) : 0,
    }))
    .sort((left, right) => right.wins - left.wins || left.condition.localeCompare(right.condition));

  return {
    ...buildMatchRecord(totals),
    uniqueDecks: deckMap.size,
    topDecks,
    colorStats,
    bracketWins,
    colorWinStats,
    longestWinStreak,
    currentWinStreak,
    bestDeck,
    winConditions,
  };
}
