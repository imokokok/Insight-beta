#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractAllKeys(obj) {
  const keys = new Set();

  function traverse(node, prefix = "") {
    for (const [key, value] of Object.entries(node)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "string") {
        keys.add(newKey);
      } else if (typeof value === "object" && value !== null) {
        traverse(value, newKey);
      }
    }
  }

  traverse(obj);
  return keys;
}

function getMissingKeys(filePath, targetLang) {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const jsonMatch = fileContent.match(
    /export const translations = (\{[\s\S]*?\n\})\s*as const;/,
  );

  if (!jsonMatch) {
    console.error("❌ 无法解析翻译文件");
    return [];
  }

  let jsonStr = jsonMatch[1];
  const translations = eval(`(${jsonStr})`);

  const allKeys = new Set();
  const targetKeys = new Set();

  const languages = ["zh", "en", "es", "fr", "ko"];
  for (const lang of languages) {
    const keys = extractAllKeys(translations[lang]);
    keys.forEach((key) => allKeys.add(key));
    if (lang === targetLang) {
      keys.forEach((key) => targetKeys.add(key));
    }
  }

  const missing = [];
  for (const key of allKeys) {
    if (!targetKeys.has(key)) {
      missing.push(key);
    }
  }

  return missing;
}

function checkTranslations() {
  const filePath = path.join(__dirname, "../src/i18n/translations.ts");
  const fileContent = fs.readFileSync(filePath, "utf-8");

  const jsonMatch = fileContent.match(
    /export const translations = (\{[\s\S]*?\n\})\s*as const;/,
  );

  if (!jsonMatch) {
    console.error("❌ 无法解析翻译文件");
    process.exit(1);
  }

  let jsonStr = jsonMatch[1];
  const translations = eval(`(${jsonStr})`);

  const languages = ["zh", "en", "es", "fr", "ko"];
  const langLabels = {
    zh: "中文",
    en: "English",
    es: "Español",
    fr: "Français",
    ko: "한국어",
  };

  const allKeys = new Set();
  const langKeys = {};

  for (const lang of languages) {
    langKeys[lang] = extractAllKeys(translations[lang]);
    langKeys[lang].forEach((key) => allKeys.add(key));
  }

  console.log("📊 缺失翻译详情:\n");
  console.log("=".repeat(60));

  for (const lang of languages) {
    const missingKeys = [];
    for (const key of allKeys) {
      if (!langKeys[lang].has(key)) {
        missingKeys.push(key);
      }
    }

    if (missingKeys.length > 0) {
      console.log(`\n${langLabels[lang]} (${lang}) - 缺失 ${missingKeys.length} 个:`);
      console.log("-".repeat(60));
      missingKeys.forEach((key) => {
        console.log(`  ${key}`);
      });
    }
  }

  console.log("\n" + "=".repeat(60));
}

checkTranslations();
