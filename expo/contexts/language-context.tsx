import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppLanguage, TranslationKey } from '@/lib/i18n/types';
import { t as translate } from '@/lib/i18n/translations';

const LANGUAGE_KEY = 'phyrexian_app_language';

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  copy: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const stored = await SecureStore.getItemAsync(LANGUAGE_KEY);
      if (stored === 'it' || stored === 'en') {
        setLanguageState(stored);
      }
      setReady(true);
    })();
  }, []);

  const setLanguage = useCallback(async (next: AppLanguage) => {
    setLanguageState(next);
    await SecureStore.setItemAsync(LANGUAGE_KEY, next);
  }, []);

  const copy = useCallback((key: TranslationKey) => translate(language, key), [language]);

  const value = useMemo(
    () => ({ language, setLanguage, copy }),
    [language, setLanguage, copy],
  );

  if (!ready) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}