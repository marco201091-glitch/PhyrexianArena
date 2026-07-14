import type { ParticipantKey } from '@/lib/participant-keys';
import type { TableLayoutVariant } from '@/lib/live-game-table-layout';

export type WebLiveGameSeatSetup = {
  participantKey: ParticipantKey | null;
  deckId: string | null;
};

export type WebLiveGameSetup = {
  playerCount: number;
  layoutVariant: TableLayoutVariant;
  startingLife: number;
  seats: WebLiveGameSeatSetup[];
};

const PREFIX = 'phyrexian-arena:web-live-game-setup:v1:';

export function createDefaultWebLiveGameSetup(): WebLiveGameSetup {
  return {
    playerCount: 4,
    layoutVariant: 'classic',
    startingLife: 40,
    seats: Array.from({ length: 4 }, () => ({ participantKey: null, deckId: null })),
  };
}

export function loadWebLiveGameSetup(groupId: string, userId: string): WebLiveGameSetup {
  if (typeof window === 'undefined') return createDefaultWebLiveGameSetup();
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${userId}:${groupId}`);
    if (!raw) return createDefaultWebLiveGameSetup();
    const parsed = JSON.parse(raw) as Partial<WebLiveGameSetup>;
    const playerCount = Number(parsed.playerCount);
    if (playerCount < 2 || playerCount > 6 || !Array.isArray(parsed.seats)) {
      return createDefaultWebLiveGameSetup();
    }
    return {
      playerCount,
      layoutVariant: parsed.layoutVariant === 'opposed' ? 'opposed' : 'classic',
      startingLife: Number(parsed.startingLife) > 0 ? Number(parsed.startingLife) : 40,
      seats: Array.from({ length: playerCount }, (_, index) => ({
        participantKey: typeof parsed.seats?.[index]?.participantKey === 'string'
          ? parsed.seats[index]!.participantKey!
          : null,
        deckId: typeof parsed.seats?.[index]?.deckId === 'string'
          ? parsed.seats[index]!.deckId!
          : null,
      })),
    };
  } catch {
    return createDefaultWebLiveGameSetup();
  }
}

export function saveWebLiveGameSetup(groupId: string, userId: string, setup: WebLiveGameSetup) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${PREFIX}${userId}:${groupId}`, JSON.stringify(setup));
}
