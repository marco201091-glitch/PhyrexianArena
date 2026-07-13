const NATIVE_USER_AGENT_TOKEN = 'PhyrexianArenaNative';

export function isNativeApp(userAgent?: string | null): boolean {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  return ua.includes(NATIVE_USER_AGENT_TOKEN);
}