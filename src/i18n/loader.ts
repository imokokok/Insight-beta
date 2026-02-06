import { logger } from '@/lib/logger';

import type { Lang, TranslationNamespace } from './types';

export type TranslationModule = () => Promise<{ default: TranslationNamespace }>;

// Lazy load translations from the modular translation files
// This allows for code splitting while keeping translations organized by module
const translationLoaders: Record<Lang, TranslationModule> = {
  en: () =>
    import('./locales/en').then((m) => ({ default: m.enTranslations as TranslationNamespace })),
  zh: () =>
    import('./locales/zh').then((m) => ({ default: m.zhTranslations as TranslationNamespace })),
  es: () =>
    import('./locales/es').then((m) => ({ default: m.esTranslations as TranslationNamespace })),
  fr: () =>
    import('./locales/fr').then((m) => ({ default: m.frTranslations as TranslationNamespace })),
  ko: () =>
    import('./locales/ko').then((m) => ({ default: m.koTranslations as TranslationNamespace })),
};

const loadedTranslations: Partial<Record<Lang, TranslationNamespace>> = {};

export async function loadTranslations(lang: Lang): Promise<TranslationNamespace> {
  const cached = loadedTranslations[lang];
  if (cached) {
    return cached;
  }

  try {
    const translationModule = await translationLoaders[lang]();
    loadedTranslations[lang] = translationModule.default;
    return translationModule.default;
  } catch (error) {
    logger.warn(`Failed to load translations for ${lang}, falling back to English`, { error });
    if (lang !== 'en') {
      return loadTranslations('en');
    }
    throw error;
  }
}

export function getLoadedTranslations(): Partial<Record<Lang, TranslationNamespace>> {
  return { ...loadedTranslations };
}

export function isTranslationLoaded(lang: Lang): boolean {
  return lang in loadedTranslations;
}

export function preloadTranslations(lang: Lang): void {
  if (!isTranslationLoaded(lang)) {
    loadTranslations(lang).catch(console.error);
  }
}

export function clearTranslationCache(lang?: Lang): void {
  if (lang) {
    delete loadedTranslations[lang];
  } else {
    Object.keys(loadedTranslations).forEach((key) => {
      delete loadedTranslations[key as Lang];
    });
  }
}
