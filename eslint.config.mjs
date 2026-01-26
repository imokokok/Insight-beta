import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import security from "eslint-plugin-security";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  {
    ignores: [
      "contracts/**",
      "test/**",
      "scripts/**",
      "typechain-types/**",
      "artifacts/**",
      "cache/**",
      ".next/**",
      ".next-dev/**",
      "hardhat.config.ts",
      "next-env.d.ts",
      "coverage/**",
      "tests/**",
      "playwright.config.ts",
      "node_modules/**",
    ],
    rules: {
      "no-loss-of-precision": "off",
    },
  },
  js.configs.recommended,
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      security,
      "@typescript-eslint": tseslint,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        process: "readonly",
        BigInt: "readonly",
      },
    },
    rules: {
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-possible-timing-attacks": "error",
      "security/detect-non-literal-require": "error",
      "security/detect-non-literal-regexp": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-unsafe-regex": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-loss-of-precision": "off",
      "@typescript-eslint/no-loss-of-precision": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/consistent-type-imports": "off",
      "security/detect-object-injection": "off",
    },
  },
];

export default config;
