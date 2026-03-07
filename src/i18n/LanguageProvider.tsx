'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

import type { Lang, InterpolationValues } from './types';
import { translations } from './translations';
import { interpolate, getNestedValue } from './utils';

export type TranslationKey = string;

interface I18nContextValue {
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface LanguageProviderProps {
  children: ReactNode;
  initialLang: Lang;
}

export function LanguageProvider({ children, initialLang }: LanguageProviderProps) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    // Store in localStorage for client-side persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('oracle-monitor_lang', newLang);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>): string => {
      const translationSet = translations[lang];
      const value = getNestedValue(translationSet, key);

      if (typeof value === 'string') {
        return values ? interpolate(value, values as InterpolationValues) : value;
      }

      // Return the key if translation not found
      return key;
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      t,
      lang,
      setLang,
    }),
    [t, lang, setLang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within a LanguageProvider');
  }
  return context;
}
