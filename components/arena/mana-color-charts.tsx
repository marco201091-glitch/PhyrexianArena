'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { MANA_CHART_COLORS, MANA_COLOR_LABELS, MANA_COLOR_ORDER } from '@/lib/mana-colors';
import { useLanguage } from '@/components/language-provider';
import { ManaColorBadge } from '@/components/ui/mana-color-pills';
import type { ArenaColorPairStat, ArenaColorStat } from '@/lib/arena-color-analytics';

type ColorReportSortKey = 'color' | 'appearances' | 'wins' | 'winRate';
type ColorReportSortDirection = 'asc' | 'desc';

interface ColorReportRow {
  color: string;
  appearances: number;
  percentage: number;
  wins: number;
  winRate: number | null;
  isActive: boolean;
}

function fillAllColorStats(data: ArenaColorStat[]): ArenaColorStat[] {
  const byColor = new Map(data.map((entry) => [entry.color, entry]));

  return MANA_COLOR_ORDER.map((color) => byColor.get(color) || {
    color,
    appearances: 0,
    wins: 0,
    percentage: 0,
    winRate: 0,
  });
}

function ColorBar({
  value,
  max,
  color,
  muted = false,
}: {
  value: number;
  max: number;
  color: string;
  muted?: boolean;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 8 : 0) : 0;

  return (
    <div className={`h-2 overflow-hidden rounded-full ${muted ? 'bg-muted/20' : 'bg-muted/30'}`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${width}%`,
          backgroundColor: muted ? 'transparent' : (MANA_CHART_COLORS[color] || MANA_CHART_COLORS.C),
        }}
      />
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/30 px-4 py-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export function ManaColorLegend() {
  const { copy: t } = useLanguage();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-background/25 px-3 py-2.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t({ it: 'Colori', en: 'Colors' })}
      </span>
      {MANA_COLOR_ORDER.map((color) => (
        <div key={color} className="flex items-center gap-1.5">
          <ManaColorBadge color={color} size="md" />
          <span className="text-xs text-muted-foreground">
            {t(MANA_COLOR_LABELS[color])}
          </span>
        </div>
      ))}
    </div>
  );
}

interface ManaColorReportProps {
  played: ArenaColorStat[];
  won: ArenaColorStat[];
  winRates: ArenaColorStat[];
  missingColorGames: number;
  emptyLabel: string;
}

function SortHeaderButton({
  label,
  active,
  direction,
  onClick,
  align = 'left',
}: {
  label: string;
  active: boolean;
  direction: ColorReportSortDirection;
  onClick: () => void;
  align?: 'left' | 'right';
}) {
  const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 transition-colors hover:text-foreground ${
        align === 'right' ? 'ml-auto' : ''
      } ${active ? 'text-foreground' : 'text-muted-foreground'}`}
    >
      <span>{label}</span>
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
    </button>
  );
}

