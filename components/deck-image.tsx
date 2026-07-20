'use client';

import { useEffect, useState } from 'react';
import { Swords } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeckImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export function DeckImage({ src, alt, className, fallbackClassName }: DeckImageProps) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(false);

  useEffect(() => {
    setFailed(false);
    setRetry(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className={cn('bg-secondary flex items-center justify-center rounded', fallbackClassName || className)}>
        <Swords className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    // Direct remote loading keeps artwork in the device HTTP cache instead of
    // routing every view through the Next image optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={retry ? `${src}${src.includes('?') ? '&' : '?'}pa_retry=1` : src}
      alt={alt}
      className={className}
      data-deck-image="true"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (!retry) {
          setRetry(true);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
