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

// Helper to check if a value is a leaf (string) value
function isLeafValue(value: unknown): boolean {
  return typeof value === 'string';
}

describe('Translation Coverage', () => {
  const enKeys = getAllKeys(enTranslations);
  const allTranslations = {
    zh: { translations: zhTranslations, name: 'Chinese' },
    es: { translations: esTranslations, name: 'Spanish' },
    fr: { translations: frTranslations, name: 'French' },
    ko: { translations: koTranslations, name: 'Korean' },
  };

  describe('English (source)', () => {
    it('should have translations', () => {
      expect(enKeys.length).toBeGreaterThan(0);
    });

    it('should have all required namespaces', () => {
      const namespaces = Object.keys(enTranslations);
      const requiredNamespaces = [
        'app',
        'common',
        'errors',
        'wallet',
        'nav',
        'oracle',
        'disputes',
        'chain',
      ];

      for (const ns of requiredNamespaces) {
        expect(namespaces).toContain(ns);
      }
    });

    it('should have string values for all leaf keys', () => {
      const nonStringKeys: string[] = [];

      for (const key of enKeys) {
        const value = getValueAtPath(enTranslations, key);
        if (!isLeafValue(value)) {
          nonStringKeys.push(key);
        }
      }

      expect(nonStringKeys).toEqual([]);
    });
  });

  describe('Translation Completeness', () => {
    for (const [, { translations, name }] of Object.entries(allTranslations)) {
      describe(`${name}`, () => {
        it(`should have all keys from English`, () => {
          const missingKeys: string[] = [];

          for (const key of enKeys) {
            const value = getValueAtPath(translations, key);
            if (value === undefined) {
              missingKeys.push(key);
            }
          }

          if (missingKeys.length > 0) {
            console.warn(`Missing ${name} translations:`, missingKeys);
          }

          // Allow up to 10% missing keys (gradual migration)
          const missingPercentage = (missingKeys.length / enKeys.length) * 100;
          expect(missingPercentage).toBeLessThanOrEqual(10);
        });

        it(`should not have extra keys not in English`, () => {
          const targetKeys = getAllKeys(translations);
          const extraKeys: string[] = [];

          for (const key of targetKeys) {
            const enValue = getValueAtPath(enTranslations, key);
            if (enValue === undefined) {
              extraKeys.push(key);
            }
          }

          expect(extraKeys).toEqual([]);
        });

        it(`should have string values for all leaf keys`, () => {
          const targetKeys = getAllKeys(translations);
          const nonStringKeys: string[] = [];

          for (const key of targetKeys) {
            const value = getValueAtPath(translations, key);
            if (value !== undefined && !isLeafValue(value)) {
              nonStringKeys.push(key);
            }
          }

          expect(nonStringKeys).toEqual([]);
        });
      });
    }
  });

  describe('Translation Quality', () => {
    it('should not have empty translations', () => {
      const emptyKeys: Record<string, string[]> = {};

      for (const [, { translations, name }] of Object.entries(allTranslations)) {
        const targetKeys = getAllKeys(translations);
        emptyKeys[name] = [];

        for (const key of targetKeys) {
          const value = getValueAtPath(translations, key);
          if (value === '') {
            emptyKeys[name].push(key);
          }
        }
      }

      const hasEmpty = Object.values(emptyKeys).some((keys) => keys.length > 0);
      if (hasEmpty) {
        console.warn('Empty translations found:', emptyKeys);
      }

      // Allow some empty strings during development
      for (const keys of Object.values(emptyKeys)) {
        expect(keys.length).toBeLessThanOrEqual(5);
      }
    });

    it('should report translation coverage statistics', () => {
      const stats: Record<string, { total: number; translated: number; percentage: number }> = {};

      for (const [, { translations, name }] of Object.entries(allTranslations)) {
        let translated = 0;

        for (const key of enKeys) {
          const value = getValueAtPath(translations, key);
          const enValue = getValueAtPath(enTranslations, key);

          if (value !== undefined && value !== '' && value !== enValue) {
            translated++;
          }
        }

        stats[name] = {
          total: enKeys.length,
          translated,
          percentage: Math.round((translated / enKeys.length) * 100),
        };
      }

      console.log('\n📊 Translation Coverage Report:');
      console.log('═══════════════════════════════════════');
      for (const [name, stat] of Object.entries(stats)) {
        const bar =
          '█'.repeat(Math.round(stat.percentage / 5)) +
          '░'.repeat(20 - Math.round(stat.percentage / 5));
        console.log(
          `${name.padEnd(10)} ${bar} ${stat.percentage}% (${stat.translated}/${stat.total})`,
        );
      }
      console.log('═══════════════════════════════════════\n');

      // All languages should have at least 50% coverage
      for (const stat of Object.values(stats)) {
        expect(stat.percentage).toBeGreaterThanOrEqual(50);
      }
    });
  });

  describe('Namespace Consistency', () => {
    it('should have consistent namespace structure across all languages', () => {
      const enNamespaces = Object.keys(enTranslations).sort();

      for (const [, { translations }] of Object.entries(allTranslations)) {
        const targetNamespaces = Object.keys(translations).sort();
        expect(targetNamespaces).toEqual(enNamespaces);
      }
    });
  });
});
