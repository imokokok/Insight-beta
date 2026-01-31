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

// 类型安全的翻译键
export type { TranslationKey, TranslationNamespace as TranslationNamespaceType } from './keys';
export { TranslationKeys, createTranslationKey } from './keys';

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
export {
  LanguageProviderLazy,
  useI18n as useI18nLazy,
  preloadTranslations as preloadTranslationsLazy,
} from './LanguageProviderLazy';

// 优先使用类型安全的 TranslationKey
export type { TranslationKey as TranslationKeyString } from './LanguageProvider';

export { translations } from './translations';
