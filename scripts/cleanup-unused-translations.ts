#!/usr/bin/env tsx
/**
 * Cleanup Unused Translations
 *
 * This script:
 * 1. Recursively extracts all translation keys from translation files
 * 2. Scans all source files to find translation key usage
 * 3. Identifies unused translation keys
 * 4. Removes unused keys from all language files
 */

import * as fs from 'fs';
import * as path from 'path';

interface TranslationFile {
  lang: string;
  namespace: string;
  filePath: string;
  content: any;
}

interface CleanupResult {
  removedKeys: string[];
  filesModified: number;
}

const SRC_DIR = path.join(__dirname, '..', 'src');
const I18N_DIR = path.join(SRC_DIR, 'i18n', 'locales');

// Patterns to match translation key usage in code
const TRANSLATION_PATTERNS = [
  /t\(['"]([a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z0-9_.]*)['"]/g,
  /tn\(['"]([a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z0-9_.]*)['"]/g,
];

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
        if (entry.name.includes('.test.') || entry.name.includes('.spec.')) {
          continue;
        }
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
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

function extractAllTranslationKeys(): Map<string, TranslationFile[]> {
  const languages = fs.readdirSync(I18N_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  const allTranslations = new Map<string, TranslationFile[]>();
  
  for (const lang of languages) {
    const langDir = path.join(I18N_DIR, lang);
    const indexPath = path.join(langDir, 'index.ts');
    
    if (!fs.existsSync(indexPath)) {
      continue;
    }
    
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const importRegex = /import\s+(?:\{?\s*(\w+)\s*\}?|(\w+))\s+from\s+['"]\.\/(\w+)['"]/g;
    const namespaces: Array<{ importName: string; fileName: string }> = [];
    
    let match;
    while ((match = importRegex.exec(indexContent)) !== null) {
      const importName = match[1] || match[2];
      const fileName = match[3];
      namespaces.push({ importName, fileName });
    }
    
    for (const { importName, fileName } of namespaces) {
      const filePath = path.join(langDir, `${fileName}.ts`);
      if (!fs.existsSync(filePath)) {
        continue;
      }
      
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        const tempFilePath = path.join(__dirname, 'temp-translation-import.mjs');
        const moduleContent = fileContent
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, '')
          .trim();
        
        const exportMatch = moduleContent.match(/export\s+(?:const|default)\s+(\w+)\s*=\s*({[\s\S]*?});?\s*$/);
        if (exportMatch) {
          const objStr = exportMatch[2];
          try {
            const content = eval(`(${objStr})`);
            
            const fileInfo: TranslationFile = {
              lang,
              namespace: importName,
              filePath,
              content
            };
            
            if (!allTranslations.has(lang)) {
              allTranslations.set(lang, []);
            }
            allTranslations.get(lang)!.push(fileInfo);
          } catch (e) {
            console.warn(`Could not parse ${filePath}:`, (e as Error).message);
          }
        }
      } catch (e) {
        console.warn(`Could not read ${filePath}:`, (e as Error).message);
      }
    }
  }
  
  return allTranslations;
}

function findUsedTranslationKeys(): Set<string> {
  const usedKeys = new Set<string>();
  const sourceFiles = getAllFiles(SRC_DIR, '.ts');
  const tsxFiles = getAllFiles(SRC_DIR, '.tsx');
  const allFiles = [...sourceFiles, ...tsxFiles];
  
  for (const filePath of allFiles) {
    if (filePath.includes('i18n/locales')) {
      continue;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      for (const pattern of TRANSLATION_PATTERNS) {
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

function removeUnusedKeysFromObject(obj: any, usedKeys: Set<string>, prefix = ''): { cleaned: any; removed: string[] } {
  const cleaned: any = {};
  const removed: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const result = removeUnusedKeysFromObject(value, usedKeys, fullKey);
      if (Object.keys(result.cleaned).length > 0) {
        cleaned[key] = result.cleaned;
      }
      removed.push(...result.removed);
    } else {
      if (usedKeys.has(fullKey)) {
        cleaned[key] = value;
      } else {
        removed.push(fullKey);
      }
    }
  }
  
  return { cleaned, removed };
}

function formatObject(obj: any, indent = 0): string {
  const spaces = '  '.repeat(indent);
  const innerSpaces = '  '.repeat(indent + 1);
  
  let result = '{\n';
  const entries = Object.entries(obj);
  
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    const comma = i < entries.length - 1 ? ',' : '';
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result += `${innerSpaces}${key}: ${formatObject(value, indent + 1)}${comma}\n`;
    } else if (typeof value === 'string') {
      const escapedValue = value.replace(/'/g, "\\'").replace(/\n/g, '\\n');
      result += `${innerSpaces}${key}: '${escapedValue}'${comma}\n`;
    } else {
      result += `${innerSpaces}${key}: ${JSON.stringify(value)}${comma}\n`;
    }
  }
  
  result += `${spaces}}`;
  return result;
}

async function main() {
  console.log('🔍 Extracting all translation keys...');
  const allTranslations = extractAllTranslationKeys();
  
  if (!allTranslations.has('en')) {
    console.error('❌ English translations not found!');
    process.exit(1);
  }
  
  const enFiles = allTranslations.get('en')!;
  const allEnKeys = new Set<string>();
  
  for (const file of enFiles) {
    const keys = flattenObject(file.content);
    keys.forEach(key => allEnKeys.add(key));
  }
  
  console.log(`✅ Found ${allEnKeys.size} translation keys in English`);
  
  console.log('\n🔍 Scanning source code for used translation keys...');
  const usedKeys = findUsedTranslationKeys();
  console.log(`✅ Found ${usedKeys.size} used translation keys`);
  
  const unusedKeys = Array.from(allEnKeys).filter(key => !usedKeys.has(key));
  console.log(`\n⚠️  Found ${unusedKeys.length} unused translation keys:`);
  
  if (unusedKeys.length > 0) {
    unusedKeys.slice(0, 50).forEach(key => console.log(`   - ${key}`));
    if (unusedKeys.length > 50) {
      console.log(`   ... and ${unusedKeys.length - 50} more`);
    }
  }
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise<string>(resolve => {
    readline.question('\n❓ Do you want to remove these unused keys? (y/N) ', (answer: string) => {
      resolve(answer.toLowerCase().trim());
    });
  });
  
  readline.close();
  
  if (answer !== 'y' && answer !== 'yes') {
    console.log('❌ Cancelled.');
    process.exit(0);
  }
  
  console.log('\n🗑️  Removing unused keys from translation files...');
  const usedKeysSet = new Set(usedKeys);
  let totalRemoved = 0;
  let filesModified = 0;
  
  for (const [lang, files] of allTranslations) {
    for (const file of files) {
      const result = removeUnusedKeysFromObject(file.content, usedKeysSet);
      
      if (result.removed.length > 0) {
        totalRemoved += result.removed.length;
        
        let fileContent = fs.readFileSync(file.filePath, 'utf-8');
        const exportMatch = fileContent.match(/(export\s+(?:const|default)\s+\w+\s*=\s*)({[\s\S]*?})(;?\s*$)/);
        
        if (exportMatch) {
          const before = exportMatch[1];
          const formattedObj = formatObject(result.cleaned);
          const after = exportMatch[3] || '';
          const newContent = fileContent.replace(exportMatch[0], `${before}${formattedObj}${after}`);
          
          fs.writeFileSync(file.filePath, newContent, 'utf-8');
          filesModified++;
          console.log(`   ✓ Updated ${file.filePath} (removed ${result.removed.length} keys)`);
        }
      }
    }
  }
  
  console.log(`\n✅ Done!`);
  console.log(`   - Total keys removed: ${totalRemoved}`);
  console.log(`   - Files modified: ${filesModified}`);
}

main().catch(console.error);
