#!/usr/bin/env tsx
/**
 * Translation Validation Script
 *
 * This script validates translations by:
 * 1. Scanning source code for translation key usage
 * 2. Comparing used keys against translation files
 * 3. Reporting missing and unused translations
 *
 * Usage:
 *   npx tsx scripts/validate-translations.ts
 *   npx tsx scripts/validate-translations.ts --fix
 */

/* eslint-disable security/detect-non-literal-fs-filename */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Configuration
const SRC_DIR = path.join(process.cwd(), 'src');
const I18N_DIR = path.join(SRC_DIR, 'i18n');
const LOCALES_DIR = path.join(I18N_DIR, 'locales');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Extract translation keys from source files
async function extractUsedKeys(): Promise<Set<string>> {
  const usedKeys = new Set<string>();

  // Patterns to match translation key usage
  const patterns = [
    // t('key') or t("key")
    /t\(['"]([^'"]+)['"]/g,
    // tn('key', ...) or tn("key", ...)
    /tn\(['"]([^'"]+)['"]/g,
    // TranslationKeys.namespace.key
    /TranslationKeys\.([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_.]*)/g,
  ];

  const files = await glob('**/*.{ts,tsx}', {
    cwd: SRC_DIR,
    ignore: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
  });

  for (const file of files) {
    const content = fs.readFileSync(path.join(SRC_DIR, file), 'utf-8');

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const key = match[1];
        // Skip dynamic keys (containing variables)
        if (!key.includes('${') && !key.includes('+')) {
          usedKeys.add(key);
        }
      }
    }
  }

  return usedKeys;
}

// Get all keys from translation files
function getAllTranslationKeys(): Map<string, Set<string>> {
  const langKeys = new Map<string, Set<string>>();

  const langDirs = fs.readdirSync(LOCALES_DIR).filter((dir) => {
    return fs.statSync(path.join(LOCALES_DIR, dir)).isDirectory();
  });

  for (const lang of langDirs) {
    const keys = new Set<string>();
    const langDir = path.join(LOCALES_DIR, lang);

    // Read index.ts to get all namespaces
    const indexPath = path.join(langDir, 'index.ts');
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      const namespaceMatches = indexContent.match(/import \{ (\w+) \} from/g);

      if (namespaceMatches) {
        for (const match of namespaceMatches) {
          const nsName = match.match(/import \{ (\w+) \} from/)?.[1];
          if (nsName) {
            const nsFile = path.join(langDir, `${nsName}.ts`);
            if (fs.existsSync(nsFile)) {
              // Simple regex extraction (not perfect but works for most cases)
              const content = fs.readFileSync(nsFile, 'utf-8');
              const exportMatch = content.match(/export const \w+ = \{([\s\S]*?)\};/);
              if (exportMatch) {
                extractKeysFromText(exportMatch[1], nsName, keys);
              }
            }
          }
        }
      }
    }

    langKeys.set(lang, keys);
  }

  return langKeys;
}

function extractKeysFromText(text: string, namespace: string, keys: Set<string>) {
  // Simple key extraction from object literal
  const keyPattern = /(\w+):/g;
  let match;
  while ((match = keyPattern.exec(text)) !== null) {
    keys.add(`${namespace}.${match[1]}`);
  }
}

// Main validation function
async function validateTranslations() {
  log('🔍 Scanning source code for translation keys...', 'cyan');
  const usedKeys = await extractUsedKeys();
  log(`   Found ${usedKeys.size} unique translation keys in code`, 'green');

  log('\n📚 Loading translation files...', 'cyan');
  const langKeys = getAllTranslationKeys();

  const enKeys = langKeys.get('en');
  if (!enKeys) {
    log('❌ English translation file not found!', 'red');
    process.exit(1);
  }

  log(`   English: ${enKeys.size} keys`, 'blue');
  for (const [lang, keys] of langKeys) {
    if (lang !== 'en') {
      log(`   ${lang}: ${keys.size} keys`, 'blue');
    }
  }

  // Find missing translations (in code but not in en translations)
  log('\n⚠️  Missing Translation Keys (in code but not in en translations):', 'yellow');
  const missingInTranslations: string[] = [];
  for (const key of usedKeys) {
    if (!enKeys.has(key)) {
      missingInTranslations.push(key);
    }
  }

  if (missingInTranslations.length === 0) {
    log('   ✅ All used keys are defined in translations', 'green');
  } else {
    for (const key of missingInTranslations.slice(0, 20)) {
      log(`   - ${key}`, 'red');
    }
    if (missingInTranslations.length > 20) {
      log(`   ... and ${missingInTranslations.length - 20} more`, 'red');
    }
  }

  // Find unused translations (in en translations but not in code)
  log('\n🗑️  Potentially Unused Translation Keys:', 'yellow');
  const potentiallyUnused: string[] = [];
  for (const key of enKeys) {
    if (!usedKeys.has(key)) {
      potentiallyUnused.push(key);
    }
  }

  if (potentiallyUnused.length === 0) {
    log('   ✅ All translation keys are used in code', 'green');
  } else {
    for (const key of potentiallyUnused.slice(0, 20)) {
      log(`   - ${key}`, 'magenta');
    }
    if (potentiallyUnused.length > 20) {
      log(`   ... and ${potentiallyUnused.length - 20} more`, 'magenta');
    }
    log(`\n   ℹ️  These might be used dynamically or are truly unused`, 'cyan');
  }

  // Check translation completeness for other languages
  log('\n📊 Translation Completeness:', 'cyan');
  for (const [lang, keys] of langKeys) {
    if (lang === 'en') continue;

    const missing: string[] = [];
    for (const key of enKeys) {
      if (!keys.has(key)) {
        missing.push(key);
      }
    }

    const percentage = Math.round(((enKeys.size - missing.length) / enKeys.size) * 100);
    const bar =
      '█'.repeat(Math.round(percentage / 5)) + '░'.repeat(20 - Math.round(percentage / 5));

    if (missing.length === 0) {
      log(`   ${lang.toUpperCase().padEnd(2)} ${bar} ${percentage}% ✅`, 'green');
    } else {
      log(
        `   ${lang.toUpperCase().padEnd(2)} ${bar} ${percentage}% (${missing.length} missing)`,
        'yellow',
      );
    }
  }

  // Summary
  log('\n═══════════════════════════════════════', 'cyan');
  log('Summary:', 'cyan');
  log(`  Total keys in English: ${enKeys.size}`, 'blue');
  log(`  Keys used in code: ${usedKeys.size}`, 'blue');
  log(
    `  Missing in translations: ${missingInTranslations.length}`,
    missingInTranslations.length === 0 ? 'green' : 'red',
  );
  log(`  Potentially unused: ${potentiallyUnused.length}`, 'magenta');
  log('═══════════════════════════════════════\n', 'cyan');

  // Exit with error if there are missing keys
  if (missingInTranslations.length > 0) {
    process.exit(1);
  }
}

// Run validation
validateTranslations().catch((error) => {
  console.error('Validation failed:', error);
  process.exit(1);
});
