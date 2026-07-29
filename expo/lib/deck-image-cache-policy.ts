export const MAX_PERSISTENT_IMAGE_FILES = 2_400;
export const MAX_PERSISTENT_IMAGE_BYTES = 768 * 1024 * 1024;

export type PersistentImageCacheEntry = {
  uri: string;
  modifiedAt: number;
  size: number;
};

export function selectPersistentImageCacheVictims(
  entries: PersistentImageCacheEntry[],
  accessed: Record<string, number>,
): string[] {
  let totalBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  let remainingFiles = entries.length;
  if (
    remainingFiles <= MAX_PERSISTENT_IMAGE_FILES
    && totalBytes <= MAX_PERSISTENT_IMAGE_BYTES
  ) return [];

  const oldestFirst = [...entries].sort((left, right) =>
    (accessed[left.uri] ?? left.modifiedAt) - (accessed[right.uri] ?? right.modifiedAt),
  );
  const victims: string[] = [];
  for (const entry of oldestFirst) {
    if (
      remainingFiles <= MAX_PERSISTENT_IMAGE_FILES
      && totalBytes <= MAX_PERSISTENT_IMAGE_BYTES
    ) break;
    victims.push(entry.uri);
    remainingFiles -= 1;
    totalBytes -= entry.size;
  }
  return victims;
}
