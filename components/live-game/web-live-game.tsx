'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock3,
  Crown,
  Box,
  Dices,
  Flag,
  Heart,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  MoreHorizontal,
  Pause,
  Plus,
  QrCode,
  Redo2,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Trophy,
  Trash2,
  UserRound,
  WifiOff,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HoldActionButton } from '@/components/ui/hold-action-button';
import { DeckImage } from '@/components/deck-image';
import { LiveGameRecapView } from '@/components/live-game/live-game-recap';
import { ModalCard, ModalOverlay } from '@/components/ui/modal-shell';
import { useLanguage } from '@/components/language-provider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  applyLiveGameMutation,
  createLiveGamePlayer,
  createLiveGameSummary,
  getDefaultWinCondition,
  getSuggestedWinner,
  isValidLiveGameResult,
  pickRandomPlayer,
  type DamageMode,
  type GroupDamageScope,
  type LiveGameMutation,
  type LiveGameRecord,
  type QueuedLiveGameMutation,
  type WinCondition,
} from '@/lib/live-game';
import { rollTableRandom, type TableRandomKind } from '@/lib/table-randomizer';
import {
  getLandscapeSeatRotation,
  getCenterToolbarBand,
  getSeatRotation,
  getSquareTableLayouts,
  getViewportTableOrientation,
  mapPlayersToSeats,
  type TableLayoutVariant,
} from '@/lib/live-game-table-layout';
import { buildRouletteSequence } from '@/lib/live-game-roulette';
import {
  applyQueuedLiveGameMutation,
  cancelLiveGame,
  ensureLiveGameCreated,
  fetchActiveLiveGame,
  fetchBusyLiveGameParticipantKeys,
  finalizeLiveGameAsMatch,
  subscribeToLiveGame,
} from '@/lib/live-game-service';
import {
  clearWebLiveGameJournal,
  loadWebLiveGameJournal,
  saveWebLiveGameJournal,
  type PendingLiveGameFinalization,
} from '@/lib/live-game-offline';
import {
  createLiveGameHistory,
  recordLiveGameHistory,
  redoLiveGameHistory,
  undoLiveGameHistory,
  type LiveGameHistory,
} from '@/lib/live-game-history';
import { persistLiveGameTelemetry, recordLiveGameQueueDepth } from '@/lib/live-game-telemetry';
import {
  createDefaultWebLiveGameSetup,
  loadWebLiveGameSetup,
  saveWebLiveGameSetup,
  type WebLiveGameSeatSetup,
} from '@/lib/live-game-setup';
import type { ParticipantKey } from '@/lib/participant-keys';

export type WebTrackerDeck = {
  id: string;
  name: string;
  commander: string;
  commanderImage: string | null;
};

export type WebTrackerParticipant = {
  key: ParticipantKey;
  displayName: string;
  isGuest: boolean;
  userId: string | null;
  guestId: string | null;
  decks: WebTrackerDeck[];
};

type LobbyGuest = {
  id: string;
  ready: boolean;
  guest_id: string;
  guest_deck_id: string;
  arena_guests: { display_name: string } | Array<{ display_name: string }> | null;
  arena_guest_decks: {
    name: string;
    commander: string;
    commander_image: string | null;
  } | Array<{
    name: string;
    commander: string;
    commander_image: string | null;
  }> | null;
};

function relationOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

type DragState = {
  sourceKey: ParticipantKey;
  startX: number;
  startY: number;
  x: number;
  y: number;
  targetKey: ParticipantKey | null;
};

type DamageDraft = {
  sourceKey: ParticipantKey;
  targetKey: ParticipantKey;
  mode: DamageMode;
  scope: 'single' | GroupDamageScope;
};

const WIN_CONDITIONS: Array<{
  value: Exclude<WinCondition, 'last_standing'>;
  label: { it: string; en: string };
  icon: typeof Sparkles;
}> = [
  { value: 'combo', label: { it: 'Combo', en: 'Combo' }, icon: Sparkles },
  { value: 'concession', label: { it: 'Resa avversari', en: 'Opponents conceded' }, icon: Flag },
  { value: 'alternate_card', label: { it: 'Vittoria alternativa', en: 'Alternate card win' }, icon: Trophy },
  { value: 'other', label: { it: 'Altro', en: 'Other' }, icon: MoreHorizontal },
];

function secureRandom() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0]! / 0x1_0000_0000;
}

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: 'portrait') => Promise<void>;
  unlock?: () => void;
};

async function lockTrackerPortraitOrientation() {
  const orientation = screen.orientation as LockableScreenOrientation | undefined;
  if (!orientation?.lock) return;
  try {
    await orientation.lock('portrait');
  } catch {
    // Safari and some embedded browsers do not expose orientation locking.
  }
}

function unlockTrackerOrientation() {
  const orientation = screen.orientation as LockableScreenOrientation | undefined;
  try {
    orientation?.unlock?.();
  } catch {
    // Ignore unsupported orientation APIs.
  }
}

function replay(record: LiveGameRecord, queue: QueuedLiveGameMutation[]) {
  return queue.reduce(
    (current, item) => ({ ...current, state: applyLiveGameMutation(current.state, item.mutation) }),
    record,
  );
}

