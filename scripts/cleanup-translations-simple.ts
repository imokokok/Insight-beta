#!/usr/bin/env tsx
/**
 * Simple Translation Cleanup Script
 *
 * Uses TypeScript imports to safely load translations
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

function loadTranslationsByImport(): Map<string, any> {
  const translations = new Map<string, any>();
  
  const langDirs = fs.readdirSync(I18N_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  for (const lang of langDirs) {
    const indexPath = path.join(I18N_DIR, lang, 'index.ts');
    if (!fs.existsSync(indexPath)) continue;
    
    const tempFile = path.join(__dirname, 'temp-translations.mjs');
    
    try {
      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      let fileContent = indexContent;
      
      const importRegex = /import\s+(?:\{?\s*(\w+)\s*\}?|(\w+))\s+from\s+['"]\.\/(\w+)['"]/g;
      const namespaces: Array<{ importName: string; fileName: string }> = [];
      
      let match;
      while ((match = importRegex.exec(indexContent)) !== null) {
        const importName = match[1] || match[2];
        const fileName = match[3];
        namespaces.push({ importName, fileName });
        
        const nsPath = path.join(I18N_DIR, lang, `${fileName}.ts`);
        if (fs.existsSync(nsPath)) {
          const nsContent = fs.readFileSync(nsPath, 'utf-8');
          fileContent = fileContent.replace(
            new RegExp(`import\\s+(?:\\{?\\s*${importName}\\s*\\}?|${importName})\\s+from\\s+['"]\\.\\/${fileName}['"]`, 'g'),
            nsContent
          );
        }
      }
      
      fileContent = fileContent
        .replace(/export\s+default\s+/g, 'const _defaultExport = ')
        .replace(/export\s+const\s+(\w+)\s*=/g, 'const $1 =');
      
      fileContent += '\n\nexport { _defaultExport as default };\n';
      
      const namesToExport = namespaces.map(ns => ns.importName);
      if (namesToExport.length > 0) {
        fileContent += `export { ${namesToExport.join(', ')} };\n`;
      }
      
      fs.writeFileSync(tempFile, fileContent, 'utf-8');
      
      const mod = require(tempFile);
      translations.set(lang, mod);
      
      fs.unlinkSync(tempFile);
    } catch (e) {
      console.warn(`Could not load translations for ${lang}:`, (e as Error).message);
    }
  }
  
  return translations;
}

function flattenObject(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('_') || key === 'default') continue;
    
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenObject(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

function getTranslationsAsObject(lang: string, translations: Map<string, any>): any {
  const mod = translations.get(lang);
  if (!mod) return {};
  
  const result: any = {};
  
  for (const [key, value] of Object.entries(mod)) {
    if (key.startsWith('_') || key === 'default') continue;
    result[key] = value;
  }
  
  return result;
}

function updateTranslationFile(filePath: string, usedKeys: Set<string>): number {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const exportMatch = content.match(/(export\s+(?:const|default)\s+(\w+)\s*=\s*)({[\s\S]*?})(;?\s*$)/);
  if (!exportMatch) return 0;
  
  const tempFile = path.join(__dirname, 'temp-parse.mjs');
  const parseCode = `
const obj = ${exportMatch[2]};
function clean(obj, used, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? \`\${prefix}.\${key}\` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const cleaned = clean(value, used, fullKey);
      if (Object.keys(cleaned).length > 0) {
        result[key] = cleaned;
      }
    } else {
      if (used.has(fullKey)) {
        result[key] = value;
      }
    }
  }
  return result;
}
const cleaned = clean(obj, new Set([${Array.from(usedKeys).map(k => `'${k}'`).join(',')}]));
console.log(JSON.stringify(cleaned, null, 2));
`;
  
  fs.writeFileSync(tempFile, parseCode, 'utf-8');
  
  const { execSync } = require('child_process');
  try {
    const output = execSync(`node "${tempFile}"`, { encoding: 'utf-8', stdio: 'pipe' });
    const cleanedObj = JSON.parse(output.trim());
    
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
    
    const formatted = formatObj(cleanedObj);
    const newContent = content.replace(exportMatch[0], `${exportMatch[1]}${formatted}${exportMatch[3]}`);
    fs.writeFileSync(filePath, newContent, 'utf-8');
    
    const originalKeys = flattenObject(getNamespaceFromContent(content));
    const newKeys = flattenObject(cleanedObj);
    
    fs.unlinkSync(tempFile);
    return originalKeys.length - newKeys.length;
  } catch (e) {
    console.warn(`Error processing ${filePath}:`, (e as Error).message);
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    return 0;
  }
}

function getNamespaceFromContent(content: string): any {
  const exportMatch = content.match(/export\s+(?:const|default)\s+\w+\s*=\s*({[\s\S]*?});?\s*$/);
  if (!exportMatch) return {};
  
  try {
    return eval(`(${exportMatch[1]})`);
  } catch {
    return {};
  }
}

async function main() {
  console.log('🔍 Finding used translation keys in source code...');
  const usedKeys = findUsedTranslationKeys();
  console.log(`✅ Found ${usedKeys.size} used translation keys`);
  
  console.log('\n📁 Loading translation files...');
  
  const langDirs = fs.readdirSync(I18N_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  const allFilesToProcess: Array<{ lang: string; filePath: string }> = [];
  
  for (const lang of langDirs) {
    const langDir = path.join(I18N_DIR, lang);
    const indexPath = path.join(langDir, 'index.ts');
    
    if (!fs.existsSync(indexPath)) continue;
    
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const importRegex = /import\s+(?:\{?\s*(\w+)\s*\}?|(\w+))\s+from\s+['"]\.\/(\w+)['"]/g;
    
    let match;
    while ((match = importRegex.exec(indexContent)) !== null) {
      const fileName = match[3];
      const filePath = path.join(langDir, `${fileName}.ts`);
      
      if (fs.existsSync(filePath)) {
        allFilesToProcess.push({ lang, filePath });
      }
    }
  }
  
  console.log(`✅ Found ${allFilesToProcess.length} translation files`);
  
  console.log('\n📊 Analyzing unused keys...');
  let totalUnused = 0;
  const filesWithUnused: Array<{ path: string; count: number }> = [];
  
  for (const { filePath } of allFilesToProcess) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const nsObj = getNamespaceFromContent(content);
      const keys = flattenObject(nsObj);
      const unused = keys.filter(k => !usedKeys.has(k));
      
      if (unused.length > 0) {
        totalUnused += unused.length;
        filesWithUnused.push({ path: filePath, count: unused.length });
      }
    } catch (e) {
      console.warn(`Could not analyze ${filePath}`);
    }
  }
  
  console.log(`\n⚠️  Found ${totalUnused} unused keys across ${filesWithUnused.length} files:`);
  filesWithUnused.slice(0, 20).forEach(f => {
    console.log(`   - ${path.relative(path.join(__dirname, '..'), f.path)}: ${f.count} unused`);
  });
  
  if (filesWithUnused.length > 20) {
    console.log(`   ... and ${filesWithUnused.length - 20} more files`);
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
  
  console.log('\n🗑️  Removing unused keys...');
  let removed = 0;
  let modified = 0;
  
  for (const { filePath } of allFilesToProcess) {
    try {
      const count = updateTranslationFile(filePath, usedKeys);
      if (count > 0) {
        removed += count;
        modified++;
        console.log(`   ✓ Updated ${path.relative(path.join(__dirname, '..'), filePath)} (removed ${count})`);
      }
    } catch (e) {
      console.warn(`Failed to update ${filePath}:`, (e as Error).message);
    }
  }
  
  console.log(`\n✅ Done!`);
  console.log(`   - Total keys removed: ${removed}`);
  console.log(`   - Files modified: ${modified}`);
}

main().catch(console.error);
