import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEdhrecStats } from '@/hooks/use-edhrec-stats';
import { colors } from '@/constants/theme';
import {
  buildCommanderSlug,
  buildEdhrecCommanderUrl,
  formatEdhrecDeckCount,
  getEdhrecRankBadgeStyle,
} from '@/lib/edhrec';
import type { EdhrecCommanderStats } from '@/lib/edhrec';

type EdhrecInsightsProps = {
  commander: string;
  viewOnEdhrecLabel: string;
  enabled?: boolean;
  layout?: 'inline' | 'stacked';
};

const badgeToneStyles = {
  amber: { border: 'rgba(251, 191, 36, 0.4)', bg: 'rgba(245, 158, 11, 0.15)', text: '#fde68a' },
  teal: { border: 'rgba(45, 212, 191, 0.4)', bg: 'rgba(20, 184, 166, 0.15)', text: '#ccfbf1' },
  tealMuted: { border: 'rgba(20, 184, 166, 0.3)', bg: 'rgba(20, 184, 166, 0.1)', text: '#99f6e4' },
  muted: { border: colors.borderSoft, bg: colors.surfaceMuted, text: colors.muted },
} as const;

function EdhrecBadge({ stats }: { stats: EdhrecCommanderStats }) {
  if (stats.rank == null && stats.numDecks == null) return null;

  const tone = stats.rank != null ? getEdhrecRankBadgeStyle(stats.rank) : 'tealMuted';
  const toneStyle = badgeToneStyles[tone];

  return (
    <View style={[styles.badge, { borderColor: toneStyle.border, backgroundColor: toneStyle.bg }]}>
      <Text style={[styles.badgeLabel, { color: toneStyle.text }]}>EDHREC</Text>
      {stats.rank != null ? (
        <Text style={[styles.badgeValue, { color: toneStyle.text }]}>#{stats.rank}</Text>
      ) : null}
      {stats.rank != null && stats.numDecks != null ? (
        <Text style={[styles.badgeMuted, { color: toneStyle.text }]}>·</Text>
      ) : null}
      {stats.numDecks != null ? (
        <Text style={[styles.badgeValue, { color: toneStyle.text }]}>
          {formatEdhrecDeckCount(stats.numDecks)}
        </Text>
      ) : null}
    </View>
  );
}

export function EdhrecInsights({
  commander,
  viewOnEdhrecLabel,
  enabled = true,
  layout = 'inline',
}: EdhrecInsightsProps) {
  const { stats } = useEdhrecStats(commander, enabled);
  const slug = stats?.slug || buildCommanderSlug(commander);

  const link = (
    <Pressable
      onPress={() => void Linking.openURL(buildEdhrecCommanderUrl(slug))}
      style={styles.link}
    >
      <Ionicons name="open-outline" size={14} color={colors.teal} />
      <Text style={styles.linkLabel}>{viewOnEdhrecLabel}</Text>
    </Pressable>
  );

  const badge = stats ? <EdhrecBadge stats={stats} /> : null;

  if (layout === 'stacked') {
    return (
      <View style={styles.stacked}>
        {link}
        {badge}
      </View>
    );
  }

  return (
    <View style={styles.inline}>
      {link}
      {badge}
    </View>
  );
}

export function EdhrecBadgeOnly({ commander, enabled = true }: { commander: string; enabled?: boolean }) {
  const { stats } = useEdhrecStats(commander, enabled);
  if (!stats) return null;
  return <EdhrecBadge stats={stats} />;
}

const styles = StyleSheet.create({
  inline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  stacked: {
    gap: 8,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkLabel: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  badgeValue: {
    fontSize: 10,
    fontWeight: '600',
  },
  badgeMuted: {
    fontSize: 10,
    opacity: 0.75,
  },
});