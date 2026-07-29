import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompactDeckCard } from '@/components/deck/compact-deck-card';
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
    archenemy: string;
    comebacker: string;
    oneTrick: string;
    comboWinner: string;
    junkMaster: string;
    trackedGames: string;
    games: string;
    wins: string;
  };
};

export function TableAwardsTab({ awards, labels }: Props) {
  if (!awards.length) {
    return <PhyrexianPanel style={styles.empty}><Ionicons name="ribbon-outline" size={36} color={colors.muted} /><Text style={styles.title}>{labels.emptyTitle}</Text><Text style={styles.body}>{labels.emptyBody}</Text></PhyrexianPanel>;
  }
  return <View style={styles.section}>
    <Text style={styles.hint}>{labels.hint}</Text>
    {awards.map((award) => {
      const presentation = award.kind === 'fastest'
        ? { title: labels.fastest, value: formatGameDuration(award.value) }
        : award.kind === 'group_slugger'
          ? { title: labels.slugger, value: `${award.value} dmg` }
          : award.kind === 'executioner'
            ? { title: labels.executioner, value: `${award.value} KO` }
            : award.kind === 'runner_up'
              ? { title: labels.runnerUp, value: `${award.value}× #2` }
              : award.kind === 'archenemy'
                ? { title: labels.archenemy, value: `×${award.value}` }
                : award.kind === 'comebacker'
                  ? { title: labels.comebacker, value: `×${award.value}` }
                  : award.kind === 'one_trick'
                    ? { title: labels.oneTrick, value: `${award.value} ${labels.games}` }
                    : award.kind === 'combo_winner'
                      ? { title: labels.comboWinner, value: `${award.value} ${labels.wins}` }
                      : { title: labels.junkMaster, value: `${award.value} ${labels.wins}` };
      const metaGames = award.kind === 'one_trick' ? award.gamesPlayed : award.trackedGames;
      const metaLabel = award.kind === 'one_trick' ? labels.games : labels.trackedGames;
      return <CompactDeckCard
        key={award.kind}
        artUri={award.commanderImage}
        eyebrow={presentation.title}
        title={award.name}
        commander={award.commander}
        meta={`${metaGames} ${metaLabel}`}
        trailing={<Text style={styles.value}>{presentation.value}</Text>}
      />;
    })}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  value: { color: '#fff', fontSize: 16, fontWeight: '900' },
  empty: { alignItems: 'center', gap: spacing.sm },
  title: { color: colors.foreground, fontSize: 18, fontWeight: '700' },
  body: { color: colors.muted, fontSize: 13, textAlign: 'center' },
});
