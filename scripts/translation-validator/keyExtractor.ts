#!/usr/bin/env tsx
/**
 * Translation Key Extractor
 *
 * Extracts translation keys from source files using configurable patterns.
 */

/* eslint-disable security/detect-non-literal-fs-filename, security/detect-non-literal-regexp */
import * as fs from 'fs';
import * as path from 'path';
import type { ValidationConfig, KeyExtractionPattern } from './types';
import { KEY_EXTRACTION_PATTERNS } from './types';
import { FileScanner } from './fileScanner';

export interface ExtractionOptions {
  skipDynamicKeys?: boolean;
  cacheResults?: boolean;
}

export class KeyExtractor {
  private config: ValidationConfig;
  private patterns: KeyExtractionPattern[];
  private cache: Map<string, Set<string>> | null = null;

  constructor(
    config: ValidationConfig,
    patterns: KeyExtractionPattern[] = KEY_EXTRACTION_PATTERNS,
  ) {
    this.config = config;
    this.patterns = patterns;
  }

  /**
   * Enable caching for repeated extractions
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
   * Extract keys from all source files
   */
  async extractUsedKeys(options: ExtractionOptions = {}): Promise<Set<string>> {
    const { skipDynamicKeys = true } = options;
    const usedKeys = new Set<string>();

    // Use FileScanner instead of glob
    const scanner = new FileScanner({
      extensions: ['.ts', '.tsx'],
      ignorePatterns: [/node_modules/, /\.test\./, /\.spec\./, /__tests__/, /__mocks__/],
    });

    const files = await scanner.scan(this.config.srcDir);

    // Process files in batches for better memory usage
    const batchSize = 50;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (file: string) => {
          const keys = await this.extractKeysFromFile(
            path.join(this.config.srcDir, file),
            skipDynamicKeys,
          );
          keys.forEach((key) => usedKeys.add(key));
        }),
      );
    }

    return usedKeys;
  }

  /**
   * Extract keys from a single file
   */
  private async extractKeysFromFile(
    filePath: string,
    skipDynamicKeys: boolean,
  ): Promise<Set<string>> {
    // Check cache first
    if (this.cache?.has(filePath)) {
      return this.cache.get(filePath)!;
    }

    const keys = new Set<string>();

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');

      for (const { pattern: patternTemplate, extractGroup } of this.patterns) {
        // Create new regex instance to avoid lastIndex issues
        const pattern = new RegExp(patternTemplate.source, patternTemplate.flags);

        let match;
        while ((match = pattern.exec(content)) !== null) {
          const key = match[extractGroup];

          if (skipDynamicKeys && this.isDynamicKey(key)) {
            continue;
          }

          keys.add(key);
        }
      }

      // Cache results if enabled
      if (this.cache) {
        this.cache.set(filePath, keys);
      }
    } catch {
      // File read error, return empty set
    }

    return keys;
  }

  /**
   * Check if a key contains dynamic content
   */
  private isDynamicKey(key: string): boolean {
    return key.includes('${') || key.includes('+') || key.includes('`');
  }

  /**
   * Get statistics about extraction patterns
   */
  getPatternStats(): Array<{ name: string; pattern: string }> {
    return this.patterns.map((p) => ({
      name: p.name,
      pattern: p.pattern.source,
    }));
  }
}
