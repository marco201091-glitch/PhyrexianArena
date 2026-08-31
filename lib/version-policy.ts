export type ClientSupportState = 'supported' | 'update_available' | 'unsupported';

function numericVersionParts(value: string) {
  return value.trim().replace(/^v/i, '').split('.').slice(0, 3).map((part) => {
    const match = /^\d+/.exec(part);
    return match ? Number(match[0]) : 0;
  });
}

export function compareAppVersions(left: string, right: string) {
  const a = numericVersionParts(left);
  const b = numericVersionParts(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference > 0 ? 1 : -1;
  }
  return 0;
}

export function getClientSupportState(
  currentVersion: string,
  minimumSupportedVersion: string,
  recommendedVersion: string,
): ClientSupportState {
  if (compareAppVersions(currentVersion, minimumSupportedVersion) < 0) return 'unsupported';
  if (compareAppVersions(currentVersion, recommendedVersion) < 0) return 'update_available';
  return 'supported';
}
