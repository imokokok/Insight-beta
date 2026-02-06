/* eslint-disable security/detect-non-literal-fs-filename */
import { describe, it, expect, beforeEach } from 'vitest';
import { KeyExtractor } from '../keyExtractor';
import { DEFAULT_CONFIG } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('KeyExtractor', () => {
  let tempDir: string;
  let extractor: KeyExtractor;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'translation-test-'));

    const config = {
      ...DEFAULT_CONFIG,
      srcDir: tempDir,
    };

    extractor = new KeyExtractor(config);
  });

  describe('extractUsedKeys', () => {
    it('should extract keys from t() function calls', async () => {
      const testFile = path.join(tempDir, 'test.tsx');
      await fs.promises.writeFile(
        testFile,
        `
        const title = t('common.title');
        const description = t('common.description');
        `,
      );

      const keys = await extractor.extractUsedKeys();

      expect(keys.has('common.title')).toBe(true);
      expect(keys.has('common.description')).toBe(true);
      expect(keys.size).toBe(2);
    });

    it('should extract keys from tn() function calls', async () => {
      const testFile = path.join(tempDir, 'test.tsx');
      await fs.promises.writeFile(
        testFile,
        `
        const count = tn('items.count', count);
        `,
      );

      const keys = await extractor.extractUsedKeys();

      expect(keys.has('items.count')).toBe(true);
    });

    it('should extract keys from TranslationKeys references', async () => {
      const testFile = path.join(tempDir, 'test.ts');
      await fs.promises.writeFile(
        testFile,
        `
        const key = TranslationKeys.common.save;
        `,
      );

      const keys = await extractor.extractUsedKeys();

      expect(keys.has('common.save')).toBe(true);
    });

    it('should skip dynamic keys', async () => {
      const testFile = path.join(tempDir, 'test.tsx');
      await fs.promises.writeFile(
        testFile,
        `
        const key = 'common.' + dynamicPart;
        const template = t(\`common.\${key}\`);
        `,
      );

      const keys = await extractor.extractUsedKeys();

      expect(keys.size).toBe(0);
    });

    it('should handle multiple files', async () => {
      await fs.promises.writeFile(path.join(tempDir, 'file1.tsx'), `const a = t('key.a');`);
      await fs.promises.writeFile(path.join(tempDir, 'file2.tsx'), `const b = t('key.b');`);

      const keys = await extractor.extractUsedKeys();

      expect(keys.has('key.a')).toBe(true);
      expect(keys.has('key.b')).toBe(true);
      expect(keys.size).toBe(2);
    });
  });

  describe('caching', () => {
    it('should cache results when enabled', async () => {
      const testFile = path.join(tempDir, 'test.tsx');
      await fs.promises.writeFile(testFile, `const a = t('key.a');`);

      extractor.enableCache();

      // First extraction
      const keys1 = await extractor.extractUsedKeys();

      // Modify file
      await fs.promises.writeFile(testFile, `const a = t('key.a'); const b = t('key.b');`);

      // Second extraction should return cached result
      const keys2 = await extractor.extractUsedKeys();

      expect(keys1.size).toBe(keys2.size);
      expect(keys2.has('key.b')).toBe(false);
    });

    it('should clear cache when requested', async () => {
      const testFile = path.join(tempDir, 'test.tsx');
      await fs.promises.writeFile(testFile, `const a = t('key.a');`);

      extractor.enableCache();
      await extractor.extractUsedKeys();

      // Modify file and clear cache
      await fs.promises.writeFile(testFile, `const a = t('key.a'); const b = t('key.b');`);
      extractor.clearCache();

      const keys = await extractor.extractUsedKeys();

      expect(keys.has('key.b')).toBe(true);
    });
  });

  describe('getPatternStats', () => {
    it('should return pattern statistics', () => {
      const stats = extractor.getPatternStats();

      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0]).toHaveProperty('name');
      expect(stats[0]).toHaveProperty('pattern');
    });
  });
});
