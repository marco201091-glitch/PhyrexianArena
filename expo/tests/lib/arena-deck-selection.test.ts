import { describe, expect, it } from 'vitest';
import { getPreferredDeckId } from '@/lib/arena-deck-selection';

describe('arena deck selection', () => {
  it('automatically selects the only available deck', () => {
    expect(getPreferredDeckId([{ id: 'only' }], null)).toBe('only');
  });

  it('restores the last deck only while it is still available', () => {
    const decks = [{ id: 'a' }, { id: 'b' }];
    expect(getPreferredDeckId(decks, 'b')).toBe('b');
    expect(getPreferredDeckId(decks, 'removed')).toBeNull();
  });
});
