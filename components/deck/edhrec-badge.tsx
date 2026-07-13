'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ExternalLink } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import {
  buildCommanderSlug,
  buildEdhrecCommanderUrl,
  EDHREC_STATS_TTL_MS,
  type EdhrecCommanderStats,
} from '@/lib/edhrec';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { cn } from '@/lib/utils';

interface CachedEdhrecEntry {
  stats: EdhrecCommanderStats | null;
  fetchedAt: number;
}

const statsCache = new Map<string, CachedEdhrecEntry>();
const inFlightRequests = new Map<string, Promise<EdhrecCommanderStats | null>>();
const cacheListeners = new Map<string, Set<() => void>>();

const MAX_CONCURRENT_EDHREC_FETCHES = 2;
let activeEdhrecFetches = 0;
const edhrecFetchQueue: Array<() => void> = [];

const PERSISTED_CACHE_PREFIX = 'phyrexian-edhrec:v1:';
const PERSISTED_SLUG_CACHE_PREFIX = 'phyrexian-edhrec-slug:v1:';
const slugCache = new Map<string, string>();

function notifyCacheListeners(normalized: string) {
  cacheListeners.get(normalized)?.forEach((listener) => listener());
}

function subscribeToEdhrecStats(normalized: string, listener: () => void) {
  const listeners = cacheListeners.get(normalized) ?? new Set<() => void>();
  listeners.add(listener);
  cacheListeners.set(normalized, listeners);

  return () => {
    const current = cacheListeners.get(normalized);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) cacheListeners.delete(normalized);
  };
}

function runEdhrecFetchTask(task: () => Promise<void>) {
  const execute = async () => {
    activeEdhrecFetches += 1;
    try {
      await task();
    } finally {
      activeEdhrecFetches -= 1;
      const next = edhrecFetchQueue.shift();
      if (next) next();
    }
  };

  if (activeEdhrecFetches < MAX_CONCURRENT_EDHREC_FETCHES) {
    void execute();
    return;
  }

  edhrecFetchQueue.push(() => {
    void execute();
  });
}

function normalizeCommander(commander: string) {
  return commander.trim().toLowerCase();
}

