import { describe, expect, it } from 'vitest';
import { collectDeckImageUrls } from '@/lib/deck-image-urls';
import type { ProfileDeck } from '@/lib/types/profile';

describe('deck-image-cache', () => {
  it('collects commander and option image urls from profile decks', () => {
    const decks: ProfileDeck[] = [
      {
        id: '1',
        user_id: 'u1',
        group_id: null,
        name: 'Deck A',
        commander: 'Atraxa',
        commander_image: 'https://example.com/a.jpg',
        source_url: null,
        source_type: 'manual',
        bracket: null,
        color_identity: ['W'],
        commander_options: [
          { name: 'Partner', imageUrl: 'https://example.com/p.jpg', colorIdentity: ['U'] },
        ],
        commander_cmc: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ];

    expect(collectDeckImageUrls(decks)).toEqual([
      'https://example.com/a.jpg',
      'https://example.com/p.jpg',
    ]);
  });
});