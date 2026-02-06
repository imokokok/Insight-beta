#!/usr/bin/env tsx
/**
 * Translation Validator Types
 */

export interface ValidationConfig {
  srcDir: string;
  i18nDir: string;
  localesDir: string;
  ignorePatterns: string[];
  filePatterns: string[];
  maxMissingKeysToShow: number;
  maxUnusedKeysToShow: number;
}

export interface ValidationResult {
  usedKeys: Set<string>;
  langKeys: Map<string, Set<string>>;
  missingInTranslations: string[];
  potentiallyUnused: string[];
  completeness: Map<string, TranslationCompleteness>;
}

export interface TranslationCompleteness {
  total: number;
  missing: number;
  percentage: number;
  missingKeys: string[];
}

export interface KeyExtractionPattern {
  name: string;
  pattern: RegExp;
  extractGroup: number;
}

export interface Logger {
  info(message: string): void;
  success(message: string): void;
  warning(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export const DEFAULT_CONFIG: ValidationConfig = {
  srcDir: 'src',
  i18nDir: 'src/i18n',
  localesDir: 'src/i18n/locales',
  ignorePatterns: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
  filePatterns: ['**/*.ts', '**/*.tsx'],
  maxMissingKeysToShow: 20,
  maxUnusedKeysToShow: 20,
};

export const KEY_EXTRACTION_PATTERNS: KeyExtractionPattern[] = [
  {
    name: 't-function',
    // Match t('namespace.key') or t("namespace.key")
    // Key must contain at least one dot (namespace.key format)
    pattern: /t\(['"]([a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z][a-zA-Z0-9_.]*)['"]/g,
    extractGroup: 1,
  },
  {
    name: 'tn-function',
    // Match tn('namespace.key', ...) or tn("namespace.key", ...)
    pattern: /tn\(['"]([a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z][a-zA-Z0-9_.]*)['"]/g,
    extractGroup: 1,
  },
  {
    name: 'translation-keys',
    // Match TranslationKeys.namespace.key
    pattern: /TranslationKeys\.([a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z][a-zA-Z0-9_.]*)/g,
    extractGroup: 1,
  },
];
