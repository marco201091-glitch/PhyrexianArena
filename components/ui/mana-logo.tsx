import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ManaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  layout?: 'horizontal' | 'stacked';
  title?: string;
  subtitle?: string;
}

export function ManaLogo({ size = 'md', className, showText = false, layout = 'horizontal', title, subtitle }: ManaLogoProps) {
  const sizes = {
    sm: { img: 'h-9 w-9', stackedImg: 'h-16 w-16', gap: 'gap-2', title: 'text-sm', stackedTitle: 'text-lg', subtitle: 'text-[0.52rem]' },
    md: { img: 'h-11 w-11', stackedImg: 'h-20 w-20', gap: 'gap-3', title: 'text-base', stackedTitle: 'text-xl', subtitle: 'text-[0.6rem]' },
    lg: { img: 'h-16 w-16', stackedImg: 'h-24 w-24', gap: 'gap-3', title: 'text-xl', stackedTitle: 'text-2xl', subtitle: 'text-[0.6rem]' },
    xl: { img: 'h-20 w-20', stackedImg: 'h-32 w-32 sm:h-36 sm:w-36', gap: 'gap-4', title: 'text-2xl', stackedTitle: 'text-3xl sm:text-4xl', subtitle: 'text-[0.7rem]' },
  };

  const s = sizes[size];
  const isStacked = layout === 'stacked';
  const primaryText = title ?? subtitle ?? 'Tracker & Analytics';
  const secondaryText = title ? subtitle : undefined;

  return (
    <div className={cn('flex items-center', isStacked ? 'flex-col gap-3 text-center' : s.gap, className)}>
      <div className={cn('relative flex-shrink-0', isStacked ? s.stackedImg : s.img)}>
        <Image
          src="/logo-transparent.png"
          alt={showText ? '' : primaryText}
          fill
          className="object-contain drop-shadow-lg"
          sizes="80px"
          priority
        />
      </div>
      {showText && (
        <div className={cn('flex min-w-0 flex-col items-center', isStacked ? 'gap-1' : 'items-start')}>
          <span
            style={{ fontFamily: 'var(--font-cinzel)' }}
            className={cn(
              'font-bold tracking-[0.11em] text-white drop-shadow-[0_0_18px_rgba(66,159,74,0.28)]',
              !title && 'uppercase',
              isStacked ? s.stackedTitle : s.title,
            )}
          >
            {primaryText}
          </span>
          {secondaryText ? (
            <span className={cn(
              'font-semibold uppercase tracking-[0.32em] text-emerald-300/90',
              s.subtitle,
            )}>
              {secondaryText}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function PhyrexianSymbol({ size = 'md', className }: Omit<ManaLogoProps, 'showText'>) {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
  };

  return (
    <div className={cn('relative flex-shrink-0', sizes[size], className)}>
      <Image
        src="/logo-transparent.png"
        alt="Tracker & Analytics"
        fill
        className="object-contain"
        sizes="40px"
      />
    </div>
  );
}
