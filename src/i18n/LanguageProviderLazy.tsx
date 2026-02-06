'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import type { ReactNode } from 'react';

import type { InterpolationValues, PluralOptions, TranslationNamespace, Lang } from '@/i18n/types';
import { isLang, langToHtmlLang, LANG_STORAGE_KEY } from '@/i18n/types';
import {
  interpolate,
  handlePlural,
  formatDate,
  formatNumber,
  formatCurrency,
  formatRelativeTime,
  getNestedValue,
} from '@/i18n/utils';
import { logger } from '@/lib/logger';

import { loadTranslations, isTranslationLoaded, preloadTranslations } from './loader';

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
  isLoading: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const fallbackTranslations: Record<Lang, TranslationNamespace> = {
  en: {},
  zh: {},
  es: {},
  fr: {},
  ko: {},
};

function getInitialLang(serverLang?: Lang): Lang {
  if (typeof window === 'undefined') {
    return serverLang ?? 'zh';
  }

  const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
  if (isLang(stored)) {
    return stored;
  }

  return serverLang ?? 'zh';
}

export function LanguageProviderLazy({
  children,
  initialLang,
  defaultTranslations,
}: {
  children: ReactNode;
  initialLang?: Lang;
  defaultTranslations?: TranslationNamespace;
}) {
  const [lang, setLangState] = useState<Lang>(() => getInitialLang(initialLang));
  const [translations, setTranslations] = useState<TranslationNamespace>(
    defaultTranslations ?? fallbackTranslations[lang],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    document.documentElement.lang = langToHtmlLang[lang];
    document.cookie = `${encodeURIComponent(LANG_STORAGE_KEY)}=${encodeURIComponent(lang)}; path=/; max-age=31536000; samesite=lax`;

    if (!isTranslationLoaded(lang)) {
      setIsLoading(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      loadTranslations(lang)
        .then((loaded) => {
          if (!abortControllerRef.current?.signal.aborted) {
            setTranslations(loaded);
          }
        })
        .catch((error) => logger.error('Failed to load translations', { error }))
        .finally(() => {
          if (!abortControllerRef.current?.signal.aborted) {
            setIsLoading(false);
          }
        });
    } else {
      loadTranslations(lang)
        .then(setTranslations)
        .catch((error) => logger.error('Failed to load translations', { error }));
    }

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, values?: InterpolationValues): string => {
      const translationValue = getNestedValue(translations, key);

      if (typeof translationValue !== 'string') {
        return key;
      }

      if (values) {
        return interpolate(translationValue, values);
      }

      return translationValue;
    },
    [translations],
  );

  const tn = useCallback(
    (key: TranslationKey, count: number, forms: PluralOptions['forms']): string => {
      const template = getNestedValue(translations, key);

      if (typeof template !== 'string') {
        return handlePlural({ count, forms }, lang);
      }

      const pluralResult = handlePlural({ count, forms }, lang);
      return interpolate(template, { count, value: pluralResult });
    },
    [translations, lang],
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
      isLoading: isLoading || !isHydrated,
    }),
    [lang, setLang, t, tn, format, isLoading, isHydrated],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within LanguageProviderLazy');
  }
  return ctx;
}

export { preloadTranslations };
