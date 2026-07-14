export function resolveArchidektFaceIndex(
  names: string[],
  faces: Array<{ name?: string | null }>,
  commanderName: string,
): number {
  const normalized = commanderName.trim().toLowerCase();

  for (let index = 0; index < faces.length; index += 1) {
    const faceName = faces[index]?.name;
    if (faceName && faceName.trim().toLowerCase() === normalized) {
      return index;
    }
  }

  for (const name of names) {
    const parts = name
      .split('//')
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);

    if (parts.length <= 1) continue;

    const partIndex = parts.indexOf(normalized);
    if (partIndex >= 0) {
      return partIndex < faces.length ? partIndex : 0;
    }
  }

  return 0;
}