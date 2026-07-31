import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

type DeckExternalLinkTone = 'emerald' | 'blue' | 'teal';

const toneStyles: Record<DeckExternalLinkTone, string> = {
  emerald: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400/40 hover:bg-emerald-500/15',
  blue: 'border-blue-500/25 bg-blue-500/10 text-blue-100 hover:border-blue-400/40 hover:bg-blue-500/15',
  teal: 'border-teal-500/25 bg-teal-500/10 text-teal-100 hover:border-teal-400/40 hover:bg-teal-500/15',
};

interface DeckExternalLinkChipProps {
  href: string;
  label: string;
  tone?: DeckExternalLinkTone;
  className?: string;
}

export function DeckExternalLinkChip({
  href,
  label,
  tone = 'emerald',
  className,
}: DeckExternalLinkChipProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex w-full min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors sm:w-auto',
        toneStyles[tone],
        className,
      )}
    >
      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  );
}