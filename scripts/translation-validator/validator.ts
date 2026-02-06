#!/usr/bin/env tsx
/**
 * Translation Validator
 *
 * Main validator class that orchestrates the validation process.
 */

// path is used implicitly through other modules
import type { ValidationConfig, ValidationResult, TranslationCompleteness } from './types';
import { DEFAULT_CONFIG } from './types';
import { KeyExtractor } from './keyExtractor';
import { TranslationLoader } from './translationLoader';
import { ConsoleLogger } from './logger';

export interface ValidatorOptions {
  config?: Partial<ValidationConfig>;
  logger?: ConsoleLogger;
  enableCache?: boolean;
}

export class TranslationValidator {
  private config: ValidationConfig;
  private keyExtractor: KeyExtractor;
  private translationLoader: TranslationLoader;
  private logger: ConsoleLogger;

  constructor(options: ValidatorOptions = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    this.logger = options.logger ?? new ConsoleLogger();
    this.keyExtractor = new KeyExtractor(this.config);
    this.translationLoader = new TranslationLoader(this.config);

    if (options.enableCache) {
      this.keyExtractor.enableCache();
      this.translationLoader.enableCache();
    }
  }

  /**
   * Run the full validation process
   */
  async validate(): Promise<ValidationResult> {
    // Step 1: Extract used keys from source code
    this.logger.section('Scanning source code for translation keys...');
    const usedKeys = await this.keyExtractor.extractUsedKeys();
    this.logger.success(`Found ${usedKeys.size} unique translation keys in code`);

    // Step 2: Load all translation keys
    this.logger.section('Loading translation files...');
    const langKeys = await this.translationLoader.loadAllTranslations();

    const enKeys = langKeys.get('en');
    if (!enKeys) {
      this.logger.error('English translation file not found!');
      process.exit(1);
    }

    this.logger.info(`English: ${enKeys.size} keys`);
    for (const [lang, keys] of langKeys) {
      if (lang !== 'en') {
        this.logger.info(`${lang}: ${keys.size} keys`);
      }
    }

    // Step 3: Find missing translations
    const missingInTranslations = this.findMissingKeys(usedKeys, enKeys);
    this.reportMissingKeys(missingInTranslations);

    // Step 4: Find potentially unused translations
    const potentiallyUnused = this.findUnusedKeys(enKeys, usedKeys);
    this.reportUnusedKeys(potentiallyUnused);

    // Step 5: Calculate completeness for all languages
    const completeness = this.calculateAllCompleteness(langKeys, enKeys);
    this.reportCompleteness(completeness);

    // Step 6: Print summary
    this.logger.summary({
      totalKeys: enKeys.size,
      usedKeys: usedKeys.size,
      missingCount: missingInTranslations.length,
      unusedCount: potentiallyUnused.length,
    });

    return {
      usedKeys,
      langKeys,
      missingInTranslations,
      potentiallyUnused,
      completeness,
    };
  }

  /**
   * Find keys that are used in code but missing in translations
   */
  private findMissingKeys(usedKeys: Set<string>, enKeys: Set<string>): string[] {
    const missing: string[] = [];
    for (const key of usedKeys) {
      if (!enKeys.has(key)) {
        missing.push(key);
      }
    }
    return missing.sort();
  }

  /**
   * Find keys that exist in translations but are not used in code
   */
  private findUnusedKeys(enKeys: Set<string>, usedKeys: Set<string>): string[] {
    const unused: string[] = [];
    for (const key of enKeys) {
      if (!usedKeys.has(key)) {
        unused.push(key);
      }
    }
    return unused.sort();
  }

  /**
   * Calculate completeness for all languages
   */
  private calculateAllCompleteness(
    langKeys: Map<string, Set<string>>,
    referenceKeys: Set<string>,
  ): Map<string, TranslationCompleteness> {
    const completeness = new Map<string, TranslationCompleteness>();

    for (const [lang, keys] of langKeys) {
      if (lang === 'en') continue;

      const result = this.translationLoader.calculateCompleteness(keys, referenceKeys);
      completeness.set(lang, result);
    }

    return completeness;
  }

  /**
   * Report missing translation keys
   */
  private reportMissingKeys(missing: string[]): void {
    this.logger.section('Missing Translation Keys (in code but not in en translations):');

    if (missing.length === 0) {
      this.logger.success('All used keys are defined in translations');
    } else {
      const toShow = missing.slice(0, this.config.maxMissingKeysToShow);
      for (const key of toShow) {
        this.logger.error(`  - ${key}`);
      }
      if (missing.length > this.config.maxMissingKeysToShow) {
        this.logger.error(`  ... and ${missing.length - this.config.maxMissingKeysToShow} more`);
      }
    }
  }

  /**
   * Report potentially unused translation keys
   */
  private reportUnusedKeys(unused: string[]): void {
    this.logger.section('Potentially Unused Translation Keys:');

    if (unused.length === 0) {
      this.logger.success('All translation keys are used in code');
    } else {
      const toShow = unused.slice(0, this.config.maxUnusedKeysToShow);
      for (const key of toShow) {
        this.logger.warning(`  - ${key}`);
      }
      if (unused.length > this.config.maxUnusedKeysToShow) {
        this.logger.warning(`  ... and ${unused.length - this.config.maxUnusedKeysToShow} more`);
      }
      this.logger.info('These might be used dynamically or are truly unused');
    }
  }

  /**
   * Report translation completeness for all languages
   */
  private reportCompleteness(completeness: Map<string, TranslationCompleteness>): void {
    this.logger.section('Translation Completeness:');

    for (const [lang, result] of completeness) {
      const bar =
        '█'.repeat(Math.round(result.percentage / 5)) +
        '░'.repeat(20 - Math.round(result.percentage / 5));

      if (result.missing === 0) {
        this.logger.success(`  ${lang.toUpperCase().padEnd(2)} ${bar} ${result.percentage}%`);
      } else {
        this.logger.warning(
          `  ${lang.toUpperCase().padEnd(2)} ${bar} ${result.percentage}% (${result.missing} missing)`,
        );
      }
    }
  }

  /**
   * Check if validation passed (no missing keys)
   */
  isValid(result: ValidationResult): boolean {
    return result.missingInTranslations.length === 0;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.keyExtractor.clearCache();
    this.translationLoader.clearCache();
  }
}
