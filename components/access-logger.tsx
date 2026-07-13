'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
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

    const storageKey = getAccessLogSessionKey(user.id, 'web');

    try {
      const lastRecordedAt = Number(sessionStorage.getItem(storageKey) || '0');
      if (lastRecordedAt > 0 && Date.now() - lastRecordedAt < ACCESS_LOG_DEDUP_WINDOW_MS) {
        return;
      }
    } catch {
      // sessionStorage may be unavailable in private mode.
    }

    void fetch('/api/access-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'web' }),
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ recorded?: boolean }>;
      })
      .then((payload) => {
        if (!payload?.recorded) return;

        try {
          sessionStorage.setItem(storageKey, String(Date.now()));
        } catch {
          // Ignore storage failures.
        }
      })
      .catch(() => undefined);
  }, [loading, user]);

  return null;
}