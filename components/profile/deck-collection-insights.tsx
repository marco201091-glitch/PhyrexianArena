'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { ManaColorBadge, ManaColorPills } from '@/components/ui/mana-color-pills';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  buildAverageCommanderCmc,
  buildDeckCollectionAnalytics,
  type DeckCollectionSnapshot,
} from '@/lib/deck-collection-analytics';
import { MANA_COLOR_LABELS } from '@/lib/mana-colors';
import { cn } from '@/lib/utils';

interface DeckCollectionInsightsProps {
  decks: DeckCollectionSnapshot[];
  commanderCmcSyncInProgress?: boolean;
}

const SOURCE_LABELS: Record<string, { it: string; en: string }> = {
  moxfield: { it: 'Moxfield', en: 'Moxfield' },
  archidekt: { it: 'Archidekt', en: 'Archidekt' },
  manual: { it: 'Manuale', en: 'Manual' },
  other: { it: 'Altro', en: 'Other' },
};

function formatStatValue(value: number | null, loading = false) {
  if (value == null) {
    return loading ? '…' : '—';
  }
  return String(value);
}

function StatHighlight({
  label,
  value,
  valueClassName,
  loading = false,
}: {
  label: string;
  value: number | null;
  valueClassName?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/30 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className={cn('mt-1 text-2xl font-bold leading-none', valueClassName)}>
        {formatStatValue(value, loading)}
      </p>
    </div>
  );
}

export function DeckCollectionInsights({
  decks,
  commanderCmcSyncInProgress = false,
}: DeckCollectionInsightsProps) {
  const { copy: t } = useLanguage();
  const [open, setOpen] = useState(false);

  const analytics = useMemo(() => buildDeckCollectionAnalytics(decks), [decks]);
  const averageCmc = useMemo(() => buildAverageCommanderCmc(decks), [decks]);

  if (analytics.deckCount === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-6">
      <div className="overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-black/30 via-black/20 to-violet-950/10">
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-end sm:justify-between sm:p-4">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:max-w-md">
            <StatHighlight
              label={t({ it: 'Bracket medio', en: 'Avg bracket' })}
              value={analytics.averageBracket}
              valueClassName="text-emerald-300"
            />
            <StatHighlight
              label={t({ it: 'CMC medio comandanti', en: 'Avg commander CMC' })}
              value={averageCmc}
              valueClassName="text-violet-300"
              loading={commanderCmcSyncInProgress && averageCmc == null}
            />
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <p className="text-xs text-muted-foreground sm:text-right">
              {analytics.deckCount}{' '}
              {t({
                it: analytics.deckCount === 1 ? 'mazzo analizzato' : 'mazzi analizzati',
                en: analytics.deckCount === 1 ? 'deck analyzed' : 'decks analyzed',
              })}
            </p>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-border/80 bg-background/40 text-foreground"
              >
                <Layers className="mr-2 h-4 w-4" />
                {open
                  ? t({ it: 'Comprimi', en: 'Collapse' })
                  : t({ it: 'Dettagli', en: 'Details' })}
                <ChevronDown className={cn('ml-2 h-4 w-4 transition-transform', open && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="border-t border-border/60 bg-black/15 px-3 pb-4 pt-4 sm:px-4">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <section className="space-y-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {t({ it: 'Colori singoli piu frequenti', en: 'Most common individual colors' })}
              </p>
              <div className="space-y-2.5">
                {analytics.colorStats.slice(0, 6).map((stat) => {
                  const label = MANA_COLOR_LABELS[stat.color] || MANA_COLOR_LABELS.C;
                  return (
                    <div key={stat.color}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <ManaColorBadge color={stat.color} size="sm" />
                          <span className="truncate font-medium text-foreground">{t(label)}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{stat.count} · {stat.percentage}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary/80">
                        <div
                          className="h-full rounded-full bg-violet-400/90"
                          style={{ width: `${Math.max(stat.percentage, stat.count > 0 ? 8 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {t({ it: 'Combinazioni colore complete', en: 'Full color combinations' })}
              </p>
              <div className="space-y-2.5">
                {analytics.combinationStats.slice(0, 6).map((stat) => (
                  <div key={stat.key}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <ManaColorPills colors={stat.colors} size="xs" gap="tight" />
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {stat.count} · {stat.percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary/80">
                      <div
                        className="h-full rounded-full bg-sky-400/85"
                        style={{ width: `${Math.max(stat.percentage, stat.count > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-5 grid gap-4 border-t border-border/50 pt-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {t({ it: 'Sorgenti', en: 'Sources' })}
              </p>
              <div className="flex flex-wrap gap-2">
                {analytics.sourceStats.map((stat) => {
                  const label = SOURCE_LABELS[stat.source] || SOURCE_LABELS.other;
                  return (
                    <span
                      key={stat.source}
                      className="rounded-full border border-border/70 bg-background/40 px-2.5 py-1 text-xs text-foreground"
                    >
                      {t(label)} · {stat.percentage}%
                    </span>
                  );
                })}
              </div>
            </div>

            {analytics.bracketStats.length > 0 ? (
              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {t({ it: 'Distribuzione bracket', en: 'Bracket spread' })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {analytics.bracketStats.map((stat) => (
                    <span
                      key={stat.bracket}
                      className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200"
                    >
                      B{stat.bracket} · {stat.count}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {analytics.averageColorCount != null ? (
              <p className="self-end text-xs text-muted-foreground sm:col-span-2 xl:col-span-1 xl:text-right">
                {t({
                  it: `Media colori per mazzo: ${analytics.averageColorCount}`,
                  en: `Average colors per deck: ${analytics.averageColorCount}`,
                })}
              </p>
            ) : null}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}