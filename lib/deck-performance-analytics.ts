export const AWARD_MIN_TRACKED_GAMES = 3;

export interface DeckPerformanceInputRow {
  deck_id: string | null;
  guest_deck_id: string | null;
  deck_name: string | null;
  guest_deck_name: string | null;
  deck_commander: string | null;
  guest_deck_commander: string | null;
  deck_commander_image: string | null;
  guest_deck_commander_image: string | null;
  is_winner: boolean;
  placement: number | null;
  duration_seconds: number | null;
  tracking_version: number | null;
  life_lost: number;
  life_gained: number;
  life_damage_dealt: number;
  commander_damage_dealt: number;
  infect_dealt: number;
  eliminations_caused: number;
  group_damage_dealt: number;
  group_damage_events: number;
}

export interface DeckPerformanceStats {
  key: string;
  deckId: string;
  isGuestDeck: boolean;
  name: string;
  commander: string;
  commanderImage: string | null;
  gamesPlayed: number;
  trackedGames: number;
  trackingCoverage: number;
  wins: number;
  winRate: number;
  secondPlaces: number;
  totalDamageDealt: number;
  averageDamageDealt: number;
  totalDamageTaken: number;
  totalLifeGained: number;
  commanderDamageDealt: number;
  infectDealt: number;
  eliminations: number;
  groupDamageDealt: number;
  groupDamageEvents: number;
  firstEliminations: number;
  comebackWins: number;
  comboWins: number;
  alternateWins: number;
  medianWinningDurationSeconds: number | null;
}

export type ArenaAwardKind =
  | 'fastest'
  | 'group_slugger'
  | 'executioner'
  | 'runner_up'
  | 'archenemy'
  | 'comebacker'
  | 'one_trick'
  | 'combo_winner'
  | 'junk_master';

