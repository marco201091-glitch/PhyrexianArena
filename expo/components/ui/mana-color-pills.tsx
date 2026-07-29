import { StyleSheet, Text, View } from 'react-native';
import { MANA_CHART_COLORS, MANA_COLOR_LABELS } from '@/lib/mana-colors';
import type { AppLanguage } from '@/lib/i18n/types';

const SYMBOL_SIZES = {
  xs: 18,
  sm: 22,
  md: 28,
} as const;

export type ManaColorBadgeSize = keyof typeof SYMBOL_SIZES;

type ManaColorBadgeProps = {
  color: string;
  size?: ManaColorBadgeSize;
  muted?: boolean;
  accessibilityLabel?: string;
};

export function ManaColorBadge({
  color,
  size = 'sm',
  muted = false,
  accessibilityLabel,
}: ManaColorBadgeProps) {
  const symbolSize = SYMBOL_SIZES[size];

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? color}
      style={[
        styles.badge,
        muted && styles.muted,
        {
          width: symbolSize,
          height: symbolSize,
          borderRadius: symbolSize / 2,
          backgroundColor: MANA_CHART_COLORS[color] || MANA_CHART_COLORS.C,
        },
      ]}
    >
      <Text style={[
        styles.badgeText,
        {
          color: color === 'W' || color === 'C' ? '#111827' : '#f8fafc',
          fontSize: Math.round(symbolSize * 0.45),
        },
      ]}>
        {color}
      </Text>
    </View>
  );
}

type ManaColorPillsProps = {
  colors: string[];
  size?: ManaColorBadgeSize;
  muted?: boolean;
  language?: AppLanguage;
};

export function ManaColorPills({
  colors: manaColors,
  size = 'sm',
  muted,
  language = 'en',
}: ManaColorPillsProps) {
  if (manaColors.length === 0) return null;

  return (
    <View style={styles.row}>
      {manaColors.map((color) => {
        const label = MANA_COLOR_LABELS[color] || MANA_COLOR_LABELS.C;
        return (
          <ManaColorBadge
            key={color}
            color={color}
            size={size}
            muted={muted}
            accessibilityLabel={label[language]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  badgeText: {
    fontWeight: '800',
    lineHeight: 14,
  },
  muted: {
    opacity: 0.4,
  },
});
