import { describe, expect, it } from 'vitest';
import { selectPersistentImageCacheVictims } from '@/lib/deck-image-cache-policy';

describe('deck image cache policy', () => {
  it('uses access time before file modification time', () => {
    expect(selectPersistentImageCacheVictims([
      { uri: 'recently-used', modifiedAt: 1, size: 500 * 1024 * 1024 },
      { uri: 'old', modifiedAt: 2, size: 500 * 1024 * 1024 },
    ], { 'recently-used': 3 })).toEqual(['old']);
  });
});