export interface ArenaAward {
  kind: ArenaAwardKind;
  rank: number;
  deck: DeckPerformanceStats;
  value: number;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function isTracked(row: DeckPerformanceInputRow) {
  return row.tracking_version != null || row.duration_seconds != null;
}

export function buildDeckPerformanceStats(rows: DeckPerformanceInputRow[]) {
  const entries = new Map<string, DeckPerformanceStats & { winningDurations: number[] }>();

  rows.forEach((row) => {
    const deckId = row.deck_id || row.guest_deck_id;
    if (!deckId) return;
    const isGuestDeck = Boolean(row.guest_deck_id);
    const key = `${isGuestDeck ? 'guest' : 'deck'}:${deckId}`;
    const current = entries.get(key) || {
      key,
      deckId,
      isGuestDeck,
      name: row.deck_name || row.guest_deck_name || row.deck_commander || row.guest_deck_commander || 'Deck',
      commander: row.deck_commander || row.guest_deck_commander || 'Unknown commander',
      commanderImage: row.deck_commander_image || row.guest_deck_commander_image,
      gamesPlayed: 0,
      trackedGames: 0,
      trackingCoverage: 0,
      wins: 0,
      winRate: 0,
      secondPlaces: 0,
      totalDamageDealt: 0,
      averageDamageDealt: 0,
      totalDamageTaken: 0,
      totalLifeGained: 0,
      commanderDamageDealt: 0,
      infectDealt: 0,
      eliminations: 0,
      groupDamageDealt: 0,
      groupDamageEvents: 0,
      firstEliminations: 0,
      comebackWins: 0,
      comboWins: 0,
      alternateWins: 0,
      medianWinningDurationSeconds: null,
      winningDurations: [],
    };

    current.gamesPlayed += 1;
    if (row.is_winner) current.wins += 1;
    if (row.placement === 2) current.secondPlaces += 1;
    if (isTracked(row)) {
      current.trackedGames += 1;
      current.totalDamageDealt += row.life_damage_dealt || 0;
      current.totalDamageTaken += row.life_lost || 0;
      current.totalLifeGained += row.life_gained || 0;
      current.commanderDamageDealt += row.commander_damage_dealt || 0;
      current.infectDealt += row.infect_dealt || 0;
      current.eliminations += row.eliminations_caused || 0;
      current.groupDamageDealt += row.group_damage_dealt || 0;
      current.groupDamageEvents += row.group_damage_events || 0;
      if (row.is_winner && row.duration_seconds != null) {
        current.winningDurations.push(row.duration_seconds);
      }
    }
    entries.set(key, current);
  });

  return Array.from(entries.values()).map(({ winningDurations, ...entry }) => ({
    ...entry,
    trackingCoverage: entry.gamesPlayed > 0
      ? Math.round((entry.trackedGames / entry.gamesPlayed) * 100)
      : 0,
    winRate: entry.gamesPlayed > 0 ? Math.round((entry.wins / entry.gamesPlayed) * 100) : 0,
    averageDamageDealt: entry.trackedGames > 0
      ? Math.round(entry.totalDamageDealt / entry.trackedGames)
      : 0,
    medianWinningDurationSeconds: median(winningDurations),
  }));
}

function topBy(
  decks: DeckPerformanceStats[],
  selector: (deck: DeckPerformanceStats) => number,
  minimum = 1,
) {
  return [...decks]
    .filter((deck) => deck.trackedGames >= AWARD_MIN_TRACKED_GAMES && selector(deck) >= minimum)
    .sort((a, b) => selector(b) - selector(a) || b.trackedGames - a.trackedGames || a.key.localeCompare(b.key))
    .slice(0, 3);
}

function topByAll(
  decks: DeckPerformanceStats[],
  selector: (deck: DeckPerformanceStats) => number,
) {
  return [...decks]
    .filter((deck) => selector(deck) > 0)
    .sort((a, b) => selector(b) - selector(a) || b.gamesPlayed - a.gamesPlayed || a.key.localeCompare(b.key))
    .slice(0, 3);
}

export function buildArenaAwards(decks: DeckPerformanceStats[]): ArenaAward[] {
  const awards: ArenaAward[] = [];
  const fastest = [...decks]
    .filter((deck) => (
      deck.trackedGames >= AWARD_MIN_TRACKED_GAMES
      && deck.medianWinningDurationSeconds != null
    ))
    .sort((a, b) => (
      a.medianWinningDurationSeconds! - b.medianWinningDurationSeconds!
      || b.wins - a.wins
    ))
    .slice(0, 3);
  fastest.forEach((deck, index) => awards.push({ kind: 'fastest', rank: index + 1, deck, value: deck.medianWinningDurationSeconds! }));

  const addRanked = (kind: ArenaAwardKind, ranked: DeckPerformanceStats[], selector: (deck: DeckPerformanceStats) => number) => {
    ranked.forEach((deck, index) => awards.push({ kind, rank: index + 1, deck, value: selector(deck) }));
  };

  addRanked('group_slugger', topBy(decks, (deck) => deck.groupDamageDealt), (deck) => deck.groupDamageDealt);
  addRanked('executioner', topBy(decks, (deck) => deck.eliminations), (deck) => deck.eliminations);
  addRanked('runner_up', topBy(decks, (deck) => deck.secondPlaces), (deck) => deck.secondPlaces);
  addRanked('archenemy', topBy(decks, (deck) => deck.firstEliminations), (deck) => deck.firstEliminations);
  addRanked('comebacker', topBy(decks, (deck) => deck.comebackWins), (deck) => deck.comebackWins);
  addRanked('one_trick', topByAll(decks, (deck) => deck.gamesPlayed), (deck) => deck.gamesPlayed);
  addRanked('combo_winner', topByAll(decks, (deck) => deck.comboWins), (deck) => deck.comboWins);
  addRanked('junk_master', topByAll(decks, (deck) => deck.alternateWins), (deck) => deck.alternateWins);

  return awards;
}
