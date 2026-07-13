import { getParticipantDeckSnapshot } from '@/lib/arena-participants';
import type { ArenaMatch } from '@/lib/types/arena';
import type { AppLanguage } from '@/lib/i18n/types';

export type ArenaDateFilter = 'all' | '7d' | '30d' | '90d';

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function subDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

export function filterMatchesByDate<T extends { played_at: string }>(
  matches: T[],
  dateFilter: ArenaDateFilter,
): T[] {
  if (dateFilter === 'all') return matches;

  const now = new Date();
  let startDate: Date;

  switch (dateFilter) {
    case '7d':
      startDate = subDays(now, 7);
      break;
    case '30d':
      startDate = subDays(now, 30);
      break;
    case '90d':
      startDate = subDays(now, 90);
      break;
    default:
      return matches;
  }

  const threshold = startOfDay(startDate).getTime();
  return matches.filter((match) => new Date(match.played_at).getTime() > threshold);
}

export function getArenaPeriodLabel(dateFilter: ArenaDateFilter, language: AppLanguage) {
  if (dateFilter === '7d') return language === 'it' ? 'Ultimi 7 giorni' : 'Last 7 days';
  if (dateFilter === '30d') return language === 'it' ? 'Ultimi 30 giorni' : 'Last 30 days';
  if (dateFilter === '90d') return language === 'it' ? 'Ultimi 90 giorni' : 'Last 90 days';
  return language === 'it' ? 'Sempre' : 'All time';
}

export function getBracketOptionsFromMatches(matches: ArenaMatch[]) {
  const brackets = new Set<string>();

  matches.forEach((match) => {
    match.match_participants.forEach((participant) => {
      const deck = getParticipantDeckSnapshot(participant);
      if (deck?.bracket) brackets.add(deck.bracket);
    });
  });

  return Array.from(brackets).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}