function formatDuration(startedAt: string | null, endedAt?: string) {
  if (!startedAt) return '00:00';
  const endTime = endedAt ? new Date(endedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.floor((endTime - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function ModalTitle({ icon: Icon, title, onClose }: {
  icon?: typeof Trophy | null;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-4">
      {Icon ? <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/15 text-violet-300">
        <Icon className="h-5 w-5" />
      </div> : null}
      <h2 className="min-w-0 flex-1 text-lg font-black text-foreground">{title}</h2>
      <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
        <X className="h-5 w-5" />
      </Button>
    </div>
  );
}

export function WebLiveGame({
  groupId,
  arenaName,
  userId,
  participants: baseParticipants,
}: {
  groupId: string;
  arenaName: string;
  userId: string;
  participants: WebTrackerParticipant[];
}) {
  const router = useRouter();
  const { copy } = useLanguage();
  const { toast } = useToast();
  const [booting, setBooting] = useState(true);
  const [record, setRecord] = useState<LiveGameRecord | null>(null);
  const recordRef = useRef<LiveGameRecord | null>(null);
  const serverRef = useRef<LiveGameRecord | null>(null);
  const queueRef = useRef<QueuedLiveGameMutation[]>([]);
  const needsCreateRef = useRef(false);
  const pendingFinalizationRef = useRef<PendingLiveGameFinalization | null>(null);
  const pendingCancelRef = useRef(false);
  const historyRef = useRef<LiveGameHistory>(createLiveGameHistory());
  const [undoDepth, setUndoDepth] = useState(0);
  const [redoDepth, setRedoDepth] = useState(0);
  const syncingRef = useRef(false);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const telemetrySessionRef = useRef(globalThis.crypto.randomUUID());
  const [duration, setDuration] = useState('00:00');

  const initialSetup = useMemo(() => loadWebLiveGameSetup(groupId, userId), [groupId, userId]);
  const [playerCount, setPlayerCount] = useState(initialSetup.playerCount);
  const [layoutVariant, setLayoutVariant] = useState<TableLayoutVariant>(initialSetup.layoutVariant);
  const [startingLife, setStartingLife] = useState(initialSetup.startingLife);
  const [seats, setSeats] = useState<WebLiveGameSeatSetup[]>(initialSetup.seats);
  const [starting, setStarting] = useState(false);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const lobbyIdRef = useRef<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [lobbyGuests, setLobbyGuests] = useState<LobbyGuest[]>([]);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteOrigin, setInviteOrigin] = useState('');
  const [inviteExpanded, setInviteExpanded] = useState(true);
  const participants = useMemo<WebTrackerParticipant[]>(() => [
    ...baseParticipants,
    ...lobbyGuests.map((entry) => {
      const guest = relationOne(entry.arena_guests);
      const deck = relationOne(entry.arena_guest_decks);
      return {
        key: `guest:${entry.guest_id}` as ParticipantKey,
        displayName: guest?.display_name ?? copy({ it: 'Ospite', en: 'Guest' }),
        isGuest: true,
        userId: null,
        guestId: entry.guest_id,
        decks: deck ? [{
          id: entry.guest_deck_id,
          name: deck.name,
          commander: deck.commander,
          commanderImage: deck.commander_image,
        }] : [],
      };
    }),
  ], [baseParticipants, copy, lobbyGuests]);

  useEffect(() => {
    setInviteOrigin(window.location.origin);
    const raw = localStorage.getItem(`phyrexian:live-lobby:${groupId}`);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { id?: string; token?: string };
      if (saved.id && saved.token) {
        lobbyIdRef.current = saved.id;
        setLobbyId(saved.id);
        setInviteToken(saved.token);
      }
    } catch {
      localStorage.removeItem(`phyrexian:live-lobby:${groupId}`);
    }
  }, [groupId]);

  const refreshLobby = useCallback(async () => {
    if (!lobbyIdRef.current) return;
    const response = await fetch(`/api/live-game-lobby?id=${encodeURIComponent(lobbyIdRef.current)}`, { cache: 'no-store' });
    if (!response.ok) return;
    const result = await response.json() as { guests?: LobbyGuest[] };
    setLobbyGuests(result.guests ?? []);
  }, []);

  useEffect(() => {
    if (!lobbyId || record) return;
    void refreshLobby();
    const timer = window.setInterval(() => void refreshLobby(), 1500);
    return () => window.clearInterval(timer);
  }, [lobbyId, record, refreshLobby]);

  useEffect(() => {
    if (record || lobbyGuests.length === 0) return;
    setSeats((current) => {
      const next = [...current];
      let changed = false;
      for (const guest of lobbyGuests) {
        const key = `guest:${guest.guest_id}` as ParticipantKey;
        if (next.some((seat) => seat.participantKey === key)) continue;
        const empty = next.findIndex((seat) => !seat.participantKey);
        if (empty >= 0) {
          next[empty] = { participantKey: key, deckId: guest.guest_deck_id };
          changed = true;
        } else if (next.length < 6) {
          next.push({ participantKey: key, deckId: guest.guest_deck_id });
          changed = true;
        }
      }
      if (changed) setPlayerCount(next.length);
      return changed ? next : current;
    });
  }, [lobbyGuests, record]);

  const createInvite = async () => {
    setCreatingInvite(true);
    try {
      const response = await fetch('/api/live-game-lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Invite creation failed');
      lobbyIdRef.current = result.id;
      setLobbyId(result.id);
      setInviteToken(result.token);
      localStorage.setItem(`phyrexian:live-lobby:${groupId}`, JSON.stringify({ id: result.id, token: result.token }));
    } catch (error) {
      toast({
        title: copy({ it: 'Invito non creato', en: 'Invite not created' }),
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setCreatingInvite(false);
    }
  };

  const rotateInvite = async () => {
    if (!lobbyIdRef.current) return;
    const response = await fetch('/api/live-game-lobby', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lobbyId: lobbyIdRef.current, action: 'rotate' }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.token) return;
    setInviteToken(result.token);
    localStorage.setItem(`phyrexian:live-lobby:${groupId}`, JSON.stringify({ id: lobbyIdRef.current, token: result.token }));
  };

  const removeLobbyGuest = async (guestSessionId: string) => {
    if (!lobbyIdRef.current) return;
    await fetch('/api/live-game-lobby', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lobbyId: lobbyIdRef.current, action: 'remove', guestSessionId }),
    });
    await refreshLobby();
  };

  const [damageDraft, setDamageDraft] = useState<DamageDraft | null>(null);
  const [damageAmount, setDamageAmount] = useState('0');
  const [damagePanelKey, setDamagePanelKey] = useState<ParticipantKey | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [highlight, setHighlight] = useState<ParticipantKey | null>(null);
  const [randomOpponentMode, setRandomOpponentMode] = useState(false);
  const [randomizerOpen, setRandomizerOpen] = useState(false);
  const [randomizerResult, setRandomizerResult] = useState<string | number | null>(null);
  const rouletteTimers = useRef<number[]>([]);
  const [endOpen, setEndOpen] = useState(false);
  const [winnerKey, setWinnerKey] = useState<ParticipantKey | ''>('');
  const [isDraw, setIsDraw] = useState(false);
  const [winCondition, setWinCondition] = useState<WinCondition | null>(null);
  const [ending, setEnding] = useState(false);
  const [completedRecord, setCompletedRecord] = useState<LiveGameRecord | null>(null);
  const [completedDuration, setCompletedDuration] = useState('00:00');
  const [confirmRematch, setConfirmRematch] = useState(false);
  const [confirmEliminate, setConfirmEliminate] = useState<ParticipantKey | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [exitChoiceOpen, setExitChoiceOpen] = useState(false);
  const previousActivePlayerCountRef = useRef<number | null>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [tableSize, setTableSize] = useState({ width: 390, height: 760 });
  const [fullscreen, setFullscreen] = useState(false);

  const toggleTrackerFullscreen = useCallback(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone) {
      void lockTrackerPortraitOrientation();
      return;
    }
    if (document.fullscreenElement) {
      unlockTrackerOrientation();
      void document.exitFullscreen().catch(() => undefined);
      return;
    }
    if (document.fullscreenEnabled && document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen({ navigationUI: 'hide' })
        .then(() => lockTrackerPortraitOrientation())
        .catch(() => {
          toast({
            title: copy({
              it: 'Il browser non ha consentito lo schermo intero. Riprova dal pulsante del tracker.',
              en: 'The browser did not allow fullscreen. Try again from the tracker button.',
            }),
            variant: 'destructive',
          });
        });
      return;
    }
    toast({
      title: copy({
        it: 'Per il vero schermo intero su iPad, aggiungi Phyrexian Arena alla schermata Home.',
        en: 'For true fullscreen on iPad, add Phyrexian Arena to your Home Screen.',
      }),
    });
  }, [copy, toast]);

  useEffect(() => {
    const updateFullscreen = () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      setFullscreen(isFullscreen);
      if (isFullscreen) {
        void lockTrackerPortraitOrientation();
      } else {
        unlockTrackerOrientation();
      }
    };
    updateFullscreen();
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', updateFullscreen);
      unlockTrackerOrientation();
    };
  }, []);

  const setOptimisticRecord = useCallback((next: LiveGameRecord | null) => {
    recordRef.current = next;
    setRecord(next);
  }, []);

  const persist = useCallback((next = recordRef.current) => {
    if (!next || !serverRef.current) return;
    saveWebLiveGameJournal(groupId, {
      record: next,
      serverRecord: serverRef.current,
      needsCreate: needsCreateRef.current,
      mutations: queueRef.current,
      pendingFinalization: pendingFinalizationRef.current,
      pendingCancel: pendingCancelRef.current,
      history: historyRef.current,
    });
  }, [groupId]);

  const showCompletedGame = useCallback((completed: LiveGameRecord, endedAt: string) => {
    setCompletedDuration(formatDuration(completed.started_at, endedAt));
    setCompletedRecord(completed);
    serverRef.current = null;
    queueRef.current = [];
    needsCreateRef.current = false;
    historyRef.current = createLiveGameHistory();
    setUndoDepth(0);
    setRedoDepth(0);
    setPendingSyncCount(0);
    setOptimisticRecord(null);
    setEndOpen(false);
  }, [setEndOpen, setOptimisticRecord]);

  const clearCancelledGame = useCallback(() => {
    serverRef.current = null;
    queueRef.current = [];
    needsCreateRef.current = false;
    historyRef.current = createLiveGameHistory();
    setUndoDepth(0);
    setRedoDepth(0);
    setPendingSyncCount(0);
    setOptimisticRecord(null);
    setConfirmCancel(false);
  }, [setConfirmCancel, setOptimisticRecord]);

  const flush = useCallback(async () => {
    if (syncingRef.current || !recordRef.current || !serverRef.current || !navigator.onLine) return false;
    syncingRef.current = true;
    setSyncing(true);
    setSyncError(null);
    try {
      let server = serverRef.current;
      if (needsCreateRef.current) {
        server = await ensureLiveGameCreated(supabase, recordRef.current);
        serverRef.current = server;
        needsCreateRef.current = false;
        if (lobbyIdRef.current) {
          const response = await fetch('/api/live-game-lobby', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lobbyId: lobbyIdRef.current, liveGameId: server.id }),
          });
          if (!response.ok) throw new Error('Guest lobby link failed');
        }
      }
      while (queueRef.current.length > 0) {
        const queued = queueRef.current[0]!;
        server = await applyQueuedLiveGameMutation(supabase, server, queued);
        serverRef.current = server;
        queueRef.current = queueRef.current.slice(1);
        setPendingSyncCount(queueRef.current.length);
        setOptimisticRecord(replay(server, queueRef.current));
        persist(recordRef.current);
      }
      if (pendingFinalizationRef.current) {
        const completed = recordRef.current;
        const finalization = pendingFinalizationRef.current;
        await finalizeLiveGameAsMatch(supabase, {
          liveGameId: server.id,
          ...finalization,
        });
        pendingFinalizationRef.current = null;
        clearWebLiveGameJournal(groupId);
        if (completed) showCompletedGame(completed, finalization.endedAt);
        return true;
      }
      if (pendingCancelRef.current) {
        await cancelLiveGame(supabase, server.id);
        pendingCancelRef.current = false;
        clearWebLiveGameJournal(groupId);
        clearCancelledGame();
        return true;
      }
      persist(recordRef.current);
      return true;
    } catch (error) {
      persist(recordRef.current);
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
      console.error('Web live-game sync failed', error);
      return false;
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      void persistLiveGameTelemetry(supabase, {
        userId,
        liveGameId: recordRef.current?.id ?? null,
        sessionId: telemetrySessionRef.current,
        platform: 'web',
      }).catch(() => undefined);
    }
  }, [clearCancelledGame, groupId, persist, setOptimisticRecord, showCompletedGame, userId]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => {
      setOnline(true);
      void flush();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [flush]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const participantKey = `user:${userId}` as ParticipantKey;
      const cached = loadWebLiveGameJournal(groupId);
      if (cached?.record.state.players.some((player) => player.participantKey === participantKey)) {
        serverRef.current = cached.serverRecord;
        queueRef.current = cached.mutations;
        needsCreateRef.current = cached.needsCreate;
        pendingFinalizationRef.current = cached.pendingFinalization;
        pendingCancelRef.current = cached.pendingCancel;
        historyRef.current = cached.history;
        setUndoDepth(cached.history.undo.length);
        setRedoDepth(cached.history.redo.length);
        setPendingSyncCount(cached.mutations.length);
        setOptimisticRecord(cached.record);
      }
      try {
        const remote = await fetchActiveLiveGame(supabase, groupId, participantKey);
        if (!mounted) return;
        if (remote) {
          const queue = cached?.record.id === remote.id ? queueRef.current : [];
          serverRef.current = remote;
          queueRef.current = queue;
          setPendingSyncCount(queue.length);
          needsCreateRef.current = false;
          setOptimisticRecord(replay(remote, queue));
          persist(recordRef.current);
          void flush();
        } else if (cached && !cached.needsCreate) {
          clearWebLiveGameJournal(groupId);
          serverRef.current = null;
          queueRef.current = [];
          setOptimisticRecord(null);
        }
      } catch {
        // The crash-safe local journal remains playable offline.
      } finally {
        if (mounted) setBooting(false);
      }
    })();
    return () => { mounted = false; };
  }, [flush, groupId, persist, setOptimisticRecord, userId]);

  const activeRecordId = record?.id;
  useEffect(() => {
    if (!activeRecordId || needsCreateRef.current) return;
    return subscribeToLiveGame(supabase, activeRecordId, (remote) => {
      if (syncingRef.current || remote.status !== 'active') return;
      serverRef.current = remote;
      setOptimisticRecord(replay(remote, queueRef.current));
      persist(recordRef.current);
    });
  }, [activeRecordId, persist, setOptimisticRecord]);

  useEffect(() => {
    if (!record?.started_at) return;
    setDuration(formatDuration(record.started_at));
    const timer = window.setInterval(() => setDuration(formatDuration(record.started_at)), 1000);
    return () => window.clearInterval(timer);
  }, [record?.started_at]);

  useEffect(() => {
    if (!activeRecordId || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let disposed = false;
    const acquire = async () => {
      if (disposed || document.visibilityState !== 'visible') return;
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        // Safari/embedded browsers may reject wake lock; gameplay still works.
      }
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') void acquire(); };
    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void lock?.release();
    };
  }, [activeRecordId]);

  useEffect(() => {
    const element = tableRef.current;
    if (!element) return;
    const update = () => setTableSize({ width: element.clientWidth, height: element.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [record]);

  const changePlayerCount = (next: number) => {
    setPlayerCount(next);
    setSeats((current) => Array.from({ length: next }, (_, index) => (
      current[index] ?? { participantKey: null, deckId: null }
    )));
  };

  const updateSeatParticipant = (index: number, key: ParticipantKey | null) => {
    setSeats((current) => current.map((seat, seatIndex) => {
      if (seatIndex !== index) return seat;
      const participant = participants.find((entry) => entry.key === key);
      const previous = initialSetup.seats.find((entry) => entry.participantKey === key)?.deckId;
      const deckId = participant?.decks.some((deck) => deck.id === previous)
        ? previous!
        : participant?.decks[0]?.id ?? null;
      return { participantKey: key, deckId };
    }));
  };

  const startGame = async (override?: {
    playerCount: number;
    layoutVariant: TableLayoutVariant;
    startingLife: number;
    seats: WebLiveGameSeatSetup[];
  }) => {
    const nextPlayerCount = override?.playerCount ?? playerCount;
    const nextLayoutVariant = override?.layoutVariant ?? layoutVariant;
    const nextStartingLife = override?.startingLife ?? startingLife;
    const nextSeats = override?.seats ?? seats;
    const selected = nextSeats.filter((seat) => seat.participantKey && seat.deckId);
    if (selected.length !== nextPlayerCount || new Set(selected.map((seat) => seat.participantKey)).size !== nextPlayerCount) {
      toast({ title: copy({ it: 'Completa tutti i posti', en: 'Complete every seat' }), variant: 'destructive' });
      return;
    }
    toggleTrackerFullscreen();
    setStarting(true);
    try {
      const keys = selected.map((seat) => seat.participantKey!) as ParticipantKey[];
      if (navigator.onLine) {
        const busy = await fetchBusyLiveGameParticipantKeys(supabase, groupId, keys);
        if (busy.length) throw new Error(copy({ it: 'Uno dei giocatori è già in una partita attiva.', en: 'A player is already in another active game.' }));
      }
      const players = selected.map((seat, slot) => {
        const participant = participants.find((entry) => entry.key === seat.participantKey)!;
        const deck = participant.decks.find((entry) => entry.id === seat.deckId)!;
        return createLiveGamePlayer({
          slot,
          participantKey: participant.key,
          deckId: deck.id,
          displayName: participant.displayName,
          commander: deck.commander,
          commanderImage: deck.commanderImage,
          startingLife: nextStartingLife,
          allParticipantKeys: keys,
        });
      });
      const startedAt = new Date().toISOString();
      const startingPlayer = players[Math.floor(secureRandom() * players.length)]!;
      const created: LiveGameRecord = {
        id: crypto.randomUUID(),
        group_id: groupId,
        created_by: userId,
        status: 'active',
        starting_life: nextStartingLife,
        state: {
          version: 0,
          players,
          events: [],
          summary: createLiveGameSummary(),
          layoutVariant: nextLayoutVariant,
          startingPlayerKey: startingPlayer.participantKey,
          startingDirection: secureRandom() < 0.5 ? 'clockwise' : 'counterclockwise',
        },
        match_id: null,
        started_at: startedAt,
        ended_at: null,
        created_at: startedAt,
        updated_at: startedAt,
      };
      serverRef.current = created;
      queueRef.current = [];
      setPendingSyncCount(0);
      historyRef.current = createLiveGameHistory();
      setUndoDepth(0);
      setRedoDepth(0);
      needsCreateRef.current = true;
      pendingFinalizationRef.current = null;
      pendingCancelRef.current = false;
      setCompletedRecord(null);
      setOptimisticRecord(created);
      saveWebLiveGameSetup(groupId, userId, {
        playerCount: nextPlayerCount,
        layoutVariant: nextLayoutVariant,
        startingLife: nextStartingLife,
        seats: nextSeats,
      });
      persist(created);
      runRoulette(keys, startingPlayer.participantKey);
      void flush();
    } catch (error) {
      toast({ title: copy({ it: 'Partita non avviata', en: 'Game not started' }), description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
    } finally {
      setStarting(false);
    }
  };

  const enqueue = useCallback((
    mutation: LiveGameMutation,
    inverse?: LiveGameMutation,
    historyMode: 'record' | 'skip' = 'record',
  ) => {
    const current = recordRef.current;
    if (!current) return;
    const id = crypto.randomUUID();
    const tracked: LiveGameMutation = {
      ...mutation,
      eventId: mutation.eventId ?? id,
      occurredAt: mutation.occurredAt ?? new Date().toISOString(),
    };
    queueRef.current = [...queueRef.current, { id, mutation: tracked }];
    setPendingSyncCount(queueRef.current.length);
    recordLiveGameQueueDepth(queueRef.current.length);
    if (inverse && historyMode === 'record') {
      historyRef.current = recordLiveGameHistory(historyRef.current, { forward: mutation, inverse });
      setUndoDepth(historyRef.current.undo.length);
      setRedoDepth(0);
    }
    const next = { ...current, state: applyLiveGameMutation(current.state, tracked) };
    setOptimisticRecord(next);
    persist(next);
    void flush();
  }, [flush, persist, setOptimisticRecord]);

  const undoLastMutation = () => {
    const result = undoLiveGameHistory(historyRef.current);
    if (!result) return;
    historyRef.current = result.history;
    setUndoDepth(result.history.undo.length);
    setRedoDepth(result.history.redo.length);
    enqueue(result.mutation, undefined, 'skip');
  };

  const redoLastMutation = () => {
    const result = redoLiveGameHistory(historyRef.current);
    if (!result) return;
    historyRef.current = result.history;
    setUndoDepth(result.history.undo.length);
    setRedoDepth(result.history.redo.length);
    enqueue(result.mutation, undefined, 'skip');
  };

  const runRoulette = (pool: ParticipantKey[], winner?: ParticipantKey) => {
    rouletteTimers.current.forEach(window.clearTimeout);
    rouletteTimers.current = [];
    const picked = winner ?? pickRandomPlayer(recordRef.current!.state, pool)?.participantKey;
    if (!picked) return;
    const sequence = buildRouletteSequence(pool, picked);
    sequence.forEach((key, index) => {
      rouletteTimers.current.push(window.setTimeout(() => setHighlight(key), index * 120));
    });
    rouletteTimers.current.push(window.setTimeout(() => setHighlight(null), sequence.length * 120 + 4000));
  };

  const selectRandomOpponent = (activeKey: ParticipantKey) => {
    if (!record) return;
    const pool = record.state.players
      .filter((player) => !player.isEliminated && player.participantKey !== activeKey)
      .map((player) => player.participantKey);
    setRandomOpponentMode(false);
    runRoulette(pool);
  };

  const beginDamageDrag = (event: React.PointerEvent<HTMLElement>, sourceKey: ParticipantKey) => {
    if (randomOpponentMode || event.button !== 0) return;
    setDrag({
      sourceKey,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      targetKey: null,
    });
  };

  const dragging = Boolean(drag);
  useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => {
      const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-player-key]');
      const key = element?.dataset.playerKey as ParticipantKey | undefined;
      setDrag((current) => current ? {
        ...current,
        x: event.clientX,
        y: event.clientY,
        targetKey: key && key !== current.sourceKey ? key : null,
      } : null);
    };
    const up = () => {
      setDrag((current) => {
        if (current?.targetKey) {
          setDamageDraft({ sourceKey: current.sourceKey, targetKey: current.targetKey, mode: 'life', scope: 'single' });
          setDamageAmount('0');
        }
        return null;
      });
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up, { once: true });
    window.addEventListener('pointercancel', up, { once: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [dragging]);

  const applyDamageDraft = () => {
    if (!damageDraft) return;
    const amount = Math.max(0, Math.min(999, Number(damageAmount) || 0));
    if (amount === 0) return;
    if (damageDraft.scope !== 'single' && damageDraft.mode === 'life') {
      enqueue({
        type: 'adjust_many',
        sourceKey: damageDraft.sourceKey,
        amount,
        scope: damageDraft.scope,
      }, {
        type: 'adjust_many',
        sourceKey: damageDraft.sourceKey,
        amount: -amount,
        scope: damageDraft.scope,
      });
    } else {
      enqueue({
        type: 'adjust',
        targetKey: damageDraft.targetKey,
        sourceKey: damageDraft.sourceKey,
        amount,
        mode: damageDraft.mode,
      }, {
        type: 'adjust',
        targetKey: damageDraft.targetKey,
        sourceKey: damageDraft.sourceKey,
        amount: -amount,
        mode: damageDraft.mode,
      });
    }
    setDamageDraft(null);
  };

  const openEnd = useCallback(() => {
    if (!record) return;
    const suggested = getSuggestedWinner(record.state);
    setWinnerKey(suggested?.participantKey ?? '');
    setIsDraw(false);
    setWinCondition(getDefaultWinCondition(record.state));
    setEndOpen(true);
  }, [record, setEndOpen, setIsDraw, setWinCondition, setWinnerKey]);

  useEffect(() => {
    if (!record) {
      previousActivePlayerCountRef.current = null;
      return;
    }

    const activePlayerCount = record.state.players.filter((player) => !player.isEliminated).length;
    const previousActivePlayerCount = previousActivePlayerCountRef.current;
    previousActivePlayerCountRef.current = activePlayerCount;

    if (previousActivePlayerCount !== null && previousActivePlayerCount > 1 && activePlayerCount === 1) {
      openEnd();
    }
  }, [openEnd, record]);

  const finishGame = async () => {
    if (!record) return;
    const result = {
      winnerKey: isDraw ? null : winnerKey || null,
      isDraw,
      winCondition: isDraw ? null : winCondition,
    };
    if (!isValidLiveGameResult(record.state, result)) {
      toast({ title: copy({ it: 'Seleziona vincitore e condizione di vittoria.', en: 'Select a winner and win condition.' }), variant: 'destructive' });
      return;
    }
    const players = record.state.players.map((player) => {
      const participant = participants.find((entry) => entry.key === player.participantKey)!;
      return {
        participantKey: player.participantKey,
        deckId: player.deckId,
        isGuest: participant.isGuest,
        userId: participant.userId,
        guestId: participant.guestId,
      };
    });
    pendingFinalizationRef.current = {
      winnerKey: result.winnerKey,
      isDraw,
      winCondition: result.winCondition,
      endedAt: new Date().toISOString(),
      players,
    };
    persist(record);
    setEnding(true);
    const saved = await flush();
    setEnding(false);
    if (saved) {
      toast({ title: copy({ it: `Partita salvata · ${duration}`, en: `Game saved · ${duration}` }) });
    } else {
      toast({ title: copy({ it: 'Salvataggio in attesa di connessione', en: 'Waiting for connection to save' }), variant: 'destructive' });
    }
  };

  const cancelGame = async () => {
    if (!record) return;
    pendingCancelRef.current = true;
    persist(record);
    const cancelled = await flush();
    if (cancelled) {
      router.replace(`/table/${groupId}`);
    }
  };

  if (booting) {
    return <div className="grid min-h-dvh place-items-center bg-black text-violet-200"><Loader2 className="h-9 w-9 animate-spin" /></div>;
  }

  if (!record) {
    if (completedRecord) {
      const completedPlayers = [...completedRecord.state.players].sort((left, right) => left.slot - right.slot);
      const previousSetup = {
        playerCount: completedPlayers.length,
        layoutVariant: completedRecord.state.layoutVariant ?? 'classic' as TableLayoutVariant,
        startingLife: completedRecord.starting_life,
        seats: completedPlayers.map((player) => ({
          participantKey: player.participantKey,
          deckId: player.deckId,
        })),
      };
      const prepareReselection = () => {
        setPlayerCount(previousSetup.playerCount);
        setLayoutVariant(previousSetup.layoutVariant);
        setStartingLife(previousSetup.startingLife);
        setSeats(previousSetup.seats);
        setCompletedRecord(null);
      };
      return (
        <div className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_top,#28144a_0%,#08080e_52%,#000_100%)] p-4 text-foreground">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-violet-400/30 bg-card/95 shadow-2xl shadow-violet-950/50 backdrop-blur-xl">
            <div className="bg-gradient-to-br from-violet-600/30 via-fuchsia-600/15 to-transparent p-7 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-violet-500/20 text-violet-200 shadow-lg">
                <Trophy className="h-8 w-8" />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-300">{arenaName}</p>
              <h1 className="mt-2 text-3xl font-black">{copy({ it: 'Partita salvata', en: 'Game saved' })}</h1>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 font-bold text-violet-100">
                <Clock3 className="h-4 w-4" /> {completedDuration}
              </div>
            </div>
            <div className="space-y-3 p-5 sm:p-7">
              <LiveGameRecapView
                record={completedRecord}
                labels={{
                  timeline: copy({ it: 'Andamento vite', en: 'Life timeline' }),
                  highlights: copy({ it: 'Momenti chiave', en: 'Highlights' }),
                  empty: copy({ it: 'Nessun momento chiave registrato.', en: 'No highlights recorded.' }),
                }}
              />
              <Button onClick={() => setConfirmRematch(true)} className="h-13 w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 font-black">
                <RotateCcw className="mr-2 h-5 w-5" />
                {copy({ it: 'Nuova partita · stessi mazzi', en: 'New game · same decks' })}
              </Button>
              <Button variant="outline" onClick={prepareReselection} className="h-13 w-full font-bold">
                <Swords className="mr-2 h-5 w-5" />
                {copy({ it: 'Riseleziona giocatori e mazzi', en: 'Reselect players and decks' })}
              </Button>
              <Button variant="ghost" onClick={() => router.replace(`/table/${groupId}`)} className="w-full text-muted-foreground">
                {copy({ it: 'Torna all’Arena', en: 'Back to Arena' })}
              </Button>
            </div>
          </div>

          {confirmRematch && (
            <ModalOverlay>
              <ModalCard>
                <ModalTitle icon={RotateCcw} title={copy({ it: 'Confermi gli stessi mazzi?', en: 'Use the same decks?' })} onClose={() => setConfirmRematch(false)} />
                <div className="space-y-4 p-5">
                  <p className="text-sm text-muted-foreground">
                    {copy({
                      it: 'Posti e mazzi restano invariati. Giocatore iniziale e verso di gioco verranno sorteggiati di nuovo.',
                      en: 'Seats and decks stay the same. Starting player and play direction will be randomized again.',
                    })}
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setConfirmRematch(false)} className="flex-1">{copy({ it: 'Annulla', en: 'Cancel' })}</Button>
                    <Button
                      disabled={starting}
                      onClick={() => {
                        setConfirmRematch(false);
                        void startGame(previousSetup);
                      }}
                      className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 font-black"
                    >
                      {starting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {copy({ it: 'Conferma', en: 'Confirm' })}
                    </Button>
                  </div>
                </div>
              </ModalCard>
            </ModalOverlay>
          )}
        </div>
      );
    }
    const usedKeys = seats.map((seat) => seat.participantKey).filter(Boolean);
    return (
      <div className="min-h-dvh bg-[radial-gradient(circle_at_top,#21163b_0%,#08080e_48%,#000_100%)] px-3 pb-10 pt-[max(1rem,env(safe-area-inset-top))] text-foreground sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/table/${groupId}`)}><ArrowLeft /></Button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Live tracker</p>
              <h1 className="truncate text-2xl font-black">{arenaName}</h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-2 text-xs text-muted-foreground">
              {online ? <CircleDot className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-amber-400" />}
              {online ? 'Realtime' : 'Offline'}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-violet-500/25 bg-card/90 shadow-2xl shadow-violet-950/30 backdrop-blur-xl">
            <div className="border-b border-border bg-gradient-to-r from-violet-500/10 to-cyan-500/5 p-5 sm:p-7">
              <h2 className="text-xl font-black">{copy({ it: 'Configura la partita', en: 'Set up the game' })}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{copy({ it: 'Scegli layout, posti e mazzi. L’ultima configurazione viene ricordata.', en: 'Choose layout, seats and decks. Your last setup is remembered.' })}</p>
            </div>
            <div className="flex flex-col gap-7 p-4 sm:p-7">
              <section className="order-last overflow-hidden rounded-3xl border border-violet-400/25 bg-gradient-to-br from-violet-500/15 via-background/70 to-cyan-500/10">
                <div className="flex flex-wrap items-center gap-3 border-b border-white/10 p-4">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/20 text-violet-200"><QrCode className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black">{copy({ it: 'Guest da remoto', en: 'Remote guests' })}</h3>
                    <p className="text-xs text-muted-foreground">{copy({ it: 'Aggiungi altri giocatori tramite link o QR.', en: 'Add other players through a link or QR code.' })}</p>
                  </div>
                  {!inviteToken ? <Button onClick={() => void createInvite()} disabled={creatingInvite} className="w-full font-black sm:w-auto">
                    {creatingInvite ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                    {copy({ it: 'Crea invito', en: 'Create invite' })}
                  </Button> : null}
                  {inviteToken ? <Button size="icon" variant="ghost" onClick={() => setInviteExpanded((value) => !value)}><ChevronDown className={cn('transition', inviteExpanded && 'rotate-180')} /></Button> : null}
                </div>
                {inviteToken && inviteExpanded ? <div className="grid gap-4 p-4 sm:grid-cols-[160px_1fr]">
                  <div className="rounded-2xl bg-white p-2 shadow-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/game-invite-qr?token=${encodeURIComponent(inviteToken)}`}
                      alt={copy({ it: 'QR invito partita', en: 'Game invite QR' })}
                      className="aspect-square w-full"
                    />
                  </div>
                  <div className="min-w-0 space-y-3">
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard.writeText(`${inviteOrigin}/game/join/${inviteToken}`)}
                      className="w-full truncate rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-left text-xs text-violet-200"
                    >
                      {inviteOrigin}/game/join/{inviteToken}
                    </button>
                    <Button variant="outline" className="w-full" onClick={() => void rotateInvite()}>{copy({ it: 'Crea nuovo invito', en: 'Create new invite' })}</Button>
                    <div className="space-y-2">
                      {lobbyGuests.length ? lobbyGuests.map((guest) => {
                        const profile = relationOne(guest.arena_guests);
                        const deck = relationOne(guest.arena_guest_decks);
                        return <div key={guest.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3">
                          <span className={cn('h-2.5 w-2.5 rounded-full', guest.ready ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : 'bg-amber-400')} />
                          <div className="min-w-0 flex-1"><b className="block truncate">{profile?.display_name ?? 'Guest'}</b><span className="block truncate text-xs text-muted-foreground">{deck?.commander}</span></div>
                          <span className={cn('rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider', guest.ready ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/15 text-amber-200')}>{guest.ready ? copy({ it: 'Pronto', en: 'Ready' }) : copy({ it: 'In attesa', en: 'Waiting' })}</span>
                          <Button size="icon" variant="ghost" onClick={() => void removeLobbyGuest(guest.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>;
                      }) : <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-muted-foreground">{copy({ it: 'Nessun guest collegato.', en: 'No guests connected.' })}</p>}
                    </div>
                  </div>
                </div> : null}
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-violet-600 text-xs font-black">1</span><h3 className="font-bold">{copy({ it: 'Numero giocatori', en: 'Number of players' })}</h3></div>
                <div className="grid grid-cols-5 gap-2">
                  {[2, 3, 4, 5, 6].map((count) => <button key={count} onClick={() => changePlayerCount(count)} className={cn('h-12 rounded-2xl border text-base font-black transition active:scale-95', playerCount === count ? 'border-violet-400 bg-violet-600/35 text-white shadow-lg shadow-violet-900/30' : 'border-border bg-background/70 text-muted-foreground hover:border-violet-500/50')}>{count}</button>)}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-violet-600 text-xs font-black">2</span><h3 className="font-bold">Layout</h3></div>
                <div className="grid grid-cols-2 gap-3">
                  {(['classic', 'opposed'] as const).map((variant) => <button key={variant} onClick={() => setLayoutVariant(variant)} className={cn('relative min-h-28 rounded-2xl border p-4 text-left transition active:scale-[.98]', layoutVariant === variant ? 'border-violet-400 bg-violet-600/20' : 'border-border bg-background/60')}><div className="mb-3 grid h-12 grid-cols-2 gap-1 rounded-lg border border-border p-1">{Array.from({ length: Math.min(playerCount, 6) }, (_, index) => <span key={index} className="rounded bg-violet-400/45" />)}</div><span className="font-bold">{variant === 'classic' ? copy({ it: 'Intorno al tavolo', en: 'Around the table' }) : copy({ it: 'Lati contrapposti', en: 'Opposing sides' })}</span>{layoutVariant === variant && <Check className="absolute right-3 top-3 h-5 w-5 text-violet-300" />}</button>)}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-violet-600 text-xs font-black">3</span><h3 className="font-bold">{copy({ it: 'Assegna posti', en: 'Assign seats' })}</h3></div>
                <div className="grid gap-3 md:grid-cols-2">
                  {seats.map((seat, index) => {
                    const participant = participants.find((entry) => entry.key === seat.participantKey);
                    return <div key={index} className="rounded-2xl border border-border bg-background/55 p-3"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground"><span className="grid h-6 w-6 place-items-center rounded-full bg-secondary">{index + 1}</span>{copy({ it: 'Posto', en: 'Seat' })} {index + 1}</div><select value={seat.participantKey ?? ''} onChange={(event) => updateSeatParticipant(index, (event.target.value || null) as ParticipantKey | null)} className="h-12 w-full rounded-xl border border-input bg-card px-3 font-semibold outline-none focus:border-violet-400"><option value="">{copy({ it: 'Scegli giocatore', en: 'Choose player' })}</option>{participants.map((entry) => <option key={entry.key} value={entry.key} disabled={usedKeys.includes(entry.key) && entry.key !== seat.participantKey}>{entry.displayName}</option>)}</select>{participant && <select value={seat.deckId ?? ''} onChange={(event) => setSeats((current) => current.map((item, seatIndex) => seatIndex === index ? { ...item, deckId: event.target.value || null } : item))} className="mt-2 h-12 w-full rounded-xl border border-input bg-card px-3 outline-none focus:border-violet-400"><option value="">{copy({ it: 'Scegli mazzo', en: 'Choose deck' })}</option>{participant.decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.name} · {deck.commander}</option>)}</select>}</div>;
                  })}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2"><Heart className="h-5 w-5 text-rose-300" /><h3 className="font-bold">{copy({ it: 'Punti vita iniziali', en: 'Starting life' })}</h3></div>
                <div className="flex flex-wrap gap-2">{[20, 25, 30, 40, 60].map((life) => <button key={life} onClick={() => setStartingLife(life)} className={cn('h-11 min-w-14 rounded-full border px-4 font-black transition active:scale-95', startingLife === life ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100' : 'border-border bg-background/60 text-muted-foreground')}>{life}</button>)}</div>
              </section>

              <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={() => { const reset = createDefaultWebLiveGameSetup(); setPlayerCount(reset.playerCount); setLayoutVariant(reset.layoutVariant); setStartingLife(reset.startingLife); setSeats(reset.seats); }}><RotateCcw className="mr-2 h-4 w-4" />Reset</Button>
                <Button onClick={() => void startGame()} disabled={starting} className="h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 font-black shadow-lg shadow-violet-950/40">{starting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Swords className="mr-2 h-5 w-5" />}{copy({ it: 'Avvia partita', en: 'Start game' })}</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const orientation = getViewportTableOrientation(tableSize.width, tableSize.height);
  const layouts = getSquareTableLayouts(record.state.players.length, tableSize.width, tableSize.height, record.state.layoutVariant ?? 'classic', orientation);
  const assignments = mapPlayersToSeats(record.state.players, layouts, null);
  const centerToolbarBand = getCenterToolbarBand(
    record.state.players.length,
    tableSize.width,
    tableSize.height,
    record.state.layoutVariant ?? 'classic',
    orientation,
  );
  const panelPlayer = record.state.players.find((player) => player.participantKey === damagePanelKey);
  const activePlayers = record.state.players.filter((player) => !player.isEliminated);
  const alternativeRequired = activePlayers.length !== 1;
  const toolbarMainSize = centerToolbarBand?.axis === 'vertical'
    ? centerToolbarBand.height
    : centerToolbarBand?.width ?? 0;
  const toolbarCrossSize = centerToolbarBand?.axis === 'vertical'
    ? centerToolbarBand.width
    : centerToolbarBand?.height ?? 0;
  const toolbarControlSize = Math.max(30, Math.min(56, toolbarCrossSize - 12, (toolbarMainSize - 96) / 8));
  const toolbarButtonStyle = { width: toolbarControlSize, height: toolbarControlSize };
  const toolbarDurationStyle = centerToolbarBand?.axis === 'vertical'
    ? { width: toolbarControlSize, height: Math.min(80, toolbarControlSize * 1.5) }
    : { width: Math.min(88, toolbarControlSize * 1.65), height: toolbarControlSize };

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-black text-white touch-none">
      <div ref={tableRef} className="absolute inset-0 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
        {assignments.map(({ player, layout }) => {
          const rotation = orientation === 'landscape'
            ? getLandscapeSeatRotation(layout, tableSize.width)
            : getSeatRotation(layout.role, record.state.players.length, record.state.layoutVariant ?? 'classic');
          const sideways = Math.abs(rotation) === 90;
          const selected = highlight === player.participantKey;
          const isStarting = record.state.startingPlayerKey === player.participantKey;
          const contentWidth = sideways ? layout.height : layout.width;
          const contentHeight = sideways ? layout.width : layout.height;
          const shortestSide = Math.min(contentWidth, contentHeight);
          const controlSize = Math.max(36, Math.min(68, shortestSide * 0.16));
          const controlWidth = controlSize * 1.35;
          const controlInset = Math.max(8, Math.min(24, contentWidth * 0.055));
          const iconSize = Math.max(18, Math.min(31, controlSize * 0.48));
          const auxiliarySize = Math.max(32, Math.min(48, controlSize * 0.75));
          return (
            <section key={player.participantKey} data-player-key={player.participantKey} onPointerDown={(event) => beginDamageDrag(event, player.participantKey)} onClickCapture={(event) => { if (randomOpponentMode) { event.stopPropagation(); selectRandomOpponent(player.participantKey); } }} className={cn('absolute overflow-hidden rounded-[clamp(12px,2vw,28px)] border-2 bg-zinc-950 transition-all duration-200', selected ? 'z-20 border-amber-300 shadow-[0_0_45px_rgba(251,191,36,.9)] brightness-125' : 'border-black/80', drag?.targetKey === player.participantKey && 'border-rose-400 shadow-[0_0_35px_rgba(244,63,94,.8)]', player.isEliminated && 'grayscale brightness-50')} style={{ left: layout.left, top: layout.top, width: layout.width, height: layout.height }}>
              <DeckImage src={player.commanderImage} alt={player.commander} className="absolute inset-0 h-full w-full rounded-none object-cover opacity-75" fallbackClassName="absolute inset-0 h-full w-full rounded-none" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/50" />
              <div className="absolute left-1/2 top-1/2" style={{ width: contentWidth, height: contentHeight, transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}>
                <HoldActionButton variant="ghost" stopPropagation onShort={() => enqueue({ type: 'adjust', targetKey: player.participantKey, amount: 1, mode: 'life' }, { type: 'adjust', targetKey: player.participantKey, amount: -1, mode: 'life' })} onLong={() => enqueue({ type: 'adjust', targetKey: player.participantKey, amount: 10, mode: 'life' }, { type: 'adjust', targetKey: player.participantKey, amount: -10, mode: 'life' })} className="absolute top-1/2 z-10 grid -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/55 font-light shadow-lg backdrop-blur transition active:scale-90" style={{ left: controlInset, width: controlWidth, height: controlSize }} aria-label={`${copy({ it: 'Riduci punti vita di', en: 'Reduce life for' })} ${player.displayName}`}><Minus style={{ width: iconSize, height: iconSize }} /></HoldActionButton>
                <HoldActionButton variant="ghost" stopPropagation onShort={() => enqueue({ type: 'adjust', targetKey: player.participantKey, amount: -1, mode: 'life' }, { type: 'adjust', targetKey: player.participantKey, amount: 1, mode: 'life' })} onLong={() => enqueue({ type: 'adjust', targetKey: player.participantKey, amount: -10, mode: 'life' }, { type: 'adjust', targetKey: player.participantKey, amount: 10, mode: 'life' })} className="absolute top-1/2 z-10 grid -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/55 font-light shadow-lg backdrop-blur transition active:scale-90" style={{ right: controlInset, width: controlWidth, height: controlSize }} aria-label={`${copy({ it: 'Aumenta punti vita di', en: 'Increase life for' })} ${player.displayName}`}><Plus style={{ width: iconSize, height: iconSize }} /></HoldActionButton>
                <div className="pointer-events-none absolute left-1/2 top-[7%] z-10 max-w-[66%] -translate-x-1/2 truncate rounded-full border border-white/15 bg-gradient-to-r from-black/75 via-zinc-900/80 to-black/75 px-[clamp(10px,3%,20px)] py-[clamp(4px,1.5%,9px)] font-black tracking-wide text-white shadow-xl backdrop-blur-md" style={{ fontSize: `clamp(11px, ${shortestSide * 0.052}px, 22px)` }}>{player.displayName}</div>
                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-black leading-none drop-shadow-[0_3px_4px_rgba(0,0,0,.9)]" style={{ fontSize: `clamp(54px, ${shortestSide * 0.28}px, 112px)` }}>{player.life}</div>
                <button
                  onClick={(event) => { event.stopPropagation(); setDamagePanelKey(player.participantKey); }}
                  className="absolute left-1/2 top-3/4 z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-violet-200/30 bg-black/65 text-violet-100 shadow-lg backdrop-blur transition active:scale-90"
                  style={{ width: controlSize, height: controlSize }}
                  aria-label={`${player.displayName} damage details`}
                >
                  <Shield style={{ width: iconSize, height: iconSize }} />
                </button>
                {player.isEliminated && <button onClick={(event) => { event.stopPropagation(); enqueue({ type: 'revive', targetKey: player.participantKey, startingLife: record.starting_life }, { type: 'restore-player', player }); }} className="absolute left-3 top-3 z-20 rounded-full bg-emerald-600 px-3 font-black" style={{ height: auxiliarySize, fontSize: Math.max(10, auxiliarySize * 0.27) }}><RotateCcw className="mr-1 inline" style={{ width: auxiliarySize * 0.38, height: auxiliarySize * 0.38 }} />Revive</button>}
                {!player.isEliminated && <button onClick={(event) => { event.stopPropagation(); setConfirmEliminate(player.participantKey); }} className="absolute left-3 top-3 z-20 grid place-items-center rounded-full border border-white/20 bg-black/55 text-white/75" style={{ width: auxiliarySize, height: auxiliarySize }}><Skull style={{ width: auxiliarySize * 0.4, height: auxiliarySize * 0.4 }} /></button>}
                {isStarting && <div className="absolute left-3 bottom-3 max-w-[55%] rounded-full border border-amber-300/50 bg-amber-950/80 px-3 py-1 text-[11px] font-black text-amber-100"><ChevronRight className={cn('mr-1 inline h-3.5 w-3.5', record.state.startingDirection === 'counterclockwise' && 'rotate-180')} />{record.state.startingDirection === 'clockwise' ? 'Clockwise' : 'Counterclockwise'}</div>}
              </div>
            </section>
          );
        })}

        {centerToolbarBand && <div
          className={cn(
            'absolute z-30 flex items-center justify-center',
            centerToolbarBand.axis === 'vertical' ? 'flex-col' : 'flex-row',
          )}
          style={{
            left: centerToolbarBand.left,
            top: centerToolbarBand.top,
            width: centerToolbarBand.width,
            height: centerToolbarBand.height,
          }}
        >
        <div className={cn('flex h-full w-full items-center justify-between border border-white/10 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-xl', centerToolbarBand.axis === 'vertical' ? 'flex-col' : 'flex-row')}>
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full" style={toolbarButtonStyle} onClick={() => setExitChoiceOpen(true)} title="Back"><ArrowLeft /></Button>
          <div className={cn('flex shrink-0 items-center justify-center gap-1 rounded-full bg-zinc-900 px-1.5 text-xs font-bold text-zinc-300', centerToolbarBand.axis === 'vertical' && 'flex-col px-1')} style={toolbarDurationStyle}><Clock3 className="h-4 w-4 shrink-0" />{duration}</div>
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full" style={toolbarButtonStyle} onClick={undoLastMutation} disabled={!undoDepth} title="Undo"><RotateCcw /></Button>
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full" style={toolbarButtonStyle} onClick={redoLastMutation} disabled={!redoDepth} title="Redo"><Redo2 /></Button>
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full" style={toolbarButtonStyle} onClick={() => runRoulette(activePlayers.map((player) => player.participantKey))} title="Random player"><Dices /></Button>
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full" style={toolbarButtonStyle} onClick={() => { setRandomizerResult(null); setRandomizerOpen(true); }} title="Dado o moneta"><Box /></Button>
          <Button variant={randomOpponentMode ? 'default' : 'ghost'} size="icon" className="shrink-0 rounded-full" style={toolbarButtonStyle} onClick={() => setRandomOpponentMode((value) => !value)} title="Random opponent">
            <span className="relative block h-5 w-5">
              <UserRound className="absolute left-0 top-0 h-[18px] w-[18px]" />
              <Dices className="absolute -bottom-1 -right-1 h-3 w-3 text-violet-300" />
            </span>
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full" style={toolbarButtonStyle} onClick={openEnd} title="End game"><Flag /></Button>
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full" style={toolbarButtonStyle} onClick={toggleTrackerFullscreen} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>{fullscreen ? <Minimize2 /> : <Maximize2 />}</Button>
        </div>
        </div>}
        <button
          type="button"
          onClick={() => void flush()}
          className={cn(
            'absolute right-2 top-[calc(env(safe-area-inset-top)+.5rem)] z-40 flex items-center gap-1.5 rounded-full border bg-black/75 px-2.5 py-1 text-[10px] font-bold backdrop-blur',
            syncError ? 'border-rose-400/50 text-rose-200' : online ? 'border-emerald-400/30 text-emerald-200' : 'border-amber-400/40 text-amber-200',
          )}
          title={syncError ?? undefined}
        >
          {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : online ? <CircleDot className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {syncError ? copy({ it: 'Riprova sync', en: 'Retry sync' }) : syncing ? copy({ it: 'Sincronizzo', en: 'Syncing' }) : pendingSyncCount ? `${pendingSyncCount} ${copy({ it: 'in attesa', en: 'pending' })}` : online ? copy({ it: 'Sincronizzato', en: 'Synced' }) : 'Offline'}
        </button>
        {randomOpponentMode && <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top)+1rem)] z-40 mx-auto max-w-md rounded-2xl border border-violet-400/40 bg-violet-950/95 px-4 py-3 text-center text-sm font-bold shadow-2xl backdrop-blur">{copy({ it: 'Tocca qualsiasi punto della card del giocatore attivo da escludere.', en: 'Tap anywhere on the active player card to exclude them.' })}</div>}
      </div>

      {drag && <svg className="pointer-events-none fixed inset-0 z-50 h-full w-full"><defs><marker id="damage-arrow" markerWidth="14" markerHeight="14" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#fb7185" /></marker><filter id="damage-glow"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs><path d={`M ${drag.startX} ${drag.startY} Q ${(drag.startX + drag.x) / 2} ${Math.min(drag.startY, drag.y) - 90} ${drag.x} ${drag.y}`} fill="none" stroke="#fb7185" strokeWidth="7" strokeLinecap="round" markerEnd="url(#damage-arrow)" filter="url(#damage-glow)" strokeDasharray="12 8"><animate attributeName="stroke-dashoffset" from="40" to="0" dur=".7s" repeatCount="indefinite" /></path></svg>}

      {randomizerOpen && <ModalOverlay><ModalCard><div className="space-y-5 p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-black">{copy({ it: 'Dado o moneta', en: 'Die or coin' })}</h2><button onClick={() => setRandomizerOpen(false)} aria-label="Close"><X /></button></div><div className="grid grid-cols-4 gap-2">{([
        ['coin', copy({ it: 'Moneta', en: 'Coin' })],
        ['d4', 'd4'],
        ['d6', 'd6'],
        ['d20', 'd20'],
      ] as Array<[TableRandomKind, string]>).map(([kind, label]) => <button key={kind} onClick={() => setRandomizerResult(rollTableRandom(kind))} className="rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4 font-black transition active:scale-95">{label}</button>)}</div>{randomizerResult !== null ? <div className="rounded-3xl border border-violet-400/20 bg-black/30 p-8 text-center text-7xl font-black text-violet-200">{randomizerResult === 'heads' ? copy({ it: 'Testa', en: 'Heads' }) : randomizerResult === 'tails' ? copy({ it: 'Croce', en: 'Tails' }) : randomizerResult}</div> : null}</div></ModalCard></ModalOverlay>}

      {damageDraft && (() => {
        const source = record.state.players.find((player) => player.participantKey === damageDraft.sourceKey);
        const target = record.state.players.find((player) => player.participantKey === damageDraft.targetKey);
        const sourceAssignment = assignments.find(({ player }) => player.participantKey === damageDraft.sourceKey);
        const sourceRotation = sourceAssignment
          ? orientation === 'landscape'
            ? getLandscapeSeatRotation(sourceAssignment.layout, tableSize.width)
            : getSeatRotation(
              sourceAssignment.layout.role,
              record.state.players.length,
              record.state.layoutVariant ?? 'classic',
            )
          : 0;
        const amount = Math.max(0, Math.min(999, Number(damageAmount) || 0));
        const targetCount = damageDraft.scope === 'all_players'
          ? record.state.players.filter((player) => !player.isEliminated).length
          : damageDraft.scope === 'opponents'
            ? record.state.players.filter((player) => !player.isEliminated && player.participantKey !== damageDraft.sourceKey).length
            : 1;
        const scopeLabel = damageDraft.scope === 'opponents'
          ? copy({ it: 'ogni avversario', en: 'each opponent' })
          : damageDraft.scope === 'all_players'
            ? copy({ it: 'tutti i giocatori', en: 'all players' })
            : target?.displayName || '';
        const modeLabel = damageDraft.mode === 'life'
          ? copy({ it: 'danno', en: 'damage' })
          : damageDraft.mode === 'commander' ? copy({ it: 'danno commander', en: 'commander damage' }) : 'infect';
        return <ModalOverlay className="bg-black/90"><ModalCard size="lg" className="relative overflow-hidden border-rose-400/25 bg-zinc-950">
          {target?.commanderImage ? <DeckImage src={target.commanderImage} alt={target.commander} className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top opacity-20" /> : null}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-950/95 via-rose-950/65 to-zinc-950/95" />
          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <ModalTitle icon={Swords} title={copy({ it: 'Assegna danno', en: 'Assign damage' })} onClose={() => setDamageDraft(null)} />
          <div className="space-y-4 overflow-y-auto p-4 sm:p-5">
          <p className="truncate text-center text-xs font-bold uppercase tracking-[0.18em] text-zinc-300">{source?.displayName} <span className="px-2 text-rose-300">→</span> {target?.displayName}</p>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/35 p-1">{(['life', 'commander', 'infect'] as DamageMode[]).map((mode) => <button key={mode} onClick={() => setDamageDraft({ ...damageDraft, mode, scope: mode === 'life' ? damageDraft.scope : 'single' })} className={cn('min-h-11 rounded-xl px-2 text-xs font-black uppercase tracking-wide transition', damageDraft.mode === mode ? 'bg-violet-500 text-white shadow-lg' : 'text-zinc-400 hover:bg-white/5')}>{mode === 'life' ? copy({ it: 'Normale', en: 'Normal' }) : mode === 'commander' ? 'Commander' : 'Infect'}</button>)}</div>
          {damageDraft.mode === 'life' ? <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/25 p-1">{([
            ['single', copy({ it: 'Questo giocatore', en: 'This player' })],
            ['opponents', copy({ it: 'Ogni avversario', en: 'Each opponent' })],
            ['all_players', copy({ it: 'Tutti', en: 'Everyone' })],
          ] as const).map(([scope, label]) => <button key={scope} onClick={() => setDamageDraft({ ...damageDraft, scope })} className={cn('min-h-11 rounded-xl px-2 py-2 text-[11px] font-bold transition', damageDraft.scope === scope ? 'bg-rose-500/25 text-rose-100 ring-1 ring-rose-400/70' : 'text-zinc-400 hover:bg-white/5')}>{label}</button>)}</div> : null}
          <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl border border-rose-400/30 bg-black/35">
            <div
              className="absolute inset-0 flex items-center justify-between px-5 sm:px-8"
              style={{ transform: `rotate(${sourceRotation}deg)` }}
            >
              <button type="button" onClick={() => setDamageAmount(String(Math.max(0, amount - 1)))} className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-white/25 bg-black/40 text-3xl font-light transition active:scale-90" aria-label={copy({ it: 'Riduci danno', en: 'Reduce damage' })}>−</button>
              <div className="min-w-0 flex-1 text-center"><input aria-label={copy({ it: 'Quantità danno', en: 'Damage amount' })} value={damageAmount} onChange={(event) => setDamageAmount(event.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" className="h-24 w-full bg-transparent text-center text-7xl font-black leading-none tabular-nums text-white outline-none" /><p className="truncate text-sm font-black uppercase tracking-wide text-zinc-100">{modeLabel} · {scopeLabel}</p></div>
              <button type="button" onClick={() => setDamageAmount(String(Math.min(999, amount + 1)))} className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-white/25 bg-black/40 text-3xl font-light transition active:scale-90" aria-label={copy({ it: 'Aumenta danno', en: 'Increase damage' })}>+</button>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">{[1, 2, 3, 5, 10, 15].map((quickAmount) => <button key={quickAmount} onClick={() => setDamageAmount(String(quickAmount))} className={cn('h-10 rounded-xl border text-sm font-black transition', damageAmount === String(quickAmount) ? 'border-rose-400 bg-rose-500/25 text-white' : 'border-white/10 bg-black/25 text-zinc-400')}>+{quickAmount}</button>)}</div>
          <div className="grid grid-cols-2 gap-3 pt-1"><Button variant="outline" onClick={() => setDamageDraft(null)} className="h-12 border-white/20 bg-black/20 font-black">{copy({ it: 'Annulla', en: 'Cancel' })}</Button><Button onClick={applyDamageDraft} disabled={amount === 0} className="h-12 bg-gradient-to-r from-rose-600 to-orange-600 font-black disabled:opacity-40">{damageDraft.scope === 'single' ? copy({ it: 'Risolvi', en: 'Resolve' }) : `${copy({ it: 'Risolvi', en: 'Resolve' })} ${amount} × ${targetCount}`}</Button></div>
        </div></div></ModalCard></ModalOverlay>;
      })()}

      {panelPlayer && (
        <ModalOverlay>
          <ModalCard size="lg">
            <ModalTitle
              icon={Shield}
              title={`${panelPlayer.displayName} · ${copy({ it: 'Dettaglio danni', en: 'Damage details' })}`}
              onClose={() => setDamagePanelKey(null)}
            />
            <div className="space-y-3 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['monarch', copy({ it: 'Monarca', en: 'Monarch' }), Crown],
                  ['initiative', copy({ it: 'Iniziativa', en: 'Initiative' }), Swords],
                ] as const).map(([emblem, label, Icon]) => <button
                  key={emblem}
                  onClick={() => {
                    const holderKey = record.state.players.find((entry) => entry.counters[emblem])?.participantKey ?? null;
                    enqueue(
                      { type: 'set_emblem', targetKey: panelPlayer.participantKey, emblem, active: !panelPlayer.counters[emblem] },
                      { type: 'restore_emblem', emblem, holderKey },
                    );
                  }}
                  className={cn('rounded-2xl border p-4 text-left transition', panelPlayer.counters[emblem] ? 'border-amber-300/70 bg-amber-500/20 text-amber-100' : 'border-border bg-background/60')}
                ><Icon className="mb-3 h-5 w-5" /><b>{label}</b></button>)}
              </div>
              {([
                ['energy', copy({ it: 'Energia', en: 'Energy' }), Sparkles],
                ['experience', copy({ it: 'Esperienza', en: 'Experience' }), Trophy],
                ['commanderTax', 'Commander Tax', Shield],
              ] as const).map(([counter, label, Icon]) => <div key={counter} className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-3"><Icon className="h-5 w-5 text-violet-300" /><b className="flex-1">{label}</b><Button variant="outline" size="icon" onClick={() => enqueue({ type: 'adjust_counter', targetKey: panelPlayer.participantKey, counter, amount: -1 }, { type: 'adjust_counter', targetKey: panelPlayer.participantKey, counter, amount: 1 })}><Minus /></Button><strong className="w-8 text-center text-xl">{panelPlayer.counters[counter]}</strong><Button variant="outline" size="icon" onClick={() => enqueue({ type: 'adjust_counter', targetKey: panelPlayer.participantKey, counter, amount: 1 }, { type: 'adjust_counter', targetKey: panelPlayer.participantKey, counter, amount: -1 })}><Plus /></Button></div>)}
              <div className="flex items-center justify-between rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-3">
                <div>
                  <p className="font-black text-emerald-100">Infect</p>
                  <p className="text-xs text-muted-foreground">{panelPlayer.infect} / 10</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => enqueue(
                      { type: 'adjust', targetKey: panelPlayer.participantKey, amount: -1, mode: 'infect' },
                      { type: 'adjust', targetKey: panelPlayer.participantKey, amount: 1, mode: 'infect' },
                    )}
                  >
                    <Minus />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => enqueue(
                      { type: 'adjust', targetKey: panelPlayer.participantKey, amount: 1, mode: 'infect' },
                      { type: 'adjust', targetKey: panelPlayer.participantKey, amount: -1, mode: 'infect' },
                    )}
                  >
                    <Plus />
                  </Button>
                </div>
              </div>
              {Object.entries(panelPlayer.commanderDamageFrom).map(([sourceKey, amount]) => {
                const source = record.state.players.find((entry) => entry.participantKey === sourceKey)!;
                const adjustment = {
                  targetKey: panelPlayer.participantKey,
                  sourceKey: source.participantKey,
                  mode: 'commander' as const,
                };
                return (
                  <div key={sourceKey} className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-3">
                    <DeckImage src={source.commanderImage} alt={source.commander} className="h-14 w-11 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black">{source.displayName}</p>
                      <p className="text-xs text-muted-foreground">{source.commander}</p>
                    </div>
                    <b className="text-2xl">{amount}</b>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => enqueue(
                          { type: 'adjust', ...adjustment, amount: -1 },
                          { type: 'adjust', ...adjustment, amount: 1 },
                        )}
                      >
                        <Minus />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => enqueue(
                          { type: 'adjust', ...adjustment, amount: 1 },
                          { type: 'adjust', ...adjustment, amount: -1 },
                        )}
                      >
                        <Plus />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ModalCard>
        </ModalOverlay>
      )}

      {endOpen && <ModalOverlay><ModalCard size="lg"><ModalTitle icon={Trophy} title={copy({ it: 'Concludi partita', en: 'End game' })} onClose={() => setEndOpen(false)} /><div className="space-y-5 overflow-y-auto p-5"><div className="flex items-center justify-between rounded-2xl border border-border bg-background/60 p-3"><span className="font-bold">{copy({ it: 'Pareggio', en: 'Draw' })}</span><button onClick={() => { setIsDraw((value) => !value); setWinnerKey(''); setWinCondition(null); }} className={cn('h-7 w-12 rounded-full p-1 transition', isDraw ? 'bg-violet-600' : 'bg-zinc-700')}><span className={cn('block h-5 w-5 rounded-full bg-white transition', isDraw && 'translate-x-5')} /></button></div>{!isDraw && <><div className="grid gap-2 sm:grid-cols-2">{activePlayers.map((player) => <button key={player.participantKey} onClick={() => { setWinnerKey(player.participantKey); setWinCondition(activePlayers.length === 1 ? 'last_standing' : null); }} className={cn('flex items-center gap-3 rounded-2xl border p-3 text-left transition', winnerKey === player.participantKey ? 'border-violet-400 bg-violet-500/20' : 'border-border bg-background/60')}><DeckImage src={player.commanderImage} alt={player.commander} className="h-12 w-10 rounded-lg object-cover" /><span className="min-w-0 flex-1"><b className="block truncate">{player.displayName}</b><small className="block truncate text-muted-foreground">{player.commander}</small></span>{winnerKey === player.participantKey && <Check className="text-violet-300" />}</button>)}</div>{winnerKey && (alternativeRequired ? <div className="grid grid-cols-2 gap-2">{WIN_CONDITIONS.map((condition) => { const Icon = condition.icon; return <button key={condition.value} onClick={() => setWinCondition(condition.value)} className={cn('rounded-2xl border p-4 text-left', winCondition === condition.value ? 'border-violet-400 bg-violet-500/20' : 'border-border bg-background/60')}><Icon className="mb-2 h-5 w-5 text-violet-300" /><b className="text-sm">{copy(condition.label)}</b></button>; })}</div> : <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/25 p-4 font-bold text-emerald-200"><Shield /><span className="flex-1">{copy({ it: 'Ultimo giocatore rimasto', en: 'Last player standing' })}</span><Check /></div>)}</>}<div className="flex gap-3"><Button variant="outline" onClick={() => setEndOpen(false)} className="flex-1">{copy({ it: 'Annulla', en: 'Cancel' })}</Button><Button onClick={finishGame} disabled={ending || (!isDraw && (!winnerKey || !winCondition))} className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 font-black">{ending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{copy({ it: 'Salva partita', en: 'Save game' })}</Button></div></div></ModalCard></ModalOverlay>}

      {confirmEliminate && <ModalOverlay><ModalCard><ModalTitle icon={Skull} title={copy({ it: 'Eliminare il giocatore?', en: 'Eliminate player?' })} onClose={() => setConfirmEliminate(null)} /><div className="space-y-4 p-5"><p className="text-muted-foreground">{record.state.players.find((player) => player.participantKey === confirmEliminate)?.displayName}</p><div className="flex gap-3"><Button variant="outline" onClick={() => setConfirmEliminate(null)} className="flex-1">{copy({ it: 'Annulla', en: 'Cancel' })}</Button><Button variant="destructive" onClick={() => { const player = record.state.players.find((entry) => entry.participantKey === confirmEliminate); enqueue({ type: 'eliminate', targetKey: confirmEliminate, eliminatedAt: new Date().toISOString() }, player ? { type: 'restore-player', player } : undefined); setConfirmEliminate(null); }} className="flex-1">{copy({ it: 'Elimina', en: 'Eliminate' })}</Button></div></div></ModalCard></ModalOverlay>}

      {exitChoiceOpen && <ModalOverlay><ModalCard><ModalTitle icon={null} title={copy({ it: 'Uscire dal tracker?', en: 'Leave the tracker?' })} onClose={() => setExitChoiceOpen(false)} /><div className="space-y-3 p-5"><p className="pb-1 text-sm text-muted-foreground">{copy({ it: 'La partita resta al sicuro finché non scegli di annullarla.', en: 'Your game stays safe unless you explicitly cancel it.' })}</p><button onClick={() => router.push(`/table/${groupId}`)} className="flex w-full items-center gap-3 rounded-2xl border border-violet-400/35 bg-violet-500/10 p-3 text-left transition hover:bg-violet-500/15 active:scale-[.99]"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-500/20 text-violet-200"><Pause className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="block">{copy({ it: 'Pausa partita', en: 'Pause game' })}</b><small className="text-muted-foreground">{copy({ it: 'Torna all’arena e riprendi quando vuoi.', en: 'Return to the arena and resume whenever you want.' })}</small></span><ChevronRight className="h-5 w-5 text-muted-foreground" /></button><button onClick={() => { setExitChoiceOpen(false); setConfirmCancel(true); }} className="flex w-full items-center gap-3 rounded-2xl border border-red-400/30 bg-red-950/20 p-3 text-left transition hover:bg-red-950/30 active:scale-[.99]"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-950/50 text-red-300"><Trash2 className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="block text-red-200">{copy({ it: 'Annulla partita', en: 'Cancel game' })}</b><small className="text-muted-foreground">{copy({ it: 'Elimina la sessione senza salvare un risultato.', en: 'Discard the session without saving a result.' })}</small></span><ChevronRight className="h-5 w-5 text-red-300/70" /></button></div></ModalCard></ModalOverlay>}

      {confirmCancel && <ModalOverlay><ModalCard><ModalTitle icon={Flag} title={copy({ it: 'Annullare la partita?', en: 'Cancel this game?' })} onClose={() => setConfirmCancel(false)} /><div className="space-y-4 p-5"><p className="text-sm text-muted-foreground">{copy({ it: 'La partita live verrà eliminata senza creare un record.', en: 'The live game will be discarded without creating a record.' })}</p><div className="flex gap-3"><Button variant="outline" onClick={() => setConfirmCancel(false)} className="flex-1">{copy({ it: 'Continua a giocare', en: 'Keep playing' })}</Button><Button variant="destructive" onClick={cancelGame} className="flex-1">{copy({ it: 'Annulla partita', en: 'Cancel game' })}</Button></div></div></ModalCard></ModalOverlay>}
    </div>
  );
}
