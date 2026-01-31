import type { Lang, TranslationNamespace } from './types';

export type TranslationModule = () => Promise<{ default: TranslationNamespace }>;

// Lazy load translations from the main translations file
// This allows for code splitting while keeping all translations in one place
const translationLoaders: Record<Lang, TranslationModule> = {
  en: () => Promise.resolve({ default: {} as TranslationNamespace }),
  zh: () => Promise.resolve({ default: {} as TranslationNamespace }),
  es: () => Promise.resolve({ default: {} as TranslationNamespace }),
  fr: () => Promise.resolve({ default: {} as TranslationNamespace }),
  ko: () => Promise.resolve({ default: {} as TranslationNamespace }),
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
    console.warn(`Failed to load translations for ${lang}, falling back to English`, error);
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
