export interface EdhrecCommanderStats {
  commander: string;
  slug: string;
  numDecks: number | null;
  rank: number | null;
  bracketCounts: Record<string, number> | null;
}

export const EDHREC_SITE_BASE = 'https://edhrec.com/commanders';

export function buildEdhrecCommanderUrl(slug: string) {
  return `${EDHREC_SITE_BASE}/${slug}`;
}

export function buildCommanderSlug(commander: string) {
  return commander
    .split('//')
    .map((part) =>
      part
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[''`´\u2018\u2019\u201A\u201B]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    )
    .filter(Boolean)
    .join('-');
}

export function formatEdhrecDeckCount(count: number) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}k`;
  return String(count);
}

export function getEdhrecRankBadgeStyle(rank: number) {
  if (rank <= 10) return 'amber' as const;
  if (rank <= 100) return 'teal' as const;
  if (rank <= 500) return 'tealMuted' as const;
  return 'muted' as const;
}