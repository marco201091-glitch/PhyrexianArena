import { describe, expect, it } from 'vitest';
import {
  MAX_PERSISTENT_IMAGE_BYTES,
  MAX_PERSISTENT_IMAGE_FILES,
  selectPersistentImageCacheVictims,
} from '@/lib/deck-image-cache-policy';

describe('persistent art cache policy', () => {
  it('keeps cache indefinitely while both limits are respected', () => {
    expect(selectPersistentImageCacheVictims([
      { uri: 'a', modifiedAt: 1, size: 1024 },
    ], {})).toEqual([]);
  });

  it('evicts least recently used files until count is safe', () => {
    const entries = Array.from({ length: MAX_PERSISTENT_IMAGE_FILES + 2 }, (_, index) => ({
      uri: String(index),
      modifiedAt: index,
      size: 1,
    }));
    expect(selectPersistentImageCacheVictims(entries, { 0: 99_999 })).toEqual(['1', '2']);
  });

  it('enforces the byte budget even below the file limit', () => {
    const half = Math.ceil(MAX_PERSISTENT_IMAGE_BYTES / 2) + 1;
    expect(selectPersistentImageCacheVictims([
      { uri: 'old', modifiedAt: 1, size: half },
      { uri: 'new', modifiedAt: 2, size: half },
    ], {})).toEqual(['old']);
  });
});
