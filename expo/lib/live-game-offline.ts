import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  parseLiveGameState,
  type LiveGameRecord,
  type QueuedLiveGameMutation,
  type WinCondition,
} from '@/lib/live-game';
import { parseLiveGameHistory, type LiveGameHistory } from '@/lib/live-game-history';

const STORAGE_PREFIX = 'phyrexian-arena:live-game:v2:';
const STORAGE_BACKUP_PREFIX = 'phyrexian-arena:live-game:v2:backup:';
const OUTBOX_KEY = 'phyrexian-arena:live-game:v2:outbox';

export type PendingLiveGameFinalization = {
  winnerKey: string | null;
  isDraw: boolean;
  winCondition: WinCondition | null;
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
  history: LiveGameHistory;
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

function backupStorageKey(groupId: string) {
  return `${STORAGE_BACKUP_PREFIX}${groupId}`;
}

function parseOfflineSession(raw: string | null): LiveGameOfflineSession | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Partial<LiveGameOfflineSession>;
  if (!parsed.record?.id || !parsed.record?.state?.players) return null;
  const record = { ...parsed.record, state: parseLiveGameState(parsed.record.state) } as LiveGameRecord;
  const rawServerRecord = parsed.serverRecord ?? parsed.record;
  const serverRecord = {
    ...rawServerRecord,
    state: parseLiveGameState(rawServerRecord.state),
  } as LiveGameRecord;
  return {
    record,
    serverRecord,
    needsCreate: Boolean(parsed.needsCreate),
    mutations: Array.isArray(parsed.mutations) ? parsed.mutations : [],
    pendingFinalization: parsed.pendingFinalization ?? null,
    pendingCancel: Boolean(parsed.pendingCancel),
    history: parseLiveGameHistory(parsed.history),
    savedAt: parsed.savedAt ?? new Date(0).toISOString(),
  };
}

export async function loadLiveGameOfflineSession(
  groupId: string,
): Promise<LiveGameOfflineSession | null> {
  const sessions: LiveGameOfflineSession[] = [];
  for (const key of [storageKey(groupId), backupStorageKey(groupId)]) {
    try {
      const session = parseOfflineSession(await AsyncStorage.getItem(key));
      if (session) sessions.push(session);
    } catch {
      // Try the shadow copy after a partial/corrupted device write.
    }
  }
  return sessions.sort((left, right) => (
    (Date.parse(right.savedAt) || 0) - (Date.parse(left.savedAt) || 0)
  ))[0] ?? null;
}

export async function saveLiveGameOfflineSession(
  groupId: string,
  session: Omit<LiveGameOfflineSession, 'savedAt'>,
): Promise<void> {
  const serialized = JSON.stringify({
    ...session,
    savedAt: new Date().toISOString(),
  } satisfies LiveGameOfflineSession);
  await AsyncStorage.multiSet([
    [backupStorageKey(groupId), serialized],
    [storageKey(groupId), serialized],
  ]);
}

export async function clearLiveGameOfflineSession(groupId: string): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(storageKey(groupId)),
    AsyncStorage.removeItem(backupStorageKey(groupId)),
  ]);
}

export async function clearLiveGameOfflineSessionIfMatches(
  groupId: string,
  liveGameId: string,
): Promise<void> {
  const current = await loadLiveGameOfflineSession(groupId);
  if (current?.record.id === liveGameId) {
    await clearLiveGameOfflineSession(groupId);
  }
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
    [backupStorageKey(groupId), 'null'],
  ]);
}
