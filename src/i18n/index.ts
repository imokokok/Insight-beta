/**
 * i18n - Internationalization Module
 *
 * This module provides comprehensive internationalization support:
 * - Type-safe translation keys
 * - Lazy loading of translation files
 * - Pluralization support
 * - Date/number/currency formatting
 * - SSR compatibility
 *
 * Quick Start:
 * ```tsx
 * import { LanguageProviderLazy, useI18n } from '@/i18n';
 *
 * function App() {
 *   return (
 *     <LanguageProviderLazy initialLang="en">
 *       <YourApp />
 *     </LanguageProviderLazy>
 *   );
 * }
 *
 * function YourComponent() {
 *   const { t, tn, format, lang, setLang } = useI18n();
 *
 *   return (
 *     <div>
 *       <h1>{t('app.title')}</h1>
 *       <p>{t('welcome.message', { name: 'John' })}</p>
 *       <span>{tn('items.count', count, { one: '1 item', other: '{{count}} items' })}</span>
 *       <time>{format.date(new Date())}</time>
 *     </div>
 *   );
 * }
 * ```
 */

// Types
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

// Constants and utilities
export {
  languages,
  LANG_STORAGE_KEY,
  isLang,
  langToHtmlLang,
  langToLocale,
  detectLangFromAcceptLanguage,
} from './types';

// Formatting utilities
export {
  interpolate,
  handlePlural,
  formatDate,
  formatNumber,
  formatCurrency,
  formatRelativeTime,
  getNestedValue,
} from './utils';

// Translation loading
export {
  loadTranslations,
  preloadTranslations,
  isTranslationLoaded,
  clearTranslationCache,
  getLoadedTranslations,
} from './loader';

// Eager-loaded Language Provider (used by layout.tsx)
export { LanguageProvider, useI18n } from './LanguageProvider';

// ⚡ Lazy-loaded Language Provider (alternative for better performance)
// Use this for better performance - translations are loaded on demand
export {
  LanguageProviderLazy,
  useI18n as useI18nLazy,
  preloadTranslations as preloadTranslationsLazy,
} from './LanguageProviderLazy';

// Types
export type { TranslationKey as TranslationKeyString } from './LanguageProvider';

// Static translations (for metadata, etc.)
export { translations } from './translations';
