import type { ParticipantKey } from '@/lib/participant-keys';
import { parseParticipantKey, toGuestParticipantKey, toUserParticipantKey } from '@/lib/participant-keys';

export interface ParticipantDeckSnapshot {
  id?: string;
  name: string;
  commander: string;
  commander_image: string | null;
  bracket: string | null;
  color_identity?: string[] | null;
  source_type?: string | null;
}

export interface ArenaGuestDeck {
  id: string;
  guest_id: string;
  group_id: string;
  name: string;
  commander: string;
  commander_image: string | null;
  color_identity: string[] | null;
  bracket: string | null;
  created_at?: string;
}

export interface ArenaGuest {
  id: string;
  group_id: string;
  display_name: string;
  last_played_at: string | null;
  arena_guest_decks?: ArenaGuestDeck[];
}

export interface MatchParticipantRecord {
  id: string;
  user_id: string | null;
  guest_id: string | null;
  deck_id: string | null;
  guest_deck_id: string | null;
  is_winner: boolean;
  tracked_event_count?: number;
  life_lost?: number;
  life_gained?: number;
  life_damage_dealt?: number;
  unattributed_life_lost?: number;
  commander_damage_taken?: number;
  commander_damage_dealt?: number;
  infect_received?: number;
  infect_dealt?: number;
  eliminations?: number;
  eliminations_caused?: number;
  revives?: number;
  corrections?: number;
  placement?: number | null;
  eliminated_at?: string | null;
  was_starting_player?: boolean;
  group_damage_dealt?: number;
  group_damage_events?: number;
  participant_name_snapshot?: string | null;
  deck_name_snapshot?: string | null;
  commander_snapshot?: string | null;
  commander_image_snapshot?: string | null;
  deck_bracket_snapshot?: string | null;
  color_identity_snapshot?: string[] | null;
  final_life?: number | null;
  final_infect?: number | null;
  profiles?: {
    id: string;
    username: string;
    display_name: string | null;
  } | null;
  arena_guests?: {
    id: string;
    display_name: string;
  } | null;
  decks?: ParticipantDeckSnapshot | null;
  arena_guest_decks?: ParticipantDeckSnapshot | null;
}

export function getParticipantKey(participant: Pick<MatchParticipantRecord, 'user_id' | 'guest_id'>): ParticipantKey | null {
  if (participant.guest_id) return toGuestParticipantKey(participant.guest_id);
  if (participant.user_id) return toUserParticipantKey(participant.user_id);
  return null;
}

export function getParticipantDisplayName(participant: MatchParticipantRecord) {
  if (participant.participant_name_snapshot?.trim()) return participant.participant_name_snapshot;
  if (participant.arena_guests?.display_name) return participant.arena_guests.display_name;
  return participant.profiles?.display_name?.trim() || participant.profiles?.username || '';
}

export function getParticipantDeckSnapshot(participant: MatchParticipantRecord): ParticipantDeckSnapshot | null {
  if (participant.commander_snapshot || participant.deck_name_snapshot) {
    return {
      id: participant.deck_id || participant.guest_deck_id || undefined,
      name: participant.deck_name_snapshot || participant.commander_snapshot || 'Deck',
      commander: participant.commander_snapshot || 'Unknown commander',
      commander_image: participant.commander_image_snapshot ?? null,
      bracket: participant.deck_bracket_snapshot ?? null,
      color_identity: participant.color_identity_snapshot ?? null,
      source_type: participant.guest_deck_id ? 'guest' : participant.decks?.source_type ?? null,
    };
  }

  if (participant.decks) {
    return {
      id: participant.deck_id || undefined,
      name: participant.decks.name,
      commander: participant.decks.commander,
      commander_image: participant.decks.commander_image,
      bracket: participant.decks.bracket,
      color_identity: participant.decks.color_identity,
      source_type: participant.decks.source_type,
    };
  }

  if (participant.arena_guest_decks) {
    return {
      id: participant.guest_deck_id || undefined,
      name: participant.arena_guest_decks.name,
      commander: participant.arena_guest_decks.commander,
      commander_image: participant.arena_guest_decks.commander_image,
      bracket: participant.arena_guest_decks.bracket,
      color_identity: participant.arena_guest_decks.color_identity,
      source_type: 'guest',
    };
  }

  return null;
}

export function getParticipantDeckId(participant: MatchParticipantRecord) {
  return participant.deck_id || participant.guest_deck_id || null;
}

export function getLastDeckSelectionForParticipant(
  participantKey: ParticipantKey,
  matches: Array<{ played_at: string; match_participants: MatchParticipantRecord[] }>,
): string | null {
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime(),
  );

  for (const match of sortedMatches) {
    for (const participant of match.match_participants) {
      const key = getParticipantKey(participant);
      if (key !== participantKey) continue;
      const deckId = getParticipantDeckId(participant);
      if (deckId) return deckId;
    }
  }

  return null;
}

export function resolveWinnerParticipantKey(match: {
  winner_id: string | null;
  winner_guest_id?: string | null;
  match_participants: MatchParticipantRecord[];
}): ParticipantKey | null {
  if (match.winner_guest_id) return toGuestParticipantKey(match.winner_guest_id);
  if (match.winner_id) return toUserParticipantKey(match.winner_id);
  const winner = match.match_participants.find((participant) => participant.is_winner);
  return winner ? getParticipantKey(winner) : null;
}
