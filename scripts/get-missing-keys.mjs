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

function getMissingKeys(targetLang) {
  const filePath = path.join(__dirname, "../src/i18n/translations.ts");
  const fileContent = fs.readFileSync(filePath, "utf-8");

  const jsonMatch = fileContent.match(
    /export const translations = (\{[\s\S]*?\n\})\s*as const;/,
  );

  if (!jsonMatch) {
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

function getMissingDetails() {
  const missingFr = getMissingKeys("fr");
  const missingKo = getMissingKeys("ko");

  console.log("Français (fr) 缺失:", missingFr.length);
  console.log(JSON.stringify(missingFr, null, 2));
  console.log("\n한국어 (ko) 缺失:", missingKo.length);
  console.log(JSON.stringify(missingKo, null, 2));
}

getMissingDetails();
