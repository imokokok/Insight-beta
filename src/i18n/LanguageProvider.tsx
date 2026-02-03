'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { isLang, langToHtmlLang, LANG_STORAGE_KEY, type Lang } from '@/i18n/types';
import {
  interpolate,
  handlePlural,
  formatDate,
  formatNumber,
  formatCurrency,
  formatRelativeTime,
  getNestedValue,
} from '@/i18n/utils';
import type { InterpolationValues, PluralOptions } from '@/i18n/types';
import { translations } from './translations';

export type TranslationKey = string;

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, values?: InterpolationValues) => string;
  tn: (key: TranslationKey, count: number, forms: PluralOptions['forms']) => string;
  format: {
    date: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
    number: (value: number, options?: Intl.NumberFormatOptions) => string;
    currency: (value: number, currency: string, options?: Intl.NumberFormatOptions) => string;
    relativeTime: (
      value: number,
      unit: Intl.RelativeTimeFormatUnit,
      options?: Intl.RelativeTimeFormatOptions,
    ) => string;
  };
};

const I18nContext = createContext<I18nContextValue | null>(null);

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
    (key: TranslationKey, values?: InterpolationValues): string => {
      const translationValue =
        getNestedValue(translations[lang], key) ?? getNestedValue(translations.en, key);

      if (typeof translationValue !== 'string') {
        return key;
      }

      if (values) {
        return interpolate(translationValue, values);
      }

      return translationValue;
    },
    [lang],
  );

  const tn = useCallback(
    (key: TranslationKey, count: number, forms: PluralOptions['forms']): string => {
      const template =
        getNestedValue(translations[lang], key) ?? getNestedValue(translations.en, key);

      if (typeof template !== 'string') {
        return handlePlural({ count, forms }, lang);
      }

      const pluralResult = handlePlural({ count, forms }, lang);
      return interpolate(template, { count, value: pluralResult });
    },
    [lang],
  );

  const format = useMemo(
    () => ({
      date: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) =>
        formatDate(value, lang, options),
      number: (value: number, options?: Intl.NumberFormatOptions) =>
        formatNumber(value, lang, options),
      currency: (value: number, currency: string, options?: Intl.NumberFormatOptions) =>
        formatCurrency(value, lang, currency, options),
      relativeTime: (
        value: number,
        unit: Intl.RelativeTimeFormatUnit,
        options?: Intl.RelativeTimeFormatOptions,
      ) => formatRelativeTime(value, unit, lang, options),
    }),
    [lang],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t,
      tn,
      format,
    }),
    [lang, setLang, t, tn, format],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within LanguageProvider');
  }
  return ctx;
}
