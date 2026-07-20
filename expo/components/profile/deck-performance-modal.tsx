import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { CommanderArt } from '@/components/deck/commander-art';
import { Modal } from '@/components/ui/modal';
import { ModalHeader } from '@/components/ui/modal-header';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing } from '@/constants/theme';
import { formatGameDuration } from '@/lib/live-game-duration';
import type { DeckPerformance, ProfileDeck } from '@/lib/types/profile';

type Labels = Record<
  | 'title'
  | 'games'
  | 'wins'
  | 'winRate'
  | 'secondPlaces'
  | 'damageDealt'
  | 'lifeLost'
  | 'lifeGained'
  | 'commanderDamage'
  | 'infectDealt'
  | 'eliminations'
  | 'fastestWin'
  | 'trackingCoverage',
  string
>;

type Props = {
  visible: boolean;
  deck: ProfileDeck | null;
  performance?: DeckPerformance;
  labels: Labels;
  onClose: () => void;
};

export function DeckPerformanceModal({ visible, deck, performance, labels, onClose }: Props) {
  const { width } = useWindowDimensions();
  if (!deck) return null;
  const phoneLayout = width < 600;

  const metrics = [
    [labels.games, performance?.gamesPlayed || 0],
    [labels.wins, performance?.wins || 0],
    [labels.winRate, `${performance?.winRate || 0}%`],
    [labels.secondPlaces, performance?.secondPlaces || 0],
    [labels.damageDealt, performance?.damageDealt || 0],
    [labels.lifeLost, performance?.damageTaken || 0],
    [labels.lifeGained, performance?.lifeGained || 0],
    [labels.eliminations, performance?.eliminations || 0],
    [labels.commanderDamage, performance?.commanderDamage || 0],
    [labels.infectDealt, performance?.infectDealt || 0],
    [
      labels.fastestWin,
      performance?.medianWinningDurationSeconds != null
        ? formatGameDuration(performance.medianWinningDurationSeconds)
        : '—',
    ],
  ] as const;

  const coverage = performance?.trackingCoverage || 0;

  return (
    <Modal visible={visible} onClose={onClose} presentation="dialog" maxWidth={620}>
      <ModalHeader title={deck.name} subtitle={deck.commander} icon="stats-chart-outline" onClose={onClose} />
      <View style={styles.content}>
        <View style={styles.hero}>
          <CommanderArt uri={deck.commander_image} alt={deck.commander} size="hero" />
          <View style={styles.heroCopy}>
            <Text style={styles.title}>{labels.title}</Text>
            <Text style={styles.subtitle}>{performance?.trackedGames || 0} / {performance?.gamesPlayed || 0}</Text>
          </View>
        </View>

        <View style={styles.metrics}>
          {metrics.map(([label, value], index) => (
            <PhyrexianPanel
              key={label}
              variant="inset"
              style={[
                styles.metric,
                phoneLayout && styles.metricPhone,
                phoneLayout && index === metrics.length - 1 && styles.metricWidePhone,
              ]}
            >
              <Text style={styles.metricLabel} numberOfLines={2}>{label}</Text>
              <Text style={styles.metricValue}>{value}</Text>
            </PhyrexianPanel>
          ))}
        </View>

        <View style={styles.coverageBlock}>
          <View style={styles.coverageHeader}>
            <Text style={styles.coverageLabel}>{labels.trackingCoverage}</Text>
            <Text style={styles.coverageValue}>{coverage}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${coverage}%` }]} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroCopy: { flex: 1, gap: 3 },
  title: { color: colors.foreground, fontSize: 17, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 12 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { width: '31%', minWidth: 96, minHeight: 80, flexGrow: 1, justifyContent: 'space-between' },
  metricPhone: { width: '48%', minWidth: 0 },
  metricWidePhone: { width: '100%' },
  metricLabel: { color: colors.muted, fontSize: 10, lineHeight: 13, textTransform: 'uppercase' },
  metricValue: { color: colors.foreground, fontSize: 19, fontWeight: '800', marginTop: 3 },
  coverageBlock: { gap: spacing.xs, marginTop: spacing.xs },
  coverageHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  coverageLabel: { color: colors.muted, fontSize: 11 },
  coverageValue: { color: colors.primaryMuted, fontSize: 11, fontWeight: '700' },
  track: { height: 4, borderRadius: 99, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99, backgroundColor: colors.primaryMuted },
});
