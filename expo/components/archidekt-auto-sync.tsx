import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { runArchidektAutoSync } from '@/lib/archidekt-auto-sync';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

export function ArchidektAutoSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let active = true;

    const sync = () => {
      if (!active) return;
      void runArchidektAutoSync(user.id)
        .then((result) => {
          if (result.inserted > 0 || result.updated > 0 || result.skipped > 0) {
            console.info('Archidekt background sync completed', result);
          }
        })
        .catch((error) => {
          console.warn(
            'Archidekt background sync failed',
            error instanceof Error ? error.message : error,
          );
        });
    };

    sync();
    const interval = setInterval(sync, CHECK_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });

    return () => {
      active = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, [user]);

  return null;
}
