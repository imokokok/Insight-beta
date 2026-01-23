#!/usr/bin/env tsx

import { readFileSync } from "fs";
import { resolve } from "path";

interface TranslationNode {
  [key: string]: string | TranslationNode;
}

interface TranslationFile {
  zh: TranslationNode;
  en: TranslationNode;
  es: TranslationNode;
  fr: TranslationNode;
  ko: TranslationNode;
}

function flattenObject(
  obj: TranslationNode,
  prefix = "",
): Record<string, string> {
  const result: Record<string, string> = {};

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

function extractTranslationKeys(obj: TranslationNode): Set<string> {
  const keys = new Set<string>();

  function traverse(node: TranslationNode, prefix = "") {
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

  const filePath = resolve(__dirname, "../src/i18n/translations.ts");
  const fileContent = readFileSync(filePath, "utf-8");

  const jsonMatch = fileContent.match(
    /export const translations = (\{[\s\S]*?\}\s*\}\s*);\s*export type TranslationKey/,
  );

  if (!jsonMatch) {
    console.error("❌ 无法解析翻译文件");
    process.exit(1);
  }

  const jsonStr = jsonMatch[1].replace(/ as const;/, "");
  const translations = eval(`(${jsonStr})`) as TranslationFile;

  const languages = ["zh", "en", "es", "fr", "ko"] as const;
  const langLabels: Record<string, string> = {
    zh: "中文",
    en: "English",
    es: "Español",
    fr: "Français",
    ko: "한국어",
  };

  const allKeys = new Set<string>();
  const langKeys: Record<string, Set<string>> = {};

  for (const lang of languages) {
    langKeys[lang] = extractTranslationKeys(translations[lang]);
    allKeys.forEach((key) => {
      if (!langKeys[lang].has(key)) {
        allKeys.add(key);
      }
    });
  }

  console.log(`📊 总翻译键数量: ${allKeys.size}\n`);

  let hasErrors = false;

  for (const lang of languages) {
    const missingKeys: string[] = [];

    for (const key of allKeys) {
      if (!langKeys[lang].has(key)) {
        missingKeys.push(key);
      }
    }

    console.log(`\n${langLabels[lang]} (${lang}):`);
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
