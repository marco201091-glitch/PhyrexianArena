'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crown, Dices, Minus, Plus, Shield, Sparkles, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HoldActionButton } from '@/components/ui/hold-action-button';
import { Input } from '@/components/ui/input';
import { ModalCard, ModalOverlay } from '@/components/ui/modal-shell';
import { DeckImage } from '@/components/deck-image';
import { parseLiveGameState, type LiveGameMutation, type LiveGameRecord } from '@/lib/live-game';
import {
  getCenterToolbarBand, getLandscapeSeatRotation, getSeatRotation,
  getSquareTableLayouts, getViewportTableOrientation, mapPlayersToSeats,
} from '@/lib/live-game-table-layout';
import type { ParticipantKey } from '@/lib/participant-keys';
import { rollTableRandom, type TableRandomKind } from '@/lib/table-randomizer';
import { subscribeGuestRealtime } from '@/lib/guest-realtime';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/components/language-provider';

type GuestSessionPayload = {
  session: {
    ready: boolean;
    guest_id: string;
    arena_guests: { display_name: string } | null;
    arena_guest_decks: { name: string; commander: string } | null;
  };
  game: LiveGameRecord | null;
  realtimeTopic: string;
};
type CommanderResult = { id: string; name: string; imageUrl: string | null; colorIdentity?: string[] };

