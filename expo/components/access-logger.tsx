import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiPost } from '@/lib/api';
import {
  ACCESS_LOG_DEDUP_WINDOW_MS,
  getAccessLogSessionKey,
  shouldSkipAccessLog,
} from '@/lib/access-log';

export function AccessLogger() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user || shouldSkipAccessLog(user)) {
      return;
    }

    const storageKey = getAccessLogSessionKey(user.id, 'app');

    void (async () => {
      try {
        const lastRecordedAt = Number(await AsyncStorage.getItem(storageKey) || '0');
        if (lastRecordedAt > 0 && Date.now() - lastRecordedAt < ACCESS_LOG_DEDUP_WINDOW_MS) {
          return;
        }
      } catch {
        // Ignore storage failures.
      }

      const { data, status } = await apiPost<{ recorded?: boolean }>('/api/access-log', { source: 'app' });
      if (status >= 400 || !data?.recorded) return;

      try {
        await AsyncStorage.setItem(storageKey, String(Date.now()));
      } catch {
        // Ignore storage failures.
      }
    })();
  }, [loading, user]);

  return null;
}