export function parseStoredCommanderCmc(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function buildAverageStoredCommanderCmc(
  decks: Array<{ commander_cmc?: number | string | null }>,
): number | null {
  const values = decks
    .map((deck) => parseStoredCommanderCmc(deck.commander_cmc))
    .filter((value): value is number => value != null);

  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}