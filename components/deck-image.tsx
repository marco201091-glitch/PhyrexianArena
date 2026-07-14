'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Swords } from 'lucide-react';
import { isOptimizableDeckImageUrl } from '@/lib/deck-image-url';
import { cn } from '@/lib/utils';

interface DeckImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export function DeckImage({ src, alt, className, fallbackClassName }: DeckImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={cn('bg-secondary flex items-center justify-center rounded', fallbackClassName || className)}>
        <Swords className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={160}
      height={160}
      className={className}
      data-deck-image="true"
      unoptimized={!isOptimizableDeckImageUrl(src)}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
