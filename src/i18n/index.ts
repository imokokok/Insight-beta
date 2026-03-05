/**
 * i18n - Internationalization Module
 *
 * This module provides comprehensive internationalization support:
 * - Type-safe translation keys
 * - Pluralization support
 * - Date/number/currency formatting
 * - SSR compatibility
 *
 * Quick Start:
 * ```tsx
 * import { LanguageProvider, useI18n } from '@/i18n';
 *
 * function App() {
 *   return (
 *     <LanguageProvider initialLang="en">
 *       <YourApp />
 *     </LanguageProvider>
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

// Translation function type - defined after importing InterpolationValues
export type TFunction = (key: string, values?: Record<string, string | number>) => string;

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

// Language Provider (used by layout.tsx)
export { LanguageProvider, useI18n } from './LanguageProvider';

// Types
export type { TranslationKey as TranslationKeyString } from './LanguageProvider';

// Static translations (for metadata, etc.)
export { translations } from './translations';
