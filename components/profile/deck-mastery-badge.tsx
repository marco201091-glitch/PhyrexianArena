'use client';

import { getDeckMastery, getDeckMasteryLabel } from '@/lib/deck-mastery';
import { useLanguage } from '@/components/language-provider';

export function DeckMasteryBadge({
  gamesPlayed = 0,
  wins = 0,
  compact = false,
}: {
  gamesPlayed?: number;
  wins?: number;
  compact?: boolean;
}) {
  const { language } = useLanguage();
  const mastery = getDeckMastery(gamesPlayed, wins);
  const label = getDeckMasteryLabel(mastery.tier, language);
  const progressDegrees = Math.round(mastery.progress * 360);
  const progressLabel = mastery.complete
    ? `${mastery.points} pt`
    : `${mastery.points}/${mastery.nextTarget} pt`;
  const scoringLabel = language === 'it'
    ? '3 pt vittoria / 1 pt altra partita'
    : '3 pts win / 1 pt other game';

  return (
    <div
      className="flex shrink-0 items-center gap-2"
      title={`${label} · ${progressLabel} · ${scoringLabel}`}
      aria-label={`${label}, ${progressLabel}`}
    >
      <div
        className={`${compact ? 'h-12 w-12' : 'h-16 w-16'} rounded-full p-[4px] shadow-[0_0_18px_rgba(0,0,0,0.45)]`}
        style={{
          background: `conic-gradient(${mastery.color} ${progressDegrees}deg, rgba(255,255,255,0.14) ${progressDegrees}deg)`,
        }}
      >
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-white/10 bg-black/80">
          <span className={`${compact ? 'text-sm' : 'text-base'} font-black leading-none text-white`}>
            {mastery.points}
          </span>
          <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-white/65">PT</span>
        </div>
      </div>
      {!compact ? (
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: mastery.color }}>
            {label}
          </p>
          <p className="mt-0.5 text-[10px] text-white/65">{progressLabel}</p>
        </div>
      ) : null}
    </div>
  );
}
