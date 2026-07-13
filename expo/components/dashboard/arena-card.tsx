import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, radii, spacing, touch } from '@/constants/theme';
import type { ArenaGroup } from '@/lib/types/group';

type ArenaCardProps = {
  group: ArenaGroup;
  arenaLabel: string;
  playersLabel: string;
  tableLabel: string;
  inviteLabel: string;
  createdLabel: string;
  openHint: string;
  openLabel: string;
  copyLabel: string;
  onOpen: () => void;
  onCopyInvite: () => void;
  formatDate: (date: string) => string;
};

export function ArenaCard({
  group,
  arenaLabel,
  playersLabel,
  tableLabel,
  inviteLabel,
  createdLabel,
  openHint,
  openLabel,
  copyLabel,
  onOpen,
  onCopyInvite,
  formatDate,
}: ArenaCardProps) {
  const playerCount = group.group_members?.length || 0;

  return (
    <Pressable onPress={onOpen}>
      <PhyrexianPanel variant="strong">
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.meta}>
              {arenaLabel} · {playerCount} {playersLabel}
            </Text>
            <Text style={styles.title}>{group.name}</Text>
            {group.description ? (
              <Text style={styles.description}>{group.description}</Text>
            ) : null}
          </View>
          <Pressable
            style={styles.copyButton}
            onPress={(event) => {
              event.stopPropagation();
              onCopyInvite();
            }}
            accessibilityLabel={copyLabel}
          >
            <Ionicons name="share-outline" size={18} color={colors.primaryMuted} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{tableLabel}</Text>
            <View style={styles.statFooter}>
              <Text style={styles.statValue}>{playerCount}</Text>
              <Text style={styles.statHint}>{playersLabel}</Text>
            </View>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{inviteLabel}</Text>
            <View style={styles.statFooter}>
              <Text style={styles.inviteCode}>{group.invite_code}</Text>
            </View>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{createdLabel}</Text>
            <View style={styles.statFooter}>
              <Text style={styles.statDate}>{formatDate(group.created_at)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.openHint}>{openHint}</Text>
          <Pressable style={styles.openButton} onPress={onOpen}>
            <Text style={styles.openButtonLabel}>{openLabel}</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>
        </View>
      </PhyrexianPanel>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
  meta: {
    color: colors.primaryMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: '700',
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  copyButton: {
    width: touch.minWidth,
    height: touch.minHeight,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  stat: {
    flex: 1,
    minHeight: 72,
    backgroundColor: colors.cardInset,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.sm + 2,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statFooter: {
    alignSelf: 'stretch',
    gap: 2,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '700',
  },
  statHint: {
    color: colors.muted,
    fontSize: 11,
  },
  inviteCode: {
    color: colors.primaryMuted,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  statDate: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: spacing.md,
    gap: spacing.sm + 2,
    marginTop: spacing.lg,
  },
  openHint: {
    color: colors.muted,
    fontSize: 13,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    minHeight: touch.minHeight,
    paddingHorizontal: spacing.lg,
  },
  openButtonLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});