export function ManaColorReport({
  played,
  won,
  winRates,
  missingColorGames,
  emptyLabel,
}: ManaColorReportProps) {
  const { copy: t } = useLanguage();
  const [sortKey, setSortKey] = useState<ColorReportSortKey>('appearances');
  const [sortDirection, setSortDirection] = useState<ColorReportSortDirection>('desc');

  const toggleSort = (key: ColorReportSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection(key === 'color' ? 'asc' : 'desc');
  };

  const colorOrder = useMemo(
    () => new Map<string, number>(MANA_COLOR_ORDER.map((color, index) => [color, index])),
    [],
  );

  const rows = useMemo<ColorReportRow[]>(() => {
    const allPlayed = fillAllColorStats(played);
    const wonByColor = new Map(won.map((entry) => [entry.color, entry]));
    const winRateByColor = new Map(winRates.map((entry) => [entry.color, entry]));

    return allPlayed.map((entry) => {
      const wonEntry = wonByColor.get(entry.color);
      const winRateEntry = winRateByColor.get(entry.color);

      return {
        color: entry.color,
        appearances: entry.appearances,
        percentage: entry.percentage,
        wins: wonEntry?.appearances ?? 0,
        winRate: winRateEntry?.winRate ?? null,
        isActive: entry.appearances > 0,
      };
    });
  }, [played, won, winRates]);

  const sortedRows = useMemo(() => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;

    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case 'color':
          return ((colorOrder.get(a.color) ?? 99) - (colorOrder.get(b.color) ?? 99)) * multiplier;
        case 'appearances':
          return (a.appearances - b.appearances) * multiplier || ((colorOrder.get(a.color) ?? 99) - (colorOrder.get(b.color) ?? 99));
        case 'wins':
          return (a.wins - b.wins) * multiplier || (a.appearances - b.appearances) * multiplier;
        case 'winRate': {
          const aRate = a.winRate ?? -1;
          const bRate = b.winRate ?? -1;
          return (aRate - bRate) * multiplier || (a.appearances - b.appearances) * multiplier;
        }
        default:
          return 0;
      }
    });
  }, [colorOrder, rows, sortDirection, sortKey]);

  const maxAppearances = Math.max(...rows.map((entry) => entry.appearances), 1);

  if (played.length === 0) {
    return (
      <div className="space-y-4">
        <ManaColorLegend />
        <EmptyState label={emptyLabel} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ManaColorLegend />

      {missingColorGames > 0 && (
        <p className="text-xs text-amber-200/80">
          {t({
            it: `${missingColorGames} partite escluse: mazzi con comandante ma colori non ancora risolti.`,
            en: `${missingColorGames} games excluded: decks with a commander but colors not resolved yet.`,
          })}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-border/50">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/50 bg-background/30 px-4 py-2.5 sm:hidden">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t({ it: 'Ordina', en: 'Sort' })}
          </span>
          {([
            ['color', t({ it: 'Colore', en: 'Color' })],
            ['appearances', t({ it: 'Presenze', en: 'Appearances' })],
            ['wins', t({ it: 'Vittorie', en: 'Wins' })],
            ['winRate', t({ it: 'Win rate', en: 'Win rate' })],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleSort(key)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                sortKey === key
                  ? 'border-violet-500/50 bg-violet-500/15 text-foreground'
                  : 'border-border/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
              {sortKey === key && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
            </button>
          ))}
        </div>

        <div className="hidden border-b border-border/50 bg-background/30 px-4 py-2.5 text-xs font-medium uppercase tracking-wide sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_5rem_5rem] sm:gap-4">
          <SortHeaderButton
            label={t({ it: 'Colore', en: 'Color' })}
            active={sortKey === 'color'}
            direction={sortDirection}
            onClick={() => toggleSort('color')}
          />
          <SortHeaderButton
            label={t({ it: 'Presenze', en: 'Appearances' })}
            active={sortKey === 'appearances'}
            direction={sortDirection}
            onClick={() => toggleSort('appearances')}
          />
          <div className="flex justify-end">
            <SortHeaderButton
              label={t({ it: 'Vittorie', en: 'Wins' })}
              active={sortKey === 'wins'}
              direction={sortDirection}
              onClick={() => toggleSort('wins')}
              align="right"
            />
          </div>
          <div className="flex justify-end">
            <SortHeaderButton
              label={t({ it: 'Win rate', en: 'Win rate' })}
              active={sortKey === 'winRate'}
              direction={sortDirection}
              onClick={() => toggleSort('winRate')}
              align="right"
            />
          </div>
        </div>

        <div className="divide-y divide-border/40">
          {sortedRows.map((entry) => (
            <div
              key={entry.color}
              className={`px-4 py-3 sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_5rem_5rem] sm:items-center sm:gap-4 ${
                entry.isActive ? '' : 'opacity-45'
              }`}
            >
              <div className="mb-2 flex items-center gap-3 sm:mb-0">
                <ManaColorBadge color={entry.color} size="md" muted={!entry.isActive} />
                <div>
                  <p className={`text-sm font-medium ${entry.isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {t(MANA_COLOR_LABELS[entry.color])}
                  </p>
                  {!entry.isActive && (
                    <p className="text-xs text-muted-foreground">
                      {t({ it: 'Nessuna partita nel periodo', en: 'No games in this period' })}
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-2 space-y-1.5 sm:mb-0">
                <div className="flex items-center justify-between gap-3 text-sm tabular-nums">
                  <span className={entry.isActive ? 'text-foreground' : 'text-muted-foreground'}>
                    {entry.appearances}
                  </span>
                  <span className="text-muted-foreground">
                    {entry.isActive ? `${entry.percentage}%` : '0%'}
                  </span>
                </div>
                <ColorBar
                  value={entry.appearances}
                  max={maxAppearances}
                  color={entry.color}
                  muted={!entry.isActive}
                />
              </div>

              <div className="mb-1 text-sm tabular-nums sm:mb-0 sm:text-right">
                <span className="mr-2 text-xs text-muted-foreground sm:hidden">
                  {t({ it: 'Vittorie', en: 'Wins' })}
                </span>
                <span className={entry.isActive ? 'text-foreground' : 'text-muted-foreground'}>
                  {entry.wins}
                </span>
              </div>

              <div className="text-sm sm:text-right">
                <span className="mr-2 text-xs text-muted-foreground sm:hidden">
                  {t({ it: 'Win rate', en: 'Win rate' })}
                </span>
                {entry.winRate !== null ? (
                  <span className="font-medium tabular-nums text-foreground">{entry.winRate}%</span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {entry.appearances > 0 && entry.appearances < 3
                      ? t({ it: 'min. 3 partite', en: 'min. 3 games' })
                      : '—'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ManaColorPairsProps {
  pairs: ArenaColorPairStat[];
  emptyLabel: string;
}

export function ManaColorPairs({ pairs, emptyLabel }: ManaColorPairsProps) {
  const { copy: t } = useLanguage();

  if (pairs.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  const maxAppearances = Math.max(...pairs.map((pair) => pair.appearances), 1);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t({
          it: 'Mazzi con 2+ colori: gilde (Dimir), tricolori (Grixis, Jeskai, Mardu…), Pentacolor o combinazioni senza nome. Gli incolori (C) non compaiono.',
          en: 'Decks with 2+ colors: guilds (Dimir), three-color (Grixis, Jeskai, Mardu…), Pentacolor, or unnamed combos. Colorless (C) decks are not listed.',
        })}
      </p>
      {pairs.map((pair, index) => (
        <div
          key={pair.key}
          className="rounded-lg border border-border/50 bg-background/25 p-3"
        >
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-bold text-violet-200">
                {index + 1}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                {pair.colors.map((color) => (
                  <ManaColorBadge key={`${pair.key}-${color}`} color={color} size="sm" />
                ))}
              </div>
              <span className="min-w-0 text-sm font-medium text-foreground break-words">
                {pair.guildName
                  ? t(pair.guildName)
                  : pair.colors.length === 5
                    ? t({ it: 'Pentacolor', en: 'Pentacolor' })
                    : pair.colors.join(' / ')}
              </span>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 text-sm tabular-nums sm:block sm:text-right">
              <span className="font-semibold text-foreground">{pair.winRate}%</span>
              <span className="text-muted-foreground sm:ml-2">
                {pair.appearances}G · {pair.wins}W
              </span>
            </div>
          </div>
          <ColorBar value={pair.appearances} max={maxAppearances} color={pair.colors[0]} />
        </div>
      ))}
    </div>
  );
}