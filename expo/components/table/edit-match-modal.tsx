import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextInput } from '@/components/ui/rich-text-input';
import { Modal } from '@/components/ui/modal';
import { colors, spacing } from '@/constants/theme';
import type { ArenaGuest } from '@/lib/arena-participants';
import {
  getParticipantDisplayName,
  getParticipantKey,
  resolveWinnerParticipantKey,
} from '@/lib/arena-participants';
import { isoToMatchDateValue, matchDateToIso } from '@/lib/match-datetime';
import type { ParticipantKey } from '@/lib/participant-keys';
import { getProfileDisplayName } from '@/lib/profile-display';
import type { ArenaMatch, ArenaProfile, MemberDeck } from '@/lib/types/arena';
import {
  MatchParticipantRow,
  toDeckOption,
  type DeckOption,
} from '@/components/table/match-participant-row';

type EditMatchModalProps = {
  visible: boolean;
  saving: boolean;
  match: ArenaMatch | null;
  members: ArenaProfile[];
  guests: ArenaGuest[];
  decks: MemberDeck[];
  labels: {
    title: string;
    hint: string;
    selectWinner: string;
    battleDate: string;
    notes: string;
    notesPlaceholder: string;
    richTextHint: string;
    selectDeck: string;
    cancel: string;
    save: string;
    saving: string;
    winnerError: string;
    dateError: string;
    guestBadge: string;
    deckCount: (count: number) => string;
    searchPlaceholder: string;
    showDeckList: string;
    hideDeckList: string;
    selectDeckPrompt: string;
    deckListHiddenSelected: string;
    deckListHiddenEmpty: string;
    noDecksMatchSearch: string;
    swipeDecksHint: string;
  };
  onClose: () => void;
  onError: (message: string) => void;
  onSave: (input: {
    matchId: string;
    winnerKey: string;
    participantDecks: Record<string, string>;
    matchPlayedAtIso: string;
    matchNotes: string;
    participants: Array<{
      id: string;
      participantKey: string | null;
      isGuest: boolean;
    }>;
  }) => Promise<void>;
};

function getDeckOptions(
  key: string,
  decksByUser: Map<string, MemberDeck[]>,
  guests: ArenaGuest[],
): DeckOption[] {
  if (key.startsWith('guest:')) {
    const guestId = key.slice(6);
    const guestDecks = guests.find((guest) => guest.id === guestId)?.arena_guest_decks || [];
    return guestDecks.map(toDeckOption);
  }

  return (decksByUser.get(key.slice(5)) || []).map(toDeckOption);
}

function filterDecks(decks: DeckOption[], query: string): DeckOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return decks;
  return decks.filter(
    (deck) =>
      deck.name.toLowerCase().includes(normalized) ||
      deck.commander.toLowerCase().includes(normalized),
  );
}

