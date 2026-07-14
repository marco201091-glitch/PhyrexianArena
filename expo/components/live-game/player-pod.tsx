import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { DeckImage } from '@/components/deck/deck-image';
import { Button } from '@/components/ui/button';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import {
  COMMANDER_DAMAGE_LIMIT,
  INFECT_LOSS_THRESHOLD,
  type DamageMode,
  type LiveGamePlayer,
} from '@/lib/live-game';
import type { ParticipantKey } from '@/lib/participant-keys';

type PlayerPodProps = {
  player: LiveGamePlayer;
  damageMode: DamageMode;
  variant?: 'list' | 'table' | 'mobile';
  isSource: boolean;
  isTarget: boolean;
  isDragHover?: boolean;
  damagePulse?: number;
  onAdjust: (delta: number) => void;
  onSelectSource: () => void;
  onSelectTarget: () => void;
  onEliminate: () => void;
  onRevive?: () => void;
  onDamageDragStart?: (key: ParticipantKey, x: number, y: number) => void;
  onDamageDragMove?: (x: number, y: number) => void;
  onDamageDragEnd?: (x: number, y: number) => void;
  labels: {
    commanderDamage: string;
    infect: string;
    eliminated: string;
    revive: string;
  };
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PlayerPod({
  player,
  damageMode,
  variant = 'list',
  isSource,
  isTarget,
  isDragHover = false,
  damagePulse = 0,
  onAdjust,
  onSelectSource,
  onSelectTarget,
  onEliminate,
  onRevive,
  onDamageDragStart,
  onDamageDragMove,
  onDamageDragEnd,
  labels,
}: PlayerPodProps) {
  const isMobile = variant === 'mobile';
  const isCompact = variant === 'table' || isMobile;
  const mainValue = damageMode === 'infect' ? player.infect : player.life;
  const maxCommanderDamage = Math.max(0, ...Object.values(player.commanderDamageFrom));

  const shakeX = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const lifeScale = useSharedValue(1);

  useEffect(() => {
    if (damagePulse <= 0) return;
    flashOpacity.value = withSequence(
      withTiming(0.75, { duration: 70 }),
      withTiming(0, { duration: 320 }),
    );
    shakeX.value = withSequence(
      withTiming(-6, { duration: 45 }),
      withTiming(6, { duration: 45 }),
      withTiming(-4, { duration: 45 }),
      withTiming(4, { duration: 45 }),
      withTiming(0, { duration: 45 }),
    );
    lifeScale.value = withSequence(
      withSpring(1.14, { damping: 8, stiffness: 320 }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    );
  }, [damagePulse, flashOpacity, lifeScale, shakeX]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const flashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const lifeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lifeScale.value }],
  }));

  const dragGesture = Gesture.Pan()
    .enabled(!player.isEliminated && Boolean(onDamageDragStart))
    .minDistance(8)
    .onStart((event) => {
      if (onDamageDragStart) {
        runOnJS(onDamageDragStart)(player.participantKey, event.absoluteX, event.absoluteY);
      }
    })
    .onUpdate((event) => {
      if (onDamageDragMove) {
        runOnJS(onDamageDragMove)(event.absoluteX, event.absoluteY);
      }
    })
    .onEnd((event) => {
      if (onDamageDragEnd) {
        runOnJS(onDamageDragEnd)(event.absoluteX, event.absoluteY);
      }
    });

  const lifeCounter = (
    <GestureDetector gesture={dragGesture}>
      <Animated.View style={[styles.lifeBubble, isMobile && styles.lifeBubbleMobile, lifeAnimatedStyle]}>
        <Text
          style={[
            isMobile ? styles.lifeValueMobile : isCompact ? styles.counterValueTable : styles.counterValue,
            mainValue <= 5 && damageMode === 'life' && styles.lowLife,
          ]}
        >
          {mainValue}
        </Text>
      </Animated.View>
    </GestureDetector>
  );

  if (isMobile) {
    return (
      <AnimatedPressable
        onPress={onSelectTarget}
        onLongPress={onSelectSource}
        style={[
          styles.mobileCard,
          isSource && styles.sourceCard,
          isTarget && styles.targetCard,
          isDragHover && styles.dragHoverCard,
          player.isEliminated && styles.eliminatedCard,
          cardAnimatedStyle,
        ]}
      >
        <Animated.View pointerEvents="none" style={[styles.damageFlash, flashAnimatedStyle]} />

        {player.isEliminated ? (
          <View style={styles.eliminatedOverlay}>
            <Text style={styles.eliminatedLabel}>{labels.eliminated}</Text>
            {onRevive ? (
              <Button label={labels.revive} variant="outline" size="sm" onPress={onRevive} />
            ) : null}
          </View>
        ) : null}

        <View style={styles.mobileTop}>
          <DeckImage
            uri={player.commanderImage}
            alt={player.commander}
            style={styles.mobileImage}
            containerStyle={styles.mobileImageWrap}
          />
          <View style={styles.mobileMeta}>
            <Text style={styles.mobileName} numberOfLines={1}>{player.displayName}</Text>
            <Text style={styles.mobileCommander} numberOfLines={1}>{player.commander}</Text>
            {damageMode === 'commander' ? (
              <Text style={styles.mobileSubMeta}>
                {labels.commanderDamage} {maxCommanderDamage}/{COMMANDER_DAMAGE_LIMIT}
              </Text>
            ) : null}
            {player.infect > 0 && damageMode !== 'infect' ? (
              <Text style={styles.mobileSubMeta}>
                {labels.infect} {player.infect}/{INFECT_LOSS_THRESHOLD}
              </Text>
            ) : null}
          </View>
          <View style={styles.mobileCounterCol}>
            <View style={styles.mobileCounterRow}>
              <Pressable style={styles.mobileStepButton} onPress={() => onAdjust(-1)}>
                <Ionicons name="remove" size={18} color={colors.foreground} />
              </Pressable>
              {lifeCounter}
              <Pressable style={styles.mobileStepButton} onPress={() => onAdjust(1)}>
                <Ionicons name="add" size={18} color={colors.foreground} />
              </Pressable>
            </View>
          </View>
        </View>

        {!player.isEliminated ? (
          <View style={styles.mobileActions}>
            {[5, 10].map((amount) => (
              <Pressable key={amount} style={styles.mobileChip} onPress={() => onAdjust(amount)}>
                <Text style={styles.mobileChipText}>+{amount}</Text>
              </Pressable>
            ))}
            <Pressable style={[styles.mobileChip, styles.mobileKoChip]} onPress={onEliminate}>
              <Text style={styles.mobileKoText}>KO</Text>
            </Pressable>
          </View>
        ) : null}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onSelectTarget}
      onLongPress={onSelectSource}
      style={[
        styles.card,
        isCompact && styles.cardTable,
        isSource && styles.sourceCard,
        isTarget && styles.targetCard,
        isDragHover && styles.dragHoverCard,
        player.isEliminated && styles.eliminatedCard,
        cardAnimatedStyle,
      ]}
    >
      <Animated.View pointerEvents="none" style={[styles.damageFlash, flashAnimatedStyle]} />

      {player.isEliminated ? (
        <View style={styles.eliminatedOverlay}>
          <Text style={styles.eliminatedLabel}>{labels.eliminated}</Text>
          {onRevive ? (
            <Button label={labels.revive} variant="outline" size="sm" onPress={onRevive} />
          ) : null}
        </View>
      ) : null}

      <View style={[styles.header, isCompact && styles.headerTable]}>
        <DeckImage
          uri={player.commanderImage}
          alt={player.commander}
          style={isCompact ? styles.imageTable : styles.image}
          containerStyle={isCompact ? styles.imageWrapTable : styles.imageWrap}
        />
        <View style={styles.meta}>
          <Text style={[styles.name, isCompact && styles.nameTable]} numberOfLines={1}>
            {player.displayName}
          </Text>
          <Text style={[styles.commander, isCompact && styles.commanderTable]} numberOfLines={isCompact ? 1 : 2}>
            {player.commander}
          </Text>
          {damageMode === 'commander' ? (
            <Text style={styles.subMeta}>
              {labels.commanderDamage}: {maxCommanderDamage}/{COMMANDER_DAMAGE_LIMIT}
            </Text>
          ) : null}
          {player.infect > 0 && damageMode !== 'infect' ? (
            <Text style={styles.subMeta}>{labels.infect}: {player.infect}/{INFECT_LOSS_THRESHOLD}</Text>
          ) : null}
        </View>
        {!isCompact ? (
          <Pressable onPress={onSelectSource} style={styles.sourceHandle}>
            <Ionicons name="swap-horizontal" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.counterRow}>
        <Pressable style={[styles.counterButton, isCompact && styles.counterButtonTable]} onPress={() => onAdjust(-1)}>
          <Ionicons name="remove" size={isCompact ? 18 : 22} color={colors.foreground} />
        </Pressable>
        {lifeCounter}
        <Pressable style={[styles.counterButton, isCompact && styles.counterButtonTable]} onPress={() => onAdjust(1)}>
          <Ionicons name="add" size={isCompact ? 18 : 22} color={colors.foreground} />
        </Pressable>
      </View>

      {!player.isEliminated ? (
        <View style={styles.quickRow}>
          {[5, 10].map((amount) => (
            <Button
              key={amount}
              label={`+${amount}`}
              size="sm"
              variant="outline"
              onPress={() => onAdjust(amount)}
              style={styles.quickButton}
            />
          ))}
          <Button label="KO" size="sm" variant="destructive" onPress={onEliminate} style={styles.quickButton} />
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
    ...shadows.cardArt,
  },
  cardTable: {
    padding: spacing.sm,
    gap: 6,
  },
  mobileCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardElevated,
    padding: spacing.sm,
    gap: spacing.sm,
    overflow: 'hidden',
    ...shadows.cardArt,
  },
  sourceCard: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  targetCard: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  dragHoverCard: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 2,
  },
  eliminatedCard: {
    opacity: 0.72,
  },
  damageFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(239, 68, 68, 0.55)',
    borderRadius: radii.lg,
    zIndex: 1,
  },
  eliminatedOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radii.lg,
  },
  eliminatedLabel: {
    color: '#fecaca',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mobileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mobileImageWrap: {
    width: 48,
    height: 67,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  mobileImage: {
    width: 48,
    height: 67,
  },
  mobileMeta: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  mobileName: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '700',
  },
  mobileCommander: {
    color: colors.muted,
    fontSize: 12,
  },
  mobileSubMeta: {
    color: colors.primaryMuted,
    fontSize: 11,
  },
  mobileCounterCol: {
    alignItems: 'flex-end',
  },
  mobileCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mobileStepButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  lifeBubble: {
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    paddingHorizontal: spacing.xs,
  },
  lifeBubbleMobile: {
    minWidth: 48,
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
  },
  lifeValueMobile: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  mobileActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  mobileChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.background,
  },
  mobileChipText: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
  },
  mobileKoChip: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  mobileKoText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '800',
  },
  header: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  headerTable: {
    gap: 6,
  },
  imageWrap: {
    width: 56,
    height: 78,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  imageWrapTable: {
    width: 42,
    height: 59,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  image: {
    width: 56,
    height: 78,
  },
  imageTable: {
    width: 42,
    height: 59,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '700',
  },
  nameTable: {
    fontSize: 13,
  },
  commander: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  commanderTable: {
    fontSize: 10,
    lineHeight: 13,
  },
  subMeta: {
    color: '#c4b5fd',
    fontSize: 11,
  },
  sourceHandle: {
    padding: spacing.xs,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  counterButtonTable: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  counterValue: {
    minWidth: 72,
    textAlign: 'center',
    color: colors.foreground,
    fontSize: 40,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  counterValueTable: {
    textAlign: 'center',
    color: colors.foreground,
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  lowLife: {
    color: '#f87171',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  quickButton: {
    minWidth: 52,
  },
});