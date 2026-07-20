import { describe, expect, it, vi } from 'vitest';

const downloadAsync = vi.hoisted(() => vi.fn());
const prefetch = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync,
  getInfoAsync: vi.fn(),
  makeDirectoryAsync: vi.fn(),
  readAsStringAsync: vi.fn(),
  writeAsStringAsync: vi.fn(),
  deleteAsync: vi.fn(),
  moveAsync: vi.fn(),
}));
vi.mock('expo-image', () => ({ Image: { prefetch, loadAsync: vi.fn() } }));
vi.mock('@/lib/commander-arts', () => ({ fetchCommanderArtOptions: vi.fn() }));

import {
  cacheRemoteDeckImage,
  resolveCachedRemoteImageUri,
} from '@/lib/deck-image-cache';

describe('iOS native image cache', () => {
  it('returns remote images immediately and leaves disk caching to expo-image', async () => {
    const url = 'https://cards.scryfall.io/art.jpg';
    prefetch.mockResolvedValue(true);

    expect(await resolveCachedRemoteImageUri(url)).toBe(url);
    expect(await cacheRemoteDeckImage(url, { background: true })).toBe(url);
    expect(downloadAsync).not.toHaveBeenCalled();
    expect(prefetch).toHaveBeenCalledWith(url, {
      cachePolicy: 'disk',
      headers: {
        Accept: 'image/*',
        'User-Agent': 'Phyrexian Arena Mobile (https://phyrexianarena.app)',
      },
    });
  });
});
