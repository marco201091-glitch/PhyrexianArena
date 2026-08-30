import { useEffect } from 'react';
import { initDeckImageCache } from '@/lib/deck-image-cache';

export function ImageCacheWarmer() {
  useEffect(() => {
    void initDeckImageCache();
  }, []);

  return null;
}
