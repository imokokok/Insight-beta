#!/usr/bin/env tsx
/**
 * Feature Module Optimizer
 *
 * 自动创建 feature 模块目录结构的脚本
 *
 * 使用方法:
 *   tsx scripts/optimize-feature.ts <feature> <page>
 *
 * 示例:
 *   tsx scripts/optimize-feature.ts oracle analytics/deviation
 */

import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
📁 Feature Module Optimizer

使用方法:
  tsx scripts/optimize-feature.ts <feature> <page>

示例:
  tsx scripts/optimize-feature.ts oracle analytics/deviation
  tsx scripts/optimize-feature.ts oracle analytics/anomalies
  tsx scripts/optimize-feature.ts oracle monitoring
`);
  process.exit(1);
}

const [featureName, pagePath] = args;
const pageName = pagePath.split('/').pop() || pagePath;
const basePath = path.join(process.cwd(), 'src', 'features', featureName, pagePath);

console.log(`
🚀 创建 feature 模块结构...
📦 Feature: ${featureName}
📄 Page: ${pagePath}
📁 目录: ${basePath}
`);

const directories = [
  'components',
  'hooks',
  'types',
  'utils',
];

const files = {
  'components/index.ts': `export {};\n`,
  'hooks/index.ts': `export {};\n`,
  'index.ts': `export * from './components';
export * from './hooks';
`;`,
};

try {
  directories.forEach((dir) => {
    const dirPath = path.join(basePath, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ 创建目录: ${dir}`);
    } else {
      console.log(`ℹ️  目录已存在: ${dir}`);
    }
  });

  Object.entries(files).forEach(([filePath, content]) => {
    const fullPath = path.join(basePath, filePath);
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, content);
      console.log(`✅ 创建文件: ${filePath}`);
    } else {
      console.log(`ℹ️  文件已存在: ${filePath}`);
    }
  });

  console.log(`
🎉 完成！

接下来的步骤：
1. 从原页面文件中提取类型定义到 types/${pageName}.ts
2. 从原页面文件中提取子组件到 components/ 目录
3. 从原页面文件中提取业务逻辑到 hooks/use${capitalize(pageName)}.ts
4. 重写原页面文件，仅负责组装

参考模板：
- docs/ARCHITECTURE_OPTIMIZATION_GUIDE.md
`);

} catch (error) {
  console.error('❌ 错误:', error);
  process.exit(1);
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
