import { useCallback, useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import {
  invalidateCachedRemoteImage,
  peekCachedRemoteImageUri,
  resolveCachedRemoteImageUri,
} from '@/lib/deck-image-cache';

function withRetryToken(uri: string | null, retryVersion: number): string | null {
  if (!uri || retryVersion === 0 || !/^https?:\/\//i.test(uri)) return uri;
  return `${uri}${uri.includes('?') ? '&' : '?'}pa_retry=${retryVersion}`;
}

export function useCachedRemoteImage(remoteUrl: string | null | undefined) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(() =>
    peekCachedRemoteImageUri(remoteUrl),
  );
  const [loading, setLoading] = useState(() => Boolean(remoteUrl) && !resolvedUri);
  const [failed, setFailed] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const retryCountRef = useRef(0);

  useEffect(() => {
    retryCountRef.current = 0;
    setResolvedUri(peekCachedRemoteImageUri(remoteUrl));
    setFailed(false);
  }, [remoteUrl]);

  useEffect(() => {
    let cancelled = false;

    if (!remoteUrl?.trim()) {
      setResolvedUri(null);
      setLoading(false);
      setFailed(false);
      return;
    }

    setLoading(true);
    void resolveCachedRemoteImageUri(remoteUrl)
      .then((uri) => {
        if (cancelled) return;
        setResolvedUri(withRetryToken(uri, retryVersion));
        setFailed(!uri);
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedUri(null);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [remoteUrl, retryVersion]);

  const handleError = useCallback(() => {
    if (retryCountRef.current >= 1) {
      setFailed(true);
      return;
    }

    retryCountRef.current += 1;
    const failedUri = resolvedUri;
    setResolvedUri(null);
    setLoading(true);
    setFailed(false);
    void invalidateCachedRemoteImage(remoteUrl, failedUri)
      .then(() => Image.clearMemoryCache().catch(() => false))
      .finally(() => setRetryVersion((version) => version + 1));
  }, [remoteUrl, resolvedUri]);

  return { resolvedUri, loading, failed, handleError };
}
