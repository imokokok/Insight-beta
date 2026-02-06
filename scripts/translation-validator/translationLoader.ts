#!/usr/bin/env tsx
/**
 * Translation Loader
 *
 * Loads and parses translation files from the locales directory.
 */

/* eslint-disable security/detect-non-literal-fs-filename */
import * as fs from 'fs';
import * as path from 'path';
import type { ValidationConfig, TranslationCompleteness } from './types';

export interface TranslationFile {
  namespace: string;
  content: string;
  keys: Set<string>;
}

export class TranslationLoader {
  private config: ValidationConfig;
  private cache: Map<string, Map<string, Set<string>>> | null = null;

  constructor(config: ValidationConfig) {
    this.config = config;
  }

  /**
   * Enable caching for repeated loads
   */
  enableCache(): void {
    this.cache = new Map();
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache?.clear();
  }

  /**
   * Load all translation keys for all languages
   */
  async loadAllTranslations(): Promise<Map<string, Set<string>>> {
    // Check cache first
    const cacheKey = 'all';
    if (this.cache?.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const langKeys = new Map<string, Set<string>>();

    const langDirs = await this.getLanguageDirectories();

    // Load translations in parallel
    const results = await Promise.all(
      langDirs.map(async (lang) => {
        const keys = await this.loadLanguageTranslations(lang);
        return { lang, keys };
      }),
    );

    for (const { lang, keys } of results) {
      langKeys.set(lang, keys);
    }

    // Cache results if enabled
    if (this.cache) {
      this.cache.set(cacheKey, langKeys);
    }

    return langKeys;
  }

  /**
   * Get list of language directories
   */
  private async getLanguageDirectories(): Promise<string[]> {
    try {
      const entries = await fs.promises.readdir(this.config.localesDir);

      const stats = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(this.config.localesDir, entry);
          const stat = await fs.promises.stat(fullPath);
          return { entry, isDirectory: stat.isDirectory() };
        }),
      );

      return stats.filter(({ isDirectory }) => isDirectory).map(({ entry }) => entry);
    } catch {
      return [];
    }
  }

  /**
   * Load translations for a specific language
   */
  private async loadLanguageTranslations(lang: string): Promise<Set<string>> {
    const keys = new Set<string>();
    const langDir = path.join(this.config.localesDir, lang);

    // Read index.ts to get all namespaces
    const indexPath = path.join(langDir, 'index.ts');

    try {
      const indexContent = await fs.promises.readFile(indexPath, 'utf-8');
      const namespaceMatches = indexContent.match(/import \{ (\w+) \} from/g);

      if (!namespaceMatches) {
        return keys;
      }

      // Parse namespace imports in parallel
      const namespaceNames = namespaceMatches
        .map((match) => match.match(/import \{ (\w+) \} from/)?.[1])
        .filter((name): name is string => name !== undefined);

      const namespaceResults = await Promise.all(
        namespaceNames.map(async (nsName) => {
          const nsFile = path.join(langDir, `${nsName}.ts`);
          try {
            const content = await fs.promises.readFile(nsFile, 'utf-8');
            const nsKeys = this.extractKeysFromNamespace(content, nsName);
            return { success: true, keys: nsKeys };
          } catch {
            return { success: false, keys: [] as string[] };
          }
        }),
      );

      for (const result of namespaceResults) {
        if (result.success) {
          result.keys.forEach((key) => keys.add(key));
        }
      }
    } catch {
      // index.ts doesn't exist or can't be read
    }

    return keys;
  }

  /**
   * Extract keys from namespace file content
   */
  private extractKeysFromNamespace(content: string, namespace: string): string[] {
    const keys: string[] = [];

    // Match export const Namespace = { ... };
    const exportMatch = content.match(/export const \w+ = \{([\s\S]*?)\};/);
    if (!exportMatch) {
      return keys;
    }

    // Extract keys from object literal
    const keyPattern = /(\w+):/g;
    let match;
    while ((match = keyPattern.exec(exportMatch[1])) !== null) {
      keys.push(`${namespace}.${match[1]}`);
    }

    return keys;
  }

  /**
   * Calculate translation completeness for a language
   */
  calculateCompleteness(
    langKeys: Set<string>,
    referenceKeys: Set<string>,
  ): TranslationCompleteness {
    const missing: string[] = [];

    for (const key of referenceKeys) {
      if (!langKeys.has(key)) {
        missing.push(key);
      }
    }

    const total = referenceKeys.size;
    const missingCount = missing.length;
    const percentage = total > 0 ? Math.round(((total - missingCount) / total) * 100) : 100;

    return {
      total,
      missing: missingCount,
      percentage,
      missingKeys: missing,
    };
  }

  /**
   * Get statistics about loaded translations
   */
  getStats(langKeys: Map<string, Set<string>>): Array<{
    language: string;
    keyCount: number;
  }> {
    return Array.from(langKeys.entries()).map(([lang, keys]) => ({
      language: lang,
      keyCount: keys.size,
    }));
  }
}