function readPersistedEntry(normalized: string): CachedEdhrecEntry | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(`${PERSISTED_CACHE_PREFIX}${normalized}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEdhrecEntry;
    if (!parsed || typeof parsed.fetchedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersistedEntry(normalized: string, entry: CachedEdhrecEntry) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(`${PERSISTED_CACHE_PREFIX}${normalized}`, JSON.stringify(entry));
  } catch {
    // Ignore quota or privacy mode errors.
  }
}

function getCacheEntry(normalized: string): CachedEdhrecEntry | undefined {
  const memoryEntry = statsCache.get(normalized);
  if (memoryEntry) return memoryEntry;

  const persisted = readPersistedEntry(normalized);
  if (!persisted) return undefined;

  statsCache.set(normalized, persisted);
  return persisted;
}

function shouldRefreshStats(entry: CachedEdhrecEntry | undefined) {
  if (!entry) return true;
  return Date.now() - entry.fetchedAt >= EDHREC_STATS_TTL_MS;
}

function hasDisplayableEdhrecStats(stats: EdhrecCommanderStats | null | undefined) {
  return stats != null && (stats.rank != null || stats.numDecks != null);
}

export function hasFreshEdhrecBadge(commander: string) {
  const normalized = normalizeCommander(commander);
  if (normalized.length < 2) return true;

  const entry = getCacheEntry(normalized);
  if (!entry || shouldRefreshStats(entry)) return false;

  return hasDisplayableEdhrecStats(entry.stats);
}

export function prefetchEdhrecStats(commander: string) {
  const normalized = normalizeCommander(commander);
  if (normalized.length < 2) {
    return Promise.resolve(null);
  }

  if (hasFreshEdhrecBadge(commander)) {
    return Promise.resolve(getCacheEntry(normalized)?.stats ?? null);
  }

  return fetchEdhrecStats(commander);
}

function setCacheEntry(normalized: string, stats: EdhrecCommanderStats | null) {
  const entry: CachedEdhrecEntry = {
    stats,
    fetchedAt: Date.now(),
  };
  statsCache.set(normalized, entry);
  writePersistedEntry(normalized, entry);
  notifyCacheListeners(normalized);
}

function fetchEdhrecStats(commander: string): Promise<EdhrecCommanderStats | null> {
  const normalized = normalizeCommander(commander);
  if (normalized.length < 2) {
    return Promise.resolve(null);
  }

  const existing = inFlightRequests.get(normalized);
  if (existing) return existing;

  const request = new Promise<EdhrecCommanderStats | null>((resolve) => {
    runEdhrecFetchTask(async () => {
      try {
        const response = await authenticatedFetch(`/api/edhrec-commander?commander=${encodeURIComponent(commander.trim())}`);
        if (!response.ok) {
          setCacheEntry(normalized, null);
          resolve(null);
          return;
        }

        const payload = await response.json();
        const data = (payload?.data ?? null) as EdhrecCommanderStats | null;
        setCacheEntry(normalized, data);
        resolve(data);
      } catch {
        setCacheEntry(normalized, null);
        resolve(null);
      } finally {
        inFlightRequests.delete(normalized);
      }
    });
  });

  inFlightRequests.set(normalized, request);
  return request;
}

function readPersistedSlug(normalized: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem(`${PERSISTED_SLUG_CACHE_PREFIX}${normalized}`);
  } catch {
    return null;
  }
}

function writePersistedSlug(normalized: string, slug: string) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(`${PERSISTED_SLUG_CACHE_PREFIX}${normalized}`, slug);
  } catch {
    // Ignore quota or privacy mode errors.
  }
}

function useEdhrecResolvedSlug(commander: string, statsSlug?: string | null) {
  const normalized = normalizeCommander(commander);
  const fallbackSlug = buildCommanderSlug(commander);
  const [slug, setSlug] = useState(() => {
    if (statsSlug) return statsSlug;
    if (normalized.length < 2) return fallbackSlug;
    return slugCache.get(normalized) || readPersistedSlug(normalized) || fallbackSlug;
  });

  useEffect(() => {
    if (statsSlug) {
      slugCache.set(normalized, statsSlug);
      writePersistedSlug(normalized, statsSlug);
      setSlug(statsSlug);
      return;
    }

    if (normalized.length < 2) {
      setSlug(fallbackSlug);
      return;
    }

    const cached = slugCache.get(normalized) || readPersistedSlug(normalized);
    if (cached) {
      setSlug(cached);
      return;
    }

    let cancelled = false;

    void authenticatedFetch(`/api/edhrec-resolve?commander=${encodeURIComponent(commander.trim())}`)
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = await response.json() as { slug?: string | null };
        return typeof payload.slug === 'string' && payload.slug ? payload.slug : null;
      })
      .then((resolvedSlug) => {
        if (cancelled || !resolvedSlug) return;
        slugCache.set(normalized, resolvedSlug);
        writePersistedSlug(normalized, resolvedSlug);
        setSlug(resolvedSlug);
      })
      .catch(() => {
        // Keep fallback slug.
      });

    return () => {
      cancelled = true;
    };
  }, [commander, fallbackSlug, normalized, statsSlug]);

  return slug;
}

function useEdhrecVisibility() {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || visible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: '160px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  return { ref, visible };
}

export function useEdhrecCommanderStats(commander: string, enabled = true) {
  const normalized = normalizeCommander(commander);

  const stats = useSyncExternalStore(
    (listener) => {
      if (!enabled || normalized.length < 2) return () => {};
      return subscribeToEdhrecStats(normalized, listener);
    },
    () => {
      if (!enabled || normalized.length < 2) return undefined;
      return getCacheEntry(normalized)?.stats;
    },
    () => undefined,
  );

  useEffect(() => {
    if (!enabled || normalized.length < 2) return;
    if (inFlightRequests.has(normalized)) return;

    const cached = getCacheEntry(normalized);
    if (!shouldRefreshStats(cached)) return;

    void fetchEdhrecStats(commander);
  }, [commander, enabled, normalized]);

  return stats;
}

function formatDeckCount(count: number) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}k`;
  return String(count);
}

function getRankBadgeStyles(rank: number) {
  if (rank <= 10) {
    return 'border-amber-400/40 bg-amber-500/15 text-amber-100';
  }
  if (rank <= 100) {
    return 'border-teal-400/40 bg-teal-500/15 text-teal-100';
  }
  if (rank <= 500) {
    return 'border-teal-500/30 bg-teal-500/10 text-teal-200';
  }
  return 'border-border/80 bg-muted/30 text-muted-foreground';
}

