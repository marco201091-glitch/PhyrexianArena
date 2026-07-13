import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommanderArt } from '@/components/deck/commander-art';
import { EdhrecBadgeOnly } from '@/components/deck/edhrec-insights';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { StatCard } from '@/components/ui/stat-card';
import { cardRowGap, colors, radii, spacing } from '@/constants/theme';
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
      <FlatList
        data={commanderStats}
        keyExtractor={(deck) => deck.key}
        scrollEnabled={false}
        renderItem={({ item: deck, index }) => (
          <PhyrexianPanel variant="inset" padded={false} style={styles.deckRow}>
            <View style={styles.deckArtWrap}>
              <CommanderArt
                uri={deck.commanderImageUrl}
                alt={deck.commander}
                size="sm"
              />
              <View style={styles.deckRankBadge}>
                <Text style={styles.deckRankText}>{index + 1}</Text>
              </View>
            </View>
            <View style={styles.deckInfo}>
              <Text style={styles.deckCommander} numberOfLines={2}>{deck.commander}</Text>
              <EdhrecBadgeOnly commander={deck.commander} />
              {deck.bracket ? (
                <Text style={styles.deckBracket}>{labels.bracket} {deck.bracket}</Text>
              ) : null}
              <Text style={styles.deckMeta}>
                {deck.gamesPlayed} {labels.games} · {deck.wins}W
              </Text>
            </View>
            <Text style={styles.deckWinRate}>{deck.winRate}%</Text>
          </PhyrexianPanel>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    overflow: 'hidden',
  },
  deckArtWrap: {
    position: 'relative',
  },
  deckRankBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckRankText: {
    color: colors.primaryMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  deckInfo: {
    flex: 1,
    gap: 2,
  },
  deckCommander: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  deckBracket: {
    color: colors.successBright,
    fontSize: 11,
    fontWeight: '600',
  },
  deckMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  deckWinRate: {
    color: colors.primaryMuted,
    fontWeight: '700',
    fontSize: 14,
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