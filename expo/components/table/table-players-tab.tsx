import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollapsiblePanel } from '@/components/ui/collapsible-panel';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { StatCard } from '@/components/ui/stat-card';
import { cardRowGap, colors, radii, spacing } from '@/constants/theme';
import { getPlayerRank } from '@/lib/arena-stats';
import { getProfileDisplayName } from '@/lib/profile-display';
import type { ArenaProfile, PlayerStats } from '@/lib/types/arena';

type TablePlayersTabProps = {
  filteredMatchCount: number;
  members: ArenaProfile[];
  playerStats: PlayerStats[];
  group: { created_by: string };
  userId?: string;
  isCreator?: boolean;
  labels: {
    totalGames: string;
    players: string;
    users: string;
    leaderboard: string;
    playerLeaderboard: string;
    playerLeaderboardHint: string;
    noMatchesBody: string;
    games: string;
    wins: string;
    winRate: string;
    guestBadge: string;
    creator: string;
    you: string;
  };
  canKickMember: (memberId: string) => boolean;
  onKickMember: (memberId: string, displayName: string) => void;
};

function getRankPresentation(rank: number) {
  if (rank === 1) {
    return {
      row: styles.rankRowFirst,
      badge: styles.rankBadgeFirst,
      badgeText: styles.rankBadgeTextLight,
    };
  }
  if (rank === 2) {
    return {
      row: styles.rankRowSecond,
      badge: styles.rankBadgeSecond,
      badgeText: styles.rankBadgeTextDark,
    };
  }
  if (rank === 3) {
    return {
      row: styles.rankRowThird,
      badge: styles.rankBadgeThird,
      badgeText: styles.rankBadgeTextLight,
    };
  }
  return {
    row: styles.playerRow,
    badge: styles.rank,
    badgeText: styles.rankText,
  };
}

export function TablePlayersTab({
  filteredMatchCount,
  members,
  playerStats,
  group,
  userId,
  isCreator = false,
  labels,
  canKickMember,
  onKickMember,
}: TablePlayersTabProps) {
  const playerRanks = useMemo(
    () => playerStats.map((_, index) => getPlayerRank(playerStats, index)),
    [playerStats],
  );

  return (
    <View style={styles.section}>
      <View style={styles.summaryRow}>
        <StatCard compact label={labels.totalGames} value={filteredMatchCount} />
        <StatCard compact label={labels.players} value={members.length} />
      </View>

      <PhyrexianPanel style={styles.leaderboardCard}>
        <View style={styles.leaderboardHeader}>
          <Ionicons name="trophy-outline" size={18} color={colors.primaryMuted} />
          <View style={styles.leaderboardHeaderText}>
            <Text style={styles.leaderboardTitle}>{labels.playerLeaderboard}</Text>
            <Text style={styles.leaderboardHint}>{labels.playerLeaderboardHint}</Text>
          </View>
        </View>

        {playerStats.length === 0 ? (
          <Text style={styles.emptyBody}>{labels.noMatchesBody}</Text>
        ) : (
          <View style={styles.leaderboardList}>
            {playerStats.map((stats, index) => {
              const rank = playerRanks[index] ?? index + 1;
              const presentation = getRankPresentation(rank);

              return (
                <View key={stats.key} style={[styles.playerRowBase, presentation.row]}>
                  <View style={[styles.rank, presentation.badge]}>
                    <Text style={[styles.rankText, presentation.badgeText]}>{rank}</Text>
                  </View>
                  <View style={styles.playerInfo}>
                    <View style={styles.playerTitleRow}>
                      <Text style={styles.playerName} numberOfLines={1}>{stats.displayName}</Text>
                      {stats.isGuest ? (
                        <Text style={styles.guestBadge}>{labels.guestBadge}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.playerMeta}>
                      {stats.gamesPlayed} {labels.games} · {stats.wins}W-{stats.gamesPlayed - stats.wins}L
                    </Text>
                  </View>
                  <View style={styles.winRateBlock}>
                    <Text style={styles.playerWinRate}>{stats.winRate}%</Text>
                    <Text style={styles.winRateLabel}>{labels.winRate}</Text>
                  </View>
                  {rank === 1 ? (
                    <Ionicons name="trophy" size={16} color={colors.primaryMuted} style={styles.trophyIcon} />
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </PhyrexianPanel>

      {isCreator ? (
        <CollapsiblePanel
          title={labels.users}
          meta={`${members.length}`}
        >
          {members.map((member) => {
            const canKick = canKickMember(member.id);

            return (
              <View key={member.id} style={styles.memberRow}>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{getProfileDisplayName(member)}</Text>
                  <View style={styles.badgeRow}>
                    {member.id === group.created_by ? (
                      <Text style={styles.badge}>{labels.creator}</Text>
                    ) : null}
                    {member.id === userId ? (
                      <Text style={styles.badge}>{labels.you}</Text>
                    ) : null}
                  </View>
                </View>
                {canKick ? (
                  <Pressable onPress={() => onKickMember(member.id, getProfileDisplayName(member))}>
                    <Ionicons name="person-remove-outline" size={18} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </CollapsiblePanel>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: cardRowGap,
  },
  leaderboardCard: {
    gap: spacing.md,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  leaderboardHeaderText: {
    flex: 1,
    gap: 2,
  },
  leaderboardTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '700',
  },
  leaderboardHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  leaderboardList: {
    gap: spacing.sm,
  },
  playerRowBase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 10,
  },
  playerRow: {
    backgroundColor: colors.cardInset,
    borderColor: colors.borderSoft,
  },
  rankRowFirst: {
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  rankRowSecond: {
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  rankRowThird: {
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  rank: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeFirst: {
    backgroundColor: colors.primary,
  },
  rankBadgeSecond: {
    backgroundColor: '#cbd5e1',
  },
  rankBadgeThird: {
    backgroundColor: '#d97706',
  },
  rankText: {
    color: colors.primaryMuted,
    fontWeight: '700',
    fontSize: 15,
  },
  rankBadgeTextLight: {
    color: '#fff',
  },
  rankBadgeTextDark: {
    color: '#1e293b',
  },
  playerInfo: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  playerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  playerName: {
    color: colors.foreground,
    fontWeight: '600',
    fontSize: 14,
    flexShrink: 1,
  },
  guestBadge: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  playerMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  winRateBlock: {
    alignItems: 'flex-end',
    minWidth: 52,
  },
  playerWinRate: {
    color: colors.primaryMuted,
    fontWeight: '700',
    fontSize: 18,
  },
  winRateLabel: {
    color: colors.muted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  trophyIcon: {
    marginLeft: -2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  memberInfo: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    color: colors.primaryMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});