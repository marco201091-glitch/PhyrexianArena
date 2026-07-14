import { useCallback, useEffect, useRef, useState } from 'react';
import {
  initDeckImageCache,
  invalidateDeckImageCacheEntry,
  peekDeckImageUri,
  resolveDeckImageUri,
} from '@/lib/deck-image-cache';

export function useDeckImageUri(
  remoteUrl: string | null | undefined,
  commanderName: string,
) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(() =>
    peekDeckImageUri(remoteUrl, commanderName),
  );
  const [loading, setLoading] = useState(() => !peekDeckImageUri(remoteUrl, commanderName));
  const [failed, setFailed] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const [forceNameFallback, setForceNameFallback] = useState(false);
  const retryCountRef = useRef(0);

  useEffect(() => {
    retryCountRef.current = 0;
    setRetryVersion(0);
    setForceNameFallback(false);
  }, [commanderName, remoteUrl]);

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
        return;
      }

      setFailed(false);
      setLoading(true);

      void (async () => {
        try {
          const uri = await resolveDeckImageUri(effectiveRemoteUrl, commanderName);
          if (cancelled) return;
          setResolvedUri(uri);
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
    setFailed(false);
    setLoading(true);
    setResolvedUri(null);
    setForceNameFallback(true);
    void invalidateDeckImageCacheEntry(remoteUrl, commanderName, failedUri)
      .finally(() => setRetryVersion((version) => version + 1));
  }, [commanderName, remoteUrl, resolvedUri]);

  return { resolvedUri, loading, failed, handleError };
}
