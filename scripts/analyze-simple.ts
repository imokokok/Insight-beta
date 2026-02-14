#!/usr/bin/env tsx
/**
 * Simple Analyze Script
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.join(__dirname, '..', 'src');
const I18N_DIR = path.join(SRC_DIR, 'i18n', 'locales');

function main() {
  console.log('Finding used keys...\n');
  
  const usedKeys = new Set<string>();
  
  const sourceFiles: string[] = [];
  
  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === '__mocks__') continue;
        walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue;
        if (entry.name.includes('.d.ts')) continue;
        if (fullPath.includes('i18n/locales')) continue;
        sourceFiles.push(fullPath);
      }
    }
  }
  
  walk(SRC_DIR);
  
  for (const file of sourceFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const patterns = [
        /t\(['"]([a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z0-9_.]*)['"]/g,
        /tn\(['"]([a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z0-9_.]*)['"]/g,
      ];
      for (const pattern of patterns) {
        let match;
        const regex = new RegExp(pattern.source, 'g');
        while ((match = regex.exec(content)) !== null) {
          usedKeys.add(match[1]);
        }
      }
    } catch {}
  }
  
  console.log(`Used keys: ${usedKeys.size}`);
  console.log('\nSample used keys:');
  Array.from(usedKeys).slice(0, 30).forEach(k => console.log(`  - ${k}`));
  
  console.log('\n---\n');
  
  console.log('Loading translation files...\n');
  
  const allTranslations = new Map<string, any>();
  const enIndex = path.join(I18N_DIR, 'en', 'index.ts');
  const enIndexContent = fs.readFileSync(enIndex, 'utf-8');
  
  const importRegex = /import\s+(?:\{?\s*(\w+)\s*\}?|(\w+))\s+from\s+['"]\.\/(\w+)['"]/g;
  const namespaces: { name: string; file: string }[] = [];
  let m;
  while ((m = importRegex.exec(enIndexContent)) !== null) {
    const importName = m[1] || m[2];
    const fileName = m[3];
    namespaces.push({ name: importName, file: fileName });
  }
  
  const allTranslationKeys = new Set<string>();
  
  for (const ns of namespaces) {
    const nsPath = path.join(I18N_DIR, 'en', `${ns.file}.ts`);
    const nsContent = fs.readFileSync(nsPath, 'utf-8');
    const exportMatch = nsContent.match(/export\s+(?:const|default)\s+(\w+)\s*=\s*({[\s\S]*?});?\s*$/);
    if (exportMatch) {
      try {
        const obj = eval(`(${exportMatch[2]})`);
        
        const addKeys = (o: any, prefix: string) => {
          for (const [k, v] of Object.entries(o)) {
            const fullKey = `${prefix}.${k}`;
            if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
              addKeys(v, fullKey);
            } else {
              allTranslationKeys.add(fullKey);
            }
          }
        };
        addKeys(obj, ns.name);
      } catch (e) {
        console.error(`Error parsing ${ns.file}:`, e);
      }
    }
  }
  
  console.log(`Total translation keys: ${allTranslationKeys.size}`);
  
  const unused = Array.from(allTranslationKeys).filter(k => !usedKeys.has(k));
  console.log(`\nUnused keys: ${unused.length}`);
  
  console.log('\nSample unused keys:');
  unused.slice(0, 50).forEach(k => console.log(`  - ${k}`));
  
  console.log(`\n\nSaving report...`);
  const report = {
    used: Array.from(usedKeys),
    all: Array.from(allTranslationKeys),
    unused: unused
  };
  fs.writeFileSync(path.join(__dirname, 'simple-report.json'), JSON.stringify(report, null, 2), 'utf-8');
  
  console.log('Report saved to scripts/simple-report.json');
}

main();
