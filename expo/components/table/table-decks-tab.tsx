import { useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompactDeckCard } from '@/components/deck/compact-deck-card';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { StatCard } from '@/components/ui/stat-card';
import { cardRowGap, colors } from '@/constants/theme';
import type { CommanderStats } from '@/lib/arena-deck-stats';
import {
  countProvisionalDeckRankings,
  filterDeckRankings,
  isProvisionalDeckRanking,
} from '@/lib/deck-ranking-visibility';

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
    showProvisionalDecks: string;
    hideProvisionalDecks: string;
    provisionalDeckSample: string;
    noRankedDecks: string;
  };
};

export function TableDecksTab({ commanderStats, labels }: TableDecksTabProps) {
  const [showProvisional, setShowProvisional] = useState(false);
  const visibleDecks = useMemo(
    () => filterDeckRankings(commanderStats, showProvisional),
    [commanderStats, showProvisional],
  );
  const provisionalCount = countProvisionalDeckRankings(commanderStats);
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
        <StatCard compact label={labels.bestDeck} value={visibleDecks[0]?.commander || '—'} />
        <StatCard compact label={labels.uniqueDecks} value={commanderStats.length} />
      </View>

      <View style={styles.rankingHeader}>
        <Text style={styles.sectionTitle}>{labels.deckRankings}</Text>
        {provisionalCount > 0 ? (
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{showProvisional ? labels.hideProvisionalDecks : labels.showProvisionalDecks}</Text>
            <Switch value={showProvisional} onValueChange={setShowProvisional} trackColor={{ true: colors.primary }} />
          </View>
        ) : null}
      </View>
      <View>
        {visibleDecks.map((deck, index) => (
          <CompactDeckCard
            key={deck.key}
            artUri={deck.commanderImageUrl}
            title={deck.commander}
            commander={deck.ownerDisplayName}
            eyebrow={[
              deck.bracket ? `${labels.bracket} ${deck.bracket}` : null,
              isProvisionalDeckRanking(deck.gamesPlayed) ? labels.provisionalDeckSample : null,
            ].filter(Boolean).join(' · ') || labels.deckRankings}
            meta={`${deck.gamesPlayed} ${labels.games} · ${deck.wins}W`}
            badge={index + 1}
            gamesPlayed={deck.gamesPlayed}
            wins={deck.wins}
            trailing={<Text style={styles.deckWinRate}>{deck.winRate}%</Text>}
          />
        ))}
        {visibleDecks.length === 0 ? <Text style={styles.emptyFiltered}>{labels.noRankedDecks}</Text> : null}
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
  rankingHeader: { gap: 10 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  toggleLabel: { flex: 1, color: colors.muted, fontSize: 12 },
  emptyFiltered: { color: colors.muted, fontSize: 13, textAlign: 'center', paddingVertical: 18 },
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
