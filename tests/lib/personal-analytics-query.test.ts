import { describe, expect, it, vi } from 'vitest';
import {
  buildPersonalAnalyticsInputs,
  fetchPersonalAnalyticsInputs,
  type PersonalAnalyticsFact,
} from '@/lib/personal-analytics-query';

const fact: PersonalAnalyticsFact = {
  is_winner: true,
  deck_id: 'deck-1',
  played_at: '2026-07-01T10:00:00.000Z',
  name: 'Counters',
  commander: 'Atraxa',
  commander_image: null,
  color_identity: ['W', 'U', 'B', 'G'],
  bracket: '4',
  source_type: 'moxfield',
  source_url: 'https://moxfield.com/decks/1',
  owner_username: 'alice',
};

describe('personal analytics query', () => {
  it('deduplicates deck snapshots while preserving every match outcome', () => {
    const inputs = buildPersonalAnalyticsInputs([
      fact,
      { ...fact, is_winner: false, played_at: '2026-07-02T10:00:00.000Z' },
    ]);
    expect(inputs.participants).toHaveLength(2);
    expect(inputs.decksById).toHaveLength(1);
    expect(inputs.decksById.get('deck-1')).toMatchObject({
      commander: 'Atraxa',
      ownerUsername: 'alice',
    });
  });

  it('loads the dashboard with one joined RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [fact], error: null });
    const inputs = await fetchPersonalAnalyticsInputs({ rpc }, 'user-1');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('get_personal_analytics_facts', {
      p_user_id: 'user-1',
    });
    expect(inputs.participants[0]).toMatchObject({ is_winner: true, deck_id: 'deck-1' });
  });
});
