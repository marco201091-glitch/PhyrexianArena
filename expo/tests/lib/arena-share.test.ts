import { describe, expect, it } from 'vitest';
import { buildArenaShareText } from '@/lib/arena-share';

const labels = {
  arenaStatsTitle: 'Arena Stats', period: 'Period', totalMatches: 'Matches',
  topPlayers: 'Top Players', topDecks: 'Top Decks', topColors: 'Top Colors',
  recentMatches: 'Recent Matches', winner: 'Winner', winRate: 'Win rate',
  publicPage: 'Public page', noComment: 'No notes',
};

describe('arena share', () => {
  it('limits long sections and keeps optional details readable', () => {
    const text = buildArenaShareText({
      arenaName: 'Friday Night', periodLabel: 'All time', totalMatches: 12,
      topPlayers: Array.from({ length: 6 }, (_, index) => ({ displayName: `P${index}`, gamesPlayed: 10, wins: 5, winRate: 50 })),
      topDecks: [
        { commander: 'Atraxa', gamesPlayed: 5, wins: 3, winRate: 60, bracket: '3' },
        { commander: 'Krenko', gamesPlayed: 2, wins: 1, winRate: 50 },
      ],
      topColors: [{ label: 'Esper', gamesPlayed: 4, percentage: 33 }],
      recentMatches: [{
        playedAt: '2026-07-08T20:00:00.000Z', winnerName: 'Marco', notes: '  Long game  ',
        participants: [
          { displayName: 'Marco', commander: 'Atraxa', deckName: 'Superfriends', isWinner: true, bracket: '3' },
          { displayName: 'No deck', isWinner: false },
        ],
      }],
      publicUrl: 'https://example.com/arena/PHY123',
    }, labels, 'en-US');

    expect(text).toContain('5. P4');
    expect(text).not.toContain('P5');
    expect(text).toContain('Atraxa [B3]');
    expect(text).toContain('Krenko - 50%');
    expect(text).toContain('Marco: Superfriends (Atraxa)');
    expect(text).toContain('No deck: —');
    expect(text).toContain('Long game');
    expect(text).toContain('Public page: https://example.com/arena/PHY123');
  });

  it('omits empty optional sections and the public link', () => {
    const text = buildArenaShareText({
      arenaName: 'Empty', periodLabel: '7 days', totalMatches: 0,
      topPlayers: [], topDecks: [], topColors: [], recentMatches: [],
    }, labels);
    expect(text).not.toContain('Top Colors');
    expect(text).not.toContain('Recent Matches');
    expect(text).not.toContain('Public page');
  });
});
