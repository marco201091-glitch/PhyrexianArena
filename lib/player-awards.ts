import { getParticipantDisplayName, getParticipantKey, type MatchParticipantRecord } from '@/lib/arena-participants';
import { buildMatchRecord } from '@/lib/win-rate';

export type PlayerAwardKind = 'veteran' | 'eternal_second' | 'arena_king' | 'hitman' | 'berserker' | 'archenemy' | 'combo' | 'last_standing' | 'concession' | 'true_skills' | 'healing_master' | 'beginners_luck';
export type PlayerAward = { kind: PlayerAwardKind; rank: number; name: string; value: number; gamesPlayed: number; winRate: number };
type Match = { is_draw?: boolean; win_condition?: string | null; match_participants: MatchParticipantRecord[] };

export function buildPlayerAwards(matches: Match[]): PlayerAward[] {
  const players = new Map<string, { name: string; games: number; wins: number; draws: number; second: number; eliminations: number; damage: number; first: number; combo: number; last: number; concession: number; skills: number; healing: number; starts: number }>();
  for (const match of matches) {
    const first = match.match_participants.map((p) => p.eliminated_at).filter((value): value is string => Boolean(value)).sort()[0];
    for (const participant of match.match_participants) {
      const key = getParticipantKey(participant); if (!key) continue;
      const row = players.get(key) ?? { name: getParticipantDisplayName(participant), games: 0, wins: 0, draws: 0, second: 0, eliminations: 0, damage: 0, first: 0, combo: 0, last: 0, concession: 0, skills: 0, healing: 0, starts: 0 };
      row.games += 1; row.wins += Number(participant.is_winner); row.draws += Number(Boolean(match.is_draw)); row.second += Number(participant.placement === 2);
      row.eliminations += participant.eliminations_caused || 0; row.damage += participant.life_damage_dealt || 0; row.first += Number(Boolean(first && participant.eliminated_at === first)); row.healing = Math.max(row.healing, participant.life_gained || 0); row.starts += Number(Boolean(participant.was_starting_player));
      if (participant.is_winner) { row.combo += Number(match.win_condition === 'combo'); row.last += Number(match.win_condition === 'last_standing'); row.concession += Number(match.win_condition === 'concession'); row.skills += Number(match.win_condition === 'alternate_card' || match.win_condition === 'other'); }
      players.set(key, row);
    }
  }
  const rows = Array.from(players.values()).map((row) => ({ ...row, ...buildMatchRecord({ gamesPlayed: row.games, wins: row.wins, draws: row.draws }) }));
  const definitions: Array<[PlayerAwardKind, (row: typeof rows[number]) => number, boolean]> = [
    ['veteran', r => r.games, false], ['eternal_second', r => r.second, false], ['arena_king', r => r.winRate, true], ['hitman', r => r.eliminations, false], ['archenemy', r => r.first, false], ['combo', r => r.combo, false], ['last_standing', r => r.last, false], ['concession', r => r.concession, false], ['true_skills', r => r.skills, false], ['healing_master', r => r.healing, false], ['beginners_luck', r => r.starts, false],
  ];
  return definitions.flatMap(([kind, score, minimumFive]) => rows.filter((row) => (!minimumFive || row.games >= 5) && score(row) > 0).sort((a, b) => score(b) - score(a) || b.games - a.games || a.name.localeCompare(b.name)).slice(0, 3).map((row, index) => ({ kind, rank: index + 1, name: row.name, value: score(row), gamesPlayed: row.games, winRate: row.winRate })));
}
