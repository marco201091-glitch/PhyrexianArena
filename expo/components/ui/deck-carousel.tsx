import { useMemo, type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/theme';
import { deckPickerCardWidth } from '@/lib/layout';

type DeckCarouselProps = {
  itemCount: number;
  swipeHint: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function DeckCarousel({ itemCount, swipeHint, children, style }: DeckCarouselProps) {
  const { width } = useWindowDimensions();
  const cardWidth = deckPickerCardWidth(width);
  const snapInterval = cardWidth + spacing.md;
  const showScrollHint = itemCount > 1;

  const contentStyle = useMemo(
    () => [styles.carouselContent, { paddingRight: showScrollHint ? spacing.xl : 0 }],
    [showScrollHint],
  );

  return (
    <View style={[styles.wrapper, style]}>
      {showScrollHint ? (
        <View style={styles.hintRow}>
          <Ionicons name="swap-horizontal" size={14} color={colors.primaryMuted} />
          <Text style={styles.hintText}>{swipeHint}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{itemCount}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.carouselFrame}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={showScrollHint}
          decelerationRate="fast"
          snapToInterval={showScrollHint ? snapInterval : undefined}
          snapToAlignment="start"
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        {showScrollHint ? (
          <View pointerEvents="none" style={styles.chevronHint}>
            <Ionicons name="chevron-forward" size={18} color={colors.primaryMuted} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function useDeckCarouselCardWidth(): number {
  const { width } = useWindowDimensions();
  return deckPickerCardWidth(width);
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hintText: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  countBadge: {
    borderRadius: 999,
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    color: colors.primaryMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  carouselFrame: {
    position: 'relative',
  },
  carouselContent: {
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  chevronHint: {
    position: 'absolute',
    right: 4,
    top: '50%',
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.selectionTintStrong,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});