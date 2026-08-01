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
    descriptions: Record<string, string>;
    trackedGames: string;
    games: string;
    wins: string;
  };
};

function getAwardVisual(kind: ArenaAward['kind']) {
  switch (kind) {
    case 'fastest': return { icon: 'speedometer' as const, color: '#67e8f9', backgroundColor: 'rgba(34,211,238,0.16)' };
    case 'group_slugger': return { icon: 'flame' as const, color: '#fdba74', backgroundColor: 'rgba(251,146,60,0.16)' };
    case 'executioner': return { icon: 'locate' as const, color: '#fda4af', backgroundColor: 'rgba(244,63,94,0.16)' };
    case 'runner_up': return { icon: 'trophy' as const, color: '#fde68a', backgroundColor: 'rgba(251,191,36,0.18)' };
    case 'archenemy': return { icon: 'skull' as const, color: '#fca5a5', backgroundColor: 'rgba(248,113,113,0.16)' };
    case 'comebacker': return { icon: 'trending-up' as const, color: '#86efac', backgroundColor: 'rgba(74,222,128,0.16)' };
    case 'one_trick': return { icon: 'locate' as const, color: '#93c5fd', backgroundColor: 'rgba(96,165,250,0.16)' };
    case 'combo_winner': return { icon: 'sparkles' as const, color: '#5eead4', backgroundColor: 'rgba(45,212,191,0.16)' };
    default: return { icon: 'ribbon' as const, color: '#bef264', backgroundColor: 'rgba(163,230,53,0.16)' };
  }
}

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
          ? { title: labels.slugger, value: String(award.value) }
          : award.kind === 'executioner'
            ? { title: labels.executioner, value: String(award.value) }
            : award.kind === 'runner_up'
              ? { title: labels.runnerUp, value: String(award.value) }
              : award.kind === 'archenemy'
                ? { title: labels.archenemy, value: String(award.value) }
                : award.kind === 'comebacker'
                  ? { title: labels.comebacker, value: String(award.value) }
                  : award.kind === 'one_trick'
                    ? { title: labels.oneTrick, value: String(award.value) }
                    : award.kind === 'combo_winner'
                      ? { title: labels.comboWinner, value: String(award.value) }
                      : { title: labels.junkMaster, value: String(award.value) };
      const metaGames = award.kind === 'one_trick' ? award.gamesPlayed : award.trackedGames;
      const metaLabel = award.kind === 'one_trick' ? labels.games : labels.trackedGames;
      const visual = getAwardVisual(award.kind);
      return <CompactDeckCard
        key={award.kind}
        artUri={award.commanderImage}
        eyebrow={presentation.title}
        title={award.name}
        commander={award.commander}
        meta={`${labels.descriptions[award.kind]} · ${metaGames} ${metaLabel}`}
        trailing={<View style={styles.trailing}><View style={[styles.trophy, { backgroundColor: visual.backgroundColor, borderColor: visual.color }]}><Ionicons name={visual.icon} size={16} color={visual.color} /></View><Text style={[styles.value, { color: visual.color }]}>{presentation.value}</Text></View>}
      />;
    })}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  trailing: { alignItems: 'center', gap: 4 },
  trophy: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center', gap: spacing.sm },
  title: { color: colors.foreground, fontSize: 18, fontWeight: '700' },
  body: { color: colors.muted, fontSize: 13, textAlign: 'center' },
});
