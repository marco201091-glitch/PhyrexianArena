import { useCallback, useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import {
  initDeckImageCache,
  invalidateDeckImageCacheEntry,
  peekDeckImageUri,
  resolveDeckImageUri,
  validateDeckImageCacheEntry,
} from '@/lib/deck-image-cache';

const IMAGE_RESOLVE_TIMEOUT_MS = 12_000;

async function resolveDeckImageUriWithTimeout(
  remoteUrl: string | null | undefined,
  commanderName: string,
): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      resolveDeckImageUri(remoteUrl, commanderName),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), IMAGE_RESOLVE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function withRetryToken(uri: string | null, retryVersion: number): string | null {
  if (!uri || retryVersion === 0 || !/^https?:\/\//i.test(uri)) return uri;
  return `${uri}${uri.includes('?') ? '&' : '?'}pa_retry=${retryVersion}`;
}

export function useDeckImageUri(
  remoteUrl: string | null | undefined,
  commanderName: string,
) {
  const directRemoteUri = remoteUrl?.trim() || null;
  const [resolvedUri, setResolvedUri] = useState<string | null>(() =>
    peekDeckImageUri(remoteUrl, commanderName) || directRemoteUri,
  );
  const [loading, setLoading] = useState(() => !peekDeckImageUri(remoteUrl, commanderName) && !directRemoteUri);
  const [failed, setFailed] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const [forceNameFallback, setForceNameFallback] = useState(false);
  const retryCountRef = useRef(0);

  useEffect(() => {
    retryCountRef.current = 0;
    setRetryVersion(0);
    setForceNameFallback(false);
    const immediateUri = peekDeckImageUri(remoteUrl, commanderName) || directRemoteUri;
    setResolvedUri(immediateUri);
    setLoading(!immediateUri);
    setFailed(false);
  }, [commanderName, directRemoteUri, remoteUrl]);

  useEffect(() => {
    let cancelled = false;

    void initDeckImageCache().then(() => {
      if (cancelled) return;

      const effectiveRemoteUrl = forceNameFallback ? null : remoteUrl;
      const cached = peekDeckImageUri(effectiveRemoteUrl, commanderName);
      if (cached) {
        setResolvedUri(cached);
        setLoading(false);
        setFailed(false);

        void (async () => {
          const validation = await validateDeckImageCacheEntry(effectiveRemoteUrl, cached);
          if (cancelled || validation === 'valid') return;

          setLoading(true);
          setResolvedUri(null);
          await invalidateDeckImageCacheEntry(remoteUrl, commanderName, cached);
          await Image.clearMemoryCache().catch(() => false);
          if (cancelled) return;

          try {
            const repairedUri = await resolveDeckImageUri(
              effectiveRemoteUrl,
              commanderName,
            );
            if (cancelled) return;
            setResolvedUri(withRetryToken(repairedUri, retryVersion));
            setFailed(!repairedUri);
          } catch {
            if (!cancelled) setFailed(true);
          } finally {
            if (!cancelled) setLoading(false);
          }
        })();
        return;
      }

      // A valid remote URL must render immediately. Persistent caching is an
      // optimization and must never block the UI on native filesystem/image decoding.
      if (effectiveRemoteUrl?.trim()) {
        setResolvedUri(withRetryToken(effectiveRemoteUrl.trim(), retryVersion));
        setLoading(false);
        setFailed(false);
        void resolveDeckImageUri(effectiveRemoteUrl, commanderName).catch(() => null);
        return;
      }

      setFailed(false);
      setLoading(true);

      void (async () => {
        try {
          const uri = await resolveDeckImageUriWithTimeout(effectiveRemoteUrl, commanderName);
          if (cancelled) return;
          setResolvedUri(withRetryToken(uri, retryVersion));
          setFailed(!uri);
        } catch {
          if (!cancelled) {
            setResolvedUri(null);
            setFailed(true);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [remoteUrl, commanderName, retryVersion, forceNameFallback]);

  const handleError = useCallback(() => {
    if (retryCountRef.current >= 1) {
      setFailed(true);
      return;
    }

    retryCountRef.current += 1;
    const failedUri = resolvedUri;
    setFailed(true);
    setLoading(false);
    setResolvedUri(null);
    setForceNameFallback(true);
    void invalidateDeckImageCacheEntry(remoteUrl, commanderName, failedUri)
      .then(() => Image.clearMemoryCache().catch(() => false))
      .finally(() => setRetryVersion((version) => version + 1));
  }, [commanderName, remoteUrl, resolvedUri]);

  return { resolvedUri, loading, failed, handleError };
}
