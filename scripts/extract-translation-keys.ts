#!/usr/bin/env tsx
/**
 * 翻译键提取工具
 *
 * 功能：
 * 1. 扫描源代码中的 t() 和 tn() 函数调用
 * 2. 提取所有使用的翻译键
 * 3. 对比翻译文件，找出未使用的键和缺失的键
 * 4. 生成报告
 *
 * 使用方法：
 *   npx tsx scripts/extract-translation-keys.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');
const LOCALES_DIR = path.join(SRC_DIR, 'i18n/locales');
const SOURCE_LANG = 'en';

// 匹配 t('key') 或 t("key") 或 t(`key`)
const T_FUNCTION_REGEX = /\bt\s*\(\s*['"`]([^'"`]+)['"`]/g;
// 匹配 tn('key', ...)
const TN_FUNCTION_REGEX = /\btn\s*\(\s*['"`]([^'"`]+)['"`]/g;

interface ExtractionResult {
  usedKeys: Set<string>;
  fileKeys: Map<string, string[]>;
  totalFiles: number;
}

interface ComparisonResult {
  definedKeys: Set<string>;
  usedKeys: Set<string>;
  unusedKeys: Set<string>;
  missingKeys: Set<string>;
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

// 从文件内容提取翻译键
function extractKeysFromContent(content: string, _filePath: string): string[] {
  const keys: string[] = [];

  // 提取 t() 调用
  let match;
  while ((match = T_FUNCTION_REGEX.exec(content)) !== null) {
    keys.push(match[1]);
  }

  // 提取 tn() 调用
  while ((match = TN_FUNCTION_REGEX.exec(content)) !== null) {
    keys.push(match[1]);
  }

  return keys;
}

// 扫描所有源文件
async function scanSourceFiles(): Promise<ExtractionResult> {
  const files = await glob('**/*.{ts,tsx}', {
    cwd: SRC_DIR,
    ignore: ['**/*.d.ts', '**/node_modules/**', '**/i18n/locales/**'],
  });

  const usedKeys = new Set<string>();
  const fileKeys = new Map<string, string[]>();

  for (const file of files) {
    const filePath = path.join(SRC_DIR, file);
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const content = fs.readFileSync(filePath, 'utf-8');
    const keys = extractKeysFromContent(content, filePath);

    if (keys.length > 0) {
      fileKeys.set(file, keys);
      keys.forEach((key) => usedKeys.add(key));
    }
  }

  return {
    usedKeys,
    fileKeys,
    totalFiles: files.length,
  };
}

// 加载翻译文件
async function loadTranslationKeys(): Promise<Set<string>> {
  const enModule = await import(path.join(LOCALES_DIR, SOURCE_LANG, 'index.ts'));
  const enTranslations = enModule[`${SOURCE_LANG}Translations`] || enModule.default;
  const keys = getAllKeys(enTranslations);
  return new Set(keys);
}

// 比较使用的键和定义的键
async function compareKeys(): Promise<ComparisonResult> {
  const [sourceResult, definedKeys] = await Promise.all([scanSourceFiles(), loadTranslationKeys()]);

  const usedKeys = sourceResult.usedKeys;

  // 未使用的键：定义了但没有被使用
  const unusedKeys = new Set([...definedKeys].filter((key) => !usedKeys.has(key)));

  // 缺失的键：使用了但没有定义
  const missingKeys = new Set([...usedKeys].filter((key) => !definedKeys.has(key)));

  return {
    definedKeys,
    usedKeys,
    unusedKeys,
    missingKeys,
  };
}

// 主函数
async function main() {
  console.log('🔍 提取翻译键...\n');

  try {
    const sourceResult = await scanSourceFiles();
    console.log(`📁 扫描了 ${sourceResult.totalFiles} 个文件`);
    console.log(`🔑 发现 ${sourceResult.usedKeys.size} 个唯一翻译键\n`);

    const comparison = await compareKeys();

    console.log('📊 统计报告');
    console.log(`   定义的键: ${comparison.definedKeys.size}`);
    console.log(`   使用的键: ${comparison.usedKeys.size}`);
    console.log(`   未使用的键: ${comparison.unusedKeys.size}`);
    console.log(`   缺失的键: ${comparison.missingKeys.size}`);
    console.log('');

    // 显示未使用的键
    if (comparison.unusedKeys.size > 0) {
      console.log('⚠️  未使用的翻译键（可以考虑删除）:');
      const sortedUnused = [...comparison.unusedKeys].sort();
      sortedUnused.forEach((key) => console.log(`   - ${key}`));
      console.log('');
    }

    // 显示缺失的键
    if (comparison.missingKeys.size > 0) {
      console.log('❌ 缺失的翻译键（需要在翻译文件中添加）:');
      const sortedMissing = [...comparison.missingKeys].sort();
      sortedMissing.forEach((key) => console.log(`   - ${key}`));
      console.log('');
    }

    // 显示每个文件使用的键
    console.log('📁 各文件使用的翻译键:');
    for (const [file, keys] of sourceResult.fileKeys) {
      console.log(`   ${file}:`);
      keys.forEach((key) => console.log(`      - ${key}`));
    }

    // 生成 JSON 报告
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: sourceResult.totalFiles,
        definedKeys: comparison.definedKeys.size,
        usedKeys: comparison.usedKeys.size,
        unusedKeys: comparison.unusedKeys.size,
        missingKeys: comparison.missingKeys.size,
      },
      unusedKeys: [...comparison.unusedKeys].sort(),
      missingKeys: [...comparison.missingKeys].sort(),
      fileUsage: Object.fromEntries(sourceResult.fileKeys),
    };

    const reportPath = path.join(__dirname, '../translation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📝 报告已保存到: ${reportPath}`);

    if (comparison.missingKeys.size > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 提取过程出错:', error);
    process.exit(1);
  }
}

main();
