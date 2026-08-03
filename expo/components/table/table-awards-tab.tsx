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

const podiumColors = ['#f4c95d', '#c5ced8', '#c8874a'] as const;

export function TableAwardsTab({ awards, labels }: Props) {
  if (!awards.length) {
    return <PhyrexianPanel style={styles.empty}><Ionicons name="ribbon-outline" size={36} color={colors.muted} /><Text style={styles.title}>{labels.emptyTitle}</Text><Text style={styles.body}>{labels.emptyBody}</Text></PhyrexianPanel>;
  }
  const awardGroups = Array.from(awards.reduce((groups, award) => {
    const entries = groups.get(award.kind) ?? [];
    entries.push(award);
    groups.set(award.kind, entries);
    return groups;
  }, new Map<ArenaAward['kind'], ArenaAward[]>()).values());

  return <View style={styles.section}>
    <Text style={styles.hint}>{labels.hint}</Text>
    {awardGroups.map((group) => {
      const leadAward = group[0];
      const visual = getAwardVisual(leadAward.kind);
      const title = leadAward.kind === 'fastest'
        ? labels.fastest
        : leadAward.kind === 'group_slugger'
          ? labels.slugger
          : leadAward.kind === 'executioner'
            ? labels.executioner
            : leadAward.kind === 'runner_up'
              ? labels.runnerUp
              : leadAward.kind === 'archenemy'
                ? labels.archenemy
                : leadAward.kind === 'comebacker'
                  ? labels.comebacker
                  : leadAward.kind === 'one_trick'
                    ? labels.oneTrick
                    : leadAward.kind === 'combo_winner'
                      ? labels.comboWinner
                      : labels.junkMaster;

      return <PhyrexianPanel key={leadAward.kind} style={styles.awardGroup}>
        <View style={styles.groupHeader}>
          <View style={[styles.groupIcon, { backgroundColor: visual.backgroundColor, borderColor: visual.color }]}>
            <Ionicons name={visual.icon} size={17} color={visual.color} />
          </View>
          <View style={styles.groupTitleBlock}>
            <Text style={styles.groupEyebrow}>Top {group.length}/3</Text>
            <Text style={[styles.groupTitle, { color: visual.color }]}>{title}</Text>
          </View>
        </View>
        <View style={styles.groupCards}>
          {group.map((award) => {
            const metaGames = award.kind === 'one_trick' ? award.gamesPlayed : award.trackedGames;
            const metaLabel = award.kind === 'one_trick' ? labels.games : labels.trackedGames;
            const podiumColor = podiumColors[award.rank - 1] ?? podiumColors[2];
            const value = award.kind === 'fastest' ? formatGameDuration(award.value) : String(award.value);

            return <CompactDeckCard
              key={`${award.kind}:${award.rank}:${award.deckId}`}
              artUri={award.commanderImage}
              badge={award.rank}
              title={award.name}
              commander={award.commander}
              meta={`${labels.descriptions[award.kind]} · ${metaGames} ${metaLabel}`}
              trailing={<View style={styles.trailing}><View style={[styles.trophy, { backgroundColor: visual.backgroundColor, borderColor: podiumColor }]}><Ionicons name={visual.icon} size={16} color={podiumColor} /><View style={[styles.medalDot, { backgroundColor: podiumColor }]}><Text style={styles.medalRank}>{award.rank}</Text></View></View><Text style={[styles.value, { color: visual.color }]}>{value}</Text></View>}
            />;
          })}
        </View>
      </PhyrexianPanel>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  awardGroup: { gap: spacing.sm, padding: spacing.md },
  groupHeader: { alignItems: 'center', borderBottomColor: colors.borderSoft, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.sm },
  groupIcon: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  groupTitleBlock: { flex: 1 },
  groupEyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  groupTitle: { fontSize: 15, fontWeight: '900' },
  groupCards: { gap: spacing.sm },
  trailing: { alignItems: 'center', gap: 4 },
  trophy: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  medalDot: { position: 'absolute', right: -5, bottom: -4, width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  medalRank: { color: '#111', fontSize: 9, fontWeight: '900' },
  value: { fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center', gap: spacing.sm },
  title: { color: colors.foreground, fontSize: 18, fontWeight: '700' },
  body: { color: colors.muted, fontSize: 13, textAlign: 'center' },
});
