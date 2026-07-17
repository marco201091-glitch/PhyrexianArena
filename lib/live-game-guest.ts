import { createHash, randomBytes } from 'node:crypto';
import type { LiveGameMutation, LiveGameState } from '@/lib/live-game';
import type { ParticipantKey } from '@/lib/participant-keys';

export function createGuestSecret(bytes = 24) {
  return randomBytes(bytes).toString('hex');
}

export function createRecoveryCode() {
  return randomBytes(8).toString('base64url').toUpperCase();
}

export function hashGuestSecret(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function normalizeGuestDisplayName(value: unknown) {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ').slice(0, 40);
  return name.length >= 2 ? name : null;
}

export function parseGuestMutation(value: unknown, state: LiveGameState): LiveGameMutation | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const targetKey = typeof input.targetKey === 'string' ? input.targetKey as ParticipantKey : null;
  const sourceKey = typeof input.sourceKey === 'string' ? input.sourceKey as ParticipantKey : undefined;
  const hasPlayer = (key: ParticipantKey | null | undefined) => Boolean(key && state.players.some((player) => player.participantKey === key));
  const amount = typeof input.amount === 'number' && Number.isInteger(input.amount)
    ? Math.max(-99, Math.min(99, input.amount))
    : null;

  if (input.type === 'adjust' && hasPlayer(targetKey) && amount !== null
      && (input.mode === 'life' || input.mode === 'commander' || input.mode === 'infect')
      && (input.mode !== 'commander' || hasPlayer(sourceKey))) {
    return { type: 'adjust', targetKey: targetKey!, sourceKey, amount, mode: input.mode };
  }
  if (input.type === 'adjust_many' && hasPlayer(sourceKey) && amount !== null
      && (input.scope === 'opponents' || input.scope === 'all_players')) {
    return { type: 'adjust_many', sourceKey: sourceKey!, amount, scope: input.scope };
  }
  if (input.type === 'adjust_counter' && hasPlayer(targetKey) && amount !== null
      && (input.counter === 'energy' || input.counter === 'experience' || input.counter === 'commanderTax')) {
    return { type: 'adjust_counter', targetKey: targetKey!, amount, counter: input.counter };
  }
  if (input.type === 'set_emblem' && hasPlayer(targetKey)
      && (input.emblem === 'monarch' || input.emblem === 'initiative')
      && typeof input.active === 'boolean') {
    return { type: 'set_emblem', targetKey: targetKey!, emblem: input.emblem, active: input.active };
  }
  if (input.type === 'eliminate' && hasPlayer(targetKey)) {
    return { type: 'eliminate', targetKey: targetKey!, eliminatedAt: new Date().toISOString() };
  }
  if (input.type === 'revive' && hasPlayer(targetKey)) {
    return { type: 'revive', targetKey: targetKey!, startingLife: Math.max(1, Math.min(999, Number(input.startingLife) || 40)) };
  }
  return null;
}
