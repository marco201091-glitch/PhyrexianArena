export function matchesLiveGameDeckSearch(
  deck: { name: string; commander: string },
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;
  return `${deck.name} ${deck.commander}`.toLocaleLowerCase().includes(normalizedQuery);
}
