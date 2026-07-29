import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeckImage } from '@/components/deck/deck-image';
import { CompactDeckCard } from '@/components/deck/compact-deck-card';
import type { DeckOption } from '@/components/table/match-participant-row';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ModalHeader } from '@/components/ui/modal-header';
import { colors, radii, spacing } from '@/constants/theme';
import {
  getCenterToolbarBand,
  getSquareTableLayouts,
  getViewportTableOrientation,
  type TableOrientation,
  type TableLayoutVariant,
} from '@/lib/live-game-table-layout';
import type { LiveGameSeatSetup } from '@/lib/live-game-setup';
import type { ParticipantKey } from '@/lib/participant-keys';
import { isCompactViewport, isTabletViewport, layout } from '@/lib/layout';

export type SetupParticipant = {
  key: ParticipantKey;
  name: string;
  decks: DeckOption[];
  preferredDeckId: string | null;
};

type Labels = {
  playerCount: string;
  layout: string;
  classic: string;
  opposed: string;
  seats: string;
  seat: string;
  emptySeat: string;
  choosePlayer: string;
  chooseDeck: string;
  clearSeat: string;
  confirm: string;
  reset: string;
  startingLife: string;
  custom: string;
  back: string;
  next: string;
  start: string;
  starting: string;
};

type Props = {
  playerCount: number;
  layoutVariant: TableLayoutVariant;
  seats: LiveGameSeatSetup[];
  startingLife: number;
  participants: SetupParticipant[];
  labels: Labels;
  onPlayerCountChange: (count: number) => void;
  onLayoutChange: (variant: TableLayoutVariant) => void;
  onStartingLifeChange: (life: number) => void;
  onAssignSeat: (index: number, participantKey: ParticipantKey | null, deckId: string | null) => void;
  onReset: () => void;
  onStart: () => void;
  starting: boolean;
};

function LayoutPreview({
  count,
  variant,
  orientation,
}: {
  count: number;
  variant: TableLayoutVariant;
  orientation: TableOrientation;
}) {
  const width = orientation === 'landscape' ? 136 : 106;
  const height = orientation === 'landscape' ? 94 : 136;
  const layouts = getSquareTableLayouts(count, width, height, variant, orientation);
  const toolbar = getCenterToolbarBand(count, width, height, variant, orientation);
  return (
    <View style={[styles.layoutPreview, { width, height }]}>
      {layouts.map((layout, index) => (
        <View
          key={`${variant}-${index}`}
          style={[
            styles.layoutSeat,
            { left: layout.left, top: layout.top, width: layout.width, height: layout.height },
          ]}
        />
      ))}
      {toolbar ? (
        <View style={[
          styles.layoutToolbar,
          toolbar.axis === 'vertical' && styles.layoutToolbarVertical,
          { left: toolbar.left, top: toolbar.top, width: toolbar.width, height: toolbar.height },
        ]}>
          <View style={styles.layoutToolbarDot} />
          <View style={styles.layoutToolbarDot} />
          <View style={styles.layoutToolbarDot} />
        </View>
      ) : null}
    </View>
  );
}

