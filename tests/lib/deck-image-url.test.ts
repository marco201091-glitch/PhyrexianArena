import { describe, expect, it } from 'vitest';
import { isOptimizableDeckImageUrl } from '@/lib/deck-image-url';

describe('deck-image-url', () => {
  it('allows Scryfall CDN images through Next image optimization', () => {
    expect(isOptimizableDeckImageUrl('https://cards.scryfall.io/display/front/a/b/card.webp')).toBe(true);
  });

  it('keeps unknown hosts on the unoptimized path', () => {
    expect(isOptimizableDeckImageUrl('https://cdn.example.com/art.jpg')).toBe(false);
    expect(isOptimizableDeckImageUrl('not-a-url')).toBe(false);
  });
});