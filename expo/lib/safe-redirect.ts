export function getSafeRedirectPath(
  value: string | null | undefined,
  fallback = '/(tabs)',
): string {
  if (!value) return fallback;

  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback;
  }

  if (!/^\/[A-Za-z0-9_./()%-]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}