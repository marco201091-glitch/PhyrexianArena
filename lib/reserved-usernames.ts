export const RESERVED_USERNAMES = new Set([
  'administrator',
  'admin',
  'root',
  'support',
  'system',
  'phyrexianarena',
  'demo',
]);

export function isReservedUsername(username: string) {
  return RESERVED_USERNAMES.has(username.trim().toLowerCase());
}