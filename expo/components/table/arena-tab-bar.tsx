import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing } from '@/constants/theme';

export type ArenaTab = 'matches' | 'players' | 'decks' | 'awards' | 'meta';

type ArenaTabBarProps = {
  activeTab: ArenaTab;
  labels: Record<ArenaTab, string>;
  onChange: (tab: ArenaTab) => void;
};

const TABS: ArenaTab[] = ['matches', 'players', 'decks', 'awards', 'meta'];
const TAB_ICONS: Record<ArenaTab, keyof typeof Ionicons.glyphMap> = {
  matches: 'time-outline',
  players: 'people-outline',
  decks: 'layers-outline',
  awards: 'ribbon-outline',
  meta: 'analytics-outline',
};

export function ArenaTabBar({ activeTab, labels, onChange }: ArenaTabBarProps) {
  return (
    <PhyrexianPanel variant="inset" padded={false} style={styles.panel}>
      <View style={styles.row}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => onChange(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab }}
          >
            <Ionicons
              name={TAB_ICONS[tab]}
              size={17}
              color={activeTab === tab ? colors.primaryLight : colors.muted}
            />
            <Text
              style={[styles.label, activeTab === tab && styles.labelActive]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              {labels[tab]}
            </Text>
          </Pressable>
        ))}
      </View>
    </PhyrexianPanel>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 7,
    gap: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  tabActive: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primarySurface,
    shadowColor: colors.primary,
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    flexShrink: 1,
    color: colors.muted,
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.foreground,
  },
});
