'use client';

import { useLanguage } from '@/components/language-provider';
import { cn } from '@/lib/utils';

interface BracketBadgeProps {
  bracket: string | null | undefined;
  className?: string;
}

export function BracketBadge({ bracket, className }: BracketBadgeProps) {
  const { copy: t } = useLanguage();

  if (!bracket) return null;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs bg-emerald-500/15 text-emerald-300',
        className,
      )}
    >
      {t({ it: 'Bracket', en: 'Bracket' })} {bracket}
    </span>
  );
}