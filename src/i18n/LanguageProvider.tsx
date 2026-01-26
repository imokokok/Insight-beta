'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  isLang,
  langToHtmlLang,
  LANG_STORAGE_KEY,
  translations,
  type Lang,
  type TranslationKey,
} from '@/i18n/translations';

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getNestedValue(obj: unknown, path: string) {
  if (!obj || typeof obj !== 'object') return undefined;
  return path.split('.').reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[part];
  }, obj);
}

export function LanguageProvider({
  children,
  initialLang,
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang ?? 'zh');

  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(stored)) {
      setLangState(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    document.documentElement.lang = langToHtmlLang[lang];
    document.cookie = `${encodeURIComponent(LANG_STORAGE_KEY)}=${encodeURIComponent(lang)}; path=/; max-age=31536000; samesite=lax`;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => {
      const value = getNestedValue(translations[lang], key) ?? getNestedValue(translations.en, key);
      return typeof value === 'string' ? value : key;
    },
    [lang],
  );

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within LanguageProvider');
  }
  return ctx;
}
