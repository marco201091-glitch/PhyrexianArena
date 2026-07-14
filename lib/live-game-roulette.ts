import type { ParticipantKey } from '@/lib/participant-keys';

export function buildRouletteSequence(
  pool: ParticipantKey[],
  winner: ParticipantKey,
  steps = 16,
  random: () => number = Math.random,
): ParticipantKey[] {
  const uniquePool = Array.from(new Set(pool));
  if (!uniquePool.length) return [winner];
  const sequence: ParticipantKey[] = [];
  for (let index = 0; index < Math.max(1, steps - 1); index += 1) {
    const previous = sequence[sequence.length - 1];
    const candidates = uniquePool.length > 1
      ? uniquePool.filter((key) => key !== previous)
      : uniquePool;
    const pickedIndex = Math.min(candidates.length - 1, Math.floor(Math.max(0, random()) * candidates.length));
    sequence.push(candidates[pickedIndex] ?? uniquePool[0]);
  }
  sequence.push(winner);
  return sequence;
}
