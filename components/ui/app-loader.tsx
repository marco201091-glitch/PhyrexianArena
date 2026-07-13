import { ManaLogo } from '@/components/ui/mana-logo';
import { cn } from '@/lib/utils';

interface AppLoaderProps {
  label?: string;
  showText?: boolean;
  className?: string;
}

export function AppLoader({ label, showText = false, className }: AppLoaderProps) {
  return (
    <div className={cn('min-h-screen flex items-center justify-center p-4', className)}>
      <div className="flex w-full max-w-xs flex-col items-center gap-5 text-center" role="status" aria-label={label || 'Compleating'}>
        <ManaLogo size="lg" showText={showText} />
        <p
          style={{ fontFamily: 'var(--font-cinzel)' }}
          className="text-2xl font-bold uppercase tracking-[0.28em] text-white sm:text-3xl"
        >
          COMPLEATING...
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
          <div className="h-full w-1/2 animate-[phyrexian-loading_1.15s_ease-in-out_infinite] rounded-full bg-white" />
        </div>
        {label ? <p className="text-sm text-white/70">{label}</p> : null}
        {!showText ? <span className="sr-only">Phyrexian Arena</span> : null}
      </div>
    </div>
  );
}