export function EditMatchModal({
  visible,
  saving,
  match,
  members,
  guests,
  decks,
  labels,
  onClose,
  onError,
  onSave,
}: EditMatchModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const modalBodyHeight = Math.min(windowHeight * 0.62, 520);
  const [winnerKey, setWinnerKey] = useState('');
  const [participantDecks, setParticipantDecks] = useState<Record<string, string>>({});
  const [matchPlayedAt, setMatchPlayedAt] = useState('');
  const [matchNotes, setMatchNotes] = useState('');
  const [deckSearch, setDeckSearch] = useState<Record<string, string>>({});
  const [hiddenDeckLists, setHiddenDeckLists] = useState<Record<string, boolean>>({});

  const decksByUser = useMemo(() => {
    const map = new Map<string, MemberDeck[]>();
    decks.forEach((deck) => {
      const current = map.get(deck.user_id) || [];
      current.push(deck);
      map.set(deck.user_id, current);
    });
    return map;
  }, [decks]);

  const participantKeys = useMemo(() => {
    if (!match) return [] as ParticipantKey[];
    return match.match_participants
      .map((participant) => getParticipantKey(participant))
      .filter((key): key is ParticipantKey => key !== null);
  }, [match]);

  useEffect(() => {
    if (!visible || !match) return;

    setWinnerKey(resolveWinnerParticipantKey(match) || '');
    setMatchNotes(match.notes || '');
    setMatchPlayedAt(isoToMatchDateValue(match.played_at));
    setDeckSearch({});
    setHiddenDeckLists({});

    const deckMap: Record<string, string> = {};
    match.match_participants.forEach((participant) => {
      const participantKey = getParticipantKey(participant);
      const deckId = participant.deck_id || participant.guest_deck_id;
      if (participantKey && deckId) {
        deckMap[participantKey] = deckId;
      }
    });
    setParticipantDecks(deckMap);
  }, [match, visible]);

  const handleSave = async () => {
    if (!match) return;
    if (!winnerKey) {
      onError(labels.winnerError);
      return;
    }

    const playedAtIso = matchDateToIso(matchPlayedAt);
    if (!playedAtIso) {
      onError(labels.dateError);
      return;
    }

    await onSave({
      matchId: match.id,
      winnerKey,
      participantDecks,
      matchPlayedAtIso: playedAtIso,
      matchNotes,
      participants: match.match_participants.map((participant) => ({
        id: participant.id,
        participantKey: getParticipantKey(participant),
        isGuest: Boolean(participant.guest_id),
      })),
    });
  };

  if (!match) return null;

  const participantRowLabels = {
    guestBadge: labels.guestBadge,
    deckCount: labels.deckCount,
    searchPlaceholder: labels.searchPlaceholder,
    showDeckList: labels.showDeckList,
    hideDeckList: labels.hideDeckList,
    selectDeckPrompt: labels.selectDeckPrompt,
    deckListHiddenSelected: labels.deckListHiddenSelected,
    deckListHiddenEmpty: labels.deckListHiddenEmpty,
    noDecksMatchSearch: labels.noDecksMatchSearch,
    swipeDecksHint: labels.swipeDecksHint,
  };

  const actionFooter = (
    <View style={styles.actions}>
      <Button label={labels.cancel} variant="ghost" onPress={onClose} style={styles.actionButton} />
      <Button
        label={saving ? labels.saving : labels.save}
        disabled={saving || !winnerKey}
        onPress={handleSave}
        style={styles.actionButton}
      />
    </View>
  );

  return (
    <Modal visible={visible} onClose={onClose} scroll={false} footer={actionFooter}>
      <View style={[styles.shell, { height: modalBodyHeight }]}>
        <Text style={styles.title}>{labels.title}</Text>
        <Text style={styles.hint}>{labels.hint}</Text>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          <Input
            label={labels.battleDate}
            value={matchPlayedAt}
            onChangeText={setMatchPlayedAt}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />

          <View style={styles.participantList}>
            {match.match_participants.map((participant) => {
              const participantKey = getParticipantKey(participant);
              if (!participantKey) return null;

              const deckOptions = getDeckOptions(participantKey, decksByUser, guests);
              const selectedDeckId = participantDecks[participantKey] || '';
              const selectedDeck = deckOptions.find((deck) => deck.id === selectedDeckId) || null;
              const isGuest = Boolean(participant.guest_id);

              return (
                <MatchParticipantRow
                  key={participant.id}
                  participantKey={participantKey}
                  displayName={getParticipantDisplayName(participant)}
                  isGuest={isGuest}
                  deckCount={deckOptions.length}
                  selected
                  readOnly
                  selectedDeck={selectedDeck}
                  deckListHidden={Boolean(hiddenDeckLists[participantKey])}
                  searchValue={deckSearch[participantKey] || ''}
                  selectedDeckId={selectedDeckId}
                  filteredDecks={filterDecks(deckOptions, deckSearch[participantKey] || '')}
                  labels={participantRowLabels}
                  onToggle={() => {}}
                  onSearchChange={(value) =>
                    setDeckSearch((state) => ({ ...state, [participantKey]: value }))
                  }
                  onToggleDeckList={() =>
                    setHiddenDeckLists((state) => ({
                      ...state,
                      [participantKey]: !state[participantKey],
                    }))
                  }
                  onSelectDeck={(deckId) =>
                    setParticipantDecks((state) => ({ ...state, [participantKey]: deckId }))
                  }
                />
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>{labels.selectWinner}</Text>
          <View style={styles.chipRow}>
            {participantKeys.map((key) => {
              const selected = winnerKey === key;
              const label = key.startsWith('guest:')
                ? guests.find((guest) => guest.id === key.slice(6))?.display_name || key
                : (() => {
                    const member = members.find((item) => item.id === key.slice(5));
                    return member ? getProfileDisplayName(member) : key;
                  })();

              return (
                <Pressable
                  key={key}
                  style={[styles.chip, selected && styles.winnerChip]}
                  onPress={() => setWinnerKey(key)}
                >
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <RichTextInput
            label={labels.notes}
            value={matchNotes}
            onChangeText={setMatchNotes}
            placeholder={labels.notesPlaceholder}
            hint={labels.richTextHint}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: '700',
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  participantList: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  winnerChip: {
    borderColor: colors.amber,
    backgroundColor: colors.warningSurface,
  },
  chipLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipLabelSelected: {
    color: colors.foreground,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});