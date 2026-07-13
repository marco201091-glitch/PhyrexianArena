import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { getManaSymbolImageSource, MANA_COLOR_LABELS } from '@/lib/mana-colors';
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
    <View style={[styles.badge, muted && styles.muted, { width: symbolSize, height: symbolSize }]}>
      <Image
        source={getManaSymbolImageSource(color)}
        style={{ width: symbolSize, height: symbolSize }}
        contentFit="contain"
        alt={accessibilityLabel ?? color}
      />
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
  },
  muted: {
    opacity: 0.4,
  },
});