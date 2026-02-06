#!/usr/bin/env tsx
/**
 * Translation Validator Logger
 */

import type { Logger } from './types';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

type ColorName = keyof typeof colors;

export class ConsoleLogger implements Logger {
  private useColors: boolean;

  constructor(useColors = true) {
    this.useColors = useColors;
  }

  private format(message: string, color: ColorName): string {
    if (!this.useColors) return message;
    return `${colors[color]}${message}${colors.reset}`;
  }

  info(message: string): void {
    console.log(this.format(`ℹ️  ${message}`, 'blue'));
  }

  success(message: string): void {
    console.log(this.format(`✅ ${message}`, 'green'));
  }

  warning(message: string): void {
    console.log(this.format(`⚠️  ${message}`, 'yellow'));
  }

  error(message: string): void {
    console.log(this.format(`❌ ${message}`, 'red'));
  }

  debug(message: string): void {
    console.log(this.format(`🐛 ${message}`, 'gray'));
  }

  section(title: string): void {
    console.log(this.format(`\n🔍 ${title}`, 'cyan'));
  }

  progress(current: number, total: number, operation: string): void {
    const percentage = Math.round((current / total) * 100);
    const bar =
      '█'.repeat(Math.round(percentage / 5)) + '░'.repeat(20 - Math.round(percentage / 5));
    console.log(this.format(`   ${bar} ${percentage}% - ${operation}`, 'blue'));
  }

  summary(results: {
    totalKeys: number;
    usedKeys: number;
    missingCount: number;
    unusedCount: number;
  }): void {
    console.log(this.format('\n═══════════════════════════════════════', 'cyan'));
    console.log(this.format('Summary:', 'cyan'));
    console.log(this.format(`  Total keys in English: ${results.totalKeys}`, 'blue'));
    console.log(this.format(`  Keys used in code: ${results.usedKeys}`, 'blue'));
    console.log(
      this.format(
        `  Missing in translations: ${results.missingCount}`,
        results.missingCount === 0 ? 'green' : 'red',
      ),
    );
    console.log(this.format(`  Potentially unused: ${results.unusedCount}`, 'magenta'));
    console.log(this.format('═══════════════════════════════════════\n', 'cyan'));
  }
}

export const logger = new ConsoleLogger();
