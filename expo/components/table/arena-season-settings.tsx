import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { ARENA_SEASON_MONTHS } from '@/lib/arena-seasons';

type Labels = {
  enabled: string;
  enabledHint: string;
  startMonth: string;
  resetHint: string;
};

export function ArenaSeasonSettings({
  enabled,
  resetMonth,
  locale,
  labels,
  onEnabledChange,
  onResetMonthChange,
}: {
  enabled: boolean;
  resetMonth: number;
  locale: string;
  labels: Labels;
  onEnabledChange: (enabled: boolean) => void;
  onResetMonthChange: (month: number) => void;
}) {
  return (
    <>
      <View style={styles.settingRow}>
        <View style={styles.settingText}>
          <Text style={styles.title}>{labels.enabled}</Text>
          <Text style={styles.hint}>{labels.enabledHint}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onEnabledChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.foreground}
        />
      </View>
      {enabled ? (
        <View style={styles.editor}>
          <Text style={styles.title}>{labels.startMonth}</Text>
          <View style={styles.monthGrid}>
            {ARENA_SEASON_MONTHS.map((month) => (
              <Pressable
                key={month}
                accessibilityRole="button"
                accessibilityState={{ selected: resetMonth === month }}
                onPress={() => onResetMonthChange(month)}
                style={[styles.monthButton, resetMonth === month && styles.monthButtonActive]}
              >
                <Text style={[styles.monthButtonText, resetMonth === month && styles.monthButtonTextActive]}>
                  {new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' })
                    .format(new Date(Date.UTC(2026, month - 1, 1)))}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>{labels.resetHint}</Text>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  settingText: { flex: 1, gap: 4 },
  title: { color: colors.foreground, fontSize: 14, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  editor: { gap: spacing.sm },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  monthButton: {
    minWidth: 52,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    alignItems: 'center',
  },
  monthButtonActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  monthButtonText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  monthButtonTextActive: { color: colors.foreground },
});
