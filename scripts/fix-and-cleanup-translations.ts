#!/usr/bin/env tsx
/**
 * Fix and Cleanup Translations
 *
 * Correctly extracts keys with namespace prefixes and cleans unused translations
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

function flattenObjectWithPrefix(obj: any, prefix: string): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('//') || key.startsWith('/*') || key.startsWith('*')) {
      continue;
    }
    
    const fullKey = `${prefix}.${key}`;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenObjectWithPrefix(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

function parseNamespaceFile(filePath: string, namespace: string): { keys: string[], obj: any {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const exportMatch = content.match(/export\s+(?:const|default)\s+(\w+)\s*=\s*({[\s\S]*?});?\s*$/);
  if (!exportMatch) return { keys: [], obj: {} };
  
  try {
    const obj = eval(`(${exportMatch[2]})`);
    const keys = flattenObjectWithPrefix(obj, namespace);
    return { keys, obj };
  } catch {
    return { keys: [], obj: {} };
  }
}

function getAllTranslationKeys(): { 
  allKeys: Set<string>, 
  files: Map<string, { namespace: string, obj: any }>,
  keysByFile: Map<string, string[]>
} {
  const allKeys = new Set<string>();
  const files = new Map<string, { namespace: string, obj: any }>();
  const keysByFile = new Map<string, string[]>();
  
  const enDir = path.join(I18N_DIR, 'en');
  const indexPath = path.join(enDir, 'index.ts');
  
  if (!fs.existsSync(indexPath)) {
    return { allKeys, files, keysByFile };
  }
  
  const indexContent = fs.readFileSync(indexPath, 'utf-8');
  const importRegex = /import\s+(?:\{?\s*(\w+)\s*\}?|(\w+))\s+from\s+['"]\.\/(\w+)['"]/g;
  
  let match;
  while ((match = importRegex.exec(indexContent)) !== null) {
    const importName = match[1] || match[2];
    const fileName = match[3];
    const filePath = path.join(enDir, `${fileName}.ts`);
    
    if (fs.existsSync(filePath)) {
      const { keys, obj } = parseNamespaceFile(filePath, importName);
      
      keys.forEach(k => allKeys.add(k));
      files.set(filePath, { namespace: importName, obj });
      keysByFile.set(filePath, keys);
    }
  }
  
  return { allKeys, files, keysByFile };
}

function cleanObject(obj: any, usedKeys: Set<string>, prefix: string): { cleaned: any, removed: string[] {
  const cleaned: any = {};
  const removed: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = `${prefix}.${key}`;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const result = cleanObject(value, usedKeys, fullKey);
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

function formatObj(obj: any, indent = 0): string {
  const spaces = '  '.repeat(indent);
  const inner = '  '.repeat(indent + 1);
  
  let result = '{\n';
  const entries = Object.entries(obj);
  
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    const comma = i < entries.length - 1 ? ',' : '';
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result += `${inner}${key}: ${formatObj(value, indent + 1)}${comma}\n`;
    } else if (typeof value === 'string') {
      const escaped = value.replace(/'/g, "\\'").replace(/\n/g, '\\n');
      result += `${inner}${key}: '${escaped}'${comma}\n`;
    } else {
      result += `${inner}${key}: ${JSON.stringify(value)}${comma}\n`;
    }
  }
  
  result += `${spaces}}`;
  return result;
}

async function main() {
  console.log('🔍 Analyzing translations...\n');
  
  console.log('Step 1: Finding used translation keys...');
  const usedKeys = findUsedTranslationKeys();
  console.log(`   Used keys found: ${usedKeys.size}\n`);
  
  console.log('Step 2: Loading all translation keys...');
  const { allKeys, files } = getAllTranslationKeys();
  console.log(`   Total translation keys: ${allKeys.size}\n`);
  
  const unusedKeys = Array.from(allKeys).filter(k => !usedKeys.has(k));
  console.log('📊 Summary:');
  console.log(`   Total keys: ${allKeys.size}`);
  console.log(`   Used keys: ${usedKeys.size}`);
  console.log(`   Unused keys: ${unusedKeys.length}\n`);
  
  if (unusedKeys.length > 0) {
    console.log('📝 Sample of unused keys (first 50):');
    unusedKeys.slice(0, 50).forEach(k => console.log(`   - ${k}`));
    if (unusedKeys.length > 50) {
      console.log(`   ... and ${unusedKeys.length - 50} more`);
    }
  }
  
  const langDirs = fs.readdirSync(I18N_DIR, { withFileTypes: true)
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  console.log(`\n🌐 Languages found: ${langDirs.join(', ')}\n`);
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise<string>(resolve => {
    readline.question('❓ Do you want to remove these unused keys from ALL language files? (y/N) ', (answer: string) => {
      resolve(answer.toLowerCase().trim());
    });
  });
  
  readline.close();
  
  if (answer !== 'y' && answer !== 'yes') {
    console.log('❌ Cancelled.');
    process.exit(0);
  }
  
  console.log('\n🗑️  Cleaning up translations...\n');
  let totalRemoved = 0;
  let totalFilesModified = 0;
  
  for (const lang of langDirs) {
    console.log(`Processing ${lang}...`);
    
    const langDir = path.join(I18N_DIR, lang);
    const indexPath = path.join(langDir, 'index.ts');
    
    if (!fs.existsSync(indexPath)) continue;
    
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const importRegex = /import\s+(?:\{?\s*(\w+)\s*\}?|(\w+))\s+from\s+['"]\.\/(\w+)['"]/g;
    
    let match;
    while ((match = importRegex.exec(indexContent)) !== null) {
      const importName = match[1] || match[2];
      const fileName = match[3];
      const filePath = path.join(langDir, `${fileName}.ts`);
      
      if (!fs.existsSync(filePath)) continue;
      
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const exportMatch = fileContent.match(/(export\s+(?:const|default)\s+(\w+)\s*=\s*)({[\s\S]*?})(;?\s*$)/);
        
        if (!exportMatch) {
          const obj = eval(`(${exportMatch[4]})`);
          const result = cleanObject(obj, usedKeys, importName);
          
          if (result.removed.length > 0) {
            const formatted = formatObj(result.cleaned);
            const newContent = fileContent.replace(exportMatch[0], `${exportMatch[1]}${formatted}${exportMatch[5]}`);
            
            fs.writeFileSync(filePath, newContent, 'utf-8');
            
            totalRemoved += result.removed.length;
            totalFilesModified++;
            console.log(`   ✓ ${fileName}.ts: removed ${result.removed.length} keys`);
          }
        }
      } catch (e) {
        console.warn(`   ⚠️  Could not process ${fileName}.ts:`, (e as Error).message;
      }
    }
  }
  
  console.log(`\n✅ Done!`);
  console.log(`   Total keys removed: ${totalRemoved}`);
  console.log(`   Total files modified: ${totalFilesModified}`);
}

main().catch(console.error);
