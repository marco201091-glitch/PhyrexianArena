'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, ChevronDown, Swords, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLanguage } from '@/components/language-provider';
import {
  ARENA_SEASON_RANKING_MIN_GAMES,
  formatArenaSeasonLabel,
  getArenaSeasonArchiveHighlights,
  getArenaSeasonRecord,
  type ArenaSeasonArchive,
} from '@/lib/arena-seasons';

type RankingView = 'players' | 'decks';

export function PreviousSeasonsPanel({ archives }: { archives: ArenaSeasonArchive[] }) {
  const { copy: t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [rankingView, setRankingView] = useState<RankingView>('players');
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  const locale = language === 'it' ? 'it-IT' : 'en-US';
  const selectedArchive = useMemo(
    () => archives.find((archive) => archive.id === selectedArchiveId) ?? archives[0] ?? null,
    [archives, selectedArchiveId],
  );
  const highlights = selectedArchive ? getArenaSeasonArchiveHighlights(selectedArchive) : null;
  const entries = rankingView === 'players' ? highlights?.topPlayers ?? [] : highlights?.topDecks ?? [];

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-5">
      <Card className="phyrexian-panel overflow-hidden border-emerald-500/20 bg-card/65">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-emerald-500/5"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
              <CalendarClock className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-foreground">
                {t({ it: 'Stagioni precedenti', en: 'Previous seasons' })}
              </span>
              <span className="block text-xs text-muted-foreground">
                {archives.length > 0
                  ? t({ it: `${archives.length} archiviate · classifiche con almeno 5 partite`, en: `${archives.length} archived · rankings with at least 5 games` })
                  : t({ it: 'Nessuna stagione ancora archiviata', en: 'No archived seasons yet' })}
              </span>
            </span>
            <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="border-t border-border/60 p-4">
            {!selectedArchive || !highlights ? (
              <p className="py-5 text-center text-sm text-muted-foreground">
                {t({ it: 'Le classifiche appariranno alla conclusione della prima season.', en: 'Rankings will appear after the first season ends.' })}
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {archives.map((archive) => (
                      <button
                        key={archive.id}
                        type="button"
                        onClick={() => setSelectedArchiveId(archive.id)}
                        className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                          archive.id === selectedArchive.id
                            ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                            : 'border-border/70 bg-background/30 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {formatArenaSeasonLabel(archive.seasonStart, archive.seasonEnd, locale)}
                      </button>
                    ))}
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {Number(selectedArchive.summary.totalMatches ?? 0)} {t({ it: 'partite', en: 'games' })}
                    {' · '}{Number(selectedArchive.summary.matches?.draws ?? 0)} {t({ it: 'pareggi', en: 'draws' })}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-background/35 p-1">
                  {([
                    { value: 'players' as const, label: t({ it: 'Top 10 giocatori', en: 'Top 10 players' }), icon: Users },
                    { value: 'decks' as const, label: t({ it: 'Top 10 mazzi', en: 'Top 10 decks' }), icon: Swords },
                  ]).map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRankingView(value)}
                      className={`flex min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        rankingView === value ? 'bg-emerald-500/15 text-emerald-300' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>

                {entries.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {t({ it: 'Nessun risultato raggiunge ancora il minimo di 5 partite.', en: 'No result has reached the 5-game minimum.' })}
                  </p>
                ) : (
                  <ol className="grid gap-2 lg:grid-cols-2">
                    {entries.map((entry, index) => {
                      const record = getArenaSeasonRecord(entry);
                      const title = rankingView === 'players'
                        ? ('display_name' in entry ? entry.display_name : null)
                        : ('deck_name' in entry ? entry.deck_name : null);
                      const subtitle = rankingView === 'decks' && 'commander' in entry ? entry.commander : null;
                      return (
                        <li key={`${rankingView}-${title ?? index}-${index}`} className="relative overflow-hidden rounded-xl border border-border/60 bg-background/30 px-3 py-2.5">
                          <span className="absolute inset-y-0 left-0 bg-emerald-500/10" style={{ width: `${record.winRate}%` }} />
                          <div className="relative flex items-center gap-3">
                            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-xs font-bold ${
                              index < 3 ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200' : 'border-border/70 text-muted-foreground'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-foreground">
                                {title || t({ it: rankingView === 'players' ? 'Giocatore' : 'Mazzo', en: rankingView === 'players' ? 'Player' : 'Deck' })}
                              </span>
                              {subtitle ? <span className="block truncate text-xs text-muted-foreground">{subtitle}</span> : null}
                            </span>
                            <span className="shrink-0 text-right tabular-nums">
                              <span className="block text-sm font-bold text-emerald-300">{record.winRate}%</span>
                              <span className="block text-[11px] text-muted-foreground">{record.wins}W / {record.losses}L</span>
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
                <p className="text-center text-[11px] text-muted-foreground">
                  {t({ it: `Classifica per win rate · minimo ${ARENA_SEASON_RANKING_MIN_GAMES} partite`, en: `Ranked by win rate · minimum ${ARENA_SEASON_RANKING_MIN_GAMES} games` })}
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
