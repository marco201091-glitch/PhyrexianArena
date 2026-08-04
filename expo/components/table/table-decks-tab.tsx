import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompactDeckCard } from '@/components/deck/compact-deck-card';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { StatCard } from '@/components/ui/stat-card';
import { cardRowGap, colors } from '@/constants/theme';
import type { CommanderStats } from '@/lib/arena-deck-stats';

type TableDecksTabProps = {
  commanderStats: CommanderStats[];
  labels: {
    noDeckStatsTitle: string;
    noDeckStatsBody: string;
    bestDeck: string;
    uniqueDecks: string;
    winRate: string;
    trackedDecks: string;
    deckRankings: string;
    bracket: string;
    games: string;
  };
};

export function TableDecksTab({ commanderStats, labels }: TableDecksTabProps) {
  if (commanderStats.length === 0) {
    return (
      <PhyrexianPanel style={styles.emptyCard}>
        <Ionicons name="layers-outline" size={36} color={colors.muted} />
        <Text style={styles.emptyTitle}>{labels.noDeckStatsTitle}</Text>
        <Text style={styles.emptyBody}>{labels.noDeckStatsBody}</Text>
      </PhyrexianPanel>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.summaryRow}>
        <StatCard compact label={labels.bestDeck} value={commanderStats[0]?.commander || '—'} />
        <StatCard compact label={labels.uniqueDecks} value={commanderStats.length} />
      </View>

      <Text style={styles.sectionTitle}>{labels.deckRankings}</Text>
      <View>
        {commanderStats.map((deck, index) => (
          <CompactDeckCard
            key={deck.key}
            artUri={deck.commanderImageUrl}
            title={deck.commander}
            commander={deck.ownerDisplayName}
            eyebrow={deck.bracket ? `${labels.bracket} ${deck.bracket}` : labels.deckRankings}
            meta={`${deck.gamesPlayed} ${labels.games} · ${deck.wins}W`}
            badge={index + 1}
            gamesPlayed={deck.gamesPlayed}
            wins={deck.wins}
            trailing={<Text style={styles.deckWinRate}>{deck.winRate}%</Text>}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 16,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: cardRowGap,
  },
  deckWinRate: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
  separator: {
    height: 8,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '600',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