export function GuestLiveGame({ inviteToken }: { inviteToken: string }) {
  const { copy } = useLanguage();
  const storageKey = `phyrexian:guest-game:${inviteToken}`;
  const hostRef = useRef<HTMLDivElement>(null);
  const [sessionToken, setSessionToken] = useState('');
  const [payload, setPayload] = useState<GuestSessionPayload | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [deckName, setDeckName] = useState('');
  const [commander, setCommander] = useState('');
  const [commanderImage, setCommanderImage] = useState<string | null>(null);
  const [commanderColors, setCommanderColors] = useState<string[]>([]);
  const [commanderResults, setCommanderResults] = useState<CommanderResult[]>([]);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [shieldKey, setShieldKey] = useState<ParticipantKey | null>(null);
  const [randomOpen, setRandomOpen] = useState(false);
  const [randomResult, setRandomResult] = useState<string | number | null>(null);

  useEffect(() => setSessionToken(localStorage.getItem(storageKey) ?? ''), [storageKey]);

  const refresh = useCallback(async () => {
    if (!sessionToken) return;
    const response = await fetch('/api/live-game-guest/session', {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!response.ok) {
      if (response.status === 404 || response.status === 410) setPayload(null);
      return;
    }
    const next = await response.json();
    if (next.game) next.game.state = parseLiveGameState(next.game.state);
    setPayload(next);
  }, [sessionToken]);

  useEffect(() => {
    void refresh();
    if (!sessionToken) return;
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(timer);
  }, [refresh, sessionToken]);

  useEffect(() => {
    if (!payload?.realtimeTopic) return;
    return subscribeGuestRealtime(supabase, {
      scope: 'game',
      secret: payload.realtimeTopic,
      onState: () => void refresh(),
    });
  }, [payload?.realtimeTopic, refresh]);

  useEffect(() => {
    if (commander.trim().length < 2 || commanderImage) {
      setCommanderResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/public-commanders?q=${encodeURIComponent(commander.trim())}`);
      const result = await response.json().catch(() => ({ data: [] }));
      setCommanderResults(response.ok && Array.isArray(result.data) ? result.data : []);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [commander, commanderImage]);

  useEffect(() => {
    if (!payload?.game || !hostRef.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, [payload?.game]);

  const join = async () => {
    setLoading(true);
    setError('');
    const response = await fetch('/api/live-game-guest/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: inviteToken, displayName, deckName, commander, commanderImage, colorIdentity: commanderColors }),
    });
    const result = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) return setError(result.error ?? copy({ it: 'Ingresso non riuscito', en: 'Could not join' }));
    localStorage.setItem(storageKey, result.sessionToken);
    setSessionToken(result.sessionToken);
    setRecoveryCode(result.recoveryCode);
  };

  const recover = async () => {
    const response = await fetch('/api/live-game-guest/session', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveryCode: recoveryInput, inviteToken }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setError(result.error ?? copy({ it: 'Codice non valido', en: 'Invalid recovery code' }));
    localStorage.setItem(storageKey, result.sessionToken);
    setSessionToken(result.sessionToken);
  };

  const mutate = async (mutation: LiveGameMutation) => {
    const response = await fetch('/api/live-game-guest/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, mutation }),
    });
    if (response.ok) await refresh();
  };

  if (!sessionToken) return <main className="min-h-dvh bg-[radial-gradient(circle_at_top,#2e1065,#09090b_52%)] px-4 py-8 text-white"><div className="mx-auto max-w-md space-y-5"><div><p className="text-xs font-black uppercase tracking-[.2em] text-violet-300">Phyrexian Arena</p><h1 className="mt-2 text-3xl font-black">{copy({ it: 'Entra nella partita', en: 'Join game' })}</h1><p className="mt-2 text-sm text-zinc-400">{copy({ it: 'Nessun account necessario.', en: 'No account required.' })}</p></div><div className="space-y-3 rounded-3xl border border-white/10 bg-black/35 p-5 backdrop-blur"><Input placeholder={copy({ it: 'Nome giocatore', en: 'Player name' })} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /><Input placeholder={copy({ it: 'Nome mazzo', en: 'Deck name' })} value={deckName} onChange={(event) => setDeckName(event.target.value)} /><div className="relative"><Input placeholder={copy({ it: 'Cerca comandante', en: 'Search commander' })} value={commander} onChange={(event) => { setCommander(event.target.value); setCommanderImage(null); }} />{commanderResults.length ? <div className="absolute inset-x-0 top-12 z-30 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950 shadow-2xl">{commanderResults.map((result) => <button type="button" key={result.id} onClick={() => { setCommander(result.name); setCommanderImage(result.imageUrl); setCommanderColors(result.colorIdentity ?? []); setCommanderResults([]); }} className="flex w-full items-center gap-3 border-b border-white/5 p-2 text-left hover:bg-white/5"><DeckImage src={result.imageUrl} alt={result.name} className="h-14 w-10 rounded object-cover" /><b className="text-sm">{result.name}</b></button>)}</div> : null}</div>{error ? <p className="text-sm text-rose-300">{error}</p> : null}<Button className="w-full" onClick={join} disabled={loading || !displayName.trim() || !commanderImage}>{loading ? copy({ it: 'Ingresso…', en: 'Joining…' }) : copy({ it: 'Entra', en: 'Join' })}</Button></div><div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4"><b className="text-sm">{copy({ it: 'Recupera sessione', en: 'Recover session' })}</b><p className="text-xs text-zinc-400">{copy({ it: 'Hai già partecipato? Inserisci il codice salvato.', en: 'Already joined? Enter your saved code.' })}</p><div className="flex flex-col gap-2 sm:flex-row"><Input placeholder={copy({ it: 'Codice recupero', en: 'Recovery code' })} value={recoveryInput} onChange={(event) => setRecoveryInput(event.target.value.toUpperCase())} /><Button variant="outline" onClick={recover}>{copy({ it: 'Recupera', en: 'Recover' })}</Button></div></div></div></main>;

  if (!payload?.game) return <main className="grid min-h-dvh place-items-center bg-black px-4 text-white"><div className="w-full max-w-md space-y-5 rounded-3xl border border-violet-400/20 bg-violet-500/10 p-6 text-center"><div className="mx-auto h-4 w-4 animate-pulse rounded-full bg-emerald-400" /><h1 className="text-2xl font-black">{copy({ it: 'Lobby partita', en: 'Game lobby' })}</h1><p className="text-zinc-300">{payload?.session.arena_guests?.display_name ?? displayName} · {payload?.session.arena_guest_decks?.commander ?? commander}</p>{recoveryCode ? <div className="rounded-2xl bg-black/30 p-4"><p className="text-xs text-zinc-400">{copy({ it: 'Codice recupero', en: 'Recovery code' })}</p><strong className="mt-1 block font-mono text-xl tracking-widest text-amber-200">{recoveryCode}</strong><div className="mt-3 flex gap-2"><Button variant="outline" className="flex-1" onClick={() => void navigator.clipboard.writeText(recoveryCode)}>{copy({ it: 'Copia', en: 'Copy' })}</Button></div><p className="mt-2 text-xs text-zinc-500">{copy({ it: 'Conservalo fino a fine partita.', en: 'Keep it until the game ends.' })}</p></div> : null}<Button onClick={async () => { const ready = !payload?.session.ready; await fetch('/api/live-game-guest/session', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionToken, ready }) }); await refresh(); }} className="w-full">{payload?.session.ready ? copy({ it: 'Pronto ✓', en: 'Ready ✓' }) : copy({ it: 'Segna come pronto', en: 'Mark as ready' })}</Button><p className="text-sm text-zinc-400">{copy({ it: 'In attesa che l’host avvii…', en: 'Waiting for host to start…' })}</p></div></main>;

  const state = payload.game.state;
  const orientation = getViewportTableOrientation(size.width, size.height);
  const layouts = getSquareTableLayouts(state.players.length, size.width, size.height, state.layoutVariant ?? 'classic', orientation);
  const assignments = mapPlayersToSeats(state.players, layouts, `guest:${payload.session.guest_id}` as ParticipantKey);
  const toolbar = getCenterToolbarBand(state.players.length, size.width, size.height, state.layoutVariant ?? 'classic', orientation);
  const shieldPlayer = state.players.find((player) => player.participantKey === shieldKey) ?? null;

  return <main ref={hostRef} className="fixed inset-0 overflow-hidden bg-black text-white">
    {size.width > 0 && assignments.map(({ player, layout }) => {
      const rotation = orientation === 'landscape' ? getLandscapeSeatRotation(layout, size.width) : getSeatRotation(layout.role, state.players.length, state.layoutVariant);
      const sideways = Math.abs(rotation) === 90;
      const contentWidth = sideways ? layout.height : layout.width;
      const contentHeight = sideways ? layout.width : layout.height;
      return <section key={player.participantKey} className="absolute overflow-hidden rounded-2xl border-2 border-black bg-zinc-950" style={{ left: layout.left, top: layout.top, width: layout.width, height: layout.height }}>
        <DeckImage src={player.commanderImage} alt={player.commander} className="absolute inset-0 h-full w-full rounded-none object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/55" />
        <div className="absolute left-1/2 top-1/2" style={{ width: contentWidth, height: contentHeight, transform: `translate(-50%,-50%) rotate(${rotation}deg)` }}>
          <HoldActionButton variant="ghost" onShort={() => void mutate({ type: 'adjust', targetKey: player.participantKey, amount: 1, mode: 'life' })} onLong={() => void mutate({ type: 'adjust', targetKey: player.participantKey, amount: 10, mode: 'life' })} className="absolute left-[5%] top-1/2 grid h-14 w-16 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/55"><Minus /></HoldActionButton>
          <HoldActionButton variant="ghost" onShort={() => void mutate({ type: 'adjust', targetKey: player.participantKey, amount: -1, mode: 'life' })} onLong={() => void mutate({ type: 'adjust', targetKey: player.participantKey, amount: -10, mode: 'life' })} className="absolute right-[5%] top-1/2 grid h-14 w-16 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/55"><Plus /></HoldActionButton>
          <div className="absolute left-1/2 top-[8%] max-w-[70%] -translate-x-1/2 truncate rounded-full bg-black/65 px-4 py-1 font-black">{player.displayName}</div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl font-black">{player.life}</div>
          <button onClick={() => setShieldKey(player.participantKey)} className="absolute left-1/2 top-[74%] grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full border border-violet-200/30 bg-black/65"><Shield /></button>
        </div>
      </section>;
    })}
    {toolbar ? <div className="absolute z-30 flex items-center justify-center rounded-xl border border-white/10 bg-zinc-950/95 p-1" style={{ left: toolbar.left, top: toolbar.top, width: toolbar.width, height: toolbar.height }}><Button size="icon" variant="ghost" onClick={() => setRandomOpen(true)} title={copy({ it: 'Dado o moneta', en: 'Die or coin' })}><Dices /></Button></div> : null}
    {randomOpen ? <ModalOverlay><ModalCard><div className="space-y-5 p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-black">{copy({ it: 'Dado o moneta', en: 'Die or coin' })}</h2><button onClick={() => setRandomOpen(false)}>×</button></div><div className="grid grid-cols-4 gap-2">{([['coin', copy({ it: 'Moneta', en: 'Coin' })], ['d4', 'd4'], ['d6', 'd6'], ['d20', 'd20']] as Array<[TableRandomKind, string]>).map(([kind, label]) => <button key={kind} onClick={() => setRandomResult(rollTableRandom(kind))} className="rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4 font-black">{label}</button>)}</div>{randomResult !== null ? <div className="rounded-3xl bg-black/35 p-8 text-center text-7xl font-black text-violet-200">{randomResult === 'heads' ? copy({ it: 'Testa', en: 'Heads' }) : randomResult === 'tails' ? copy({ it: 'Croce', en: 'Tails' }) : randomResult}</div> : null}</div></ModalCard></ModalOverlay> : null}
    {shieldPlayer ? <ModalOverlay><ModalCard size="lg"><div className="max-h-[85dvh] space-y-3 overflow-y-auto p-5"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">{shieldPlayer.displayName}</h2><p className="text-xs text-zinc-400">Segnalini, emblemi e danni</p></div><button onClick={() => setShieldKey(null)}>×</button></div><div className="grid grid-cols-2 gap-2">{([['monarch', 'Monarca', Crown], ['initiative', 'Iniziativa', Swords]] as const).map(([emblem, label, Icon]) => <button key={emblem} onClick={() => void mutate({ type: 'set_emblem', targetKey: shieldPlayer.participantKey, emblem, active: !shieldPlayer.counters[emblem] })} className={`rounded-2xl border p-4 text-left ${shieldPlayer.counters[emblem] ? 'border-amber-300 bg-amber-500/20' : 'border-white/10 bg-white/5'}`}><Icon className="mb-2" /><b>{label}</b></button>)}</div>{([['energy', 'Energia', Sparkles], ['experience', 'Esperienza', Sparkles], ['commanderTax', 'Commander Tax', Shield]] as const).map(([counter, label, Icon]) => <div key={counter} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3"><Icon className="text-violet-300" /><b className="flex-1">{label}</b><Button size="icon" variant="outline" onClick={() => void mutate({ type: 'adjust_counter', targetKey: shieldPlayer.participantKey, counter, amount: -1 })}><Minus /></Button><strong className="w-7 text-center">{shieldPlayer.counters[counter]}</strong><Button size="icon" variant="outline" onClick={() => void mutate({ type: 'adjust_counter', targetKey: shieldPlayer.participantKey, counter, amount: 1 })}><Plus /></Button></div>)}<div className="flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-3"><Shield className="text-emerald-300" /><b className="flex-1">Infect</b><Button size="icon" variant="outline" onClick={() => void mutate({ type: 'adjust', targetKey: shieldPlayer.participantKey, amount: -1, mode: 'infect' })}><Minus /></Button><strong className="w-7 text-center">{shieldPlayer.infect}</strong><Button size="icon" variant="outline" onClick={() => void mutate({ type: 'adjust', targetKey: shieldPlayer.participantKey, amount: 1, mode: 'infect' })}><Plus /></Button></div>{state.players.filter((source) => source.participantKey !== shieldPlayer.participantKey).map((source) => <div key={source.participantKey} className="flex items-center gap-2 rounded-2xl border border-blue-400/15 bg-blue-500/5 p-3"><b className="min-w-0 flex-1 truncate">{source.commander}</b><Button size="icon" variant="outline" onClick={() => void mutate({ type: 'adjust', sourceKey: source.participantKey, targetKey: shieldPlayer.participantKey, amount: -1, mode: 'commander' })}><Minus /></Button><strong className="w-7 text-center">{shieldPlayer.commanderDamageFrom[source.participantKey] ?? 0}</strong><Button size="icon" variant="outline" onClick={() => void mutate({ type: 'adjust', sourceKey: source.participantKey, targetKey: shieldPlayer.participantKey, amount: 1, mode: 'commander' })}><Plus /></Button></div>)}</div></ModalCard></ModalOverlay> : null}
  </main>;
}
