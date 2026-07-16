'use client';

import { buildLiveGameRecap } from '@/lib/live-game-recap';
import type { LiveGameRecord } from '@/lib/live-game';

const COLORS = ['#a78bfa', '#22d3ee', '#fb7185', '#fbbf24', '#4ade80', '#f472b6'];

function buildPath(values: number[]) {
  if (!values.length) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(1, max - min);
  return values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 300;
    const y = 68 - ((value - min) / spread) * 56;
    return `${index ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

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
          {recap.players.map((player, index) => {
            const values = player.timeline.map((point) => point.life);
            return (
              <div key={player.participantKey} className="grid grid-cols-[minmax(90px,1fr)_2fr_42px] items-center gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground">{player.displayName}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{player.commander}</p>
                </div>
                <svg viewBox="0 0 300 80" preserveAspectRatio="none" className="h-16 w-full overflow-visible" role="img" aria-label={`${player.displayName}: ${values.join(', ')}`}>
                  <path d="M 0 68 L 300 68" stroke="rgba(255,255,255,.08)" strokeWidth="1" />
                  <path d={buildPath(values)} fill="none" stroke={COLORS[index % COLORS.length]} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </svg>
                <span className="text-right text-lg font-black" style={{ color: COLORS[index % COLORS.length] }}>{player.finalLife}</span>
              </div>
            );
          })}
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
