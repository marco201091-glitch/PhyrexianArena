import {
  buildArenaAnalyticsBundle,
  type ArenaAnalyticsBundlePayload,
} from '@/lib/arena-analytics-bundle';
import { MANA_COLOR_LABELS } from '@/lib/mana-colors';

export function buildPublicArenaAnalytics(payload: ArenaAnalyticsBundlePayload) {
  const analytics = buildArenaAnalyticsBundle(payload);

  return {
    summary: {
      totalMatches: payload.totalMatches ?? 0,
      totalPlayers: analytics.players.length,
    },
    topPlayers: analytics.players.slice(0, 10).map((player) => ({
      displayName: player.displayName,
      gamesPlayed: player.gamesPlayed,
      wins: player.wins,
      winRate: player.winRate,
    })),
    topDecks: analytics.decks.slice(0, 10).map((deck) => ({
      name: deck.name,
      commander: deck.commander,
      commanderImage: deck.commanderImage,
      bracket: deck.bracket,
      ownerDisplayName: deck.ownerDisplayName,
      gamesPlayed: deck.gamesPlayed,
      wins: deck.wins,
      winRate: deck.winRate,
    })),
    topColors: analytics.colors.played.slice(0, 6).map((entry) => ({
      color: entry.color,
      label: MANA_COLOR_LABELS[entry.color],
      gamesPlayed: entry.appearances,
      percentage: entry.percentage,
      winRate: entry.winRate,
    })),
    colorMeta: analytics.colors,
  };
}
