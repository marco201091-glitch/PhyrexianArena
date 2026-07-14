'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { isDemoUser } from '@/lib/demo';
import { useLanguage } from '@/components/language-provider';
import { FlaskConical } from 'lucide-react';

const DEMO_MODE_CACHE_KEY = 'phyrexian-demo-mode-enabled';

function readCachedDemoMode() {
  try {
    const cached = sessionStorage.getItem(DEMO_MODE_CACHE_KEY);
    if (cached === 'true') return true;
    if (cached === 'false') return false;
  } catch {
    // sessionStorage may be unavailable.
  }

  return null;
}

function writeCachedDemoMode(enabled: boolean) {
  try {
    sessionStorage.setItem(DEMO_MODE_CACHE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage failures.
  }
}

export function DemoBanner() {
  const { user } = useAuth();
  const { copy: t } = useLanguage();
  const [demoModeEnabled, setDemoModeEnabled] = useState<boolean | null>(() => readCachedDemoMode());

  useEffect(() => {
    let cancelled = false;

    fetch('/api/demo-mode')
      .then((response) => response.json())
      .then((payload: { enabled?: boolean }) => {
        if (!cancelled) {
          const enabled = payload.enabled === true;
          setDemoModeEnabled(enabled);
          writeCachedDemoMode(enabled);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDemoModeEnabled(false);
          writeCachedDemoMode(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (demoModeEnabled !== true || !isDemoUser(user)) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-100 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2">
        <FlaskConical className="h-4 w-4 shrink-0 text-amber-300" />
        <span>
          {t({
            it: 'I dati di questa sessione verranno resettati entro 24 ore.',
            en: 'This session data will reset within 24 hours.',
          })}
        </span>
      </div>
    </div>
  );
}