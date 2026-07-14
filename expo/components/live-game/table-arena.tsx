import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSharedValue } from 'react-native-reanimated';
import { DamageConfirmSheet } from '@/components/live-game/damage-confirm-sheet';
import { DamageDragOverlay } from '@/components/live-game/damage-drag-overlay';
import { TableSeat } from '@/components/live-game/table-seat';
import { PlayerDamageSheet } from '@/components/live-game/player-damage-sheet';
import { colors, radii, spacing } from '@/constants/theme';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import {
  findPodAtPoint,
  getCenterToolbarBand,
  getLandscapeSeatRotation,
  getSeatControlPlacement,
  getSeatRotation,
  getSquareTableLayouts,
  getViewportTableOrientation,
  mapPlayersToSeats,
  usesCenterToolbar,
  type PodBounds,
  type TableLayoutVariant,
} from '@/lib/live-game-table-layout';
import type { DamageMode, LiveGamePlayer, PlayDirection } from '@/lib/live-game';
import type { ParticipantKey } from '@/lib/participant-keys';

type PendingTransfer = {
  sourceKey: ParticipantKey;
  targetKey: ParticipantKey;
};

type TableArenaProps = {
  players: LiveGamePlayer[];
  damageMode: DamageMode;
  randomHighlight: ParticipantKey | null;
  startingPlayerKey: ParticipantKey | null;
  startingHighlight: ParticipantKey | null;
  startingDirection: PlayDirection | null;
  layoutVariant: TableLayoutVariant;
  damagePulse: Record<string, number>;
  activePlayers: LiveGamePlayer[];
  labels: {
    damageLife: string;
    damageCommander: string;
    damageInfect: string;
    randomAll: string;
    randomOpponents: string;
    selectActivePlayer: string;
    dragDamage: string;
    dropDamage: string;
    damageConfirmTitle: string;
    damageAmount: string;
    lifeDamage: string;
    commanderDamage: string;
    applyDamage: string;
    cancel: string;
    commanderDamageMeta: string;
    infect: string;
    eliminated: string;
    revive: string;
    selected: string;
    ko: string;
    endGame: string;
    startingPlayer: string;
    clockwise: string;
    counterclockwise: string;
    damageReceived: string;
    undo: string;
  };
  onBack: () => void;
  canUndo: boolean;
  onUndo: () => void;
  onEndGame: () => void;
  onDamageModeChange: (mode: DamageMode) => void;
  onAdjust: (key: ParticipantKey, delta: number) => void;
  onApplyDragDamage: (input: {
    sourceKey: ParticipantKey;
    targetKey: ParticipantKey;
    amount: number;
    isCommander: boolean;
  }) => void;
  onEliminate: (key: ParticipantKey) => void;
  onRevive: (key: ParticipantKey) => void;
  onPickRandom: (pool?: ParticipantKey[]) => void;
};

const DAMAGE_MODES: DamageMode[] = ['life', 'commander', 'infect'];

const DAMAGE_MODE_META: Record<DamageMode, {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  surface: string;
}> = {
  life: { icon: 'heart', color: '#86efac', surface: 'rgba(22, 101, 52, 0.82)' },
  commander: { icon: 'shield', color: '#93c5fd', surface: 'rgba(30, 64, 175, 0.82)' },
  infect: { icon: 'skull', color: '#e9d5ff', surface: 'rgba(107, 33, 168, 0.82)' },
};

