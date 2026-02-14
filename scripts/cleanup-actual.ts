#!/usr/bin/env tsx
/**
 * Actual Cleanup Script
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.join(__dirname, '..', 'src');
const I18N_DIR = path.join(SRC_DIR, 'i18n', 'locales');

function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === '__mocks__') continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext) && !entry.name.includes('.test.') && !entry.name.includes('.spec.') && !entry.name.includes('.d.ts')) {
          if (!fullPath.includes('i18n/locales')) {
            files.push(fullPath);
          }
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

function findUsedKeys(): Set<string> {
  const used = new Set<string>();
  const files = getAllFiles(SRC_DIR, ['.ts', '.tsx']);
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    const patterns = [
      /t\(['"]([a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z0-9_.]*)['"]/g,
      /tn\(['"]([a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z0-9_.]*)['"]/g
    ];
    
    for (const pattern of patterns) {
      let match;
      const re = new RegExp(pattern.source, 'g');
      while ((match = re.exec(content)) !== null) {
        used.add(match[1]);
      }
    }
  }
  
  return used;
}

function parseAndFlatten(filePath: string, namespace: string): { keys: string[], obj: any } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const exportMatch = content.match(/export\s+(?:const|default)\s+\w+\s*=\s*({[\s\S]*?});?\s*$/);
  
  if (!exportMatch) return { keys: [], obj: {} };
  
  const obj = eval(`(${exportMatch[1]})`);
  const keys: string[] = [];
  
  function traverse(o: any, prefix: string) {
    for (const [k, v] of Object.entries(o)) {
      const full = `${prefix}.${k}`;
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        traverse(v, full);
      } else {
        keys.push(full);
      }
    }
  }
  
  traverse(obj, namespace);
  
  return { keys, obj };
}

function cleanObj(obj: any, used: Set<string>, prefix: string): any {
  const cleaned: any = {};
  
  for (const [k, v] of Object.entries(obj)) {
    const full = `${prefix}.${k}`;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      const child = cleanObj(v, used, full);
      if (Object.keys(child).length > 0) {
        cleaned[k] = child;
      }
    } else {
      if (used.has(full)) {
        cleaned[k] = v;
      }
    }
  }
  
  return cleaned;
}

function formatObject(obj: any, indent: number = 0): string {
  const spaces = '  '.repeat(indent);
  const inner = '  '.repeat(indent + 1);
  let result = '{\n';
  
  const entries = Object.entries(obj);
  
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    const comma = i < entries.length - 1 ? ',' : '';
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result += `${inner}${key}: ${formatObject(value, indent + 1)}${comma}\n`;
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
  console.log('🔍 Finding used translation keys...');
  const usedKeys = findUsedKeys();
  console.log(`   Found ${usedKeys.size} used keys\n`);
  
  console.log('📂 Loading translation files...');
  
  const enIndex = path.join(I18N_DIR, 'en', 'index.ts');
  const enIndexContent = fs.readFileSync(enIndex, 'utf-8');
  
  const importRegex = /import\s+(?:\{?\s*(\w+)\s*\}?|(\w+))\s+from\s+['"]\.\/(\w+)['"]/g;
  const namespaces: Array<{ name: string; file: string }> = [];
  let m;
  while ((m = importRegex.exec(enIndexContent)) !== null) {
    const importName = m[1] || m[2];
    const fileName = m[3];
    namespaces.push({ name: importName, file: fileName });
  }
  
  const allTranslationKeys = new Set<string>();
  const filesData = new Map<string, { obj: any, ns: string }>();
  
  for (const ns of namespaces) {
    const filePath = path.join(I18N_DIR, 'en', `${ns.file}.ts`);
    const { keys, obj } = parseAndFlatten(filePath, ns.name);
    keys.forEach(k => allTranslationKeys.add(k));
    filesData.set(filePath, { obj, ns: ns.name });
  }
  
  console.log(`   Found ${allTranslationKeys.size} total keys\n`);
  
  const unusedKeys = Array.from(allTranslationKeys).filter(k => !usedKeys.has(k));
  console.log('📊 Summary:');
  console.log(`   Total keys: ${allTranslationKeys.size}`);
  console.log(`   Used keys: ${usedKeys.size}`);
  console.log(`   Unused keys: ${unusedKeys.length}\n`);
  
  if (unusedKeys.length > 0) {
    console.log('📝 Sample unused keys:');
    unusedKeys.slice(0, 50).forEach(k => console.log(`   - ${k}`));
    if (unusedKeys.length > 50) {
      console.log(`   ... and ${unusedKeys.length - 50} more`);
    }
  }
  
  const langDirs = fs.readdirSync(I18N_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  console.log(`\n🌐 Languages: ${langDirs.join(', ')}\n`);
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise<string>(resolve => {
    readline.question('❓ Proceed to clean ALL language files? (y/N) ', (a: string) => {
      resolve(a.toLowerCase().trim());
    });
  });
  readline.close();
  
  if (answer !== 'y' && answer !== 'yes') {
    console.log('Cancelled.');
    return;
  }
  
  console.log('\n🗑️  Cleaning up...\n');
  let totalRemoved = 0;
  let filesModified = 0;
  
  for (const lang of langDirs) {
    console.log(`Processing ${lang}...`);
    
    const langIndex = path.join(I18N_DIR, lang, 'index.ts');
    if (!fs.existsSync(langIndex)) continue;
    
    const langIndexContent = fs.readFileSync(langIndex, 'utf-8');
    const langImportRegex = /import\s+(?:\{?\s*(\w+)\s*\}?|(\w+))\s+from\s+['"]\.\/(\w+)['"]/g;
    const langNamespaces: Array<{ name: string; file: string }> = [];
    
    let lm;
    while ((lm = langImportRegex.exec(langIndexContent)) !== null) {
      const importName = lm[1] || lm[2];
      const fileName = lm[3];
      langNamespaces.push({ name: importName, file: fileName });
    }
    
    for (const ns of langNamespaces) {
      const filePath = path.join(I18N_DIR, lang, `${ns.file}.ts`);
      if (!fs.existsSync(filePath)) continue;
      
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const exportMatch = content.match(/(export\s+(?:const|default)\s+(\w+)\s*=\s*)({[\s\S]*?})(;?\s*$)/);
        
        if (exportMatch) {
          const obj = eval(`(${exportMatch[3]})`);
          const cleaned = cleanObj(obj, usedKeys, ns.name);
          
          const originalKeys: string[] = [];
          function countOriginal(o: any, p: string) {
            for (const [k, v] of Object.entries(o)) {
              const f = `${p}.${k}`;
              if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                countOriginal(v, f);
              } else {
                originalKeys.push(f);
              }
            }
          }
          countOriginal(obj, ns.name);
          
          const newKeys: string[] = [];
          function countNew(o: any, p: string) {
            for (const [k, v] of Object.entries(o)) {
              const f = `${p}.${k}`;
              if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                countNew(v, f);
              } else {
                newKeys.push(f);
              }
            }
          }
          countNew(cleaned, ns.name);
          
          const removed = originalKeys.length - newKeys.length;
          
          if (removed > 0) {
            const formatted = formatObject(cleaned);
            const newContent = content.replace(exportMatch[0], `${exportMatch[1]}${formatted}${exportMatch[4]}`);
            
            fs.writeFileSync(filePath, newContent, 'utf-8');
            totalRemoved += removed;
            filesModified++;
            console.log(`   ✓ ${ns.file}.ts: removed ${removed} keys`);
          }
        }
      } catch (e) {
        console.log(`   ⚠️  Failed to process ${ns.file}.ts`);
      }
    }
  }
  
  console.log(`\n✅ Done!`);
  console.log(`   Total keys removed: ${totalRemoved}`);
  console.log(`   Files modified: ${filesModified}`);
}

main().catch(console.error);
