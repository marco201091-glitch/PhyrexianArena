import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import { fetchCommanderArtOptions } from '@/lib/commander-arts';
import { collectDeckCommanderNames, collectDeckImageUrls } from '@/lib/deck-image-urls';
import type { ProfileDeck } from '@/lib/types/profile';

export { collectDeckCommanderNames, collectDeckImageUrls } from '@/lib/deck-image-urls';

const CACHE_DIR = `${FileSystem.cacheDirectory ?? ''}deck-images/`;
const MANIFEST_PATH = `${CACHE_DIR}manifest.json`;
const ON_DEMAND_CONCURRENCY = 6;
const BACKGROUND_CONCURRENCY = 12;
const MIN_CACHED_FILE_BYTES = 512;
const ARTS_PER_COMMANDER_PREFETCH = 8;
const REMOTE_VALIDATION_TIMEOUT_MS = 8_000;

type CacheManifest = {
  urls: Record<string, string>;
  names: Record<string, string>;
};

const downloadInflight = new Map<string, Promise<string>>();
const resolveInflight = new Map<string, Promise<string | null>>();
const artsInflight = new Map<string, Promise<string[]>>();

let manifest: CacheManifest = { urls: {}, names: {} };
let manifestReady = false;
let manifestPersistScheduled = false;
let initPromise: Promise<void> | null = null;

const memoryUriByRemote = new Map<string, string>();
const memoryUriByCommander = new Map<string, string>();

let onDemandActive = 0;
const onDemandWaiters: Array<() => void> = [];
let backgroundActive = 0;
const backgroundWaiters: Array<() => void> = [];

function hashKey(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function normalizeRemoteUrl(url: string): string {
  return url.trim();
}

function normalizeCommanderName(name: string): string {
  return name.trim().toLowerCase();
}

export function splitCommanderNames(commander: string): string[] {
  return commander
    .split(/\s*\/\/\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://');
}

async function isUsableLocalCacheFile(uri: string): Promise<boolean> {
  if (!isLocalUri(uri)) return true;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    const hasUsableSize = Boolean(
      info.exists &&
      (typeof info.size !== 'number' || info.size > MIN_CACHED_FILE_BYTES),
    );
    if (!hasUsableSize) return false;
    const imageRef = await Image.loadAsync(uri);
    try {
      return imageRef.width > 8 && imageRef.height > 8;
    } finally {
      imageRef.release();
    }
  } catch {
    return false;
  }
}

export type DeckImageCacheValidation = 'valid' | 'cache-invalid' | 'remote-invalid';

/**
 * Validate a cached image without making offline startup depend on the network.
 * A remote size mismatch catches interrupted downloads that can still be large
 * enough to look valid to the filesystem but render as a blank/black image.
 */
export async function validateDeckImageCacheEntry(
  remoteUrl: string | null | undefined,
  cachedUri: string,
): Promise<DeckImageCacheValidation> {
  if (!isLocalUri(cachedUri)) return 'valid';
  if (!(await isUsableLocalCacheFile(cachedUri))) return 'cache-invalid';

  const normalizedRemote = remoteUrl?.trim();
  if (!normalizedRemote || isLocalUri(normalizedRemote)) return 'valid';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_VALIDATION_TIMEOUT_MS);
  try {
    const response = await fetch(normalizedRemote, {
      method: 'HEAD',
      signal: controller.signal,
    });
    if (!response.ok) return 'remote-invalid';

    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.toLowerCase().startsWith('image/')) {
      return 'remote-invalid';
    }

    const expectedBytes = Number(response.headers.get('content-length'));
    if (Number.isFinite(expectedBytes) && expectedBytes > 0) {
      const info = await FileSystem.getInfoAsync(cachedUri);
      if (!info.exists || (typeof info.size === 'number' && info.size !== expectedBytes)) {
        return 'cache-invalid';
      }
    }

    return 'valid';
  } catch {
    // Preserve a decodable cached image when offline or when the CDN is slow.
    return 'valid';
  } finally {
    clearTimeout(timeout);
  }
}

