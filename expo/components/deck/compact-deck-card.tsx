import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeckImage } from '@/components/deck/deck-image';
import { colors, radii, spacing } from '@/constants/theme';
import { getDeckMastery } from '@/lib/deck-mastery';

type CompactDeckCardProps = {
  artUri?: string | null;
  title: string;
  commander?: string | null;
  eyebrow?: string;
  meta?: string;
  badge?: string | number;
  trailing?: ReactNode;
  winner?: boolean;
  gamesPlayed?: number;
  wins?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function CompactDeckCard({
  artUri,
  title,
  commander,
  eyebrow,
  meta,
  badge,
  trailing,
  winner = false,
  gamesPlayed,
  wins,
  onPress,
  accessibilityLabel,
  style,
}: CompactDeckCardProps) {
  const hasMastery = typeof gamesPlayed === 'number' && gamesPlayed > 0;
  const mastery = hasMastery ? getDeckMastery(gamesPlayed, wins ?? 0) : null;
  const borderColor = mastery?.color ?? (winner ? colors.primaryLight : colors.borderSoft);

  const content = (
    <>
      <DeckImage
        uri={artUri}
        alt={commander || title}
        style={styles.art}
        containerStyle={styles.art}
        contentFit="cover"
        contentPosition="top"
      />
      <View pointerEvents="none" style={styles.scrim} />
      <View pointerEvents="none" style={[styles.accent, { backgroundColor: borderColor }]} />

      <View style={styles.content}>
        {badge != null ? (
          <View style={[styles.badge, { borderColor }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : winner ? (
          <View style={[styles.badge, { borderColor }]}>
            <Ionicons name="trophy" size={13} color={colors.primaryMuted} />
          </View>
        ) : null}

        <View style={styles.copy}>
          {eyebrow ? <Text style={styles.eyebrow} numberOfLines={1}>{eyebrow}</Text> : null}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {commander ? <Text style={styles.commander} numberOfLines={1}>{commander}</Text> : null}
          {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
        </View>

        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
    </>
  );

  const cardStyle = [
    styles.card,
    {
      borderColor,
      shadowColor: borderColor,
      shadowOpacity: winner || hasMastery ? 0.24 : 0.08,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    minHeight: 94,
    overflow: 'hidden',
    borderRadius: radii.md,
    borderWidth: 1.5,
    backgroundColor: colors.cardInset,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 4,
  },
  art: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(2, 5, 4, 0.72)',
  },
  accent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
  },
  content: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  badge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.66)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  eyebrow: {
    color: colors.primaryMuted,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  commander: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  meta: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.64)',
    fontSize: 10,
    lineHeight: 13,
  },
  trailing: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.992 }],
  },
});
