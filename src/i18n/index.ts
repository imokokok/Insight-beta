export type {
  Lang,
  InterpolationValues,
  PluralOptions,
  PluralRule,
  FormatOptions,
  TranslationValue,
  TranslationNamespace,
  Translations,
} from './types';

export {
  languages,
  LANG_STORAGE_KEY,
  isLang,
  langToHtmlLang,
  langToLocale,
  detectLangFromAcceptLanguage,
} from './types';

export {
  interpolate,
  handlePlural,
  formatDate,
  formatNumber,
  formatCurrency,
  formatRelativeTime,
  getNestedValue,
} from './utils';

export {
  loadTranslations,
  preloadTranslations,
  isTranslationLoaded,
  clearTranslationCache,
  getLoadedTranslations,
} from './loader';

export { LanguageProvider, useI18n } from './LanguageProvider';
export { LanguageProviderLazy, useI18n as useI18nLazy, preloadTranslations as preloadTranslationsLazy } from './LanguageProviderLazy';

export type { TranslationKey } from './LanguageProvider';

export { translations } from './translations';
