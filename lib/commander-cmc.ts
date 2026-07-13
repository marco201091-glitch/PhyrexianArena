import type { ScryfallCard } from '@/lib/scryfall';

type ScryfallCardFace = NonNullable<ScryfallCard['card_faces']>[number] & {
  cmc?: number;
  mana_cost?: string;
};

export type ScryfallCardWithCmc = ScryfallCard & {
  card_faces?: ScryfallCardFace[];
  mana_cost?: string;
  object?: string;
};

export function isScryfallError(value: unknown): value is { object: 'error' } {
  return Boolean(value && typeof value === 'object' && (value as { object?: string }).object === 'error');
}

function parseManaCostCmc(manaCost: string | undefined) {
  if (!manaCost) return null;

  const symbols = manaCost.match(/\{[^}]+\}/g);
  if (!symbols || symbols.length === 0) return 0;

  let total = 0;
  for (const symbol of symbols) {
    const inner = symbol.slice(1, -1);
    const numeric = Number.parseFloat(inner);
    if (Number.isFinite(numeric)) {
      total += numeric;
      continue;
    }
    if (inner === 'P') continue;
    total += 1;
  }

  return total;
}

function extractFaceCmc(face: ScryfallCardFace) {
  if (typeof face.cmc === 'number' && Number.isFinite(face.cmc)) {
    return face.cmc;
  }
  return parseManaCostCmc(face.mana_cost);
}

export function extractCardCmc(card: ScryfallCardWithCmc, preferredName?: string) {
  const normalizedPreferred = preferredName?.trim().toLowerCase();

  if (normalizedPreferred && card.card_faces?.length) {
    const matchingFace = card.card_faces.find(
      (face) => face.name.trim().toLowerCase() === normalizedPreferred,
    );
    if (matchingFace) {
      const faceCmc = extractFaceCmc(matchingFace);
      if (faceCmc != null) return faceCmc;
    }
  }

  if (typeof card.cmc === 'number' && Number.isFinite(card.cmc)) {
    return card.cmc;
  }

  return parseManaCostCmc(card.mana_cost);
}

export function resolveCommanderCmcFromCard(card: ScryfallCardWithCmc | null, commanderName: string) {
  if (!card || isScryfallError(card)) return null;
  return extractCardCmc(card, commanderName);
}