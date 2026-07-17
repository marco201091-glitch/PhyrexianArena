'use client';

import { useCallback, useEffect, useState } from 'react';
import { Dices, Minus, Plus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HoldActionButton } from '@/components/ui/hold-action-button';
import { DeckImage } from '@/components/deck-image';
import { ModalCard, ModalOverlay } from '@/components/ui/modal-shell';
import { parseLiveGameState, type LiveGameMutation, type LiveGameState } from '@/lib/live-game';
import { subscribeGuestRealtime } from '@/lib/guest-realtime';
import { supabase } from '@/lib/supabase';
import { rollTableRandom, type TableRandomKind } from '@/lib/table-randomizer';

type Commander = { id: string; name: string; imageUrl: string | null; colorIdentity?: string[] };
type Payload = {
  guestId: string;
  session: { format: 'commander' | 'classic'; state: LiveGameState | null; realtimeTopic: string };
  guests: Array<{ id: string; display_name: string; commander: string; ready: boolean }>;
};

export function PublicCounterGuest({ inviteToken }: { inviteToken: string }) {
  const storageKey = `phyrexian:public-counter-guest:${inviteToken}`;
  const [token, setToken] = useState('');
  const [payload, setPayload] = useState<Payload | null>(null);
  const [name, setName] = useState('');
  const [deck, setDeck] = useState('');
  const [commander, setCommander] = useState('');
  const [commanderImage, setCommanderImage] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [results, setResults] = useState<Commander[]>([]);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [error, setError] = useState('');
  const [randomOpen, setRandomOpen] = useState(false);
  const [randomResult, setRandomResult] = useState<string | number | null>(null);

  useEffect(() => setToken(localStorage.getItem(storageKey) ?? ''), [storageKey]);

  const refresh = useCallback(async () => {
    if (!token) return;
    const response = await fetch('/api/public-counter-session', { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return;
    const next = await response.json();
    if (next.session.state) next.session.state = parseLiveGameState(next.session.state);
    setPayload(next);
  }, [token]);

  useEffect(() => {
    void refresh();
    if (!token) return;
    const timer = window.setInterval(() => void refresh(), payload?.session.state ? 15_000 : 2_000);
    return () => window.clearInterval(timer);
  }, [payload?.session.state, refresh, token]);

  useEffect(() => {
    if (!payload?.session.realtimeTopic) return;
    return subscribeGuestRealtime(supabase, { scope: 'counter', secret: payload.session.realtimeTopic, onState: () => void refresh() });
  }, [payload?.session.realtimeTopic, refresh]);

  useEffect(() => {
    if (commander.trim().length < 2 || commanderImage) return setResults([]);
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/public-commanders?q=${encodeURIComponent(commander.trim())}`);
      const body = await response.json().catch(() => ({ data: [] }));
      setResults(response.ok && Array.isArray(body.data) ? body.data : []);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [commander, commanderImage]);

  const join = async () => {
    setError('');
    const response = await fetch('/api/public-counter-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', inviteToken, displayName: name, deckName: deck, commander, commanderImage, colorIdentity: colors }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.error ?? 'Ingresso non riuscito');
    localStorage.setItem(storageKey, body.guestToken);
    setToken(body.guestToken);
    setRecoveryCode(body.recoveryCode);
  };

  const recover = async () => {
    const response = await fetch('/api/public-counter-session', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inviteToken, recoveryCode: recoveryInput }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.error ?? 'Codice non valido');
    localStorage.setItem(storageKey, body.guestToken);
    setToken(body.guestToken);
  };

  const mutate = async (mutation: LiveGameMutation) => {
    const response = await fetch('/api/public-counter-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mutate', sessionToken: token, mutation }) });
    if (response.ok) await refresh();
  };

  if (!token) return <main className="min-h-dvh bg-[radial-gradient(circle_at_top,#2e1065,#09090b_52%)] p-4 text-white"><div className="mx-auto max-w-md space-y-4 py-8"><h1 className="text-3xl font-black">Entra nella partita veloce</h1><p className="text-sm text-zinc-400">Guest temporaneo. Nessun account, nessuna statistica.</p><div className="space-y-3 rounded-3xl border border-white/10 bg-black/35 p-5"><Input placeholder="Nome giocatore" value={name} onChange={(event) => setName(event.target.value)} /><Input placeholder="Nome mazzo (opzionale)" value={deck} onChange={(event) => setDeck(event.target.value)} /><div className="relative"><Input placeholder="Cerca comandante (se Commander)" value={commander} onChange={(event) => { setCommander(event.target.value); setCommanderImage(null); }} />{results.length ? <div className="absolute inset-x-0 top-12 z-20 max-h-60 overflow-y-auto rounded-xl bg-zinc-950">{results.map((result) => <button key={result.id} className="flex w-full items-center gap-3 border-b border-white/10 p-2 text-left" onClick={() => { setCommander(result.name); setCommanderImage(result.imageUrl); setColors(result.colorIdentity ?? []); setResults([]); }}><DeckImage src={result.imageUrl} alt={result.name} className="h-14 w-10 rounded object-cover" /><b>{result.name}</b></button>)}</div> : null}</div>{error ? <p className="text-sm text-rose-300">{error}</p> : null}<Button className="w-full" disabled={!name.trim()} onClick={() => void join()}>Entra</Button></div><div className="space-y-3 rounded-2xl border border-white/10 p-4"><b>Recupera sessione</b><div className="flex gap-2"><Input value={recoveryInput} onChange={(event) => setRecoveryInput(event.target.value.toUpperCase())} placeholder="Codice recupero" /><Button variant="outline" onClick={() => void recover()}>Recupera</Button></div></div></div></main>;

  if (!payload?.session.state) {
    const me = payload?.guests.find((guest) => guest.id === payload.guestId);
    return <main className="grid min-h-dvh place-items-center bg-black p-4 text-white"><div className="w-full max-w-md space-y-5 rounded-3xl border border-violet-400/20 bg-violet-500/10 p-6 text-center"><h1 className="text-2xl font-black">Lobby partita veloce</h1><p>{me?.display_name ?? name}</p>{recoveryCode ? <div className="rounded-2xl bg-black/30 p-4"><small className="text-zinc-400">Codice recupero</small><strong className="block font-mono text-xl tracking-widest text-amber-200">{recoveryCode}</strong><Button variant="outline" className="mt-3" onClick={() => void navigator.clipboard.writeText(recoveryCode)}>Copia</Button></div> : null}<Button className="w-full" onClick={async () => { await fetch('/api/public-counter-session', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ready', sessionToken: token, ready: !me?.ready }) }); await refresh(); }}>{me?.ready ? 'Pronto ✓' : 'Segna come pronto'}</Button><p className="text-sm text-zinc-400">Attesa host…</p></div></main>;
  }

  const state = payload.session.state;
  return <main className="min-h-dvh bg-black p-2 text-white"><div className="grid min-h-[calc(100dvh-4.5rem)] gap-2 sm:grid-cols-2">{state.players.map((player) => <section key={player.participantKey} className="relative min-h-48 overflow-hidden rounded-2xl border border-white/10" style={{ backgroundColor: player.backgroundColor ?? '#18181b' }}>{player.commanderImage ? <DeckImage src={player.commanderImage} alt={player.commander} className="absolute inset-0 h-full w-full rounded-none object-cover opacity-60" /> : null}<div className="absolute inset-0 bg-black/25" /><div className="relative flex min-h-48 items-center justify-between p-4"><HoldActionButton variant="ghost" className="h-14 w-14 rounded-full bg-black/60" onShort={() => void mutate({ type: 'adjust', targetKey: player.participantKey, amount: 1, mode: 'life' })} onLong={() => void mutate({ type: 'adjust', targetKey: player.participantKey, amount: 10, mode: 'life' })}><Minus /></HoldActionButton><div className="text-center"><b className="block max-w-40 truncate">{player.displayName}</b><strong className="block text-7xl">{player.life}</strong><Shield className="mx-auto mt-2 h-6 w-6" /></div><HoldActionButton variant="ghost" className="h-14 w-14 rounded-full bg-black/60" onShort={() => void mutate({ type: 'adjust', targetKey: player.participantKey, amount: -1, mode: 'life' })} onLong={() => void mutate({ type: 'adjust', targetKey: player.participantKey, amount: -10, mode: 'life' })}><Plus /></HoldActionButton></div></section>)}</div><Button className="fixed bottom-3 left-1/2 -translate-x-1/2 rounded-full" onClick={() => setRandomOpen(true)}><Dices className="mr-2" /> Dado</Button>{randomOpen ? <ModalOverlay><ModalCard><div className="space-y-5 p-5"><h2 className="text-xl font-black">Dado o moneta</h2><div className="grid grid-cols-4 gap-2">{([['coin', 'Moneta'], ['d4', 'd4'], ['d6', 'd6'], ['d20', 'd20']] as Array<[TableRandomKind, string]>).map(([kind, label]) => <button key={kind} onClick={() => setRandomResult(rollTableRandom(kind))} className="rounded-xl border p-3 font-black">{label}</button>)}</div>{randomResult !== null ? <div className="text-center text-7xl font-black">{randomResult === 'heads' ? 'Testa' : randomResult === 'tails' ? 'Croce' : randomResult}</div> : null}<Button className="w-full" variant="outline" onClick={() => setRandomOpen(false)}>Chiudi</Button></div></ModalCard></ModalOverlay> : null}</main>;
}
