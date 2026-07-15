import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { filterMatchesByDate, getArenaPeriodLabel, getBracketOptionsFromMatches } from '@/lib/arena-filters';
import type { ArenaMatch } from '@/lib/types/arena';

describe('arena filters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 15, 12, 0, 0));
  });

  afterEach(() => vi.useRealTimers());

  it('filters relative periods using the local start-of-day boundary', () => {
    const sevenDaysAgo = new Date(2026, 6, 8, 0, 0, 0).toISOString();
    const justInside = new Date(2026, 6, 8, 0, 0, 1).toISOString();
    const recent = new Date(2026, 6, 14, 10, 0, 0).toISOString();
    const matches = [{ id: 'boundary', played_at: sevenDaysAgo }, { id: 'inside', played_at: justInside }, { id: 'recent', played_at: recent }];

    expect(filterMatchesByDate(matches, '7d').map((match) => match.id)).toEqual(['inside', 'recent']);
    expect(filterMatchesByDate(matches, 'all')).toBe(matches);
  });

  it('localizes every period label', () => {
    expect(getArenaPeriodLabel('all', 'it')).toBe('Sempre');
    expect(getArenaPeriodLabel('7d', 'en')).toBe('Last 7 days');
    expect(getArenaPeriodLabel('30d', 'it')).toBe('Ultimi 30 giorni');
    expect(getArenaPeriodLabel('90d', 'en')).toBe('Last 90 days');
  });

  it('extracts unique, numerically sorted brackets from user and guest decks', () => {
    const match = {
      match_participants: [
        { decks: { name: 'A', commander: 'A', commander_image: null, bracket: '10' } },
        { arena_guest_decks: { name: 'B', commander: 'B', commander_image: null, bracket: '2' } },
        { decks: { name: 'C', commander: 'C', commander_image: null, bracket: '2' } },
        { decks: { name: 'D', commander: 'D', commander_image: null, bracket: null } },
      ],
    } as ArenaMatch;
    expect(getBracketOptionsFromMatches([match])).toEqual(['2', '10']);
  });
});
