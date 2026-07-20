import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommanderArt } from '@/components/deck/commander-art';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing } from '@/constants/theme';
import { formatGameDuration } from '@/lib/live-game-duration';
import type { ArenaAward } from '@/lib/arena-awards';

type Props = {
  awards: ArenaAward[];
  labels: {
    emptyTitle: string;
    emptyBody: string;
    hint: string;
    fastest: string;
    slugger: string;
    executioner: string;
    runnerUp: string;
    trackedGames: string;
  };
};

export function TableAwardsTab({ awards, labels }: Props) {
  if (!awards.length) {
    return <PhyrexianPanel style={styles.empty}><Ionicons name="ribbon-outline" size={36} color={colors.muted} /><Text style={styles.title}>{labels.emptyTitle}</Text><Text style={styles.body}>{labels.emptyBody}</Text></PhyrexianPanel>;
  }
  return <View style={styles.section}>
    <Text style={styles.hint}>{labels.hint}</Text>
    {awards.map((award) => {
      const title = award.kind === 'fastest' ? labels.fastest : award.kind === 'group_slugger' ? labels.slugger : award.kind === 'executioner' ? labels.executioner : labels.runnerUp;
      const value = award.kind === 'fastest' ? formatGameDuration(award.value) : award.kind === 'runner_up' ? `${award.value}× #2` : award.kind === 'executioner' ? `${award.value} KO` : `${award.value} dmg`;
      return <PhyrexianPanel key={award.kind} variant="inset" style={styles.card}>
        <CommanderArt uri={award.commanderImage} alt={award.commander} size="sm" />
        <View style={styles.main}><Text style={styles.kicker}>{title}</Text><Text style={styles.name} numberOfLines={1}>{award.name}</Text><Text style={styles.commander} numberOfLines={1}>{award.commander}</Text><Text style={styles.meta}>{award.trackedGames} {labels.trackedGames}</Text></View>
        <Text style={styles.value}>{value}</Text>
      </PhyrexianPanel>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  main: { flex: 1, minWidth: 0 },
  kicker: { color: colors.primaryMuted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  name: { color: colors.foreground, fontSize: 14, fontWeight: '700', marginTop: 2 },
  commander: { color: colors.muted, fontSize: 12 },
  meta: { color: colors.muted, fontSize: 10, marginTop: 2 },
  value: { color: colors.foreground, fontSize: 15, fontWeight: '800' },
  empty: { alignItems: 'center', gap: spacing.sm },
  title: { color: colors.foreground, fontSize: 18, fontWeight: '700' },
  body: { color: colors.muted, fontSize: 13, textAlign: 'center' },
});
