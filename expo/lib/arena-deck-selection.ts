type SelectableDeck = { id: string };

export function getPreferredDeckId(
  deckOptions: SelectableDeck[],
  lastDeckId: string | null | undefined,
): string | null {
  if (deckOptions.length === 1) return deckOptions[0].id;
  if (lastDeckId && deckOptions.some((deck) => deck.id === lastDeckId)) return lastDeckId;
  return null;
}
