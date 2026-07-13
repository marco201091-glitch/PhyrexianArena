export const ANALYTICS_EXCLUDED_USERNAMES = new Set(['usertest', 'administrator', 'demo']);

export function isExcludedAnalyticsUsername(username: string | null | undefined) {
  if (!username) return false;
  return ANALYTICS_EXCLUDED_USERNAMES.has(username.trim().toLowerCase());
}