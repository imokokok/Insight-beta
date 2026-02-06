/**
 * Performance Budget Checker - 性能预算检查脚本
 *
 * 用于 CI/CD 中检查构建输出是否符合性能预算
 * - Bundle 大小检查
 * - 图片大小检查
 * - 第三方库大小检查
 */

/* eslint-disable security/detect-non-literal-fs-filename, security/detect-unsafe-regex */
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

interface BudgetConfig {
  type: 'bundle' | 'image' | 'library' | 'metric';
  name: string;
  maximumWarning: string;
  maximumError: string;
}

interface PerformanceBudget {
  budgets: BudgetConfig[];
}

interface CheckResult {
  name: string;
  type: string;
  actual: number;
  budget: number;
  status: 'pass' | 'warning' | 'error';
  message: string;
}

// 默认性能预算配置
const DEFAULT_BUDGET: PerformanceBudget = {
  budgets: [
    // Bundle 预算
    { type: 'bundle', name: 'main', maximumWarning: '150kb', maximumError: '200kb' },
    { type: 'bundle', name: 'vendor', maximumWarning: '250kb', maximumError: '300kb' },
    { type: 'bundle', name: 'recharts', maximumWarning: '100kb', maximumError: '150kb' },
    { type: 'bundle', name: 'viem', maximumWarning: '150kb', maximumError: '200kb' },

    // 图片预算
    { type: 'image', name: 'hero', maximumWarning: '100kb', maximumError: '200kb' },
    { type: 'image', name: 'icon', maximumWarning: '5kb', maximumError: '10kb' },

    // 第三方库预算
    { type: 'library', name: 'recharts', maximumWarning: '150kb', maximumError: '200kb' },
    { type: 'library', name: '@sentry', maximumWarning: '50kb', maximumError: '80kb' },
  ],
};

/**
 * 解析大小字符串（如 "150kb" -> 153600）
 */
function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = (match[2] || 'b').toLowerCase();

  const multipliers: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  return value * (multipliers[unit] || 1);
}

/**
 * 格式化大小
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}b`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}kb`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}mb`;
}

/**
 * 检查 Bundle 大小
 */
async function checkBundleSize(budget: BudgetConfig): Promise<CheckResult> {
  const nextDir = join(process.cwd(), '.next');
  const staticDir = join(nextDir, 'static');

  // 查找匹配的 chunk 文件
  const pattern = `**/${budget.name}*.js`;
  const files = await glob(pattern, { cwd: staticDir });

  let totalSize = 0;
  for (const file of files) {
    const filePath = join(staticDir, file);
    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      totalSize += stats.size;
    }
  }

  const warningLimit = parseSize(budget.maximumWarning);
  const errorLimit = parseSize(budget.maximumError);

  let status: 'pass' | 'warning' | 'error' = 'pass';
  if (totalSize > errorLimit) {
    status = 'error';
  } else if (totalSize > warningLimit) {
    status = 'warning';
  }

  return {
    name: budget.name,
    type: 'bundle',
    actual: totalSize,
    budget: warningLimit,
    status,
    message: `Bundle "${budget.name}": ${formatSize(totalSize)} (budget: ${budget.maximumWarning})`,
  };
}

/**
 * 检查图片大小
 */
async function checkImageSize(budget: BudgetConfig): Promise<CheckResult> {
  const publicDir = join(process.cwd(), 'public');
  const pattern = `**/*.{png,jpg,jpeg,gif,webp,svg}`;
  const files = await glob(pattern, { cwd: publicDir });

  let totalSize = 0;
  let fileCount = 0;

  for (const file of files) {
    // 根据预算名称过滤
    if (budget.name === 'hero' && !file.includes('hero')) continue;
    if (budget.name === 'icon' && !file.includes('icon')) continue;

    const filePath = join(publicDir, file);
    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      totalSize += stats.size;
      fileCount++;
    }
  }

  const warningLimit = parseSize(budget.maximumWarning);
  const errorLimit = parseSize(budget.maximumError);

  let status: 'pass' | 'warning' | 'error' = 'pass';
  if (totalSize > errorLimit) {
    status = 'error';
  } else if (totalSize > warningLimit) {
    status = 'warning';
  }

  return {
    name: budget.name,
    type: 'image',
    actual: totalSize,
    budget: warningLimit,
    status,
    message: `Images "${budget.name}" (${fileCount} files): ${formatSize(totalSize)} (budget: ${budget.maximumWarning})`,
  };
}

