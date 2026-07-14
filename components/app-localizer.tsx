'use client';

import { useEffect } from 'react';
import { LanguageSwitcher } from '@/components/language-switcher';

function handleImageError(event: Event) {
  const image = event.target as HTMLImageElement;
  if (image.dataset.deckImage === 'true') return;
  if (image.dataset.fallbackApplied === 'true' || image.src.endsWith('/logo-transparent.png')) return;

  image.dataset.fallbackApplied = 'true';
  image.src = '/logo-transparent.png';
  image.classList.remove('object-cover');
  image.classList.add('object-contain', 'p-2');
}

export function AppLocalizer() {
  useEffect(() => {
    document.addEventListener('error', handleImageError, true);
    return () => document.removeEventListener('error', handleImageError, true);
  }, []);

  return (
    <div
      data-no-localize
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[60]"
    >
      <LanguageSwitcher />
    </div>
  );
}
