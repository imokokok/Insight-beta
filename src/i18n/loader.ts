import { logger } from '@/shared/logger';

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

export async function preloadTranslations(lang: Lang): Promise<void> {
  if (!isTranslationLoaded(lang)) {
    try {
      await loadTranslations(lang);
    } catch (error) {
      logger.warn(`Failed to preload translations for ${lang}`, { error });
    }
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
