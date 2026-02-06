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
 *   npx tsx scripts/translation-validator/index.ts
 *   npx tsx scripts/translation-validator/index.ts --fix
 */

import { TranslationValidator } from './validator';
import { ConsoleLogger } from './logger';

async function main() {
  const args = process.argv.slice(2);
  const fixMode = args.includes('--fix');
  const verbose = args.includes('--verbose');
  const noCache = args.includes('--no-cache');

  const logger = new ConsoleLogger();

  if (fixMode) {
    logger.info('Running in fix mode (not yet implemented)');
  }

  const validator = new TranslationValidator({
    logger,
    enableCache: !noCache,
  });

  try {
    const result = await validator.validate();

    if (!validator.isValid(result)) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    logger.error(`Validation failed: ${errorMessage}`);
    if (verbose && errorStack) {
      logger.debug(errorStack);
    }
    process.exit(1);
  }
}

main();
