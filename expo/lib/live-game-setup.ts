import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TableLayoutVariant } from '@/lib/live-game-table-layout';
import type { ParticipantKey } from '@/lib/participant-keys';

const PREFIX = 'phyrexian-arena:live-game-setup:v1:';

export type LiveGameSeatSetup = {
  participantKey: ParticipantKey | null;
  deckId: string | null;
};

export type LiveGameSetup = {
  playerCount: number;
  layoutVariant: TableLayoutVariant;
  startingLife: number;
  seats: LiveGameSeatSetup[];
};

export function createDefaultLiveGameSetup(): LiveGameSetup {
  return {
    playerCount: 4,
    layoutVariant: 'classic',
    startingLife: 40,
    seats: Array.from({ length: 4 }, () => ({ participantKey: null, deckId: null })),
  };
}

export function parseLiveGameSetup(raw: string | null): LiveGameSetup | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LiveGameSetup>;
    const playerCount = Number(parsed.playerCount);
    if (
      !Number.isInteger(playerCount) ||
      playerCount < 2 ||
      playerCount > 6 ||
      !Array.isArray(parsed.seats) ||
      parsed.seats.length !== playerCount
    ) return null;
    return {
      playerCount,
      layoutVariant: parsed.layoutVariant === 'opposed' ? 'opposed' : 'classic',
      startingLife: Number.isFinite(parsed.startingLife) && Number(parsed.startingLife) > 0
        ? Number(parsed.startingLife)
        : 40,
      seats: parsed.seats.map((seat) => ({
        participantKey: typeof seat?.participantKey === 'string' ? seat.participantKey : null,
        deckId: typeof seat?.deckId === 'string' ? seat.deckId : null,
      })),
    };
  } catch {
    return null;
  }
}

function key(groupId: string, userId: string) {
  return `${PREFIX}${userId}:${groupId}`;
}

export async function loadLiveGameSetup(groupId: string, userId: string): Promise<LiveGameSetup | null> {
  try {
    return parseLiveGameSetup(await AsyncStorage.getItem(key(groupId, userId)));
  } catch {
    return null;
  }
}

export async function saveLiveGameSetup(
  groupId: string,
  userId: string,
  setup: LiveGameSetup,
): Promise<void> {
  await AsyncStorage.setItem(key(groupId, userId), JSON.stringify(setup));
}
