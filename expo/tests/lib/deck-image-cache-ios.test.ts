import { describe, expect, it, vi } from 'vitest';

const downloadAsync = vi.hoisted(() => vi.fn());
const getInfoAsync = vi.hoisted(() => vi.fn());
const deleteAsync = vi.hoisted(() => vi.fn());
const moveAsync = vi.hoisted(() => vi.fn());
const prefetch = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const loadAsync = vi.hoisted(() => vi.fn());

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  cacheDirectory: 'file:///cache/',
  downloadAsync,
  getInfoAsync,
  makeDirectoryAsync: vi.fn().mockResolvedValue(undefined),
  readDirectoryAsync: vi.fn().mockResolvedValue([]),
  readAsStringAsync: vi.fn(),
  writeAsStringAsync: vi.fn().mockResolvedValue(undefined),
  deleteAsync,
  moveAsync,
}));
vi.mock('expo-image', () => ({ Image: { prefetch, loadAsync } }));
vi.mock('@/lib/commander-arts', () => ({ fetchCommanderArtOptions: vi.fn() }));

import {
  cacheRemoteDeckImage,
  resolveCachedRemoteImageUri,
} from '@/lib/deck-image-cache';

describe('iOS native image cache', () => {
  it('persists images in documents storage instead of an evictable cache', async () => {
    const url = 'https://cards.scryfall.io/art.jpg';
    getInfoAsync.mockImplementation(async (uri: string) => {
      if (uri.includes('.download-')) return { exists: true, size: 10_000 };
      return { exists: uri === 'file:///documents/deck-images/', size: 0 };
    });
    downloadAsync.mockResolvedValue({
      status: 200,
      uri: 'file:///documents/deck-images/art.img.download-1',
    });
    deleteAsync.mockResolvedValue(undefined);
    moveAsync.mockResolvedValue(undefined);
    loadAsync.mockResolvedValue({ width: 100, height: 100, release: vi.fn() });
    prefetch.mockResolvedValue(true);

    const resolved = await resolveCachedRemoteImageUri(url);
    expect(downloadAsync).toHaveBeenCalledTimes(1);
    expect(loadAsync).toHaveBeenCalled();
    expect(resolved).toMatch(/^file:\/\/\/documents\/deck-images\/.+\.img$/);
    expect(await cacheRemoteDeckImage(url, { background: true })).toBe(resolved);
    expect(prefetch).toHaveBeenCalledWith(resolved);
  });
});
