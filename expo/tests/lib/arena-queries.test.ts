import { describe, expect, it, vi } from 'vitest';
import { fetchArenaMemberDecks } from '@/lib/arena-queries';

describe('arena queries', () => {
  it('fetches every member deck list with one bounded RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ id: 'deck-1', user_id: 'user-1' }],
      error: null,
    });
    const from = vi.fn();
    const result = await fetchArenaMemberDecks({ rpc, from } as never, 'group-1', [
      'user-1',
      'user-2',
    ]);

    expect(result).toHaveLength(1);
    expect(rpc).toHaveBeenCalledWith('get_arena_member_decks', {
      p_group_id: 'group-1',
      p_user_ids: ['user-1', 'user-2'],
      p_limit_per_user: 120,
    });
    expect(from).not.toHaveBeenCalled();
  });
});