/**
 * 检查第三方库大小
 */
async function checkLibrarySize(budget: BudgetConfig): Promise<CheckResult> {
  const nodeModulesDir = join(process.cwd(), 'node_modules', budget.name);

  if (!existsSync(nodeModulesDir)) {
    return {
      name: budget.name,
      type: 'library',
      actual: 0,
      budget: parseSize(budget.maximumWarning),
      status: 'pass',
      message: `Library "${budget.name}": not found in node_modules`,
    };
  }

  // 查找库的主文件
  const packageJsonPath = join(nodeModulesDir, 'package.json');
  let mainFile = 'index.js';

  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    mainFile = packageJson.module || packageJson.main || 'index.js';
  }

  const mainFilePath = join(nodeModulesDir, mainFile);
  let totalSize = 0;

  if (existsSync(mainFilePath)) {
    const stats = statSync(mainFilePath);
    totalSize = stats.size;
  }

  const warningLimit = parseSize(budget.maximumWarning);
  const errorLimit = parseSize(budget.maximumError);

  let status: 'pass' | 'warning' | 'error' = 'pass';
  if (totalSize > errorLimit) {
    status = 'error';
  } else if (totalSize > warningLimit) {
    status = 'warning';
  }

  return {
    name: budget.name,
    type: 'library',
    actual: totalSize,
    budget: warningLimit,
    status,
    message: `Library "${budget.name}": ${formatSize(totalSize)} (budget: ${budget.maximumWarning})`,
  };
}

/**
 * 运行性能预算检查
 */
async function runPerformanceCheck(): Promise<void> {
  console.log('🔍 Running performance budget check...\n');

  // 加载自定义配置
  const configPath = join(process.cwd(), 'performance-budget.json');
  let budgetConfig = DEFAULT_BUDGET;

  if (existsSync(configPath)) {
    try {
      const customConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      budgetConfig = { ...DEFAULT_BUDGET, ...customConfig };
      console.log('✅ Loaded custom performance budget config\n');
    } catch {
      console.warn('⚠️  Failed to load custom config, using defaults\n');
    }
  }

  const results: CheckResult[] = [];
  let hasError = false;
  let hasWarning = false;

  // 检查所有预算
  for (const budget of budgetConfig.budgets) {
    let result: CheckResult;

    switch (budget.type) {
      case 'bundle':
        result = await checkBundleSize(budget);
        break;
      case 'image':
        result = await checkImageSize(budget);
        break;
      case 'library':
        result = await checkLibrarySize(budget);
        break;
      default:
        continue;
    }

    results.push(result);

    if (result.status === 'error') hasError = true;
    if (result.status === 'warning') hasWarning = true;
  }

  // 输出结果
  console.log('📊 Performance Budget Results:\n');
  console.log('─'.repeat(80));

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️ ' : '❌';
    const color =
      result.status === 'pass' ? '\x1b[32m' : result.status === 'warning' ? '\x1b[33m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`${color}${icon}${reset} ${result.message}`);
  }

  console.log('─'.repeat(80));

  // 汇总
  const passCount = results.filter((r) => r.status === 'pass').length;
  const warningCount = results.filter((r) => r.status === 'warning').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  console.log(
    `\n📈 Summary: ${passCount} passed, ${warningCount} warnings, ${errorCount} errors\n`,
  );

  // 退出状态
  if (hasError) {
    console.error('❌ Performance budget check failed!\n');
    process.exit(1);
  } else if (hasWarning) {
    console.warn('⚠️  Performance budget check passed with warnings\n');
    process.exit(0);
  } else {
    console.log('✅ All performance budgets passed!\n');
    process.exit(0);
  }
}

// 运行检查
runPerformanceCheck().catch((error) => {
  console.error('❌ Performance check failed:', error);
  process.exit(1);
});
