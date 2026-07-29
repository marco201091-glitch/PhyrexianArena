'use client';

import { buildLiveGameRecap } from '@/lib/live-game-recap';
import type { LiveGameRecord } from '@/lib/live-game';

const COLORS = ['#72d17b', '#22d3ee', '#fb7185', '#fbbf24', '#4ade80', '#f472b6'];

export function LiveGameRecapView({
  record,
  labels,
}: {
  record: LiveGameRecord;
  labels: { timeline: string; highlights: string; empty: string };
}) {
  const recap = buildLiveGameRecap(record);
  return (
    <section className="space-y-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
      <div>
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">{labels.timeline}</h3>
        <div className="mt-3 space-y-3">
          {recap.players.map((player, index) => (
              <div key={player.participantKey} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground">{player.displayName}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{player.commander}</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  {player.finalInfect > 0 ? <span className="text-xs font-bold text-emerald-300">☠ {player.finalInfect}</span> : null}
                  <span className="text-right text-lg font-black" style={{ color: COLORS[index % COLORS.length] }}>{player.finalLife}</span>
                </div>
              </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-violet-200">{labels.highlights}</h3>
        {recap.highlights.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {recap.highlights.map((event) => {
              const target = recap.players.find((player) => player.participantKey === event.targetKey);
              return <span key={event.id} className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-muted-foreground">{target?.displayName ?? event.targetKey} · {event.type.replace('_', ' ')}</span>;
            })}
          </div>
        ) : <p className="mt-2 text-xs text-muted-foreground">{labels.empty}</p>}
      </div>
    </section>
  );
}
