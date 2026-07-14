import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ManaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  layout?: 'horizontal' | 'stacked';
  subtitle?: string;
}

export function ManaLogo({ size = 'md', className, showText = false, layout = 'horizontal', subtitle }: ManaLogoProps) {
  const sizes = {
    sm: { img: 'h-9 w-8', stackedImg: 'h-16 w-16', gap: 'gap-2', wordmark: 'h-9 w-28 sm:h-10 sm:w-36', stackedWordmark: 'h-16 w-60', subtitle: 'text-[0.52rem]' },
    md: { img: 'h-11 w-10', stackedImg: 'h-20 w-20', gap: 'gap-3', wordmark: 'h-12 w-44', stackedWordmark: 'h-20 w-72', subtitle: 'text-[0.6rem]' },
    lg: { img: 'h-16 w-14', stackedImg: 'h-24 w-24', gap: 'gap-3', wordmark: 'h-16 w-64', stackedWordmark: 'h-28 w-[28rem]', subtitle: 'text-[0.6rem]' },
    xl: { img: 'h-20 w-[4.5rem]', stackedImg: 'h-28 w-28 sm:h-32 sm:w-32', gap: 'gap-4', wordmark: 'h-20 w-80', stackedWordmark: 'h-28 w-[38rem] max-w-[calc(100vw-2rem)] scale-110 sm:scale-125', subtitle: 'text-[0.56rem]' },
  };

  const s = sizes[size];
  const isStacked = layout === 'stacked';

  return (
    <div className={cn('flex items-center', isStacked ? 'flex-col gap-3 text-center' : s.gap, className)}>
      <div className={cn('relative flex-shrink-0', isStacked ? s.stackedImg : s.img)}>
        <Image
          src="/logo-transparent.png"
          alt="Phyrexian Arena"
          fill
          className="object-contain drop-shadow-lg"
          sizes="80px"
          priority
        />
      </div>
      {showText && (
        <div className={cn('flex min-w-0 flex-col items-center', isStacked ? 'gap-1' : 'items-start')}>
          <div className={cn('relative flex-shrink-0 origin-center', isStacked ? s.stackedWordmark : s.wordmark)}>
            <Image
              src="/logo-wordmark.png"
              alt="Phyrexian Arena"
              fill
              className={cn(
                'object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.16)]',
                isStacked ? 'object-center' : 'object-left'
              )}
              sizes={isStacked ? '416px' : '320px'}
              priority
            />
          </div>
          {subtitle && (
            <span
              style={{ fontFamily: 'var(--font-cinzel)' }}
              className={cn('font-bold uppercase tracking-[0.24em] text-white/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.14)]', s.subtitle)}
            >
              {subtitle}
            </span>
          )}
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
        alt="Phyrexian Arena"
        fill
        className="object-contain"
        sizes="40px"
      />
    </div>
  );
}
