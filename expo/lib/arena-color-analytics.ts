import { getColorIdentityGroupKey, getColorIdentityLabel, getPlayableManaColors, MANA_COLOR_ORDER } from '@/lib/mana-colors';

export interface ArenaColorParticipant {
  deck_id: string | null;
  guest_deck_id?: string | null;
  is_winner: boolean;
  decks?: {
    bracket: string | null;
    commander?: string | null;
    color_identity?: string[] | null;
  } | null;
  arena_guest_decks?: {
    bracket: string | null;
    commander?: string | null;
    color_identity?: string[] | null;
  } | null;
}

export interface ArenaColorMatch {
  match_participants: ArenaColorParticipant[];
}

export interface ArenaColorStat {
  color: string;
  appearances: number;
  wins: number;
  percentage: number;
  winRate: number;
}

export interface ArenaColorPairStat {
  key: string;
  colors: string[];
  guildName: { it: string; en: string } | null;
  appearances: number;
  wins: number;
  winRate: number;
}

export interface ArenaColorAnalytics {
  played: ArenaColorStat[];
  won: ArenaColorStat[];
  winRates: ArenaColorStat[];
  pairs: ArenaColorPairStat[];
  missingColorGames: number;
  totalGamesWithColors: number;
}

function buildColorMap() {
  return new Map<string, { appearances: number; wins: number }>(
    MANA_COLOR_ORDER.map((color) => [color, { appearances: 0, wins: 0 }]),
  );
}

function finalizeColorStats(colorMap: Map<string, { appearances: number; wins: number }>, total: number) {
  return MANA_COLOR_ORDER
    .map((color) => {
      const entry = colorMap.get(color) || { appearances: 0, wins: 0 };
      return {
        color,
        appearances: entry.appearances,
        wins: entry.wins,
        percentage: total > 0 ? Math.round((entry.appearances / total) * 100) : 0,
        winRate: entry.appearances > 0 ? Math.round((entry.wins / entry.appearances) * 100) : 0,
      };
    })
    .filter((entry) => entry.appearances > 0);
}

function resolveDeckColors(
  deckId: string | null,
  guestDeckId: string | null | undefined,
  participant: ArenaColorParticipant,
  colorOverrides: Map<string, string[]>,
) {
  const effectiveDeckId = deckId || guestDeckId || null;
  if (effectiveDeckId) {
    const colors = colorOverrides.get(effectiveDeckId);
    if (colors && colors.length > 0) return colors;
  }

  const snapshot = participant.decks || participant.arena_guest_decks;
  const inlineColors = snapshot?.color_identity?.filter(Boolean) || [];
  return inlineColors.length > 0 ? inlineColors : null;
}

export function computeArenaColorAnalytics(
  matches: ArenaColorMatch[],
  colorOverrides: Map<string, string[]>,
  bracketFilter: string,
): ArenaColorAnalytics {
  const playedMap = buildColorMap();
  const wonMap = buildColorMap();
  const pairMap = new Map<string, { colors: string[]; appearances: number; wins: number }>();

  let totalColorAppearances = 0;
  let missingColorGames = 0;

  matches.forEach((match) => {
    let matchHadResolvableColors = false;

    match.match_participants.forEach((participant) => {
      const deckSnapshot = participant.decks || participant.arena_guest_decks;
      if (bracketFilter !== 'all' && deckSnapshot?.bracket !== bracketFilter) return;

      const colors = resolveDeckColors(
        participant.deck_id,
        participant.guest_deck_id,
        participant,
        colorOverrides,
      );
      if (!colors) return;

      matchHadResolvableColors = true;
      colors.forEach((color) => {
        const playedEntry = playedMap.get(color) || { appearances: 0, wins: 0 };
        playedEntry.appearances += 1;
        totalColorAppearances += 1;
        if (participant.is_winner) playedEntry.wins += 1;
        playedMap.set(color, playedEntry);

        if (participant.is_winner) {
          const wonEntry = wonMap.get(color) || { appearances: 0, wins: 0 };
          wonEntry.appearances += 1;
          wonEntry.wins += 1;
          wonMap.set(color, wonEntry);
        }
      });

      const identityKey = getColorIdentityGroupKey(colors);
      if (identityKey) {
        const identityColors = getPlayableManaColors(colors);
        const current = pairMap.get(identityKey) || { colors: identityColors, appearances: 0, wins: 0 };
        current.appearances += 1;
        if (participant.is_winner) current.wins += 1;
        pairMap.set(identityKey, current);
      }
    });

    if (!matchHadResolvableColors) {
      const hasTrackedDeck = match.match_participants.some((participant) => {
        const deckSnapshot = participant.decks || participant.arena_guest_decks;
        if (bracketFilter !== 'all' && deckSnapshot?.bracket !== bracketFilter) return false;
        const effectiveDeckId = participant.deck_id || participant.guest_deck_id;
        if (!effectiveDeckId || !deckSnapshot?.commander?.trim()) return false;
        return !resolveDeckColors(
          participant.deck_id,
          participant.guest_deck_id,
          participant,
          colorOverrides,
        );
      });
      if (hasTrackedDeck) missingColorGames += 1;
    }
  });

  const played = finalizeColorStats(playedMap, totalColorAppearances);
  const wonTotal = MANA_COLOR_ORDER.reduce((total, color) => total + (wonMap.get(color)?.appearances || 0), 0);
  const won = finalizeColorStats(wonMap, wonTotal);
  const winRates = played
    .filter((entry) => entry.appearances >= 3)
    .sort((a, b) => b.winRate - a.winRate || b.appearances - a.appearances);

  const pairs = Array.from(pairMap.entries())
    .map(([key, entry]) => ({
      key,
      colors: entry.colors,
      guildName: getColorIdentityLabel(entry.colors),
      appearances: entry.appearances,
      wins: entry.wins,
      winRate: entry.appearances > 0 ? Math.round((entry.wins / entry.appearances) * 100) : 0,
    }))
    .sort((a, b) => b.appearances - a.appearances || b.winRate - a.winRate)
    .slice(0, 5);

  return {
    played,
    won,
    winRates,
    pairs,
    missingColorGames,
    totalGamesWithColors: matches.length - missingColorGames,
  };
}