'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Language = 'it' | 'en';

type CopyValue = string | { it: string; en: string };

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  copy: (value: CopyValue) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('it');

  useEffect(() => {
    const stored = window.localStorage.getItem('phyrexian-arena-language');
    if (stored === 'it' || stored === 'en') {
      setLanguageState(stored);
      return;
    }

    const browserLanguage = window.navigator.language.toLowerCase();
    setLanguageState(browserLanguage.startsWith('it') ? 'it' : 'en');
  }, []);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem('phyrexian-arena-language', nextLanguage);
  };

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    copy: (valueToCopy) => typeof valueToCopy === 'string' ? valueToCopy : valueToCopy[language],
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return context;
}
