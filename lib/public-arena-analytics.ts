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
    // The draw count travels with every rate so the published record
    // (`6W-2L-2D`) stays consistent with the percentage next to it.
    topPlayers: analytics.players.slice(0, 10).map((player) => ({
      displayName: player.displayName,
      gamesPlayed: player.gamesPlayed,
      decisiveGames: player.decisiveGames,
      wins: player.wins,
      losses: player.losses,
      draws: player.draws,
      winRate: player.winRate,
    })),
    topDecks: analytics.decks.slice(0, 10).map((deck) => ({
      name: deck.name,
      commander: deck.commander,
      commanderImage: deck.commanderImage,
      bracket: deck.bracket,
      ownerDisplayName: deck.ownerDisplayName,
      gamesPlayed: deck.gamesPlayed,
      decisiveGames: deck.decisiveGames,
      wins: deck.wins,
      losses: deck.losses,
      draws: deck.draws,
      winRate: deck.winRate,
    })),
    topColors: analytics.colors.played.slice(0, 6).map((entry) => ({
      color: entry.color,
      label: MANA_COLOR_LABELS[entry.color],
      gamesPlayed: entry.appearances,
      decisiveGames: entry.decisiveGames,
      draws: entry.draws,
      percentage: entry.percentage,
      winRate: entry.winRate,
    })),
    colorMeta: analytics.colors,
  };
}
