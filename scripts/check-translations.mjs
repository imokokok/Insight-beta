#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function flattenObject(obj, prefix = "") {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      result[newKey] = value;
    } else if (typeof value === "object" && value !== null) {
      Object.assign(result, flattenObject(value, newKey));
    }
  }

  return result;
}

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

function checkTranslations() {
  console.log("🔍 验证翻译完整性...\n");

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

  const evalContent = `(${jsonStr})`;
  const translations = eval(evalContent);

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

  console.log(`📊 总翻译键数量: ${allKeys.size}\n`);

  let hasErrors = false;

  for (const lang of languages) {
    const missingKeys = [];

    for (const key of allKeys) {
      if (!langKeys[lang].has(key)) {
        missingKeys.push(key);
      }
    }

    console.log(`${langLabels[lang]} (${lang}):`);
    console.log(`  - 已翻译: ${langKeys[lang].size}/${allKeys.size}`);

    if (missingKeys.length > 0) {
      console.log(`  - 缺失: ${missingKeys.length}`);
      missingKeys.slice(0, 5).forEach((key) => {
        console.log(`    ❌ ${key}`);
      });
      if (missingKeys.length > 5) {
        console.log(`    ... 还有 ${missingKeys.length - 5} 个`);
      }
      hasErrors = true;
    } else {
      console.log(`  ✅ 完整`);
    }
  }

  console.log("\n" + "=".repeat(50));

  if (hasErrors) {
    console.log("\n⚠️  存在缺失的翻译，请补充。\n");
    process.exit(1);
  } else {
    console.log("\n🎉 所有语言翻译完整！\n");
    process.exit(0);
  }
}

checkTranslations();
