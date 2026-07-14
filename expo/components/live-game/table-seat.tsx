import { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { colors, radii } from '@/constants/theme';
import {
  COMMANDER_DAMAGE_LIMIT,
  type DamageMode,
  type LiveGamePlayer,
  type PlayDirection,
} from '@/lib/live-game';
import type { SeatControlPlacement } from '@/lib/live-game-table-layout';
import type { ParticipantKey } from '@/lib/participant-keys';

type TableSeatProps = {
  player: LiveGamePlayer;
  allPlayers: LiveGamePlayer[];
  seatRotation: number;
  controlPlacement: SeatControlPlacement;
  damageMode: DamageMode;
  isSource: boolean;
  isDragHover: boolean;
  isActiveSelector: boolean;
  highlightLabel?: string | null;
  highlightTone?: 'starting' | 'random';
  startingDirection?: PlayDirection | null;
  startingBadgeLabel?: string;
  damagePulse: number;
  onAdjust: (delta: number) => void;
  onEliminate: () => void;
  onOpenDetails?: () => void;
  onSelectActivePlayer?: () => void;
  onRevive?: () => void;
  onDamageDragStart?: (key: ParticipantKey, x: number, y: number) => void;
  onDamageDragMove?: (x: number, y: number) => void;
  onDamageDragEnd?: (x: number, y: number) => void;
  onDamageDragCancel?: () => void;
  labels: {
    commanderDamage: string;
    infect: string;
    eliminated: string;
    revive: string;
    ko: string;
  };
};

const AnimatedView = Animated.createAnimatedComponent(View);

function CommanderDamageTray({
  sources,
  damageFrom,
  columns,
  tileWidth,
  tileHeight,
  gap,
  fontSize,
  onPress,
  accessibilityLabel,
}: {
  sources: LiveGamePlayer[];
  damageFrom: LiveGamePlayer['commanderDamageFrom'];
  columns: number;
  tileWidth: number;
  tileHeight: number;
  gap: number;
  fontSize: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  if (sources.length === 0) return null;

  return (
    <Pressable
      style={[
        styles.damageTray,
        {
          width: columns * tileWidth + (columns - 1) * gap + 8,
          gap,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {sources.map((source) => {
        const amount = damageFrom[source.participantKey] ?? 0;
        const hot = amount >= COMMANDER_DAMAGE_LIMIT - 3;
        return (
          <View
            key={source.participantKey}
            style={[styles.damageTile, { width: tileWidth, height: tileHeight }]}
          >
            <DeckImage
              uri={source.commanderImage}
              alt={source.commander}
              style={{ width: tileWidth, height: tileHeight }}
              containerStyle={{ width: tileWidth, height: tileHeight, borderRadius: 0 }}
              contentPosition="top"
            />
            <View style={[styles.damageValueBadge, hot && styles.damageValueBadgeHot]}>
              <Text
                style={[styles.damageValue, { fontSize }, hot && styles.damageValueHot]}
              >
                {amount}
              </Text>
            </View>
          </View>
        );
      })}
    </Pressable>
  );
}

export function TableSeat({
  player,
  allPlayers,
  seatRotation,
  controlPlacement,
  damageMode,
  isSource,
  isDragHover,
  isActiveSelector,
  highlightLabel,
  highlightTone = 'starting',
  startingDirection,
  startingBadgeLabel,
  damagePulse,
  onAdjust,
  onEliminate,
  onOpenDetails,
  onSelectActivePlayer,
  onRevive,
  onDamageDragStart,
  onDamageDragMove,
  onDamageDragEnd,
  onDamageDragCancel,
  labels,
}: TableSeatProps) {
  const mainValue = player.life;
  const isLow = mainValue <= 5;
  const commanderSources = useMemo(
    () => allPlayers.filter((entry) => entry.participantKey !== player.participantKey),
    [allPlayers, player.participantKey],
  );

  const shake = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const lifeScale = useSharedValue(1);

  useEffect(() => {
    if (damagePulse <= 0) return;
    flashOpacity.value = withSequence(
      withTiming(0.58, { duration: 70 }),
      withTiming(0, { duration: 280 }),
    );
    shake.value = withSequence(
      withTiming(-5, { duration: 40 }),
      withTiming(5, { duration: 40 }),
      withTiming(0, { duration: 40 }),
    );
    lifeScale.value = withSequence(
      withSpring(1.1, { damping: 9, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    );
  }, [damagePulse, flashOpacity, lifeScale, shake]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }, { translateY: shake.value * 0.3 }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const lifeStyle = useAnimatedStyle(() => ({ transform: [{ scale: lifeScale.value }] }));

  const dragGesture = Gesture.Pan()
    .enabled(!player.isEliminated && Boolean(onDamageDragStart))
    .minDistance(8)
    .onStart((event) => {
      if (onDamageDragStart) runOnJS(onDamageDragStart)(player.participantKey, event.absoluteX, event.absoluteY);
    })
    .onUpdate((event) => {
      if (onDamageDragMove) runOnJS(onDamageDragMove)(event.absoluteX, event.absoluteY);
    })
    .onEnd((event) => {
      if (onDamageDragEnd) runOnJS(onDamageDragEnd)(event.absoluteX, event.absoluteY);
    })
    .onFinalize((_event, success) => {
      if (!success && onDamageDragCancel) runOnJS(onDamageDragCancel)();
    });

  const [seatSize, setSeatSize] = useState({ width: 0, height: 0 });
  const isSideways = Math.abs(seatRotation) % 180 === 90;
  const canvasWidth = isSideways ? seatSize.height : seatSize.width;
  const canvasHeight = isSideways ? seatSize.width : seatSize.height;
  const canvasStyle = seatSize.width > 0
    ? {
        width: canvasWidth,
        height: canvasHeight,
        left: (seatSize.width - canvasWidth) / 2,
        top: (seatSize.height - canvasHeight) / 2,
        transform: [{ rotate: `${seatRotation}deg` }],
      }
    : styles.canvasHidden;

  const handleSeatLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSeatSize({ width, height });
  };

  const nameOnLeft = controlPlacement.nameSide === 'left';
  const isCompact = canvasWidth > 0 && canvasWidth < 280;
  const commanderCount = commanderSources.length;
  const commanderColumns = commanderCount <= 2 ? commanderCount : commanderCount <= 4 ? 2 : 3;
  const playerCount = allPlayers.length;
  const commanderMaxHeight = playerCount <= 3 ? 64 : playerCount === 4 ? 52 : 40;
  const commanderMinHeight = playerCount >= 6 ? 24 : playerCount === 5 ? 28 : 32;
  const commanderTileHeight = Math.max(
    commanderMinHeight,
    Math.min(
      commanderMaxHeight,
      Math.round(Math.min(canvasWidth * 0.18, canvasHeight * 0.2)),
    ),
  );
  const commanderTileWidth = Math.round(commanderTileHeight * 0.74);
  const commanderGap = Math.max(2, Math.min(5, Math.round(commanderTileHeight * 0.08)));
  const commanderFontSize = Math.max(8, Math.min(16, Math.round(commanderTileHeight * 0.25)));
  const lifeFontSize = Math.max(46, Math.min(isCompact ? 58 : 76, Math.round(canvasHeight * 0.4)));

  return (
    <AnimatedView
      onLayout={handleSeatLayout}
      style={[
        styles.seat,
        isSource && styles.sourceSeat,
        isDragHover && styles.hoverSeat,
        isActiveSelector && styles.activeSelectorSeat,
        highlightLabel && (highlightTone === 'random' ? styles.randomSeat : styles.startingSeat),
        player.isEliminated && styles.eliminatedSeat,
        cardStyle,
      ]}
    >
      <View style={[styles.playerCanvas, canvasStyle]}>
        <View style={styles.backgroundWrap} pointerEvents="none">
          <DeckImage
            uri={player.commanderImage}
            alt={player.commander}
            style={styles.backgroundImage}
            containerStyle={styles.backgroundImageWrap}
            contentFit="cover"
            contentPosition="top"
          />
        </View>
        <View style={styles.scrim} pointerEvents="none" />
        <View style={[styles.edgeShade, styles.edgeShadeLeft]} pointerEvents="none" />
        <View style={[styles.edgeShade, styles.edgeShadeRight]} pointerEvents="none" />
        <AnimatedView pointerEvents="none" style={[styles.flash, flashStyle]} />

        {onSelectActivePlayer && !player.isEliminated ? (
          <Pressable
            style={styles.selectSurface}
            onPress={onSelectActivePlayer}
            accessibilityRole="button"
            accessibilityLabel={player.displayName}
            accessibilityState={{ selected: isActiveSelector }}
          />
        ) : null}

        {highlightLabel ? (
          <View
            pointerEvents="none"
            style={[
              styles.playerHighlight,
              highlightTone === 'random' ? styles.randomHighlight : styles.startingHighlight,
            ]}
          >
            <Text style={styles.playerHighlightText}>{highlightLabel}</Text>
          </View>
        ) : null}

        {startingDirection && startingBadgeLabel ? (
          <View pointerEvents="none" style={styles.startingBadge}>
            <Ionicons
              name={startingDirection === 'clockwise' ? 'arrow-redo-outline' : 'arrow-undo-outline'}
              size={14}
              color="#fef3c7"
            />
            <Text style={styles.startingBadgeText} numberOfLines={1}>{startingBadgeLabel}</Text>
          </View>
        ) : null}

        {player.isEliminated ? (
          <View style={styles.eliminatedOverlay}>
            <Ionicons name="skull-outline" size={28} color="#fecaca" />
            <Text style={styles.eliminatedLabel}>{labels.eliminated}</Text>
            {onRevive ? (
              <Pressable style={styles.reviveBtn} onPress={onRevive}>
                <Text style={styles.reviveText}>{labels.revive}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <>
            <Pressable
              style={[styles.edgeButton, styles.minusButton]}
              onPress={() => onAdjust(-1)}
              accessibilityRole="button"
              accessibilityLabel={`${player.displayName} -1`}
            >
              <Text style={styles.edgeButtonText}>−</Text>
            </Pressable>

            <Pressable
              style={[styles.edgeButton, styles.plusButton]}
              onPress={() => onAdjust(1)}
              accessibilityRole="button"
              accessibilityLabel={`${player.displayName} +1`}
            >
              <Text style={styles.edgeButtonText}>+</Text>
            </Pressable>

            <View
              style={[
                styles.metadataRail,
                isCompact
                  ? styles.metadataCompact
                  : nameOnLeft ? styles.metadataLeft : styles.metadataRight,
              ]}
            >
              <Text style={styles.playerName} numberOfLines={1}>{player.displayName}</Text>
            </View>

            <View
              style={styles.damageTrayAnchor}
            >
              <CommanderDamageTray
                sources={commanderSources}
                damageFrom={player.commanderDamageFrom}
                columns={commanderColumns}
                tileWidth={commanderTileWidth}
                tileHeight={commanderTileHeight}
                gap={commanderGap}
                fontSize={commanderFontSize}
                onPress={onOpenDetails}
                accessibilityLabel={`${player.displayName} · ${labels.commanderDamage}`}
              />
            </View>

            <GestureDetector gesture={dragGesture}>
              <AnimatedView style={[styles.lifeReadout, lifeStyle]}>
                <Text
                  style={[
                    styles.lifeValue,
                    { fontSize: lifeFontSize, lineHeight: lifeFontSize + 4 },
                    isLow && styles.dangerLife,
                  ]}
                >
                  {mainValue}
                </Text>
                {player.infect > 0 || damageMode === 'infect' ? (
                  <View style={[styles.secondaryPill, styles.infectPill]}>
                    <Ionicons name="skull" size={11} color="#f5d0fe" />
                    <Text style={styles.secondaryValue}>{player.infect}</Text>
                  </View>
                ) : null}
              </AnimatedView>
            </GestureDetector>

            <Pressable
              style={styles.koButton}
              onPress={onEliminate}
              accessibilityRole="button"
              accessibilityLabel={`${labels.ko}: ${player.displayName}`}
            >
              <Ionicons name="skull-outline" size={15} color="rgba(254,202,202,0.86)" />
            </Pressable>
          </>
        )}
      </View>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  seat: {
    flex: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: '#09090f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sourceSeat: {
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  hoverSeat: {
    borderWidth: 2,
    borderColor: '#22d3ee',
  },
  activeSelectorSeat: {
    borderWidth: 3,
    borderColor: '#22d3ee',
  },
  startingSeat: {
    borderWidth: 3,
    borderColor: '#fbbf24',
  },
  randomSeat: {
    borderWidth: 3,
    borderColor: '#c4b5fd',
  },
  eliminatedSeat: {
    opacity: 0.82,
  },
  playerCanvas: {
    position: 'absolute',
    overflow: 'hidden',
  },
  canvasHidden: {
    opacity: 0,
  },
  backgroundWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImageWrap: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 3, 8, 0.25)',
    zIndex: 1,
  },
  edgeShade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '25%',
    backgroundColor: 'rgba(0,0,0,0.17)',
    zIndex: 2,
  },
  edgeShadeLeft: {
    left: 0,
  },
  edgeShadeRight: {
    right: 0,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(239, 68, 68, 0.42)',
    zIndex: 3,
  },
  selectSurface: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 30,
  },
  playerHighlight: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
  },
  startingHighlight: {
    backgroundColor: 'rgba(251, 191, 36, 0.22)',
    borderColor: 'rgba(253, 230, 138, 0.95)',
  },
  randomHighlight: {
    backgroundColor: 'rgba(124, 58, 237, 0.28)',
    borderColor: 'rgba(221, 214, 254, 0.95)',
  },
  startingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    zIndex: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.52)',
    backgroundColor: 'rgba(69,42,8,0.88)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  startingBadgeText: {
    flexShrink: 1,
    color: '#fef3c7',
    fontSize: 10,
    fontWeight: '900',
  },
  playerHighlightText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  edgeButton: {
    position: 'absolute',
    top: '50%',
    zIndex: 8,
    width: 48,
    height: 64,
    marginTop: -32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minusButton: {
    left: 0,
  },
  plusButton: {
    right: 0,
  },
  edgeButtonText: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '300',
    lineHeight: 42,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 7,
  },
  metadataRail: {
    position: 'absolute',
    top: '50%',
    zIndex: 6,
    maxWidth: 82,
    marginTop: -18,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(4, 5, 10, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  metadataLeft: {
    left: 46,
  },
  metadataRight: {
    right: 46,
  },
  metadataCompact: {
    top: 6,
    left: 42,
    right: 42,
    maxWidth: undefined,
    marginTop: 0,
    paddingVertical: 4,
  },
  playerName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  damageTrayAnchor: {
    position: 'absolute',
    left: 42,
    right: 42,
    top: '74%',
    transform: [{ translateY: -24 }],
    alignItems: 'center',
    zIndex: 6,
  },
  damageTray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 3,
    borderRadius: radii.sm,
    padding: 4,
    backgroundColor: 'rgba(4, 5, 10, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  damageTile: {
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: '#101018',
  },
  damageValueBadge: {
    position: 'absolute',
    left: 2,
    right: 2,
    bottom: 2,
    minHeight: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.76)',
  },
  damageValueBadgeHot: {
    backgroundColor: 'rgba(127,29,29,0.9)',
  },
  damageValue: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  damageValueHot: {
    color: '#fecaca',
  },
  lifeReadout: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    zIndex: 7,
    width: 132,
    minHeight: 112,
    marginLeft: -66,
    marginTop: -56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lifeValue: {
    color: '#ffffff',
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -3,
    textShadowColor: 'rgba(0,0,0,0.92)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
    includeFontPadding: false,
  },
  dangerLife: {
    color: '#fecaca',
  },
  secondaryPill: {
    minWidth: 34,
    height: 20,
    marginTop: -4,
    paddingHorizontal: 7,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  infectPill: {
    backgroundColor: 'rgba(88,28,135,0.78)',
    borderColor: 'rgba(216,180,254,0.3)',
  },
  secondaryValue: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  koButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(254,202,202,0.14)',
  },
  eliminatedOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  eliminatedLabel: {
    color: '#fecaca',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  reviveBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(10,10,15,0.88)',
  },
  reviveText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '700',
  },
});
