import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

type DeckExternalLinkTone = 'violet' | 'blue' | 'purple';

const toneStyles: Record<DeckExternalLinkTone, string> = {
  violet: 'border-violet-500/25 bg-violet-500/10 text-violet-100 hover:border-violet-400/40 hover:bg-violet-500/15',
  blue: 'border-blue-500/25 bg-blue-500/10 text-blue-100 hover:border-blue-400/40 hover:bg-blue-500/15',
  purple: 'border-purple-500/25 bg-purple-500/10 text-purple-100 hover:border-purple-400/40 hover:bg-purple-500/15',
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
  tone = 'violet',
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