export async function invalidateDeckImageCacheEntry(
  remoteUrl?: string | null,
  commanderName?: string,
  failedUri?: string | null,
): Promise<void> {
  await initDeckImageCache();

  const normalizedRemote = remoteUrl?.trim() || '';
  const normalizedName = commanderName?.trim().toLowerCase() || '';
  const localCandidates = new Set<string>();

  if (normalizedRemote) {
    const mapped = memoryUriByRemote.get(normalizedRemote) || manifest.urls[normalizedRemote];
    if (mapped) localCandidates.add(mapped);
    memoryUriByRemote.delete(normalizedRemote);
    delete manifest.urls[normalizedRemote];
  }

  if (normalizedName) {
    const mapped = memoryUriByCommander.get(normalizedName) || manifest.names[normalizedName];
    if (mapped) localCandidates.add(mapped);
    memoryUriByCommander.delete(normalizedName);
    delete manifest.names[normalizedName];
  }

  if (failedUri && isLocalUri(failedUri)) localCandidates.add(failedUri);

  for (const localUri of localCandidates) {
    if (!isLocalUri(localUri)) continue;
    try {
      const info = await FileSystem.getInfoAsync(localUri);
      if (info.exists) await FileSystem.deleteAsync(localUri, { idempotent: true });
    } catch {
      // A failed cache entry is already unusable; cleanup remains best effort.
    }
  }

  scheduleManifestPersist();
}

function rememberRemoteMapping(remoteUrl: string, localUri: string): void {
  const normalized = normalizeRemoteUrl(remoteUrl);
  memoryUriByRemote.set(normalized, localUri);
  manifest.urls[normalized] = localUri;
  scheduleManifestPersist();
}

function rememberCommanderMapping(commanderName: string, localUri: string): void {
  const normalized = normalizeCommanderName(commanderName);
  memoryUriByCommander.set(normalized, localUri);
  manifest.names[normalized] = localUri;
  scheduleManifestPersist();
}

function scheduleManifestPersist(): void {
  if (manifestPersistScheduled) return;
  manifestPersistScheduled = true;

  setTimeout(() => {
    manifestPersistScheduled = false;
    void persistManifest();
  }, 400);
}

async function persistManifest(): Promise<void> {
  if (!FileSystem.cacheDirectory) return;
  try {
    await ensureCacheDir();
    await FileSystem.writeAsStringAsync(MANIFEST_PATH, JSON.stringify(manifest));
  } catch {
    // Best effort.
  }
}