export function LiveGameConfigurator({
  playerCount,
  layoutVariant,
  seats,
  startingLife,
  participants,
  labels,
  onPlayerCountChange,
  onLayoutChange,
  onStartingLifeChange,
  onAssignSeat,
  onReset,
  onStart,
  starting,
}: Props) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const compact = isCompactViewport(windowWidth);
  const tablet = isTabletViewport(windowWidth);
  const previewOrientation = getViewportTableOrientation(windowWidth, windowHeight);
  const maxPreviewWidth = tablet && previewOrientation === 'landscape' ? 680 : tablet ? 520 : 420;
  const availableWidth = Math.min(windowWidth, layout.contentMaxWidth) - spacing.lg * 4;
  const previewWidth = Math.min(maxPreviewWidth, availableWidth);
  const previewHeight = Math.round(previewWidth * (previewOrientation === 'landscape' ? 0.62 : 1.2));
  const layouts = useMemo(
    () => getSquareTableLayouts(
      playerCount,
      previewWidth,
      previewHeight,
      layoutVariant,
      previewOrientation,
    ),
    [layoutVariant, playerCount, previewHeight, previewOrientation, previewWidth],
  );
  const toolbar = useMemo(
    () => getCenterToolbarBand(
      playerCount,
      previewWidth,
      previewHeight,
      layoutVariant,
      previewOrientation,
    ),
    [layoutVariant, playerCount, previewHeight, previewOrientation, previewWidth],
  );
  const [editingSeat, setEditingSeat] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [customLife, setCustomLife] = useState(String(startingLife));
  const lifePresets = [20, 25, 30, 40, 60];
  const isCustomLife = !lifePresets.includes(startingLife);
  const setupComplete = seats.length === playerCount
    && seats.every((seat) => Boolean(seat.participantKey && seat.deckId));
  useEffect(() => setCustomLife(String(startingLife)), [startingLife]);
  const currentSeat = editingSeat === null ? null : seats[editingSeat];
  const [draftPlayer, setDraftPlayer] = useState<ParticipantKey | null>(null);
  const [draftDeck, setDraftDeck] = useState<string | null>(null);
  const participantByKey = useMemo(
    () => new Map(participants.map((participant) => [participant.key, participant])),
    [participants],
  );

  const openSeat = (index: number) => {
    const seat = seats[index];
    setEditingSeat(index);
    setDraftPlayer(seat?.participantKey ?? null);
    setDraftDeck(seat?.deckId ?? null);
  };

  const selectPlayer = (participant: SetupParticipant) => {
    setDraftPlayer(participant.key);
    const preferred = participant.decks.length === 1
      ? participant.decks[0].id
      : participant.decks.some((deck) => deck.id === participant.preferredDeckId)
        ? participant.preferredDeckId
        : null;
    setDraftDeck(preferred);
  };

  const selectedParticipant = draftPlayer ? participantByKey.get(draftPlayer) ?? null : null;
  const occupiedElsewhere = new Set(
    seats
      .filter((_seat, index) => index !== editingSeat)
      .map((seat) => seat.participantKey)
      .filter(Boolean),
  );

  return (
    <View style={styles.root}>
      <View style={styles.wizardHeader}>
        <View style={styles.progressRow}>
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={[styles.progressBar, index <= step && styles.progressBarActive]} />
          ))}
        </View>
        <Pressable
          style={({ pressed }) => [styles.resetButton, pressed && styles.interactivePressed]}
          onPress={() => {
            onReset();
            setStep(0);
          }}
        >
          <Ionicons name="refresh-outline" size={15} color={colors.muted} />
          <Text style={styles.resetText}>{labels.reset}</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.stepBadge}><Text style={styles.stepText}>{step + 1}</Text></View>
        <Text style={styles.sectionTitle}>
          {[labels.playerCount, labels.startingLife, labels.layout, labels.seats][step]}
        </Text>
      </View>

      {step === 0 ? <View style={styles.countRow}>
        {[2, 3, 4, 5, 6].map((count) => (
          <Pressable
            key={count}
            onPress={() => onPlayerCountChange(count)}
            style={({ pressed }) => [
              styles.countButton,
              count === playerCount && styles.countButtonActive,
              pressed && styles.interactivePressed,
            ]}
          >
            <Text style={[styles.countText, count === playerCount && styles.countTextActive]}>{count}</Text>
          </Pressable>
        ))}
      </View> : null}

      {step === 1 ? <View style={styles.lifeStep}>
        <View style={styles.lifeRow}>
          {lifePresets.map((life) => (
            <Pressable
              key={life}
              onPress={() => onStartingLifeChange(life)}
              style={({ pressed }) => [
                styles.lifeButton,
                startingLife === life && styles.lifeButtonActive,
                pressed && styles.interactivePressed,
              ]}
            >
              <Text style={[styles.countText, startingLife === life && styles.countTextActive]}>{life}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={isCustomLife ? customLife : ''}
          onChangeText={(value) => {
            setCustomLife(value);
            const parsed = Number.parseInt(value, 10);
            if (Number.isFinite(parsed) && parsed > 0) onStartingLifeChange(parsed);
          }}
          placeholder={labels.custom}
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          style={[styles.customLifeInput, isCustomLife && styles.customLifeInputActive]}
        />
      </View> : null}

      {step === 2 ? <View style={styles.layoutOptions}>
        {(['classic', 'opposed'] as const).map((variant) => (
          <Pressable
            key={variant}
            onPress={() => onLayoutChange(variant)}
            style={({ pressed }) => [
              styles.layoutOption,
              layoutVariant === variant && styles.layoutOptionActive,
              pressed && styles.interactivePressed,
            ]}
          >
            <LayoutPreview count={playerCount} variant={variant} orientation={previewOrientation} />
            <View style={styles.layoutLabelRow}>
              <Text style={[styles.layoutLabel, layoutVariant === variant && styles.layoutLabelActive]}>
                {variant === 'classic' ? labels.classic : labels.opposed}
              </Text>
              <Ionicons
                name={layoutVariant === variant ? 'checkmark-circle' : 'ellipse-outline'}
                size={19}
                color={layoutVariant === variant ? colors.primaryLight : colors.muted}
              />
            </View>
          </Pressable>
        ))}
      </View> : null}

      {step === 3 ? <View style={[styles.tablePreview, { width: previewWidth, height: previewHeight }]}>
        {layouts.map((layout, index) => {
          const seat = seats[index];
          const participant = seat?.participantKey ? participantByKey.get(seat.participantKey) : null;
          const deck = participant?.decks.find((entry) => entry.id === seat?.deckId) ?? null;
          return (
            <Pressable
              key={`seat-${index}`}
              onPress={() => openSeat(index)}
              style={({ pressed }) => [
                styles.seatButton,
                participant && styles.seatButtonAssigned,
                pressed && styles.seatButtonPressed,
                { left: layout.left, top: layout.top, width: layout.width, height: layout.height },
              ]}
            >
              {deck ? (
                <DeckImage
                  uri={deck.commander_image}
                  alt={deck.commander}
                  style={styles.seatImage}
                  containerStyle={styles.seatImage}
                  contentFit="cover"
                  contentPosition="top"
                />
              ) : null}
              <View style={styles.seatScrim} />
              <Text style={styles.seatNumber}>{index + 1}</Text>
              <Ionicons name={participant ? 'person' : 'add'} size={20} color={participant ? '#fff' : colors.primaryMuted} />
              <Text style={styles.seatName} numberOfLines={1}>{participant?.name ?? `${labels.seat} ${index + 1}`}</Text>
              <Text style={styles.seatDeck} numberOfLines={1}>{deck?.commander ?? labels.emptySeat}</Text>
            </Pressable>
          );
        })}
        {toolbar ? (
          <View style={[
            styles.tableToolbar,
            toolbar.axis === 'vertical' && styles.tableToolbarVertical,
            { left: toolbar.left, top: toolbar.top, width: toolbar.width, height: toolbar.height },
          ]}>
            <Ionicons name="game-controller-outline" size={19} color={colors.primaryMuted} />
          </View>
        ) : null}
      </View> : null}

      <View style={styles.wizardActions}>
        {step > 0 ? (
          <Button label={labels.back} variant="outline" icon="arrow-back" onPress={() => setStep((value) => value - 1)} style={styles.actionButton} />
        ) : <View style={styles.actionButton} />}
        {step < 3 ? (
          <Button label={labels.next} icon="arrow-forward" onPress={() => setStep((value) => value + 1)} style={styles.actionButton} />
        ) : (
          <Button
            label={starting ? labels.starting : labels.start}
            icon="play"
            disabled={starting || !setupComplete}
            onPress={onStart}
            style={styles.actionButton}
          />
        )}
      </View>

      <Modal
        visible={editingSeat !== null}
        onClose={() => setEditingSeat(null)}
        maxWidth={tablet ? 720 : 560}
      >
        <ModalHeader
          title={`${labels.seat} ${(editingSeat ?? 0) + 1}`}
          subtitle={labels.choosePlayer}
          icon="people-outline"
          onClose={() => setEditingSeat(null)}
        />
        <View style={[styles.seatPickerColumns, tablet && styles.seatPickerColumnsTablet]}>
          <ScrollView
            style={[styles.playerList, tablet && styles.playerListTablet]}
            contentContainerStyle={styles.optionListContent}
            nestedScrollEnabled
          >
            {participants.filter((participant) => !occupiedElsewhere.has(participant.key)).map((participant) => (
              <Pressable
                key={participant.key}
                onPress={() => selectPlayer(participant)}
                style={({ pressed }) => [
                  styles.playerOption,
                  draftPlayer === participant.key && styles.playerOptionActive,
                  pressed && styles.interactivePressed,
                ]}
              >
                <Ionicons name="person-circle-outline" size={24} color={draftPlayer === participant.key ? colors.primaryLight : colors.muted} />
                <Text style={styles.playerName}>{participant.name}</Text>
                <Ionicons
                  name={draftPlayer === participant.key ? 'checkmark-circle' : 'ellipse-outline'}
                  size={21}
                  color={draftPlayer === participant.key ? colors.primaryLight : colors.muted}
                />
              </Pressable>
            ))}
          </ScrollView>
          {selectedParticipant ? (
            <View style={[styles.deckSection, tablet && styles.deckSectionTablet]}>
              <Text style={styles.deckSectionTitle}>{labels.chooseDeck}</Text>
              <ScrollView style={[styles.deckList, tablet && styles.deckListTablet]} contentContainerStyle={styles.optionListContent} nestedScrollEnabled>
                {selectedParticipant.decks.map((deck) => (
                  <CompactDeckCard
                    key={deck.id}
                    artUri={deck.commander_image}
                    title={deck.name}
                    commander={deck.commander}
                    onPress={() => setDraftDeck(deck.id)}
                    accessibilityLabel={`${labels.chooseDeck}: ${deck.name}`}
                    style={draftDeck === deck.id ? styles.deckOptionActive : undefined}
                    trailing={<Ionicons
                      name={draftDeck === deck.id ? 'checkmark-circle' : 'ellipse-outline'}
                      size={23}
                      color={draftDeck === deck.id ? colors.primaryLight : colors.muted}
                    />}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
        <View style={[styles.modalActions, compact && styles.modalActionsStacked]}>
          {currentSeat?.participantKey ? (
            <Button
              label={labels.clearSeat}
              variant="destructive"
              icon="close-circle-outline"
              onPress={() => {
                if (editingSeat !== null) onAssignSeat(editingSeat, null, null);
                setEditingSeat(null);
              }}
              style={styles.actionButton}
            />
          ) : null}
          <Button
            label={labels.confirm}
            icon="checkmark"
            disabled={!draftPlayer || !draftDeck}
            onPress={() => {
              if (editingSeat === null || !draftPlayer) return;
              onAssignSeat(editingSeat, draftPlayer, draftDeck);
              setEditingSeat(null);
            }}
            style={styles.actionButton}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  wizardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  progressRow: { flex: 1, flexDirection: 'row', gap: 5 },
  progressBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border },
  progressBarActive: { backgroundColor: colors.primaryLight, shadowColor: colors.primary, shadowOpacity: 0.45, shadowRadius: 5, elevation: 2 },
  interactivePressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  stepBadge: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primaryLight, shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 7, elevation: 4 },
  stepText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  sectionTitle: { flex: 1, color: colors.foreground, fontSize: 15, fontWeight: '800' },
  resetButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.surfaceMuted },
  resetText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  countRow: { flexDirection: 'row', gap: spacing.sm },
  lifeStep: { gap: spacing.md },
  lifeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  lifeButton: { minWidth: 58, minHeight: 46, paddingHorizontal: spacing.md, borderRadius: 23, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardInset },
  lifeButtonActive: { borderColor: colors.primaryLight, backgroundColor: colors.selectionTintStrong, shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 7, elevation: 2 },
  customLifeInput: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, color: colors.foreground, backgroundColor: colors.cardInset, fontWeight: '800' },
  customLifeInputActive: { borderColor: colors.primaryLight },
  countButton: { flex: 1, minHeight: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardInset },
  countButtonActive: { borderColor: colors.primaryLight, backgroundColor: colors.selectionTintStrong, shadowColor: colors.primary, shadowOpacity: 0.22, shadowRadius: 7, elevation: 2 },
  countText: { color: colors.muted, fontSize: 16, fontWeight: '800' },
  countTextActive: { color: colors.foreground },
  layoutOptions: { flexDirection: 'row', gap: spacing.sm },
  layoutOption: { flex: 1, alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardInset },
  layoutOptionActive: { borderColor: colors.primaryLight, backgroundColor: colors.selectionTint, shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  layoutPreview: { position: 'relative', backgroundColor: '#06060a', borderRadius: radii.md, overflow: 'hidden' },
  layoutSeat: { position: 'absolute', borderRadius: 4, borderWidth: 1, borderColor: 'rgba(167, 227, 172,0.35)', backgroundColor: 'rgba(66, 159, 74,0.22)' },
  layoutToolbar: { position: 'absolute', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#12121a' },
  layoutToolbarVertical: { flexDirection: 'column' },
  layoutToolbarDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primaryMuted },
  layoutLabelRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  layoutLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  layoutLabelActive: { color: colors.foreground },
  tablePreview: { position: 'relative', alignSelf: 'center', borderRadius: radii.lg, overflow: 'hidden', backgroundColor: '#050508', borderWidth: 1, borderColor: colors.border },
  seatButton: { position: 'absolute', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 5, borderRadius: 7, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.selectionBorder, backgroundColor: 'rgba(66, 159, 74,0.08)' },
  seatButtonAssigned: { borderStyle: 'solid', borderColor: 'rgba(167, 227, 172,0.62)', shadowColor: colors.primary, shadowOpacity: 0.24, shadowRadius: 6, elevation: 3 },
  seatButtonPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  seatImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  seatScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(3,3,8,0.52)' },
  seatNumber: { position: 'absolute', left: 5, top: 4, color: 'rgba(255,255,255,0.72)', fontSize: 9, fontWeight: '900' },
  seatName: { color: '#fff', fontSize: 11, fontWeight: '900', textAlign: 'center' },
  seatDeck: { color: 'rgba(255,255,255,0.7)', fontSize: 9, textAlign: 'center' },
  tableToolbar: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111118', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.borderSoft },
  tableToolbarVertical: { borderTopWidth: 0, borderBottomWidth: 0, borderLeftWidth: 1, borderRightWidth: 1 },
  wizardActions: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, paddingTop: spacing.sm },
  seatPickerColumns: { gap: spacing.md },
  seatPickerColumnsTablet: { flexDirection: 'row', alignItems: 'stretch' },
  playerList: { gap: spacing.xs, maxHeight: 210 },
  playerListTablet: { flex: 1, maxHeight: 340 },
  optionListContent: { gap: spacing.xs },
  playerOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.cardInset, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  playerOptionActive: { borderColor: colors.primaryLight, backgroundColor: colors.selectionTint, shadowColor: colors.primary, shadowOpacity: 0.18, shadowRadius: 6, elevation: 2 },
  playerName: { flex: 1, color: colors.foreground, fontSize: 14, fontWeight: '800' },
  deckSection: { gap: spacing.sm },
  deckSectionTablet: { flex: 1, minWidth: 0 },
  deckSectionTitle: { color: colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  deckList: { gap: spacing.xs, maxHeight: 245 },
  deckListTablet: { maxHeight: 310 },
  deckOptionActive: { borderColor: colors.primaryLight },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalActionsStacked: { flexDirection: 'column' },
  actionButton: { flex: 1 },
});
