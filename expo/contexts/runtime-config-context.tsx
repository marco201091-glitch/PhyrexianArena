import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { apiGet } from '@/lib/api';
import { APP_DISPLAY_VERSION } from '@/lib/app-version';
import { showAppAlert } from '@/lib/app-alert';

type ReleaseNote = { version?: string; it?: string; en?: string };
type RuntimeConfig = {
  recommendedVersion?: string;
  supportState?: 'supported' | 'update_available' | 'unsupported';
  maintenanceMessageIt?: string | null;
  maintenanceMessageEn?: string | null;
  featureFlags?: Record<string, boolean>;
  releaseNotes?: ReleaseNote[];
};

const RuntimeConfigContext = createContext<RuntimeConfig>({
  featureFlags: { lastStanding: true, deckWizardSearch: true },
});

export function RuntimeConfigProvider({ children }: PropsWithChildren) {
  const { language } = useLanguage();
  const [config, setConfig] = useState<RuntimeConfig>({
    featureFlags: { lastStanding: true, deckWizardSearch: true },
  });

  useEffect(() => {
    let active = true;
    void apiGet<RuntimeConfig>(`/api/app-config?version=${encodeURIComponent(APP_DISPLAY_VERSION)}`, {
      authenticated: false,
      timeoutMs: 5_000,
    }).then(async ({ data, status }) => {
      if (!active || status !== 200 || !data) return;
      setConfig(data);

      const localizedMaintenance = language === 'it'
        ? data.maintenanceMessageIt
        : data.maintenanceMessageEn;
      const latestNote = data.releaseNotes?.find((note) => note.version === APP_DISPLAY_VERSION);
      const message = localizedMaintenance || (language === 'it' ? latestNote?.it : latestNote?.en);
      if (!message) return;

      const noticeKey = `runtime-notice:${data.recommendedVersion ?? APP_DISPLAY_VERSION}:${language}`;
      if (await AsyncStorage.getItem(noticeKey)) return;
      const title = data.supportState === 'unsupported'
        ? (language === 'it' ? 'Aggiornamento necessario' : 'Update required')
        : (language === 'it' ? `Novità ${APP_DISPLAY_VERSION}` : `What's new in ${APP_DISPLAY_VERSION}`);
      showAppAlert(title, message);
      await AsyncStorage.setItem(noticeKey, 'shown');
    }).catch(() => undefined);
    return () => { active = false; };
  }, [language]);

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