export function TableArena({
  players,
  damageMode,
  randomHighlight,
  startingPlayerKey,
  startingHighlight,
  startingDirection,
  layoutVariant,
  damagePulse,
  activePlayers,
  labels,
  onBack,
  canUndo,
  onUndo,
  onEndGame,
  onDamageModeChange,
  onAdjust,
  onApplyDragDamage,
  onEliminate,
  onRevive,
  onPickRandom,
}: TableArenaProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [arenaSize, setArenaSize] = useState({ width: 0, height: 0 });
  const [showTools, setShowTools] = useState(false);
  const [isChoosingActivePlayer, setIsChoosingActivePlayer] = useState(false);
  const [activePickerKey, setActivePickerKey] = useState<ParticipantKey | null>(null);
  const [dragSource, setDragSource] = useState<ParticipantKey | null>(null);
  const [dragHoverKey, setDragHoverKey] = useState<ParticipantKey | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null);
  const [detailsPlayerKey, setDetailsPlayerKey] = useState<ParticipantKey | null>(null);
  const [damageFeedback, setDamageFeedback] = useState<string | null>(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragSourceX = useSharedValue(0);
  const dragSourceY = useSharedValue(0);
  const dragSourceRef = useRef<ParticipantKey | null>(null);
  const dragHoverRef = useRef<ParticipantKey | null>(null);
  const podBoundsRef = useRef<Record<string, PodBounds>>({});
  const podRefs = useRef<Record<string, View | null>>({});
  const activePickerResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playerCount = players.length;
  const arenaWidth = arenaSize.width || screenWidth;
  const arenaHeight = arenaSize.height || 480;
  const tableOrientation = getViewportTableOrientation(arenaWidth, arenaHeight);
  const hasCenterToolbar = usesCenterToolbar(playerCount) && tableOrientation === 'portrait';
  const toolbarHeight = hasCenterToolbar
    ? 0
    : 56 + Math.max(insets.bottom, 8);
  const layoutHeight = Math.max(0, arenaHeight - toolbarHeight);
  const seatLayouts = useMemo(
    () => getSquareTableLayouts(
      playerCount,
      arenaWidth,
      layoutHeight,
      layoutVariant,
      tableOrientation,
    ),
    [layoutHeight, arenaWidth, playerCount, layoutVariant, tableOrientation],
  );

  const centerToolbarBand = useMemo(
    () => hasCenterToolbar
      ? getCenterToolbarBand(playerCount, arenaWidth, layoutHeight, layoutVariant)
      : null,
    [arenaWidth, hasCenterToolbar, layoutHeight, layoutVariant, playerCount],
  );
  const isVerticalCenterToolbar = centerToolbarBand?.axis === 'vertical';

  const seatAssignments = useMemo(
    () => mapPlayersToSeats(players, seatLayouts, null),
    [players, seatLayouts],
  );

  const playersByKey = useMemo(
    () => new Map(players.map((player) => [player.participantKey, player])),
    [players],
  );

  const refreshPodBounds = useCallback((key: string) => {
    const ref = podRefs.current[key];
    if (!ref) return;
    ref.measureInWindow((x, y, width, height) => {
      podBoundsRef.current[key] = { x, y, width, height };
    });
  }, []);

  const refreshAllBounds = useCallback(() => {
    seatAssignments.forEach(({ player }) => refreshPodBounds(player.participantKey));
  }, [refreshPodBounds, seatAssignments]);

  const resolveDropTarget = useCallback((x: number, y: number, sourceKey: ParticipantKey) => {
    return findPodAtPoint(podBoundsRef.current, x, y, sourceKey);
  }, []);

  const openDamageSheet = useCallback((sourceKey: ParticipantKey, targetKey: ParticipantKey) => {
    if (sourceKey === targetKey) return;
    setPendingTransfer({ sourceKey, targetKey });
    void hapticSuccess();
  }, []);

  const handleDragStart = useCallback((key: ParticipantKey, x: number, y: number) => {
    refreshAllBounds();
    dragSourceRef.current = key;
    dragHoverRef.current = null;
    setDragSource(key);
    setDragHoverKey(null);
    dragX.value = x;
    dragY.value = y;
    dragSourceX.value = x;
    dragSourceY.value = y;
    void hapticLight();
  }, [dragSourceX, dragSourceY, dragX, dragY, refreshAllBounds]);

  const handleDragMove = useCallback((x: number, y: number) => {
    dragX.value = x;
    dragY.value = y;
    const sourceKey = dragSourceRef.current;
    if (!sourceKey) return;
    const hover = resolveDropTarget(x, y, sourceKey) as ParticipantKey | null;
    if (hover === dragHoverRef.current) return;
    dragHoverRef.current = hover;
    setDragHoverKey(hover);
    if (hover) void hapticLight();
  }, [dragX, dragY, resolveDropTarget]);

  const handleDragEnd = useCallback((x: number, y: number) => {
    const sourceKey = dragSourceRef.current;
    dragSourceRef.current = null;
    dragHoverRef.current = null;
    setDragSource(null);
    setDragHoverKey(null);
    if (!sourceKey) return;
    const targetKey = resolveDropTarget(x, y, sourceKey);
    if (targetKey) {
      openDamageSheet(sourceKey, targetKey as ParticipantKey);
    }
  }, [openDamageSheet, resolveDropTarget]);

  const handleDragCancel = useCallback(() => {
    dragSourceRef.current = null;
    dragHoverRef.current = null;
    setDragSource(null);
    setDragHoverKey(null);
  }, []);

  const handleArenaLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArenaSize({ width, height });
  }, []);

  const pendingSource = pendingTransfer ? playersByKey.get(pendingTransfer.sourceKey) ?? null : null;
  const pendingTarget = pendingTransfer ? playersByKey.get(pendingTransfer.targetKey) ?? null : null;
  useEffect(() => {
    if (!activePickerKey) return;
    const stillActive = activePlayers.some((player) => player.participantKey === activePickerKey);
    if (!stillActive) setActivePickerKey(null);
  }, [activePickerKey, activePlayers]);

  useEffect(() => () => {
    if (activePickerResetRef.current) clearTimeout(activePickerResetRef.current);
  }, []);

  const cancelActivePlayerChoice = useCallback(() => {
    setIsChoosingActivePlayer(false);
    setActivePickerKey(null);
    setShowTools(false);
  }, []);

  const chooseActivePlayer = useCallback((key: ParticipantKey) => {
    const opponentKeys = activePlayers
      .filter((player) => player.participantKey !== key)
      .map((player) => player.participantKey);
    if (opponentKeys.length === 0) return;

    if (activePickerResetRef.current) clearTimeout(activePickerResetRef.current);
    setActivePickerKey(key);
    setIsChoosingActivePlayer(false);
    setShowTools(false);
    onPickRandom(opponentKeys);
    activePickerResetRef.current = setTimeout(() => {
      setActivePickerKey(null);
      activePickerResetRef.current = null;
    }, 1600);
  }, [activePlayers, onPickRandom]);

  const toolbarControls = (
    <>
      <Pressable
        style={[styles.toolBtn, styles.toolBtnSurface]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="arrow-back" size={21} color={colors.foreground} />
      </Pressable>

      <View style={[styles.modeSegment, isVerticalCenterToolbar && styles.modeSegmentVertical]}>
        {DAMAGE_MODES.map((mode) => {
          const active = damageMode === mode;
          const meta = DAMAGE_MODE_META[mode];
          return (
            <Pressable
              key={mode}
              style={[styles.modeButton, active && { backgroundColor: meta.surface }]}
              onPress={() => onDamageModeChange(mode)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={mode === 'life'
                ? labels.damageLife
                : mode === 'commander'
                  ? labels.damageCommander
                  : labels.damageInfect}
            >
              <Ionicons
                name={meta.icon}
                size={17}
                color={active ? meta.color : 'rgba(244,244,245,0.46)'}
              />
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.toolBtn, styles.toolBtnSurface, !canUndo && styles.toolBtnDisabled]}
        onPress={onUndo}
        disabled={!canUndo}
        accessibilityRole="button"
        accessibilityLabel="Undo"
        accessibilityState={{ disabled: !canUndo }}
      >
        <Ionicons
          name="arrow-undo-outline"
          size={21}
          color={canUndo ? colors.foreground : 'rgba(244,244,245,0.28)'}
        />
      </Pressable>

      <Pressable
        style={[styles.toolBtn, styles.toolBtnSurface, showTools && styles.toolBtnActive]}
        onPress={() => {
          if (isChoosingActivePlayer) {
            cancelActivePlayerChoice();
            return;
          }
          setShowTools((value) => !value);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: showTools }}
      >
        <Ionicons name="ellipsis-horizontal" size={21} color={colors.foreground} />
      </Pressable>
    </>
  );

  return (
    <View style={styles.root}>
      <View
        style={[styles.gridHost, !hasCenterToolbar && { paddingBottom: toolbarHeight }]}
        onLayout={handleArenaLayout}
      >
        {arenaSize.width > 0 && seatAssignments.map(({ player, layout }) => (
          <View
            key={player.participantKey}
            ref={(ref) => { podRefs.current[player.participantKey] = ref; }}
            onLayout={() => refreshPodBounds(player.participantKey)}
            style={[
              styles.seatHost,
              styles.seatHostAbsolute,
              {
                left: layout.left,
                top: layout.top,
                width: layout.width,
                height: layout.height,
              },
            ]}
          >
            <TableSeat
              player={player}
              allPlayers={players}
              seatRotation={tableOrientation === 'landscape'
                ? getLandscapeSeatRotation(layout, arenaWidth)
                : getSeatRotation(layout.role, playerCount, layoutVariant)}
              controlPlacement={getSeatControlPlacement(layout.role)}
              damageMode={damageMode}
              isSource={dragSource === player.participantKey}
              isDragHover={dragHoverKey === player.participantKey}
              isActiveSelector={activePickerKey === player.participantKey}
              highlightLabel={randomHighlight
                ? randomHighlight === player.participantKey ? labels.selected : null
                : startingHighlight === player.participantKey ? labels.startingPlayer : null}
              highlightTone={randomHighlight ? 'random' : 'starting'}
              startingDirection={startingPlayerKey === player.participantKey ? startingDirection : null}
              startingBadgeLabel={startingPlayerKey === player.participantKey && startingDirection
                ? `${labels.startingPlayer} · ${startingDirection === 'clockwise' ? labels.clockwise : labels.counterclockwise}`
                : undefined}
              damagePulse={damagePulse[player.participantKey] ?? 0}
              onAdjust={(delta) => onAdjust(player.participantKey, delta)}
              onEliminate={() => onEliminate(player.participantKey)}
              onOpenDetails={() => setDetailsPlayerKey(player.participantKey)}
              onSelectActivePlayer={isChoosingActivePlayer
                ? () => chooseActivePlayer(player.participantKey)
                : undefined}
              onRevive={player.isEliminated ? () => onRevive(player.participantKey) : undefined}
              onDamageDragStart={handleDragStart}
              onDamageDragMove={handleDragMove}
              onDamageDragEnd={handleDragEnd}
              onDamageDragCancel={handleDragCancel}
              labels={{
                commanderDamage: labels.commanderDamageMeta,
                infect: labels.infect,
                eliminated: labels.eliminated,
                revive: labels.revive,
                ko: labels.ko,
              }}
            />
          </View>
        ))}

        {centerToolbarBand ? (
          <View
            style={[
              styles.centerToolbarRow,
              isVerticalCenterToolbar && styles.centerToolbarColumn,
              {
                left: centerToolbarBand.left,
                top: centerToolbarBand.top,
                width: centerToolbarBand.width,
                height: centerToolbarBand.height,
              },
            ]}
          >
            {toolbarControls}
          </View>
        ) : null}
      </View>

      {showTools ? (
        <View
          style={[
            styles.toolsSheet,
            centerToolbarBand
              ? centerToolbarBand.axis === 'vertical'
                ? { top: spacing.md }
                : { top: centerToolbarBand.top + centerToolbarBand.height + 6 }
              : { bottom: toolbarHeight + 8 },
          ]}
        >
          {isChoosingActivePlayer ? (
            <View style={styles.activePickerPrompt}>
              <View style={styles.activePickerRow}>
                <Ionicons name="finger-print-outline" size={19} color={colors.primaryMuted} />
                <Text style={styles.activePickerText}>{labels.selectActivePlayer}</Text>
              </View>
              <Pressable
                style={styles.activePickerCancel}
                onPress={cancelActivePlayerChoice}
                accessibilityRole="button"
                accessibilityLabel={labels.cancel}
              >
                <Ionicons name="close" size={18} color={colors.muted} />
                <Text style={styles.activePickerCancelText}>{labels.cancel}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.randomActions}>
                <Pressable
                  style={styles.randomButton}
                  onPress={() => {
                    setActivePickerKey(null);
                    onPickRandom();
                    setShowTools(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={labels.randomAll}
                >
                  <Ionicons name="people" size={18} color={colors.foreground} />
                  <Text style={styles.randomButtonText}>{labels.randomAll}</Text>
                </Pressable>
                <Pressable
                  style={[styles.randomButton, activePlayers.length < 2 && styles.toolBtnDisabled]}
                  disabled={activePlayers.length < 2}
                  onPress={() => {
                    setActivePickerKey(null);
                    setIsChoosingActivePlayer(true);
                    void hapticLight();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={labels.randomOpponents}
                  accessibilityState={{ disabled: activePlayers.length < 2 }}
                >
                  <Ionicons name="locate" size={18} color={colors.foreground} />
                  <Text style={styles.randomButtonText}>{labels.randomOpponents}</Text>
                </Pressable>
              </View>
              <Pressable style={styles.endGameRow} onPress={() => { setShowTools(false); onEndGame(); }}>
                <Ionicons name="flag" size={18} color="#fecaca" />
                <Text style={styles.endGameRowText}>{labels.endGame}</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}

      {!hasCenterToolbar ? (
        <View style={[styles.toolbar, { height: toolbarHeight, paddingBottom: Math.max(insets.bottom, 8) }]}>
          {toolbarControls}
        </View>
      ) : null}

      <DamageDragOverlay
        visible={Boolean(dragSource)}
        amount={1}
        dragX={dragX}
        dragY={dragY}
        sourceX={dragSourceX}
        sourceY={dragSourceY}
      />

      <DamageConfirmSheet
        visible={Boolean(pendingTransfer)}
        source={pendingSource}
        target={pendingTarget}
        showCommanderChoice={damageMode !== 'infect'}
        defaultCommander={damageMode === 'commander'}
        labels={{
          title: labels.damageConfirmTitle,
          amount: labels.damageAmount,
          lifeDamage: labels.lifeDamage,
          commanderDamage: labels.commanderDamage,
          apply: labels.applyDamage,
          cancel: labels.cancel,
        }}
        onClose={() => setPendingTransfer(null)}
        onConfirm={({ amount, isCommander }) => {
          if (!pendingTransfer) return;
          const sourceName = playersByKey.get(pendingTransfer.sourceKey)?.displayName ?? '';
          const targetName = playersByKey.get(pendingTransfer.targetKey)?.displayName ?? '';
          const modeLabel = damageMode === 'infect'
            ? labels.infect
            : isCommander ? labels.commanderDamage : labels.lifeDamage;
          onApplyDragDamage({
            sourceKey: pendingTransfer.sourceKey,
            targetKey: pendingTransfer.targetKey,
            amount,
            isCommander,
          });
          setDamageFeedback(`${sourceName} → ${targetName} · ${amount} ${modeLabel}`);
          setTimeout(() => setDamageFeedback(null), 3200);
          setPendingTransfer(null);
        }}
      />

      <PlayerDamageSheet
        player={detailsPlayerKey ? playersByKey.get(detailsPlayerKey) ?? null : null}
        players={players}
        title={labels.damageReceived}
        commanderLabel={labels.commanderDamageMeta}
        infectLabel={labels.infect}
        onClose={() => setDetailsPlayerKey(null)}
      />


      {damageFeedback ? (
        <View style={[styles.damageFeedback, { bottom: Math.max(insets.bottom, 10) + 8 }]}>
          <Text style={styles.damageFeedbackText} numberOfLines={1}>{damageFeedback}</Text>
          <Pressable
            onPress={() => {
              onUndo();
              setDamageFeedback(null);
            }}
            style={styles.damageFeedbackUndo}
          >
            <Text style={styles.damageFeedbackUndoText}>{labels.undo}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050508',
  },
  gridHost: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  seatHost: {
    zIndex: 1,
    overflow: 'hidden',
    borderRadius: radii.sm,
  },
  seatHostAbsolute: {
    position: 'absolute',
  },
  centerToolbarRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(4, 4, 9, 0.98)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    zIndex: 40,
  },
  centerToolbarColumn: {
    flexDirection: 'column',
    paddingHorizontal: 0,
    paddingVertical: spacing.sm,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  toolbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    backgroundColor: 'rgba(4, 4, 8, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  toolBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnSurface: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  toolBtnActive: {
    backgroundColor: 'rgba(124,58,237,0.28)',
    borderColor: 'rgba(167,139,250,0.45)',
  },
  toolBtnDisabled: {
    opacity: 0.55,
  },
  modeSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 38,
    padding: 3,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modeSegmentVertical: {
    flexDirection: 'column',
    width: 38,
    height: 102,
  },
  modeButton: {
    width: 34,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endGameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(127, 29, 29, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.45)',
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  endGameRowText: {
    color: '#fecaca',
    fontSize: 14,
    fontWeight: '800',
  },
  toolsSheet: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(8, 8, 14, 0.97)',
    gap: spacing.xs,
    zIndex: 50,
  },
  activePickerRow: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  activePickerText: {
    flex: 1,
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
  },
  activePickerPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.selectionBorder,
    borderRadius: radii.md,
    paddingLeft: spacing.md,
    paddingRight: 5,
    backgroundColor: 'rgba(124,58,237,0.16)',
  },
  activePickerCancel: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  activePickerCancelText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  randomActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  randomButton: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  randomButtonText: {
    color: colors.foreground,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  damageFeedback: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 80,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    backgroundColor: 'rgba(12,12,18,0.97)',
    paddingLeft: spacing.md,
    paddingRight: 6,
  },
  damageFeedbackText: {
    flex: 1,
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
  },
  damageFeedbackUndo: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(124,58,237,0.22)',
  },
  damageFeedbackUndoText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '800',
  },
});
