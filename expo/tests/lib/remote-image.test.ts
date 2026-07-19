import { describe, expect, it } from 'vitest';
import { getRemoteImageHeaders } from '@/lib/remote-image';

describe('remote image request headers', () => {
  it('identifies the app when loading Scryfall card images', () => {
    expect(getRemoteImageHeaders('https://cards.scryfall.io/large/front/a/b/card.jpg')).toEqual({
      Accept: 'image/*',
      'User-Agent': 'Phyrexian Arena Mobile (https://phyrexianarena.app)',
    });
  });

  it('does not attach Scryfall headers to avatars or unrelated hosts', () => {
    expect(getRemoteImageHeaders('https://example.supabase.co/storage/v1/object/public/avatars/a.jpg'))
      .toBeUndefined();
  });
});
