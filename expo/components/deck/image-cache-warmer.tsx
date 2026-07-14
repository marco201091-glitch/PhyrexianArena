import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { initDeckImageCache } from '@/lib/deck-image-cache';
import { scheduleWarmUserImageCache } from '@/lib/deck-image-warm-cache';

export function ImageCacheWarmer() {
  const { user, loading } = useAuth();

  useEffect(() => {
    void initDeckImageCache();
  }, []);

  useEffect(() => {
    if (loading || !user?.id) return;
    scheduleWarmUserImageCache(user.id);
  }, [loading, user?.id]);

  return null;
}