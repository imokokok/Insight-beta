#!/usr/bin/env ts-node
/**
 * Schema Consistency Validation Script
 *
 * 校验代码中的 SQL 查询与 Supabase migrations 的一致性
 * 防止出现"遗留命名"问题
 *
 * 使用方法:
 *   npx ts-node scripts/validate-schema-consistency.ts
 *   或
 *   npm run validate-schema
 */

import * as fs from 'fs';
import * as path from 'path';

import { sync as globSync } from 'glob';

// ============================================================================
// 配置
// ============================================================================

const CONFIG = {
  // Migrations 目录
  migrationsDir: 'supabase/migrations',
  // 源代码目录
  srcDir: 'src',
  // 需要检查的 SQL 表名（来自 migrations）
  expectedTables: [] as string[],
  // 已知的遗留/废弃表名
  deprecatedTables: ['unified_price_comparisons', 'price_comparisons', 'oracle_comparisons'],
  // 忽略的文件模式
  ignorePatterns: [
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/node_modules/**',
    '**/i18n/**', // 忽略 i18n 文件（包含很多非 SQL 的 FROM 关键词）
    '**/types/**', // 忽略类型定义文件
  ],
  // 忽略的表名（常见误报）
  ignoreTables: [
    // PostgreSQL 系统表
    'pg_indexes',
    'pg_stat_user_tables',
    'pg_stat_user_indexes',
    'pg_index',
    'pg_stat_activity',
    'pg_tables',
    // 常见 SQL 关键词误报
    'all',
    'the',
    'set',
    'a',
    'time',
    'number',
    'address',
    'state',
    'role',
    'refs',
    'types',
    'cache',
    'actual',
    'failed',
    'last',
    'quartiles',
    'consensus',
    'latency',
    'frequency',
    'every',
    'watchlist',
    'oracle',
    'timestamp',
    'environment',
    'institutional',
    'localstorage',
    'database',
    'configuration',
    'lib',
    'monitoring',
    'detection',
    'network',
    'oraclemonitor',
    'unifiedservice',
    'sync',
    'unified',
    // 其他非表名
    'uma_oracle_config',
    'uma_sync_state',
    'oracle_instances',
    'oracle_sync_state',
    'oracle_config',
    'sync_state',
    'assertions',
    'disputes',
    'votes',
    'oracle_assertions',
    'oracle_disputes',
    'oracle_votes',
    'oracle_rewards',
    'oracle_staking',
    'notification',
    'notification_channels',
    'developers',
    'api_keys',
    'developer',
    'api_usage_stats',
    'billing_records',
    'rate_limit_events',
    'oracle_price_feeds',
    'latest_prices',
    'unified_sync_errors',
    'oracle_configs',
  ],
};

// ============================================================================
// 类型定义
// ============================================================================

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalFiles: number;
    checkedFiles: number;
    tablesFound: Set<string>;
  };
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 从 migrations 文件中提取表名
 */
function extractTablesFromMigrations(): string[] {
  const tables = new Set<string>();
  const migrationsPath = path.join(process.cwd(), CONFIG.migrationsDir);

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (!fs.existsSync(migrationsPath)) {
    console.warn(`⚠️ Migrations directory not found: ${migrationsPath}`);
    return [];
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const migrationFiles = fs
    .readdirSync(migrationsPath)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => path.join(migrationsPath, f));

  for (const file of migrationFiles) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const content = fs.readFileSync(file, 'utf-8');

    // 匹配 CREATE TABLE 语句
    // eslint-disable-next-line security/detect-unsafe-regex
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
    let match;
    while ((match = createTableRegex.exec(content)) !== null) {
      const tableName = match[1];
      if (tableName) {
        tables.add(tableName.toLowerCase());
      }
    }
  }

  return Array.from(tables);
}

/**
 * 从源代码中提取 SQL 表名引用
 */
function extractTablesFromSource(filePath: string): string[] {
  const tables = new Set<string>();
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const content = fs.readFileSync(filePath, 'utf-8');

  // 匹配 FROM 子句
  const fromRegex = /FROM\s+(\w+)/gi;
  let match;
  while ((match = fromRegex.exec(content)) !== null) {
    const tableName = match[1];
    if (tableName) {
      tables.add(tableName.toLowerCase());
    }
  }

  // 匹配 INSERT INTO 子句
  const insertRegex = /INSERT\s+INTO\s+(\w+)/gi;
  while ((match = insertRegex.exec(content)) !== null) {
    const tableName = match[1];
    if (tableName) {
      tables.add(tableName.toLowerCase());
    }
  }

  // 匹配 UPDATE 子句
  const updateRegex = /UPDATE\s+(\w+)/gi;
  while ((match = updateRegex.exec(content)) !== null) {
    const tableName = match[1];
    if (tableName) {
      tables.add(tableName.toLowerCase());
    }
  }

  // 匹配 JOIN 子句
  const joinRegex = /JOIN\s+(\w+)/gi;
  while ((match = joinRegex.exec(content)) !== null) {
    const tableName = match[1];
    if (tableName) {
      tables.add(tableName.toLowerCase());
    }
  }

  return Array.from(tables);
}

/**
 * 检查文件是否包含 SQL 查询
 */
function containsSqlQueries(filePath: string): boolean {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const content = fs.readFileSync(filePath, 'utf-8');
  const sqlPatterns = [
    /\bFROM\s+\w+/i,
    /\bINSERT\s+INTO\s+\w+/i,
    /\bUPDATE\s+\w+/i,
    /\bJOIN\s+\w+/i,
  ];
  return sqlPatterns.some((pattern) => pattern.test(content));
}

/**
 * 获取所有需要检查的源文件
 */
function getSourceFiles(): string[] {
  const srcPath = path.join(process.cwd(), CONFIG.srcDir);

  const files = globSync('**/*.ts', {
    cwd: srcPath,
    absolute: true,
    ignore: CONFIG.ignorePatterns,
  });

  return files.filter(containsSqlQueries);
}

// ============================================================================
// 主校验逻辑
// ============================================================================

function validateSchemaConsistency(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    stats: {
      totalFiles: 0,
      checkedFiles: 0,
      tablesFound: new Set(),
    },
  };

  console.log('🔍 Starting schema consistency validation...\n');

  // 1. 从 migrations 提取表名
  console.log('📁 Extracting tables from migrations...');
  const migrationTables = extractTablesFromMigrations();
  console.log(`   Found ${migrationTables.length} tables in migrations:`);
  migrationTables.forEach((t) => console.log(`   - ${t}`));
  console.log();

  // 2. 获取所有源文件
  console.log('📄 Scanning source files...');
  const sourceFiles = getSourceFiles();
  result.stats.totalFiles = sourceFiles.length;
  console.log(`   Found ${sourceFiles.length} files with SQL queries\n`);

  // 3. 检查每个文件
  console.log('🔎 Checking SQL queries in source files...');
  for (const file of sourceFiles) {
    const relativePath = path.relative(process.cwd(), file);
    const tablesInFile = extractTablesFromSource(file);

    if (tablesInFile.length === 0) continue;

    result.stats.checkedFiles++;
    tablesInFile.forEach((t) => result.stats.tablesFound.add(t));

    // 检查是否使用了废弃的表名
    for (const table of tablesInFile) {
      if (CONFIG.deprecatedTables.includes(table)) {
        result.valid = false;
        result.errors.push(
          `❌ DEPRECATED TABLE: "${table}" found in ${relativePath}\n   ` +
            `   This table name is deprecated. Use "cross_oracle_comparisons" instead.`,
        );
      }
    }

    // 检查是否使用了 migrations 中不存在的表名
    for (const table of tablesInFile) {
      if (
        !migrationTables.includes(table) &&
        !CONFIG.deprecatedTables.includes(table) &&
        !CONFIG.ignoreTables.includes(table)
      ) {
        // 可能是动态表名或临时表，发出警告
        result.warnings.push(
          `⚠️ UNKNOWN TABLE: "${table}" found in ${relativePath}\n   ` +
            `   This table is not defined in migrations. Please verify if it's intentional.`,
        );
      }
    }
  }

  console.log();

  // 4. 生成报告
  console.log('📊 Validation Report:');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total files scanned: ${result.stats.totalFiles}`);
  console.log(`Files with SQL queries: ${result.stats.checkedFiles}`);
  console.log(`Unique tables referenced: ${result.stats.tablesFound.size}`);
  console.log();

  if (result.errors.length > 0) {
    console.log(`❌ ERRORS (${result.errors.length}):`);
    result.errors.forEach((e) => console.log(e));
    console.log();
  }

  if (result.warnings.length > 0) {
    console.log(`⚠️ WARNINGS (${result.warnings.length}):`);
    result.warnings.forEach((w) => console.log(w));
    console.log();
  }

  if (result.valid && result.errors.length === 0) {
    console.log('✅ All checks passed! No deprecated table names found.');
  }

  console.log('═══════════════════════════════════════════════════════════════');

  return result;
}

// ============================================================================
// 运行
// ============================================================================

const result = validateSchemaConsistency();

if (!result.valid) {
  console.log('\n❌ Validation failed. Please fix the errors above.');
  process.exit(1);
} else if (result.warnings.length > 0) {
  console.log('\n⚠️ Validation completed with warnings.');
  process.exit(0);
} else {
  console.log('\n✅ Validation completed successfully!');
  process.exit(0);
}
