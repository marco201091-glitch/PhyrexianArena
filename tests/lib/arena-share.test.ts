import { describe, expect, it } from 'vitest';
import { buildArenaShareText } from '@/lib/arena-share';

const labels = {
  arenaStatsTitle: 'Arena Stats',
  period: 'Period',
  totalMatches: 'Matches',
  topPlayers: 'Top Players',
  topDecks: 'Top Decks',
  topColors: 'Top Colors',
  recentMatches: 'Recent Matches',
  winner: 'Winner',
  winRate: 'Win rate',
  publicPage: 'Public page',
  noComment: 'No notes',
};

describe('arena-share', () => {
  it('builds shareable text summary', () => {
    const text = buildArenaShareText({
      arenaName: 'Friday Night',
      periodLabel: 'All time',
      totalMatches: 12,
      topPlayers: [{ displayName: 'Marco', gamesPlayed: 10, wins: 6, winRate: 60 }],
      topDecks: [{ commander: 'Atraxa', gamesPlayed: 5, wins: 3, winRate: 60, bracket: '3' }],
      topColors: [{ label: 'Esper', gamesPlayed: 4, percentage: 33 }],
      recentMatches: [{
        playedAt: '2026-07-08T20:00:00.000Z',
        winnerName: 'Marco',
        notes: 'Long game',
        participants: [{
          displayName: 'Marco',
          commander: 'Atraxa',
          deckName: 'Atraxa',
          isWinner: true,
          bracket: '3',
        }],
      }],
      publicUrl: 'https://example.com/arena/PHY123',
    }, labels);

    expect(text).toContain('Friday Night');
    expect(text).toContain('Marco - 60%');
    expect(text).toContain('Atraxa [B3]');
    expect(text).toContain('Public page: https://example.com/arena/PHY123');
    expect(text).toContain('Long game');
  });
});