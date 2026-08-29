'use client';

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import packageJson from '@/package.json';
import { useLanguage } from '@/components/language-provider';
import { useToast } from '@/hooks/use-toast';

type RuntimeConfig = {
  recommendedVersion?: string;
  supportState?: 'supported' | 'update_available' | 'unsupported';
  featureFlags?: Record<string, boolean>;
  releaseNotes?: Array<{ version?: string; it?: string; en?: string }>;
};

const RuntimeConfigContext = createContext<RuntimeConfig>({
  featureFlags: { lastStanding: true, deckWizardSearch: true },
});

export function RuntimeConfigProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [config, setConfig] = useState<RuntimeConfig>({
    featureFlags: { lastStanding: true, deckWizardSearch: true },
  });

  useEffect(() => {
    let active = true;
    void fetch(`/api/app-config?version=${encodeURIComponent(packageJson.version)}`)
      .then((response) => response.ok ? response.json() as Promise<RuntimeConfig> : null)
      .then((next) => {
        if (!active || !next) return;
        setConfig(next);
        const note = next.releaseNotes?.find((entry) => entry.version === packageJson.version);
        const description = language === 'it' ? note?.it : note?.en;
        if (!description) return;
        const key = `runtime-notice:${packageJson.version}:${language}`;
        if (localStorage.getItem(key)) return;
        toast({ title: language === 'it' ? `Novità ${packageJson.version}` : `What's new in ${packageJson.version}`, description });
        localStorage.setItem(key, 'shown');
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [language, toast]);

  const value = useMemo(() => ({
    ...config,
    featureFlags: {
      lastStanding: config.featureFlags?.lastStanding !== false,
      deckWizardSearch: config.featureFlags?.deckWizardSearch !== false,
      ...config.featureFlags,
    },
  }), [config]);
  return <RuntimeConfigContext.Provider value={value}>{children}</RuntimeConfigContext.Provider>;
}

export function useRuntimeConfig() {
  return useContext(RuntimeConfigContext);
}
