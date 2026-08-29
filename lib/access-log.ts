import type { User } from '@supabase/supabase-js';
import { isAdministrator } from '@/lib/admin';

export type AccessLogSource = 'web' | 'app';

export const ACCESS_LOG_DEDUP_WINDOW_MS = 60 * 60 * 1000;
export const ACCESS_LOG_RETENTION_DAYS = 30;

const EXCLUDED_USERNAMES = new Set(['usertest', 'administrator']);

export function shouldSkipAccessLog(user: User | null | undefined) {
  if (!user) return true;
  if (isAdministrator(user)) return true;

  const username = typeof user.user_metadata?.username === 'string'
    ? user.user_metadata.username.trim().toLowerCase()
    : '';

  return EXCLUDED_USERNAMES.has(username);
}

export function normalizeAccessLogSource(value: unknown): AccessLogSource {
  return typeof value === 'string' && value.trim().toLowerCase() === 'app' ? 'app' : 'web';
}

const APP_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[+-][0-9A-Za-z.-]+)?$/;

export function normalizeAccessLogAppVersion(value: unknown, source: AccessLogSource): string | null {
  if (source !== 'app' || typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length <= 32 && APP_VERSION_PATTERN.test(normalized) ? normalized : null;
}

export function getAccessLogSessionKey(userId: string, source: AccessLogSource = 'web') {
  return `access-log:${userId}:${source}`;
}
