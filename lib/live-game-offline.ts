import {
  parseLiveGameState,
  type LiveGameRecord,
  type QueuedLiveGameMutation,
  type WinCondition,
} from '@/lib/live-game';

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

export type WebLiveGameJournal = {
  record: LiveGameRecord;
  serverRecord: LiveGameRecord;
  needsCreate: boolean;
  mutations: QueuedLiveGameMutation[];
  pendingFinalization: PendingLiveGameFinalization | null;
  pendingCancel: boolean;
  savedAt: string;
};

const JOURNAL_PREFIX = 'phyrexian-arena:web-live-game:v1:';

export function loadWebLiveGameJournal(groupId: string): WebLiveGameJournal | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${JOURNAL_PREFIX}${groupId}`);
    if (!raw) return null;
    const value = JSON.parse(raw) as WebLiveGameJournal;
    if (!value.record?.id || !Array.isArray(value.record.state?.players)) return null;
    const serverRecord = value.serverRecord?.id ? value.serverRecord : value.record;
    return {
      ...value,
      record: { ...value.record, state: parseLiveGameState(value.record.state) },
      serverRecord: { ...serverRecord, state: parseLiveGameState(serverRecord.state) },
      needsCreate: Boolean(value.needsCreate),
      mutations: Array.isArray(value.mutations) ? value.mutations : [],
      pendingFinalization: value.pendingFinalization ?? null,
      pendingCancel: Boolean(value.pendingCancel),
    };
  } catch {
    return null;
  }
}

export function saveWebLiveGameJournal(groupId: string, journal: Omit<WebLiveGameJournal, 'savedAt'>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${JOURNAL_PREFIX}${groupId}`, JSON.stringify({
    ...journal,
    savedAt: new Date().toISOString(),
  } satisfies WebLiveGameJournal));
}

export function clearWebLiveGameJournal(groupId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(`${JOURNAL_PREFIX}${groupId}`);
}