function buildStatsTitle(
  commander: string,
  stats: EdhrecCommanderStats | null | undefined,
  t: (value: { it: string; en: string }) => string,
) {
  if (stats?.rank != null && stats.numDecks != null) {
    return t({
      it: `#${stats.rank} tra i comandanti più giocati su EDHREC (${stats.numDecks.toLocaleString()} mazzi)`,
      en: `#${stats.rank} among the most played commanders on EDHREC (${stats.numDecks.toLocaleString()} decks)`,
    });
  }
  if (stats?.rank != null) {
    return t({
      it: `#${stats.rank} tra i comandanti più giocati su EDHREC`,
      en: `#${stats.rank} among the most played commanders on EDHREC`,
    });
  }
  if (stats?.numDecks != null) {
    return t({
      it: `${stats.numDecks.toLocaleString()} mazzi su EDHREC`,
      en: `${stats.numDecks.toLocaleString()} decks on EDHREC`,
    });
  }
  return commander.trim() || 'EDHREC';
}

function EdhrecBadgeContent({
  stats,
  className = '',
}: {
  stats: EdhrecCommanderStats;
  className?: string;
}) {
  const { copy: t } = useLanguage();

  const hasRank = stats.rank != null;
  const hasDeckCount = stats.numDecks != null;

  if (!hasRank && !hasDeckCount) return null;

  const badgeClassName = hasRank
    ? getRankBadgeStyles(stats.rank!)
    : 'border-teal-500/30 bg-teal-500/10 text-teal-200';

  return (
    <span
      title={buildStatsTitle(stats.commander, stats, t)}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        badgeClassName,
        className,
      )}
    >
      <span>EDHREC</span>
      {hasRank ? (
        <span className="font-semibold normal-case">#{stats.rank}</span>
      ) : null}
      {hasRank && hasDeckCount ? (
        <span className="normal-case opacity-75">·</span>
      ) : null}
      {hasDeckCount ? (
        <span className="normal-case opacity-90">{formatDeckCount(stats.numDecks!)}</span>
      ) : null}
    </span>
  );
}

function getDominantEdhrecBracket(bracketCounts: Record<string, number>) {
  const entries = Object.entries(bracketCounts).filter(([, count]) => count > 0);
  if (entries.length === 0) return null;

  const [bracket, count] = entries.sort((a, b) => b[1] - a[1])[0];
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (total <= 0) return null;

  return {
    bracket,
    count,
    percentage: Math.round((count / total) * 100),
  };
}

function EdhrecBracketComparison({
  stats,
  localBracket,
  className = '',
}: {
  stats: EdhrecCommanderStats;
  localBracket: string;
  className?: string;
}) {
  const { copy: t } = useLanguage();
  const counts = stats.bracketCounts;
  if (!counts) return null;

  const localValue = Number.parseInt(localBracket, 10);
  const dominant = getDominantEdhrecBracket(counts);
  if (!Number.isFinite(localValue) || !dominant) return null;

  const dominantValue = Number.parseInt(dominant.bracket, 10);
  const delta = Number.isFinite(dominantValue) ? localValue - dominantValue : 0;

  const comparisonLabel = delta === 0
    ? t({ it: 'Allineato al meta EDHREC', en: 'Aligned with EDHREC meta' })
    : delta > 0
      ? t({ it: 'Sopra il meta EDHREC', en: 'Above EDHREC meta' })
      : t({ it: 'Sotto il meta EDHREC', en: 'Below EDHREC meta' });

  const title = t({
    it: `Il tuo bracket B${localValue} vs tipico EDHREC B${dominant.bracket} (${dominant.percentage}% dei mazzi)`,
    en: `Your bracket B${localValue} vs typical EDHREC B${dominant.bracket} (${dominant.percentage}% of decks)`,
  });

  return (
    <span
      title={title}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        delta === 0
          ? 'border-teal-400/35 bg-teal-500/10 text-teal-100'
          : delta > 0
            ? 'border-amber-400/35 bg-amber-500/10 text-amber-100'
            : 'border-sky-400/35 bg-sky-500/10 text-sky-100',
        className,
      )}
    >
      <span className="normal-case opacity-90">{comparisonLabel}</span>
      <span className="normal-case opacity-75">·</span>
      <span className="font-semibold normal-case">B{dominant.bracket}</span>
      <span className="normal-case opacity-75">{dominant.percentage}%</span>
    </span>
  );
}

