import { useEffect, useState } from 'react';
import { initDeckImageCache, peekDeckImageUri, resolveDeckImageUri } from '@/lib/deck-image-cache';

export function useDeckImageUri(
  remoteUrl: string | null | undefined,
  commanderName: string,
) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(() =>
    peekDeckImageUri(remoteUrl, commanderName),
  );
  const [loading, setLoading] = useState(() => !peekDeckImageUri(remoteUrl, commanderName));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void initDeckImageCache().then(() => {
      if (cancelled) return;

      const cached = peekDeckImageUri(remoteUrl, commanderName);
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
          const uri = await resolveDeckImageUri(remoteUrl, commanderName);
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
  }, [remoteUrl, commanderName]);

  return { resolvedUri, loading, failed, setFailed };
}