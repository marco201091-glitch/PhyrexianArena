import { beforeEach, describe, expect, it, vi } from 'vitest';

const getInfoAsync = vi.hoisted(() => vi.fn());
const loadAsync = vi.hoisted(() => vi.fn());

vi.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///cache/', getInfoAsync,
  makeDirectoryAsync: vi.fn(), readAsStringAsync: vi.fn(), writeAsStringAsync: vi.fn(),
  deleteAsync: vi.fn(), moveAsync: vi.fn(), downloadAsync: vi.fn(),
}));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-image', () => ({ Image: { loadAsync } }));
vi.mock('@/lib/commander-arts', () => ({ fetchCommanderArtOptions: vi.fn() }));

import { splitCommanderNames, validateDeckImageCacheEntry } from '@/lib/deck-image-cache';

describe('deck image cache validation', () => {
  beforeEach(() => {
    getInfoAsync.mockReset();
    loadAsync.mockReset();
  });

  it('splits partner labels and ignores empty or one-character fragments', () => {
    expect(splitCommanderNames(' Tymna // Kraum // X // ')).toEqual(['Tymna', 'Kraum']);
  });

  it('accepts remote image URIs without filesystem checks', async () => {
    expect(await validateDeckImageCacheEntry('https://remote/image.jpg', 'https://cdn/cached.jpg')).toBe('valid');
    expect(getInfoAsync).not.toHaveBeenCalled();
  });

  it('rejects missing, tiny, and undecodable cache files', async () => {
    getInfoAsync.mockResolvedValueOnce({ exists: false });
    expect(await validateDeckImageCacheEntry('https://remote/image.jpg', 'file:///cache/a.jpg')).toBe('cache-invalid');
    getInfoAsync.mockResolvedValueOnce({ exists: true, size: 100 });
    expect(await validateDeckImageCacheEntry('https://remote/image.jpg', 'file:///cache/a.jpg')).toBe('cache-invalid');
    getInfoAsync.mockResolvedValueOnce({ exists: true, size: 1000 });
    loadAsync.mockRejectedValueOnce(new Error('decode failed'));
    expect(await validateDeckImageCacheEntry('https://remote/image.jpg', 'file:///cache/a.jpg')).toBe('cache-invalid');
  });

  it('keeps a decoded local image without re-downloading it', async () => {
    const release = vi.fn();
    getInfoAsync.mockResolvedValue({ exists: true, size: 1000 });
    loadAsync.mockResolvedValue({ width: 100, height: 100, release });
    expect(await validateDeckImageCacheEntry('https://remote/a.jpg', 'file:///cache/a.jpg')).toBe('valid');
    expect(release).toHaveBeenCalledTimes(1);
  });
});
