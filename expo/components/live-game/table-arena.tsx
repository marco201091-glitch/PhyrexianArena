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
import { Modal } from '@/components/ui/modal';
import { ModalHeader } from '@/components/ui/modal-header';
import { colors, radii, spacing } from '@/constants/theme';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import {
  findPodAtPoint,
  getCenterToolbarBand,
  getLandscapeSeatRotation,
  getSeatRotation,
  getSquareTableLayouts,
  getViewportTableOrientation,
  mapPlayersToSeats,
  usesCenterToolbar,
  type PodBounds,
  type TableLayoutVariant,
} from '@/lib/live-game-table-layout';
import type { DamageMode, GroupDamageScope, LiveGamePlayer, PlayDirection, PlayerCounter, PlayerEmblem } from '@/lib/live-game';
import { rollTableRandom, type TableRandomKind } from '@/lib/table-randomizer';
import type { ParticipantKey } from '@/lib/participant-keys';

type PendingTransfer = {
  sourceKey: ParticipantKey;
  targetKey: ParticipantKey;
};

type TableArenaProps = {
  players: LiveGamePlayer[];
  startedAt: string | null;
  randomHighlight: ParticipantKey | null;
  startingPlayerKey: ParticipantKey | null;
  startingHighlight: ParticipantKey | null;
  startingDirection: PlayDirection | null;
  layoutVariant: TableLayoutVariant;
  commanderMode?: boolean;
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
    redo: string;
    thisPlayer: string;
    eachOpponent: string;
    everyone: string;
  };
  onBack: () => void;
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  syncStatus: 'offline' | 'pending' | 'syncing' | 'synced' | 'error';
  syncLabel: string;
  pendingSyncCount: number;
  syncError: string | null;
  onRetrySync: () => void;
  onEndGame: () => void;
  onAdjust: (key: ParticipantKey, delta: number) => void;
  onApplyDragDamage: (input: {
    sourceKey: ParticipantKey;
    targetKey: ParticipantKey;
    amount: number;
    mode: DamageMode;
    scope: 'single' | GroupDamageScope;
  }) => void;
  onEliminate: (key: ParticipantKey) => void;
  onRevive: (key: ParticipantKey) => void;
  onPickRandom: (pool?: ParticipantKey[]) => void;
  onAdjustCounter: (key: ParticipantKey, counter: PlayerCounter, amount: number) => void;
  onSetEmblem: (key: ParticipantKey, emblem: PlayerEmblem, active: boolean) => void;
};

const SYSTEM_GESTURE_GUARD = 10;

