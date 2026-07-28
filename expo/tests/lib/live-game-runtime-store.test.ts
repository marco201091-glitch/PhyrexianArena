import { beforeEach, describe, expect, it } from 'vitest';
import { createLiveGamePlayer } from '@/lib/live-game';
import {
  clearLiveGameRuntimePlayers,
  replaceLiveGameRuntimePlayers,
  useLiveGameRuntimeStore,
} from '@/stores/live-game-runtime-store';

const keys = ['user:one', 'user:two'] as const;

function makePlayer(index: number) {
  return createLiveGamePlayer({
    slot: index,
    participantKey: keys[index]!,
    deckId: `deck-${index}`,
    displayName: `Player ${index}`,
    commander: `Commander ${index}`,
    commanderImage: null,
    startingLife: 40,
    allParticipantKeys: [...keys],
  });
}

describe('live game runtime store', () => {
  beforeEach(clearLiveGameRuntimePlayers);

  it('indexes players for fine-grained seat subscriptions', () => {
    const first = makePlayer(0);
    const second = makePlayer(1);
    replaceLiveGameRuntimePlayers([first, second]);

    expect(useLiveGameRuntimeStore.getState().playersByKey[first.participantKey]).toBe(first);
    expect(useLiveGameRuntimeStore.getState().playersByKey[second.participantKey]).toBe(second);
  });

  it('preserves unchanged player identity across optimistic updates', () => {
    const first = makePlayer(0);
    const second = makePlayer(1);
    replaceLiveGameRuntimePlayers([first, second]);
    const changedFirst = { ...first, life: 39 };
    replaceLiveGameRuntimePlayers([changedFirst, second]);

    expect(useLiveGameRuntimeStore.getState().playersByKey[first.participantKey]).toBe(changedFirst);
    expect(useLiveGameRuntimeStore.getState().playersByKey[second.participantKey]).toBe(second);
  });
});
