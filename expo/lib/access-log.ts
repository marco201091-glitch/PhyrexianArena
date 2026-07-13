import type { User } from '@supabase/supabase-js';

export type AccessLogSource = 'web' | 'app';

export const ACCESS_LOG_DEDUP_WINDOW_MS = 60 * 60 * 1000;

const EXCLUDED_USERNAMES = new Set(['usertest', 'administrator']);

const configuredAdminEmails = (process.env.EXPO_PUBLIC_PLATFORM_ADMIN_EMAILS ?? '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

function isAdministrator(user: Pick<User, 'email'> | null | undefined) {
  if (!user || configuredAdminEmails.length === 0) return false;

  const email = typeof user.email === 'string' ? user.email.toLowerCase() : '';
  return configuredAdminEmails.includes(email);
}

export function shouldSkipAccessLog(user: User | null | undefined) {
  if (!user) return true;
  if (isAdministrator(user)) return true;

  const username = typeof user.user_metadata?.username === 'string'
    ? user.user_metadata.username.trim().toLowerCase()
    : '';

  return EXCLUDED_USERNAMES.has(username);
}

export function getAccessLogSessionKey(userId: string, source: AccessLogSource = 'app') {
  return `access-log:${userId}:${source}`;
}