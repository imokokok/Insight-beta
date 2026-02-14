#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.join(__dirname, '..', 'src');
const I18N_DIR = path.join(SRC_DIR, 'i18n', 'locales');

function findUsedKeys() {
  const used = new Set<string>();
  const files: string[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '__tests__' && entry.name !== '__mocks__') {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        if ((entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && 
            !entry.name.includes('.test.') && 
            !entry.name.includes('.spec.') && 
            !entry.name.includes('.d.ts') &&
            !fullPath.includes('i18n/locales')) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(SRC_DIR);

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

function getNamespaces() {
  const enIndex = path.join(I18N_DIR, 'en', 'index.ts');
  const content = fs.readFileSync(enIndex, 'utf-8');
  const regex = /import\s+(?:\{?\s*(\w+)\s*\}?|(\w+))\s+from\s+['"]\.\/(\w+)['"]/g;
  const result: { name: string; file: string }[] = [];
  let m;
  while ((m = regex.exec(content)) !== null) {
    const name = m[1] || m[2];
    const file = m[3];
    result.push({ name, file });
  }
  return result;
}

function getAllKeys(namespaces: { name: string; file: string }[]) {
  const all = new Set<string>();
  for (const ns of namespaces) {
    const filePath = path.join(I18N_DIR, 'en', `${ns.file}.ts`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/export\s+(?:const|default)\s+\w+\s*=\s*({[\s\S]*?});?\s*$/);
    if (match) {
      const obj = eval('(' + match[1] + ')');
      function add(o: any, prefix: string) {
        for (const [k, v] of Object.entries(o)) {
          const full = prefix + '.' + k;
          if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            add(v, full);
          } else {
            all.add(full);
          }
        }
      }
      add(obj, ns.name);
    }
  }
  return all;
}

function cleanFile(filePath: string, namespace: string, used: Set<string>) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/(export\s+(?:const|default)\s+(\w+)\s*=\s*)({[\s\S]*?})(;?\s*$)/);
  if (!match) return { updated: false, removed: 0 };

  const obj = eval('(' + match[3] + ')');

  function clean(o: any, prefix: string): any {
    const result: any = {};
    for (const [k, v] of Object.entries(o)) {
      const full = prefix + '.' + k;
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        const child = clean(v, full);
        if (Object.keys(child).length > 0) {
          result[k] = child;
        }
      } else {
        if (used.has(full)) {
          result[k] = v;
        }
      }
    }
    return result;
  }

  const cleaned = clean(obj, namespace);

  function countKeys(o: any, prefix: string): number {
    let count = 0;
    for (const [k, v] of Object.entries(o)) {
      const full = prefix + '.' + k;
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        count += countKeys(v, full);
      } else {
        count++;
      }
    }
    return count;
  }

  const originalCount = countKeys(obj, namespace);
  const newCount = countKeys(cleaned, namespace);
  const removed = originalCount - newCount;

  if (removed === 0) return { updated: false, removed: 0 };

  function formatObj(o: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    const inner = '  '.repeat(indent + 1);
    let r = '{\n';
    const entries = Object.entries(o);
    for (let i = 0; i < entries.length; i++) {
      const [k, v] = entries[i];
      const comma = i < entries.length - 1 ? ',' : '';
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        r += inner + k + ': ' + formatObj(v, indent + 1) + comma + '\n';
      } else if (typeof v === 'string') {
        const escaped = v.replace(/'/g, "\\'").replace(/\n/g, '\\n');
        r += inner + k + ": '" + escaped + "'" + comma + '\n';
      } else {
        r += inner + k + ': ' + JSON.stringify(v) + comma + '\n';
      }
    }
    r += spaces + '}';
    return r;
  }

  const newContent = content.replace(match[0], match[1] + formatObj(cleaned) + match[4]);
  fs.writeFileSync(filePath, newContent, 'utf-8');

  return { updated: true, removed };
}

async function main() {
  console.log('🔍 Finding used keys...');
  const usedKeys = findUsedKeys();
  console.log('   Used:', usedKeys.size);

  console.log('\n📂 Loading translations...');
  const namespaces = getNamespaces();
  const allKeys = getAllKeys(namespaces);
  console.log('   Total:', allKeys.size);

  const unused = Array.from(allKeys).filter(k => !usedKeys.has(k));
  console.log('\n📊 Unused keys:', unused.length);

  if (unused.length > 0) {
    console.log('\n📝 Sample unused keys:');
    unused.slice(0, 30).forEach(k => console.log('  -', k));
  }

  const langDirs = fs.readdirSync(I18N_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  console.log('\n🌐 Languages:', langDirs.join(', '));

  if (unused.length === 0) {
    console.log('\n✅ No unused keys found!');
    return;
  }

  console.log('\n🗑️  Cleaning...');
  let totalRemoved = 0;
  let filesModified = 0;

  for (const lang of langDirs) {
    console.log('\nProcessing', lang + '...');
    const langIndex = path.join(I18N_DIR, lang, 'index.ts');
    if (!fs.existsSync(langIndex)) continue;

    const langIndexContent = fs.readFileSync(langIndex, 'utf-8');
    const regex = /import\s+(?:\{?\s*(\w+)\s*\}?|(\w+))\s+from\s+['"]\.\/(\w+)['"]/g;
    const langNs: { name: string; file: string }[] = [];
    let m;
    while ((m = regex.exec(langIndexContent)) !== null) {
      const name = m[1] || m[2];
      const file = m[3];
      langNs.push({ name, file });
    }

    for (const ns of langNs) {
      const filePath = path.join(I18N_DIR, lang, `${ns.file}.ts`);
      if (!fs.existsSync(filePath)) continue;

      try {
        const result = cleanFile(filePath, ns.name, usedKeys);
        if (result.updated) {
          totalRemoved += result.removed;
          filesModified++;
          console.log('   ✓', ns.file + '.ts:', result.removed, 'removed');
        }
      } catch {
        console.log('   ⚠️', ns.file + '.ts: failed');
      }
    }
  }

  console.log('\n✅ Done!');
  console.log('   Total removed:', totalRemoved);
  console.log('   Files modified:', filesModified);
}

main().catch(console.error);
