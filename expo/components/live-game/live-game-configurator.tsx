import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeckImage } from '@/components/deck/deck-image';
import type { DeckOption } from '@/components/table/match-participant-row';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ModalHeader } from '@/components/ui/modal-header';
import { colors, radii, spacing } from '@/constants/theme';
import {
  getCenterToolbarBand,
  getSquareTableLayouts,
  type TableLayoutVariant,
} from '@/lib/live-game-table-layout';
import type { LiveGameSeatSetup } from '@/lib/live-game-setup';
import type { ParticipantKey } from '@/lib/participant-keys';

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
};

type Props = {
  playerCount: number;
  layoutVariant: TableLayoutVariant;
  seats: LiveGameSeatSetup[];
  participants: SetupParticipant[];
  labels: Labels;
  onPlayerCountChange: (count: number) => void;
  onLayoutChange: (variant: TableLayoutVariant) => void;
  onAssignSeat: (index: number, participantKey: ParticipantKey | null, deckId: string | null) => void;
  onReset: () => void;
};

function LayoutPreview({ count, variant }: { count: number; variant: TableLayoutVariant }) {
  const width = 106;
  const height = 136;
  const layouts = getSquareTableLayouts(count, width, height, variant);
  const toolbar = getCenterToolbarBand(count, width, height, variant);
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
        <View style={[styles.layoutToolbar, { left: toolbar.left, top: toolbar.top, width: toolbar.width, height: toolbar.height }]}>
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
  participants,
  labels,
  onPlayerCountChange,
  onLayoutChange,
  onAssignSeat,
  onReset,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const previewWidth = Math.min(420, windowWidth - spacing.lg * 4);
  const previewHeight = Math.round(previewWidth * 1.2);
  const layouts = useMemo(
    () => getSquareTableLayouts(playerCount, previewWidth, previewHeight, layoutVariant),
    [layoutVariant, playerCount, previewHeight, previewWidth],
  );
  const toolbar = useMemo(
    () => getCenterToolbarBand(playerCount, previewWidth, previewHeight, layoutVariant),
    [layoutVariant, playerCount, previewHeight, previewWidth],
  );
  const [editingSeat, setEditingSeat] = useState<number | null>(null);
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
      <View style={styles.sectionHeader}>
        <View style={styles.stepBadge}><Text style={styles.stepText}>1</Text></View>
        <Text style={styles.sectionTitle}>{labels.playerCount}</Text>
        <Pressable style={styles.resetButton} onPress={onReset}>
          <Ionicons name="refresh-outline" size={15} color={colors.muted} />
          <Text style={styles.resetText}>{labels.reset}</Text>
        </Pressable>
      </View>
      <View style={styles.countRow}>
        {[2, 3, 4, 5, 6].map((count) => (
          <Pressable
            key={count}
            onPress={() => onPlayerCountChange(count)}
            style={[styles.countButton, count === playerCount && styles.countButtonActive]}
          >
            <Text style={[styles.countText, count === playerCount && styles.countTextActive]}>{count}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.stepBadge}><Text style={styles.stepText}>2</Text></View>
        <Text style={styles.sectionTitle}>{labels.layout}</Text>
      </View>
      <View style={styles.layoutOptions}>
        {(['classic', 'opposed'] as const).map((variant) => (
          <Pressable
            key={variant}
            onPress={() => onLayoutChange(variant)}
            style={[styles.layoutOption, layoutVariant === variant && styles.layoutOptionActive]}
          >
            <LayoutPreview count={playerCount} variant={variant} />
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
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.stepBadge}><Text style={styles.stepText}>3</Text></View>
        <Text style={styles.sectionTitle}>{labels.seats}</Text>
      </View>
      <View style={[styles.tablePreview, { width: previewWidth, height: previewHeight }]}>
        {layouts.map((layout, index) => {
          const seat = seats[index];
          const participant = seat?.participantKey ? participantByKey.get(seat.participantKey) : null;
          const deck = participant?.decks.find((entry) => entry.id === seat?.deckId) ?? null;
          return (
            <Pressable
              key={`seat-${index}`}
              onPress={() => openSeat(index)}
              style={[
                styles.seatButton,
                participant && styles.seatButtonAssigned,
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
              <Text style={styles.seatDeck} numberOfLines={1}>{deck?.name ?? labels.emptySeat}</Text>
            </Pressable>
          );
        })}
        {toolbar ? (
          <View style={[styles.tableToolbar, { left: toolbar.left, top: toolbar.top, width: toolbar.width, height: toolbar.height }]}>
            <Ionicons name="game-controller-outline" size={19} color={colors.primaryMuted} />
          </View>
        ) : null}
      </View>

      <Modal visible={editingSeat !== null} onClose={() => setEditingSeat(null)}>
        <ModalHeader
          title={`${labels.seat} ${(editingSeat ?? 0) + 1}`}
          subtitle={labels.choosePlayer}
          icon="people-outline"
          onClose={() => setEditingSeat(null)}
        />
        <ScrollView style={styles.playerList} contentContainerStyle={styles.optionListContent} nestedScrollEnabled>
          {participants.filter((participant) => !occupiedElsewhere.has(participant.key)).map((participant) => (
            <Pressable
              key={participant.key}
              onPress={() => selectPlayer(participant)}
              style={[styles.playerOption, draftPlayer === participant.key && styles.playerOptionActive]}
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
          <View style={styles.deckSection}>
            <Text style={styles.deckSectionTitle}>{labels.chooseDeck}</Text>
            <ScrollView style={styles.deckList} contentContainerStyle={styles.optionListContent} nestedScrollEnabled>
              {selectedParticipant.decks.map((deck) => (
                <Pressable
                  key={deck.id}
                  onPress={() => setDraftDeck(deck.id)}
                  style={[styles.deckOption, draftDeck === deck.id && styles.deckOptionActive]}
                >
                  <DeckImage uri={deck.commander_image} alt={deck.commander} style={styles.deckImage} containerStyle={styles.deckImage} />
                  <View style={styles.deckCopy}>
                    <Text style={styles.deckName} numberOfLines={1}>{deck.name}</Text>
                    <Text style={styles.deckCommander} numberOfLines={1}>{deck.commander}</Text>
                  </View>
                  <Ionicons
                    name={draftDeck === deck.id ? 'checkmark-circle' : 'ellipse-outline'}
                    size={21}
                    color={draftDeck === deck.id ? colors.primaryLight : colors.muted}
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
        <View style={styles.modalActions}>
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  stepBadge: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  stepText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  sectionTitle: { flex: 1, color: colors.foreground, fontSize: 15, fontWeight: '800' },
  resetButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.surfaceMuted },
  resetText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  countRow: { flexDirection: 'row', gap: spacing.sm },
  countButton: { flex: 1, minHeight: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardInset },
  countButtonActive: { borderColor: colors.primaryLight, backgroundColor: colors.selectionTintStrong },
  countText: { color: colors.muted, fontSize: 16, fontWeight: '800' },
  countTextActive: { color: colors.foreground },
  layoutOptions: { flexDirection: 'row', gap: spacing.sm },
  layoutOption: { flex: 1, alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardInset },
  layoutOptionActive: { borderColor: colors.primaryLight, backgroundColor: colors.selectionTint },
  layoutPreview: { position: 'relative', backgroundColor: '#06060a', borderRadius: radii.md, overflow: 'hidden' },
  layoutSeat: { position: 'absolute', borderRadius: 4, borderWidth: 1, borderColor: 'rgba(196,181,253,0.35)', backgroundColor: 'rgba(124,58,237,0.22)' },
  layoutToolbar: { position: 'absolute', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#12121a' },
  layoutToolbarDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primaryMuted },
  layoutLabelRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  layoutLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  layoutLabelActive: { color: colors.foreground },
  tablePreview: { position: 'relative', alignSelf: 'center', borderRadius: radii.lg, overflow: 'hidden', backgroundColor: '#050508', borderWidth: 1, borderColor: colors.border },
  seatButton: { position: 'absolute', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 5, borderRadius: 7, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.selectionBorder, backgroundColor: 'rgba(124,58,237,0.08)' },
  seatButtonAssigned: { borderStyle: 'solid', borderColor: 'rgba(196,181,253,0.58)' },
  seatImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  seatScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,3,8,0.52)' },
  seatNumber: { position: 'absolute', left: 5, top: 4, color: 'rgba(255,255,255,0.72)', fontSize: 9, fontWeight: '900' },
  seatName: { color: '#fff', fontSize: 11, fontWeight: '900', textAlign: 'center' },
  seatDeck: { color: 'rgba(255,255,255,0.7)', fontSize: 9, textAlign: 'center' },
  tableToolbar: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111118', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.borderSoft },
  playerList: { gap: spacing.xs, maxHeight: 210 },
  optionListContent: { gap: spacing.xs },
  playerOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.cardInset, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  playerOptionActive: { borderColor: colors.primaryLight, backgroundColor: colors.selectionTint },
  playerName: { flex: 1, color: colors.foreground, fontSize: 14, fontWeight: '800' },
  deckSection: { gap: spacing.sm },
  deckSectionTitle: { color: colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  deckList: { gap: spacing.xs, maxHeight: 245 },
  deckOption: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardInset },
  deckOptionActive: { borderColor: colors.primaryLight, backgroundColor: colors.selectionTint },
  deckImage: { width: 42, height: 48, borderRadius: 7 },
  deckCopy: { flex: 1, minWidth: 0 },
  deckName: { color: colors.foreground, fontSize: 13, fontWeight: '800' },
  deckCommander: { color: colors.muted, fontSize: 11, marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1 },
});
