#!/usr/bin/env tsx
/**
 * Analyze Translations - Only collect information, no modifications
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.join(__dirname, '..', 'src');
const I18N_DIR = path.join(SRC_DIR, 'i18n', 'locales');

function getAllFiles(dir: string, extension: string): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === '__mocks__') {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        if (entry.name.includes('.test.') || entry.name.includes('.spec.') || entry.name.includes('.d.ts')) {
          continue;
        }
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

function findUsedTranslationKeys(): Set<string> {
  const usedKeys = new Set<string>();
  const sourceFiles = getAllFiles(SRC_DIR, '.ts');
  const tsxFiles = getAllFiles(SRC_DIR, '.tsx');
  const allFiles = [...sourceFiles, ...tsxFiles];
  
  const patterns = [
    /t\(['"]([a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z0-9_.]*)['"]/g,
    /tn\(['"]([a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z0-9_.]*)['"]/g,
  ];
  
  for (const filePath of allFiles) {
    if (filePath.includes('i18n/locales')) {
      continue;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      for (const pattern of patterns) {
        let match;
        const regex = new RegExp(pattern.source, 'g');
        while ((match = regex.exec(content)) !== null) {
          const key = match[1];
          usedKeys.add(key);
        }
      }
    } catch (e) {
      console.warn(`Could not read ${filePath}:`, (e as Error).message);
    }
  }
  
  return usedKeys;
}

function flattenObject(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('//') || key.startsWith('/*') || key.startsWith('*')) {
      continue;
    }
    
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenObject(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

function parseNamespaceFile(filePath: string): any {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const exportMatch = content.match(/export\s+(?:const|default)\s+\w+\s*=\s*({[\s\S]*?});?\s*$/);
  if (!exportMatch) return {};
  
  try {
    return eval(`(${exportMatch[1]})`);
  } catch {
    return {};
  }
}

function getAllTranslationKeys(): { keys: Set<string>, files: Map<string, string[]> } {
  const allKeys = new Set<string>();
  const keysByFile = new Map<string, string[]>();
  
  const langDirs = fs.readdirSync(I18N_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  const enDir = path.join(I18N_DIR, 'en');
  const indexPath = path.join(enDir, 'index.ts');
  
  if (!fs.existsSync(indexPath)) {
    return { keys: allKeys, files: keysByFile };
  }
  
  const indexContent = fs.readFileSync(indexPath, 'utf-8');
  const importRegex = /import\s+(?:\{?\s*(\w+)\s*\}?|(\w+))\s+from\s+['"]\.\/(\w+)['"]/g;
  
  let match;
  while ((match = importRegex.exec(indexContent)) !== null) {
    const fileName = match[3];
    const filePath = path.join(enDir, `${fileName}.ts`);
    
    if (fs.existsSync(filePath)) {
      const obj = parseNamespaceFile(filePath);
      const keys = flattenObject(obj);
      
      keys.forEach(k => allKeys.add(k));
      keysByFile.set(filePath, keys);
    }
  }
  
  return { keys: allKeys, files: keysByFile };
}

async function main() {
  console.log('🔍 Analyzing translations...\n');
  
  console.log('Step 1: Finding used translation keys...');
  const usedKeys = findUsedTranslationKeys();
  console.log(`   Used keys found: ${usedKeys.size}\n`);
  
  console.log('Step 2: Loading all translation keys...');
  const { keys: allKeys, files: keysByFile } = getAllTranslationKeys();
  console.log(`   Total translation keys: ${allKeys.size}\n`);
  
  const unusedKeys = Array.from(allKeys).filter(k => !usedKeys.has(k));
  const unusedByFile = new Map<string, string[]>();
  
  for (const [filePath, keys] of keysByFile) {
    const unusedInFile = keys.filter(k => !usedKeys.has(k));
    if (unusedInFile.length > 0) {
      unusedByFile.set(filePath, unusedInFile);
    }
  }
  
  console.log('📊 Summary:');
  console.log(`   Total keys: ${allKeys.size}`);
  console.log(`   Used keys: ${usedKeys.size}`);
  console.log(`   Unused keys: ${unusedKeys.length}\n`);
  
  console.log('📁 Unused keys by file:');
  for (const [filePath, keys] of unusedByFile) {
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);
    console.log(`\n   ${relativePath} (${keys.length} unused):`);
    keys.slice(0, 10).forEach(k => console.log(`      - ${k}`));
    if (keys.length > 10) {
      console.log(`      ... and ${keys.length - 10} more`);
    }
  }
  
  console.log('\n📝 Sample of unused keys (first 50):');
  unusedKeys.slice(0, 50).forEach(k => console.log(`   - ${k}`));
  
  if (unusedKeys.length > 50) {
    console.log(`   ... and ${unusedKeys.length - 50} more`);
  }
  
  const reportPath = path.join(__dirname, 'unused-translations-report.json');
  const report = {
    generatedAt: new Date().toISOString(),
    totalKeys: allKeys.size,
    usedKeys: usedKeys.size,
    unusedKeys: unusedKeys.length,
    unusedByFile: Object.fromEntries(
      Array.from(unusedByFile.entries()).map(([file, keys]) => [
        path.relative(path.join(__dirname, '..'), file),
        keys
      ])
    ),
    unusedKeysList: unusedKeys
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n💾 Full report saved to: ${path.relative(path.join(__dirname, '..'), reportPath)}`);
}

main().catch(console.error);
