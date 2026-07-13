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

  const existing = await FileSystem.getInfoAsync(cachePath);
  if (existing.exists && typeof existing.size === 'number' && existing.size > MIN_CACHED_FILE_BYTES) {
    return cachePath;
  }

  return runQueued(priority, async () => {
    const downloaded = await FileSystem.downloadAsync(remoteUrl, cachePath);
    if (downloaded.status >= 200 && downloaded.status < 300) {
      void warmExpoImageCache(downloaded.uri);
      return downloaded.uri;
    }
    return remoteUrl;
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
    void warmExpoImageCache(peeked);
    return peeked;
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