async function ensureCacheDir(): Promise<void> {
  if (!FileSystem.cacheDirectory) return;

  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

async function loadManifest(): Promise<void> {
  if (!FileSystem.cacheDirectory) {
    manifestReady = true;
    return;
  }

  try {
    await ensureCacheDir();
    const info = await FileSystem.getInfoAsync(MANIFEST_PATH);
    if (info.exists) {
      const raw = await FileSystem.readAsStringAsync(MANIFEST_PATH);
      const parsed = JSON.parse(raw) as CacheManifest;
      manifest = {
        urls: parsed.urls || {},
        names: parsed.names || {},
      };

      Object.entries(manifest.urls).forEach(([remoteUrl, localUri]) => {
        memoryUriByRemote.set(remoteUrl, localUri);
      });
      Object.entries(manifest.names).forEach(([commanderName, localUri]) => {
        memoryUriByCommander.set(commanderName, localUri);
      });
    }
  } catch {
    manifest = { urls: {}, names: {} };
  } finally {
    manifestReady = true;
  }
}

export async function initDeckImageCache(): Promise<void> {
  if (manifestReady) return;
  if (!initPromise) {
    initPromise = loadManifest();
  }
  await initPromise;
}

export function peekDeckImageUri(
  remoteUrl?: string | null,
  commanderName?: string,
): string | null {
  if (remoteUrl?.trim()) {
    const normalized = normalizeRemoteUrl(remoteUrl);
    const cached = memoryUriByRemote.get(normalized) || manifest.urls[normalized];
    if (cached) return cached;
  }

  if (commanderName?.trim()) {
    const normalized = normalizeCommanderName(commanderName);
    const cached = memoryUriByCommander.get(normalized) || manifest.names[normalized];
    if (cached) return cached;
  }

  return null;
}

function acquireSlot(onDemand: boolean): Promise<void> {
  return new Promise((resolve) => {
    const tryAcquire = () => {
      const max = onDemand ? ON_DEMAND_CONCURRENCY : BACKGROUND_CONCURRENCY;
      const active = onDemand ? onDemandActive : backgroundActive;
      if (active < max) {
        if (onDemand) onDemandActive += 1;
        else backgroundActive += 1;
        resolve();
        return;
      }

      const waiters = onDemand ? onDemandWaiters : backgroundWaiters;
      waiters.push(tryAcquire);
    };

    tryAcquire();
  });
}

function releaseSlot(onDemand: boolean): void {
  if (onDemand) onDemandActive -= 1;
  else backgroundActive -= 1;

  const waiters = onDemand ? onDemandWaiters : backgroundWaiters;
  const next = waiters.shift();
  if (next) next();
}

async function runQueued<T>(
  priority: 'on-demand' | 'background',
  task: () => Promise<T>,
): Promise<T> {
  const onDemand = priority === 'on-demand';
  await acquireSlot(onDemand);
  try {
    return await task();
  } finally {
    releaseSlot(onDemand);
  }
}

async function warmExpoImageCache(localUri: string): Promise<void> {
  if (!isLocalUri(localUri)) return;
  try {
    await Image.prefetch(localUri);
  } catch {
    // Best effort.
  }
}

async function downloadToCache(
  remoteUrl: string,
  cachePath: string,
  priority: 'on-demand' | 'background',
): Promise<string> {
  await initDeckImageCache();
  await ensureCacheDir();

  if (await isUsableLocalCacheFile(cachePath)) {
    return cachePath;
  }

  return runQueued(priority, async () => {
    const temporaryPath = `${cachePath}.download-${Date.now()}`;
    try {
      const downloaded = await FileSystem.downloadAsync(remoteUrl, temporaryPath);
      if (
        downloaded.status >= 200 &&
        downloaded.status < 300 &&
        await isUsableLocalCacheFile(downloaded.uri)
      ) {
        await FileSystem.deleteAsync(cachePath, { idempotent: true });
        await FileSystem.moveAsync({ from: downloaded.uri, to: cachePath });
        void warmExpoImageCache(cachePath);
        return cachePath;
      }
      return remoteUrl;
    } finally {
      await FileSystem.deleteAsync(temporaryPath, { idempotent: true }).catch(() => undefined);
    }
  });
}

export async function cacheRemoteDeckImage(
  remoteUrl: string,
  options?: { background?: boolean },
): Promise<string> {
  const normalized = normalizeRemoteUrl(remoteUrl);
  if (!normalized) return normalized;
  if (isLocalUri(normalized)) return normalized;

  const peeked = peekDeckImageUri(normalized);
  if (peeked) return peeked;

  const inflight = downloadInflight.get(normalized);
  if (inflight) return inflight;

  const priority = options?.background ? 'background' : 'on-demand';

  const task = (async () => {
    const cachePath = `${CACHE_DIR}${hashKey(normalized)}.img`;
    try {
      const localUri = await downloadToCache(normalized, cachePath, priority);
      if (isLocalUri(localUri)) {
        rememberRemoteMapping(normalized, localUri);
      }
      return localUri;
    } catch {
      return normalized;
    }
  })();

  downloadInflight.set(normalized, task);
  try {
    return await task;
  } finally {
    downloadInflight.delete(normalized);
  }
}

async function fetchCommanderArtsFromApi(commanderName: string): Promise<string[]> {
  const arts = await fetchCommanderArtOptions(commanderName);
  return arts
    .map((art) => art.imageUrl?.trim())
    .filter((url): url is string => Boolean(url));
}

export async function prefetchCommanderArtsByName(
  commanderName: string,
  options?: { background?: boolean },
): Promise<string[]> {
  const normalizedName = commanderName.trim();
  if (normalizedName.length < 2) return [];

  const inflight = artsInflight.get(normalizedName.toLowerCase());
  if (inflight) return inflight;

  const task = (async () => {
    await initDeckImageCache();

    const arts = await fetchCommanderArtsFromApi(normalizedName);
    const limitedArts = arts.slice(0, ARTS_PER_COMMANDER_PREFETCH);
    const priority = options?.background ? 'background' : 'on-demand';

    if (limitedArts.length > 0) {
      const nameCachePath = `${CACHE_DIR}cmd-${hashKey(normalizedName.toLowerCase())}.img`;
      const primaryUrl = limitedArts[0];
      const localPrimary = await downloadToCache(primaryUrl, nameCachePath, priority);
      if (isLocalUri(localPrimary)) {
        rememberCommanderMapping(normalizedName, localPrimary);
        rememberRemoteMapping(primaryUrl, localPrimary);
      }

      await Promise.allSettled(
        limitedArts.slice(1).map((url) => cacheRemoteDeckImage(url, { background: true })),
      );
    }

    return limitedArts;
  })();

  artsInflight.set(normalizedName.toLowerCase(), task);
  try {
    return await task;
  } finally {
    artsInflight.delete(normalizedName.toLowerCase());
  }
}

export async function resolveDeckImageUri(
  remoteUrl: string | null | undefined,
  commanderName: string,
): Promise<string | null> {
  await initDeckImageCache();

  const peeked = peekDeckImageUri(remoteUrl, commanderName);
  if (peeked) {
    if (await isUsableLocalCacheFile(peeked)) {
      void warmExpoImageCache(peeked);
      return peeked;
    }
    await invalidateDeckImageCacheEntry(remoteUrl, commanderName, peeked);
  }

  if (remoteUrl?.trim()) {
    const cached = await cacheRemoteDeckImage(remoteUrl.trim());
    return cached || null;
  }

  const normalizedName = commanderName.trim();
  if (normalizedName.length < 2) return null;

  const inflight = resolveInflight.get(normalizedName.toLowerCase());
  if (inflight) return inflight;

  const task = (async () => {
    const arts = await prefetchCommanderArtsByName(normalizedName);
    if (arts.length === 0) return null;

    const peekedAfterFetch = peekDeckImageUri(arts[0], normalizedName);
    if (peekedAfterFetch) return peekedAfterFetch;

    return cacheRemoteDeckImage(arts[0]);
  })();

  resolveInflight.set(normalizedName.toLowerCase(), task);
  try {
    return await task;
  } finally {
    resolveInflight.delete(normalizedName.toLowerCase());
  }
}

export async function prefetchDeckImageUrls(
  urls: Iterable<string | null | undefined>,
  options?: { background?: boolean },
): Promise<void> {
  const unique = [...new Set(
    [...urls]
      .map((url) => url?.trim())
      .filter((url): url is string => Boolean(url)),
  )];

  const uncached = unique.filter((url) => !peekDeckImageUri(url));
  if (uncached.length === 0) return;

  const concurrency = options?.background ? BACKGROUND_CONCURRENCY : ON_DEMAND_CONCURRENCY;
  for (let index = 0; index < uncached.length; index += concurrency) {
    const batch = uncached.slice(index, index + concurrency);
    await Promise.allSettled(
      batch.map((url) => cacheRemoteDeckImage(url, { background: options?.background ?? true })),
    );
  }
}

export async function prefetchCommanderNames(
  names: Iterable<string | null | undefined>,
  options?: { background?: boolean },
): Promise<void> {
  const unique = [...new Set(
    [...names]
      .flatMap((name) => (name ? splitCommanderNames(name) : []))
      .map((name) => name.trim())
      .filter((name) => name.length >= 2),
  )];

  const missing = unique.filter((name) => !peekDeckImageUri(null, name));
  if (missing.length === 0) return;

  const concurrency = options?.background ? BACKGROUND_CONCURRENCY : ON_DEMAND_CONCURRENCY;
  for (let index = 0; index < missing.length; index += concurrency) {
    const batch = missing.slice(index, index + concurrency);
    await Promise.allSettled(
      batch.map((name) => prefetchCommanderArtsByName(name, { background: options?.background ?? true })),
    );
  }
}

export function prefetchProfileDeckImages(decks: ProfileDeck[]): void {
  void prefetchDeckImageUrls(collectDeckImageUrls(decks), { background: true });
  void prefetchCommanderNames(collectDeckCommanderNames(decks), { background: true });
}
