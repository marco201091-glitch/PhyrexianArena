'use client';

import { buildLiveGameRecap } from '@/lib/live-game-recap';
import { buildLiveGameRecapShareSvg } from '@/lib/live-game-recap-share';
import type { LiveGameRecord } from '@/lib/live-game';
import { Share2 } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

const COLORS = ['#72d17b', '#22d3ee', '#fb7185', '#fbbf24', '#4ade80', '#f472b6'];

export function LiveGameRecapView({
  record,
  labels,
}: {
  record: LiveGameRecord;
  labels: { timeline: string; highlights: string; empty: string };
}) {
  const { language } = useLanguage();
  const recap = buildLiveGameRecap(record);
  const shareRecap = async () => {
    const svg = buildLiveGameRecapShareSvg(record, language);
    const safeId = record.id.replace(/[^a-zA-Z0-9_-]/g, '-');
    const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
    const sourceUrl = URL.createObjectURL(svgBlob);
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to render recap'));
      image.src = sourceUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d')?.drawImage(image, 0, 0);
    URL.revokeObjectURL(sourceUrl);
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (
      blob ? resolve(blob) : reject(new Error('Unable to create recap image'))
    ), 'image/png'));
    const file = new File([png], `mtg-game-recap-${safeId}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: 'MTG Tracker & Analytics', files: [file] });
      return;
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  };
  const duration = recap.durationSeconds == null ? '—' : `${Math.floor(recap.durationSeconds / 60)}:${String(recap.durationSeconds % 60).padStart(2, '0')}`;
  return (
    <section className="space-y-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">⏱ {duration}</span>
        {recap.startingPlayerName ? <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">① {recap.startingPlayerName} · {recap.startingDirection === 'clockwise' ? '↻' : '↺'}</span> : null}
        <button type="button" onClick={() => void shareRecap().catch(() => undefined)} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 font-bold text-emerald-200"><Share2 className="h-3.5 w-3.5" />{language === 'it' ? 'Condividi' : 'Share'}</button>
      </div>
      <div>
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">{labels.timeline}</h3>
        <div className="mt-3 space-y-3">
          {recap.players.map((player, index) => (
              <div key={player.participantKey} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground">{player.displayName}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{player.commander}</p>
                  <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] font-semibold text-muted-foreground">
                    {player.damageDealt > 0 ? <span>⚔ {player.damageDealt}</span> : null}
                    {player.lifeGained > 0 ? <span>♥ +{player.lifeGained}</span> : null}
                    {player.eliminationsCaused > 0 ? <span>☠ {player.eliminationsCaused}</span> : null}
                    {player.commanderDamageDealt > 0 ? <span>CMD ⚔ {player.commanderDamageDealt}</span> : null}
                    {player.infectDealt > 0 ? <span>INF ⚔ {player.infectDealt}</span> : null}
                    {player.events > 0 ? <span>• {player.events}</span> : null}
                  </div>
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
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-emerald-200">{labels.highlights}</h3>
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
