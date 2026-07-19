import { describe, expect, it, vi } from 'vitest';
import { fetchPersonalAnalyticsInputs } from '@/lib/personal-analytics-query';

describe('personal analytics RPC', () => {
  it('returns participant and deck inputs from one request', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        is_winner: true,
        deck_id: 'deck-1',
        played_at: '2026-07-01T10:00:00.000Z',
        name: 'Deck',
        commander: 'Atraxa',
        commander_image: null,
        color_identity: ['G'],
        bracket: '3',
        source_type: null,
        source_url: null,
        owner_username: 'alice',
      }],
      error: null,
    });

    const result = await fetchPersonalAnalyticsInputs({ rpc }, 'user-1');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(result.decksById.get('deck-1')?.color_identity).toEqual(['G']);
  });
});
