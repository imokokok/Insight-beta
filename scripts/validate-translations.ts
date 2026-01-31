#!/usr/bin/env tsx
/**
 * 翻译验证脚本
 *
 * 功能：
 * 1. 检查所有语言是否包含英语的所有翻译键
 * 2. 检查是否有未使用的翻译键
 * 3. 检查是否有缺失的翻译键
 * 4. 生成翻译覆盖率报告
 *
 * 使用方法：
 *   npx tsx scripts/validate-translations.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const SOURCE_LANG = 'en';

interface ValidationResult {
  language: string;
  missingKeys: string[];
  extraKeys: string[];
  totalKeys: number;
  coverage: number;
}

// 递归获取对象的所有键路径
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

// 获取路径对应的值
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

// 验证翻译
async function validateTranslations(): Promise<ValidationResult[]> {
  const languages = fs.readdirSync(LOCALES_DIR).filter(
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    (dir) => fs.statSync(path.join(LOCALES_DIR, dir)).isDirectory(),
  );

  // 动态导入英语翻译
  const enModule = await import(path.join(LOCALES_DIR, SOURCE_LANG, 'index.ts'));
  const enTranslations = enModule[`${SOURCE_LANG}Translations`] || enModule.default;
  const sourceKeys = getAllKeys(enTranslations);

  const results: ValidationResult[] = [];

  for (const lang of languages) {
    if (lang === SOURCE_LANG) continue;

    const langModule = await import(path.join(LOCALES_DIR, lang, 'index.ts'));
    const langTranslations = langModule[`${lang}Translations`] || langModule.default;
    const langKeys = getAllKeys(langTranslations);

    const missingKeys = sourceKeys.filter(
      (key) => getValueAtPath(langTranslations, key) === undefined,
    );

    const extraKeys = langKeys.filter((key) => getValueAtPath(enTranslations, key) === undefined);

    results.push({
      language: lang,
      missingKeys,
      extraKeys,
      totalKeys: sourceKeys.length,
      coverage: Math.round(((sourceKeys.length - missingKeys.length) / sourceKeys.length) * 100),
    });
  }

  return results;
}

// 主函数
async function main() {
  console.log('🔍 验证翻译文件...\n');

  try {
    const results = await validateTranslations();

    let hasErrors = false;

    for (const result of results) {
      console.log(`📊 ${result.language.toUpperCase()}`);
      console.log(
        `   覆盖率: ${result.coverage}% (${result.totalKeys - result.missingKeys.length}/${result.totalKeys})`,
      );

      if (result.missingKeys.length > 0) {
        console.log(`   ❌ 缺失 ${result.missingKeys.length} 个键:`);
        result.missingKeys.forEach((key) => console.log(`      - ${key}`));
        hasErrors = true;
      }

      if (result.extraKeys.length > 0) {
        console.log(`   ⚠️  多余 ${result.extraKeys.length} 个键:`);
        result.extraKeys.forEach((key) => console.log(`      - ${key}`));
      }

      console.log('');
    }

    if (hasErrors) {
      console.log('❌ 验证失败，请修复缺失的翻译键');
      process.exit(1);
    } else {
      console.log('✅ 所有翻译文件验证通过！');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ 验证过程出错:', error);
    process.exit(1);
  }
}

main();
