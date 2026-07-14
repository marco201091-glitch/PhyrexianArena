import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LiveGameRecord, QueuedLiveGameMutation } from '@/lib/live-game';

const STORAGE_PREFIX = 'phyrexian-arena:live-game:v2:';
const OUTBOX_KEY = 'phyrexian-arena:live-game:v2:outbox';

export type PendingLiveGameFinalization = {
  winnerKey: string | null;
  isDraw: boolean;
  endedAt: string;
  players: Array<{
    participantKey: string;
    deckId: string;
    isGuest: boolean;
    userId: string | null;
    guestId: string | null;
  }>;
};

export type LiveGameOfflineSession = {
  record: LiveGameRecord;
  serverRecord: LiveGameRecord;
  needsCreate: boolean;
  mutations: QueuedLiveGameMutation[];
  pendingFinalization: PendingLiveGameFinalization | null;
  pendingCancel: boolean;
  savedAt: string;
};

export type ArchivedLiveGameOperation = {
  id: string;
  serverRecord: LiveGameRecord;
  needsCreate: boolean;
  mutations: QueuedLiveGameMutation[];
  finalization: PendingLiveGameFinalization | null;
  cancel: boolean;
};

function storageKey(groupId: string) {
  return `${STORAGE_PREFIX}${groupId}`;
}

export async function loadLiveGameOfflineSession(
  groupId: string,
): Promise<LiveGameOfflineSession | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(groupId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LiveGameOfflineSession>;
    if (!parsed.record?.id || !parsed.record?.state?.players) return null;
    return {
      record: parsed.record,
      serverRecord: parsed.serverRecord ?? parsed.record,
      needsCreate: Boolean(parsed.needsCreate),
      mutations: Array.isArray(parsed.mutations) ? parsed.mutations : [],
      pendingFinalization: parsed.pendingFinalization ?? null,
      pendingCancel: Boolean(parsed.pendingCancel),
      savedAt: parsed.savedAt ?? new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export async function saveLiveGameOfflineSession(
  groupId: string,
  session: Omit<LiveGameOfflineSession, 'savedAt'>,
): Promise<void> {
  await AsyncStorage.setItem(storageKey(groupId), JSON.stringify({
    ...session,
    savedAt: new Date().toISOString(),
  } satisfies LiveGameOfflineSession));
}

export async function clearLiveGameOfflineSession(groupId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(groupId));
}

export async function loadLiveGameOutbox(): Promise<ArchivedLiveGameOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveLiveGameOutbox(items: ArchivedLiveGameOperation[]): Promise<void> {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
}

export async function archiveAndClearLiveGameSession(
  groupId: string,
  item: ArchivedLiveGameOperation,
): Promise<void> {
  const current = await loadLiveGameOutbox();
  const nextOutbox = [
    ...current.filter((entry) => entry.id !== item.id),
    item,
  ];
  await AsyncStorage.multiSet([
    [OUTBOX_KEY, JSON.stringify(nextOutbox)],
    [storageKey(groupId), 'null'],
  ]);
}
