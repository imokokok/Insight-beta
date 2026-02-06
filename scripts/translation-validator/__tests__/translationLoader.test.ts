/* eslint-disable security/detect-non-literal-fs-filename */
import { describe, it, expect, beforeEach } from 'vitest';
import { TranslationLoader } from '../translationLoader';
import { DEFAULT_CONFIG } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('TranslationLoader', () => {
  let tempDir: string;
  let localesDir: string;
  let loader: TranslationLoader;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'translation-loader-test-'));
    localesDir = path.join(tempDir, 'locales');
    await fs.promises.mkdir(localesDir, { recursive: true });

    const config = {
      ...DEFAULT_CONFIG,
      localesDir,
    };

    loader = new TranslationLoader(config);
  });

  describe('loadAllTranslations', () => {
    it('should load translations from multiple languages', async () => {
      // Create English translations
      const enDir = path.join(localesDir, 'en');
      await fs.promises.mkdir(enDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(enDir, 'index.ts'),
        `import { common } from './common';\nexport const en = { common };`,
      );
      await fs.promises.writeFile(
        path.join(enDir, 'common.ts'),
        `export const common = { hello: 'Hello', world: 'World' };`,
      );

      // Create Spanish translations
      const esDir = path.join(localesDir, 'es');
      await fs.promises.mkdir(esDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(esDir, 'index.ts'),
        `import { common } from './common';\nexport const es = { common };`,
      );
      await fs.promises.writeFile(
        path.join(esDir, 'common.ts'),
        `export const common = { hello: 'Hola' };`,
      );

      const langKeys = await loader.loadAllTranslations();

      expect(langKeys.has('en')).toBe(true);
      expect(langKeys.has('es')).toBe(true);

      const enKeys = langKeys.get('en');
      expect(enKeys?.has('common.hello')).toBe(true);
      expect(enKeys?.has('common.world')).toBe(true);
    });

    it('should handle missing index.ts gracefully', async () => {
      const emptyDir = path.join(localesDir, 'empty');
      await fs.promises.mkdir(emptyDir, { recursive: true });

      const langKeys = await loader.loadAllTranslations();

      expect(langKeys.get('empty')?.size).toBe(0);
    });

    it('should handle missing namespace files gracefully', async () => {
      const enDir = path.join(localesDir, 'en');
      await fs.promises.mkdir(enDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(enDir, 'index.ts'),
        `import { common } from './common';\nimport { missing } from './missing';\nexport const en = { common, missing };`,
      );
      await fs.promises.writeFile(
        path.join(enDir, 'common.ts'),
        `export const common = { hello: 'Hello' };`,
      );

      const langKeys = await loader.loadAllTranslations();

      const enKeys = langKeys.get('en');
      expect(enKeys?.has('common.hello')).toBe(true);
      expect(enKeys?.has('missing.anything')).toBe(false);
    });
  });

  describe('calculateCompleteness', () => {
    it('should calculate 100% completeness when all keys present', () => {
      const langKeys = new Set(['a', 'b', 'c']);
      const referenceKeys = new Set(['a', 'b', 'c']);

      const result = loader.calculateCompleteness(langKeys, referenceKeys);

      expect(result.percentage).toBe(100);
      expect(result.missing).toBe(0);
      expect(result.total).toBe(3);
    });

    it('should calculate partial completeness', () => {
      const langKeys = new Set(['a', 'b']);
      const referenceKeys = new Set(['a', 'b', 'c', 'd']);

      const result = loader.calculateCompleteness(langKeys, referenceKeys);

      expect(result.percentage).toBe(50);
      expect(result.missing).toBe(2);
      expect(result.missingKeys).toContain('c');
      expect(result.missingKeys).toContain('d');
    });

    it('should handle empty reference', () => {
      const langKeys = new Set<string>();
      const referenceKeys = new Set<string>();

      const result = loader.calculateCompleteness(langKeys, referenceKeys);

      expect(result.percentage).toBe(100);
      expect(result.total).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return statistics for all languages', () => {
      const langKeys = new Map([
        ['en', new Set(['a', 'b', 'c'])],
        ['es', new Set(['a', 'b'])],
        ['fr', new Set(['a'])],
      ]);

      const stats = loader.getStats(langKeys);

      expect(stats).toHaveLength(3);
      expect(stats.find((s) => s.language === 'en')?.keyCount).toBe(3);
      expect(stats.find((s) => s.language === 'es')?.keyCount).toBe(2);
      expect(stats.find((s) => s.language === 'fr')?.keyCount).toBe(1);
    });
  });

  describe('caching', () => {
    it('should cache results when enabled', async () => {
      const enDir = path.join(localesDir, 'en');
      await fs.promises.mkdir(enDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(enDir, 'index.ts'),
        `import { common } from './common';\nexport const en = { common };`,
      );
      await fs.promises.writeFile(
        path.join(enDir, 'common.ts'),
        `export const common = { hello: 'Hello' };`,
      );

      loader.enableCache();

      // First load
      const keys1 = await loader.loadAllTranslations();

      // Modify file
      await fs.promises.writeFile(
        path.join(enDir, 'common.ts'),
        `export const common = { hello: 'Hello', world: 'World' };`,
      );

      // Second load should return cached result
      const keys2 = await loader.loadAllTranslations();

      expect(keys1.get('en')?.size).toBe(keys2.get('en')?.size);
    });
  });
});