function formatTrackerDuration(startedAt: string | null | undefined, now: number) {
  if (!startedAt || now <= 0) return '00:00';
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return '00:00';
  const seconds = Math.max(0, Math.floor((now - started) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function TableArena({
  players,
  startedAt,
  randomHighlight,
  startingPlayerKey,
  startingHighlight,
  startingDirection,
  layoutVariant,
  commanderMode = true,
  damagePulse,
  activePlayers,
  labels,
  onBack,
  canUndo,
  onUndo,
  canRedo,
  onRedo,
  syncStatus,
  syncLabel,
  pendingSyncCount,
  syncError,
  onRetrySync,
  onEndGame,
  onAdjust,
  onApplyDragDamage,
  onEliminate,
  onRevive,
  onPickRandom,
  onAdjustCounter,
  onSetEmblem,
}: TableArenaProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [arenaSize, setArenaSize] = useState({ width: 0, height: 0 });
  const [isChoosingActivePlayer, setIsChoosingActivePlayer] = useState(false);
  const [activePickerKey, setActivePickerKey] = useState<ParticipantKey | null>(null);
  const [dragSource, setDragSource] = useState<ParticipantKey | null>(null);
  const [dragHoverKey, setDragHoverKey] = useState<ParticipantKey | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null);
  const [detailsPlayerKey, setDetailsPlayerKey] = useState<ParticipantKey | null>(null);
  const [damageFeedback, setDamageFeedback] = useState<string | null>(null);
  const [randomizerOpen, setRandomizerOpen] = useState(false);
  const [randomizerResult, setRandomizerResult] = useState<string | number | null>(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragSourceX = useSharedValue(0);
  const dragSourceY = useSharedValue(0);
  const dragSourceRef = useRef<ParticipantKey | null>(null);
  const dragHoverRef = useRef<ParticipantKey | null>(null);
  const podBoundsRef = useRef<Record<string, PodBounds>>({});
  const podRefs = useRef<Record<string, View | null>>({});
  const activePickerResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clockNow, setClockNow] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const playerCount = players.length;
  const arenaWidth = arenaSize.width || screenWidth;
  const arenaHeight = arenaSize.height || 480;
  const tableOrientation = getViewportTableOrientation(arenaWidth, arenaHeight);
  const hasCenterToolbar = usesCenterToolbar(playerCount);
  const toolbarHeight = hasCenterToolbar
    ? 0
    : 64 + Math.max(insets.bottom, 8);
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
      ? getCenterToolbarBand(playerCount, arenaWidth, layoutHeight, layoutVariant, tableOrientation)
      : null,
    [arenaWidth, hasCenterToolbar, layoutHeight, layoutVariant, playerCount, tableOrientation],
  );
  const isVerticalCenterToolbar = centerToolbarBand?.axis === 'vertical';
  const centerToolbarMainSize = isVerticalCenterToolbar
    ? centerToolbarBand?.height ?? 0
    : centerToolbarBand?.width ?? 0;
  const toolbarButtonSize = centerToolbarBand
    ? Math.max(30, Math.min(56, (centerToolbarMainSize - 98) / 8))
    : 44;
  const toolbarButtonStyle = {
    width: toolbarButtonSize,
    height: toolbarButtonSize,
    borderRadius: toolbarButtonSize / 2,
  };

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
  }, []);

  const chooseActivePlayer = useCallback((key: ParticipantKey) => {
    const opponentKeys = activePlayers
      .filter((player) => player.participantKey !== key)
      .map((player) => player.participantKey);
    if (opponentKeys.length === 0) return;

    if (activePickerResetRef.current) clearTimeout(activePickerResetRef.current);
    setActivePickerKey(key);
    setIsChoosingActivePlayer(false);
    onPickRandom(opponentKeys);
    activePickerResetRef.current = setTimeout(() => {
      setActivePickerKey(null);
      activePickerResetRef.current = null;
    }, 1600);
  }, [activePlayers, onPickRandom]);

  const toolbarControls = (
    <>
      <Pressable
        style={[styles.toolBtn, styles.toolBtnSurface, toolbarButtonStyle]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="arrow-back" size={23} color={colors.foreground} />
      </Pressable>

      <View style={[styles.durationPill, isVerticalCenterToolbar && styles.durationPillVertical]}>
        <Ionicons name="time-outline" size={15} color={colors.muted} />
        <Text style={styles.durationText}>{formatTrackerDuration(startedAt, clockNow)}</Text>
      </View>

      <Pressable
        style={[styles.toolBtn, styles.toolBtnSurface, toolbarButtonStyle, !canUndo && styles.toolBtnDisabled]}
        onPress={onUndo}
        disabled={!canUndo}
        accessibilityRole="button"
        accessibilityLabel="Undo"
        accessibilityState={{ disabled: !canUndo }}
      >
        <Ionicons
          name="arrow-undo-outline"
          size={23}
          color={canUndo ? colors.foreground : 'rgba(244,244,245,0.28)'}
        />
      </Pressable>

      <Pressable
        style={[styles.toolBtn, styles.toolBtnSurface, toolbarButtonStyle, !canRedo && styles.toolBtnDisabled]}
        onPress={onRedo}
        disabled={!canRedo}
        accessibilityRole="button"
        accessibilityLabel={labels.redo}
        accessibilityState={{ disabled: !canRedo }}
      >
        <Ionicons
          name="arrow-redo-outline"
          size={23}
          color={canRedo ? colors.foreground : 'rgba(244,244,245,0.28)'}
        />
      </Pressable>

      <Pressable
        style={[styles.toolBtn, styles.toolBtnSurface, toolbarButtonStyle]}
        onPress={() => {
          setActivePickerKey(null);
          onPickRandom();
        }}
        accessibilityRole="button"
        accessibilityLabel={labels.randomAll}
      >
        <Ionicons name="dice-outline" size={23} color={colors.foreground} />
      </Pressable>

      <Pressable
        style={[styles.toolBtn, styles.toolBtnSurface, toolbarButtonStyle]}
        onPress={() => {
          setRandomizerResult(null);
          setRandomizerOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Dado o moneta"
      >
        <Ionicons name="cube-outline" size={22} color={colors.foreground} />
      </Pressable>

      <Pressable
        style={[styles.toolBtn, styles.toolBtnSurface, toolbarButtonStyle, activePlayers.length < 2 && styles.toolBtnDisabled]}
        disabled={activePlayers.length < 2}
        onPress={() => {
          setActivePickerKey(null);
          setIsChoosingActivePlayer(true);
          void hapticLight();
        }}
        accessibilityRole="button"
        accessibilityLabel={labels.randomOpponents}
      >
        <View style={styles.opponentRandomIcon}>
          <Ionicons name="person-outline" size={21} color={colors.foreground} />
          <Ionicons name="dice" size={11} color={colors.primaryLight} style={styles.opponentRandomDie} />
        </View>
      </Pressable>

      <Pressable
        style={[styles.toolBtn, styles.toolBtnSurface, toolbarButtonStyle]}
        onPress={onEndGame}
        accessibilityRole="button"
        accessibilityLabel={labels.endGame}
      >
        <Ionicons name="flag-outline" size={22} color={colors.foreground} />
      </Pressable>
    </>
  );

  return (
    <View style={styles.root}>
      <Pressable
        onPress={onRetrySync}
        accessibilityRole="button"
        accessibilityLabel={syncLabel}
        style={[
          styles.syncBadge,
          { top: Math.max(insets.top, SYSTEM_GESTURE_GUARD) + 6, right: Math.max(insets.right, SYSTEM_GESTURE_GUARD) + 6 },
          syncStatus === 'error' && styles.syncBadgeError,
          syncStatus === 'offline' && styles.syncBadgeOffline,
        ]}
      >
        <Ionicons
          name={syncStatus === 'syncing' ? 'sync' : syncStatus === 'offline' ? 'cloud-offline-outline' : syncStatus === 'error' ? 'warning-outline' : 'cloud-done-outline'}
          size={13}
          color={syncStatus === 'error' ? '#fecaca' : syncStatus === 'offline' ? '#fde68a' : '#bbf7d0'}
        />
        <Text style={styles.syncBadgeText} numberOfLines={1}>
          {syncLabel}{pendingSyncCount > 0 ? ` · ${pendingSyncCount}` : ''}
        </Text>
        {syncError ? <Ionicons name="refresh" size={12} color="#fecaca" /> : null}
      </Pressable>
      <View
        style={[
          styles.gridHost,
          {
            marginTop: Math.max(insets.top, SYSTEM_GESTURE_GUARD),
            marginRight: Math.max(insets.right, SYSTEM_GESTURE_GUARD),
            marginBottom: Math.max(insets.bottom, SYSTEM_GESTURE_GUARD),
            marginLeft: Math.max(insets.left, SYSTEM_GESTURE_GUARD),
          },
          !hasCenterToolbar && { paddingBottom: toolbarHeight },
        ]}
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
              damageMode="life"
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

      {isChoosingActivePlayer ? (
        <View style={[styles.toolsSheet, { top: spacing.md }]}>
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
        defaultMode="life"
        commanderMode={commanderMode}
        labels={{
          title: labels.damageConfirmTitle,
          amount: labels.damageAmount,
          lifeDamage: labels.lifeDamage,
          commanderDamage: labels.commanderDamage,
          infectDamage: labels.infect,
          apply: labels.applyDamage,
          cancel: labels.cancel,
          thisPlayer: labels.thisPlayer,
          eachOpponent: labels.eachOpponent,
          everyone: labels.everyone,
        }}
        onClose={() => setPendingTransfer(null)}
        onConfirm={({ amount, mode, scope }) => {
          if (!pendingTransfer) return;
          const sourceName = playersByKey.get(pendingTransfer.sourceKey)?.displayName ?? '';
          const targetName = playersByKey.get(pendingTransfer.targetKey)?.displayName ?? '';
          const modeLabel = mode === 'infect'
            ? labels.infect
            : mode === 'commander' ? labels.commanderDamage : labels.lifeDamage;
          onApplyDragDamage({
            sourceKey: pendingTransfer.sourceKey,
            targetKey: pendingTransfer.targetKey,
            amount,
            mode,
            scope,
          });
          const destination = scope === 'opponents'
            ? labels.eachOpponent
            : scope === 'all_players' ? labels.everyone : targetName;
          setDamageFeedback(`${sourceName} → ${destination} · ${amount} ${modeLabel}`);
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
        commanderMode={commanderMode}
        onClose={() => setDetailsPlayerKey(null)}
        onAdjustCounter={(counter, amount) => {
          if (detailsPlayerKey) onAdjustCounter(detailsPlayerKey, counter, amount);
        }}
        onSetEmblem={(emblem, active) => {
          if (detailsPlayerKey) onSetEmblem(detailsPlayerKey, emblem, active);
        }}
      />

      <Modal visible={randomizerOpen} onClose={() => setRandomizerOpen(false)} presentation="dialog" maxWidth={440}>
        <ModalHeader title="Dado o moneta" icon="cube-outline" onClose={() => setRandomizerOpen(false)} />
        <View style={styles.randomizerChoices}>
          {([
            ['coin', 'Moneta'],
            ['d4', 'd4'],
            ['d6', 'd6'],
            ['d20', 'd20'],
          ] as Array<[TableRandomKind, string]>).map(([kind, label]) => (
            <Pressable
              key={kind}
              style={styles.randomizerButton}
              onPress={() => {
                setRandomizerResult(rollTableRandom(kind));
                void hapticSuccess();
              }}
            >
              <Text style={styles.randomizerButtonText}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {randomizerResult !== null ? (
          <View style={styles.randomizerResult}>
            <Text style={styles.randomizerResultText}>
              {randomizerResult === 'heads' ? 'Testa' : randomizerResult === 'tails' ? 'Croce' : randomizerResult}
            </Text>
          </View>
        ) : null}
      </Modal>


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
  syncBadge: {
    position: 'absolute',
    zIndex: 90,
    maxWidth: 150,
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.3)',
    borderRadius: 16,
    backgroundColor: 'rgba(4,4,8,0.82)',
    paddingHorizontal: 9,
  },
  syncBadgeError: {
    borderColor: 'rgba(248,113,113,0.45)',
  },
  syncBadgeOffline: {
    borderColor: 'rgba(251,191,36,0.4)',
  },
  syncBadgeText: {
    flexShrink: 1,
    color: colors.foreground,
    fontSize: 10,
    fontWeight: '800',
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
    justifyContent: 'space-between',
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
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    backgroundColor: 'rgba(4, 4, 8, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  durationPill: {
    minWidth: 66,
    height: 40,
    paddingHorizontal: 9,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  durationPillVertical: {
    minWidth: 40,
    width: 40,
    height: 72,
    paddingHorizontal: 0,
    flexDirection: 'column',
  },
  durationText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  opponentRandomIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opponentRandomDie: {
    position: 'absolute',
    right: -1,
    bottom: -1,
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
  randomizerChoices: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  randomizerButton: {
    flex: 1,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.32)',
    backgroundColor: 'rgba(124,58,237,0.13)',
  },
  randomizerButtonText: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '900',
  },
  randomizerResult: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  randomizerResultText: {
    color: '#ddd6fe',
    fontSize: 64,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
});
