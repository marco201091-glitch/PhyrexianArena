'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function RecentLifeDelta({ life, className }: { life: number; className?: string }) {
  const previousLife = useRef(life);
  const timer = useRef<number | null>(null);
  const [delta, setDelta] = useState(0);

  useEffect(() => {
    const change = life - previousLife.current;
    previousLife.current = life;
    if (change === 0) return;

    setDelta((current) => current + change);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setDelta(0);
    }, 2_600);

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [life]);

  if (delta === 0) return null;

  return (
    <span
      aria-live="polite"
      className={cn(
        'pointer-events-none font-black tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,.95)]',
        delta < 0 ? 'text-red-400' : 'text-emerald-300',
        className,
      )}
    >
      {delta > 0 ? '+' : '−'}{Math.abs(delta)}
    </span>
  );
}