function EdhrecLinkContent({
  commander,
  stats,
  className = '',
  variant = 'text',
}: {
  commander: string;
  stats?: EdhrecCommanderStats | null;
  className?: string;
  variant?: 'text' | 'chip';
}) {
  const { copy: t } = useLanguage();
  const slug = useEdhrecResolvedSlug(commander, stats?.slug);

  if (!slug) return null;

  const label = t({ it: 'Vedi su EDHREC', en: 'View on EDHREC' });

  return (
    <a
      href={buildEdhrecCommanderUrl(slug)}
      target="_blank"
      rel="noopener noreferrer"
      title={buildStatsTitle(commander, stats, t)}
      className={cn(
        variant === 'chip'
          ? 'inline-flex w-full min-w-0 items-center gap-2 rounded-md border border-teal-500/25 bg-teal-500/10 px-3 py-2 text-xs font-medium text-teal-100 transition-colors hover:border-teal-400/40 hover:bg-teal-500/15 sm:w-auto'
          : 'inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground hover:text-teal-300',
        className,
      )}
    >
      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  );
}

function useLazyEdhrecStats(commander: string, fetchStats: boolean) {
  const { ref, visible } = useEdhrecVisibility();
  const stats = useEdhrecCommanderStats(commander, visible && fetchStats);
  return { ref, stats };
}

interface EdhrecBadgeProps {
  commander: string;
  className?: string;
}

export function EdhrecBadge({ commander, className = '' }: EdhrecBadgeProps) {
  const { ref, stats } = useLazyEdhrecStats(commander, true);

  return (
    <span ref={ref} className="inline-flex min-h-0 min-w-0">
      {stats ? <EdhrecBadgeContent stats={stats} className={className} /> : null}
    </span>
  );
}

interface EdhrecLinkProps {
  commander: string;
  className?: string;
}

export function EdhrecLink({ commander, className = '' }: EdhrecLinkProps) {
  return (
    <span className="inline-flex min-h-0 min-w-0">
      <EdhrecLinkContent commander={commander} className={className} />
    </span>
  );
}

interface EdhrecDeckInsightsProps {
  commander: string;
  localBracket?: string | null;
  showBadge?: boolean;
  showLink?: boolean;
  showBracketComparison?: boolean;
  linkVariant?: 'text' | 'chip';
  linkClassName?: string;
  badgeClassName?: string;
  className?: string;
  layout?: 'inline' | 'stacked';
}

export function EdhrecDeckInsights({
  commander,
  localBracket = null,
  showBadge = true,
  showLink = true,
  showBracketComparison = false,
  linkVariant = 'text',
  linkClassName = '',
  badgeClassName = '',
  className = '',
  layout = 'inline',
}: EdhrecDeckInsightsProps) {
  const needsStats = showBadge || (showBracketComparison && Boolean(localBracket));
  const { ref, stats } = useLazyEdhrecStats(commander, needsStats);

  const link = showLink ? (
    <EdhrecLinkContent
      commander={commander}
      stats={stats}
      variant={linkVariant}
      className={linkClassName}
    />
  ) : null;

  const tags = needsStats && stats && (showBadge || (showBracketComparison && localBracket)) ? (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
      {showBadge ? <EdhrecBadgeContent stats={stats} className={badgeClassName} /> : null}
      {showBracketComparison && localBracket ? (
        <EdhrecBracketComparison stats={stats} localBracket={localBracket} />
      ) : null}
    </span>
  ) : null;

  if (layout === 'stacked') {
    return (
      <span ref={needsStats ? ref : undefined} className={cn('flex min-w-0 flex-col gap-2', className)}>
        {link}
        {tags}
      </span>
    );
  }

  return (
    <span
      ref={needsStats ? ref : undefined}
      className={cn(
        'inline-flex min-h-0 min-w-0 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1',
        className,
      )}
    >
      {link}
      {tags}
    </span>
  );
}