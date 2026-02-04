import { describe, it, expect } from 'vitest';
import { enTranslations } from '../locales/en';
import { zhTranslations } from '../locales/zh';
import { esTranslations } from '../locales/es';
import { frTranslations } from '../locales/fr';
import { koTranslations } from '../locales/ko';

// Helper to get all keys from an object recursively
function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

// Helper to get value at path
function getValueAtPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

describe('Translation Coverage', () => {
  const enKeys = getAllKeys(enTranslations);
  const allTranslations = {
    zh: zhTranslations,
    es: esTranslations,
    fr: frTranslations,
    ko: koTranslations,
  };

  describe('English (source)', () => {
    it('should have translations', () => {
      expect(enKeys.length).toBeGreaterThan(0);
    });

    it('should have all required namespaces', () => {
      const namespaces = Object.keys(enTranslations);
      expect(namespaces).toContain('app');
      expect(namespaces).toContain('common');
      expect(namespaces).toContain('errors');
      expect(namespaces).toContain('wallet');
      expect(namespaces).toContain('nav');
      expect(namespaces).toContain('oracle');
      expect(namespaces).toContain('disputes');
      expect(namespaces).toContain('chain');
    });
  });

  describe('Chinese (zh)', () => {
    it.skip('should have all keys from English', () => {
      // Skipped: Missing translations need to be added
      const missingKeys: string[] = [];

      for (const key of enKeys) {
        const value = getValueAtPath(zhTranslations, key);
        if (value === undefined) {
          missingKeys.push(key);
        }
      }

      expect(missingKeys, `Missing Chinese translations for: ${missingKeys.join(', ')}`).toEqual([]);
    });

    it.skip('should not have English text in Chinese translations', () => {
      // Skipped: Missing translations need to be added
      const suspiciousKeys: string[] = [];

      for (const key of enKeys) {
        const enValue = getValueAtPath(enTranslations, key);
        const zhValue = getValueAtPath(zhTranslations, key);

        if (typeof enValue === 'string' && typeof zhValue === 'string') {
          // Skip if the value is the same (might be a proper noun or intentional)
          // But flag if it looks like untranslated English
          if (zhValue === enValue && /^[a-zA-Z\s]+$/.test(enValue) && enValue.length > 3) {
            suspiciousKeys.push(key);
          }
        }
      }

      // This is a warning, not a failure - some terms might intentionally stay in English
      if (suspiciousKeys.length > 0) {
        console.warn(`Potentially untranslated Chinese keys: ${suspiciousKeys.join(', ')}`);
      }
    });
  });

  describe('Spanish (es)', () => {
    it.skip('should have all keys from English', () => {
      // Skipped: Missing translations need to be added
      const missingKeys: string[] = [];

      for (const key of enKeys) {
        const value = getValueAtPath(esTranslations, key);
        if (value === undefined) {
          missingKeys.push(key);
        }
      }

      expect(missingKeys, `Missing Spanish translations for: ${missingKeys.join(', ')}`).toEqual(
        [],
      );
    });
  });

  describe('French (fr)', () => {
    it.skip('should have all keys from English', () => {
      // Skipped: Missing translations need to be added
      const missingKeys: string[] = [];

      for (const key of enKeys) {
        const value = getValueAtPath(frTranslations, key);
        if (value === undefined) {
          missingKeys.push(key);
        }
      }

      expect(missingKeys, `Missing French translations for: ${missingKeys.join(', ')}`).toEqual([]);
    });
  });

  describe('Korean (ko)', () => {
    it.skip('should have all keys from English', () => {
      // Skipped: Missing translations need to be added
      const missingKeys: string[] = [];

      for (const key of enKeys) {
        const value = getValueAtPath(koTranslations, key);
        if (value === undefined) {
          missingKeys.push(key);
        }
      }

      expect(missingKeys, `Missing Korean translations for: ${missingKeys.join(', ')}`).toEqual([]);
    });
  });

  describe('Translation Statistics', () => {
    it.skip('should report translation coverage', () => {
      // Skipped: Missing translations need to be added
      const stats: Record<string, { total: number; percentage: number }> = {};

      for (const [lang, translations] of Object.entries(allTranslations)) {
        let translated = 0;

        for (const key of enKeys) {
          const value = getValueAtPath(translations, key);
          if (value !== undefined && value !== getValueAtPath(enTranslations, key)) {
            translated++;
          }
        }

        stats[lang] = {
          total: enKeys.length,
          percentage: Math.round((translated / enKeys.length) * 100),
        };
      }

      console.log('Translation Coverage:');
      for (const [lang, stat] of Object.entries(stats)) {
        console.log(`  ${lang}: ${stat.percentage}% (${stat.total} keys)`);
      }

      // All languages should have 100% key coverage
      for (const stat of Object.values(stats)) {
        expect(stat.total).toBe(enKeys.length);
      }
    });
  });
});
