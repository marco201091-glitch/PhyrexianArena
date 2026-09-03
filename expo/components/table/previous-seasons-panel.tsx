import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import {
  ARENA_SEASON_RANKING_MIN_GAMES,
  formatArenaSeasonLabel,
  getArenaSeasonArchiveHighlights,
  getArenaSeasonRecord,
  type ArenaSeasonArchive,
} from '@/lib/arena-seasons';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';

type RankingView = 'players' | 'decks';

export function PreviousSeasonsPanel({ archives }: { archives: ArenaSeasonArchive[] }) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [rankingView, setRankingView] = useState<RankingView>('players');
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  const text = (it: string, en: string) => language === 'it' ? it : en;
  const locale = language === 'it' ? 'it-IT' : 'en-US';
  const selectedArchive = useMemo(
    () => archives.find((archive) => archive.id === selectedArchiveId) ?? archives[0] ?? null,
    [archives, selectedArchiveId],
  );
  const highlights = selectedArchive ? getArenaSeasonArchiveHighlights(selectedArchive) : null;
  const entries = rankingView === 'players' ? highlights?.topPlayers ?? [] : highlights?.topDecks ?? [];

  return (
    <PhyrexianPanel style={styles.panel}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <View style={styles.iconBox}>
          <Ionicons name="calendar-outline" size={20} color={colors.primaryMuted} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{text('Stagioni precedenti', 'Previous seasons')}</Text>
          <Text style={styles.hint}>
            {archives.length > 0
              ? text(`${archives.length} archiviate · minimo 5 partite`, `${archives.length} archived · minimum 5 games`)
              : text('Nessuna stagione ancora archiviata', 'No archived seasons yet')}
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
      </Pressable>

      {open ? (
        <View style={styles.content}>
          {!selectedArchive || !highlights ? (
            <Text style={styles.empty}>
              {text('Le classifiche appariranno alla conclusione della prima season.', 'Rankings will appear after the first season ends.')}
            </Text>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonList}>
                {archives.map((archive) => {
                  const active = archive.id === selectedArchive.id;
                  return (
                    <Pressable
                      key={archive.id}
                      onPress={() => setSelectedArchiveId(archive.id)}
                      style={[styles.seasonButton, active && styles.seasonButtonActive]}
                    >
                      <Text style={[styles.seasonButtonText, active && styles.seasonButtonTextActive]}>
                        {formatArenaSeasonLabel(archive.seasonStart, archive.seasonEnd, locale)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={styles.summary}>
                {Number(selectedArchive.summary.totalMatches ?? 0)} {text('partite', 'games')}
                {' · '}{Number(selectedArchive.summary.matches?.draws ?? 0)} {text('pareggi', 'draws')}
              </Text>

              <View style={styles.tabs}>
                {([
                  { value: 'players' as const, label: text('Top 10 giocatori', 'Top 10 players'), icon: 'people-outline' as const },
                  { value: 'decks' as const, label: text('Top 10 mazzi', 'Top 10 decks'), icon: 'flash-outline' as const },
                ]).map((tab) => {
                  const active = rankingView === tab.value;
                  return (
                    <Pressable key={tab.value} onPress={() => setRankingView(tab.value)} style={[styles.tab, active && styles.tabActive]}>
                      <Ionicons name={tab.icon} size={16} color={active ? colors.primaryMuted : colors.muted} />
                      <Text numberOfLines={1} style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {entries.length === 0 ? (
                <Text style={styles.empty}>
                  {text('Nessun risultato raggiunge ancora il minimo di 5 partite.', 'No result has reached the 5-game minimum.')}
                </Text>
              ) : entries.map((entry, index) => {
                const record = getArenaSeasonRecord(entry);
                const title = rankingView === 'players'
                  ? ('display_name' in entry ? entry.display_name : null)
                  : ('deck_name' in entry ? entry.deck_name : null);
                const subtitle = rankingView === 'decks' && 'commander' in entry ? entry.commander : null;
                return (
                  <View key={`${rankingView}-${title ?? index}-${index}`} style={styles.row}>
                    <View style={[styles.rank, index < 3 && styles.rankTop]}>
                      <Text style={[styles.rankText, index < 3 && styles.rankTextTop]}>{index + 1}</Text>
                    </View>
                    <View style={styles.rowCopy}>
                      <Text numberOfLines={1} style={styles.rowTitle}>
                        {title || text(rankingView === 'players' ? 'Giocatore' : 'Mazzo', rankingView === 'players' ? 'Player' : 'Deck')}
                      </Text>
                      {subtitle ? <Text numberOfLines={1} style={styles.rowSubtitle}>{subtitle}</Text> : null}
                    </View>
                    <View style={styles.record}>
                      <Text style={styles.rate}>{record.winRate}%</Text>
                      <Text style={styles.wl}>{record.wins}W / {record.losses}L</Text>
                    </View>
                  </View>
                );
              })}
              <Text style={styles.footer}>
                {text(
                  `Classifica per win rate · minimo ${ARENA_SEASON_RANKING_MIN_GAMES} partite`,
                  `Ranked by win rate · minimum ${ARENA_SEASON_RANKING_MIN_GAMES} games`,
                )}
              </Text>
            </>
          )}
        </View>
      ) : null}
    </PhyrexianPanel>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 0, overflow: 'hidden', borderColor: 'rgba(16, 185, 129, 0.22)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  pressed: { opacity: 0.78 },
  iconBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.28)', backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.foreground, fontSize: 15, fontWeight: '700' },
  hint: { marginTop: 2, color: colors.muted, fontSize: 11 },
  content: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, padding: 14 },
  empty: { paddingVertical: spacing.lg, color: colors.muted, fontSize: 13, textAlign: 'center' },
  seasonList: { gap: 8 },
  seasonButton: { borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, paddingHorizontal: 12, paddingVertical: 8 },
  seasonButtonActive: { borderColor: 'rgba(52, 211, 153, 0.5)', backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  seasonButtonText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  seasonButtonTextActive: { color: colors.primaryMuted },
  summary: { color: colors.muted, fontSize: 11 },
  tabs: { flexDirection: 'row', gap: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, padding: 4 },
  tab: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 9 },
  tabActive: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: colors.primaryMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, padding: 10 },
  rank: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  rankTop: { borderColor: 'rgba(52, 211, 153, 0.4)', backgroundColor: 'rgba(16, 185, 129, 0.14)' },
  rankText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  rankTextTop: { color: colors.primaryMuted },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700' },
  rowSubtitle: { marginTop: 1, color: colors.muted, fontSize: 11 },
  record: { alignItems: 'flex-end' },
  rate: { color: colors.primaryMuted, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  wl: { color: colors.muted, fontSize: 10, fontVariant: ['tabular-nums'] },
  footer: { color: colors.muted, fontSize: 10, textAlign: 'center' },
});
