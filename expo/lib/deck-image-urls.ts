import type { ProfileDeck } from '@/lib/types/profile';

export function collectDeckImageUrls(decks: ProfileDeck[]): string[] {
  return decks
    .flatMap((deck) => [
      deck.commander_image,
      ...(deck.commander_options || []).map((option) => option.imageUrl),
    ])
    .filter((url): url is string => Boolean(url?.trim()));
}

export function collectDeckCommanderNames(decks: ProfileDeck[]): string[] {
  return decks.flatMap((deck) => [
    deck.commander,
    ...(deck.commander_options || []).map((option) => option.name),
  ]);
}