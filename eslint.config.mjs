import js from "@eslint/js";
import security from "eslint-plugin-security";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";

import unusedImports from "eslint-plugin-unused-imports";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  {
    ignores: [
      "contracts/**",
      "contracts/test/**",
      "**/*.test.js",
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
  },
  js.configs.recommended,
  // Next.js recommended flat config
  {
    name: "next/recommended",
    plugins: {
      "@next/next": nextPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // Next.js recommended rules
      "@next/next/google-font-display": "warn",
      "@next/next/google-font-preconnect": "warn",
      "@next/next/next-script-for-ga": "warn",
      "@next/next/no-async-client-component": "warn",
      "@next/next/no-before-interactive-script-outside-document": "warn",
      "@next/next/no-css-tags": "warn",
      "@next/next/no-head-element": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "@next/next/no-img-element": "off",
      "@next/next/no-page-custom-font": "warn",
      "@next/next/no-styled-jsx-in-document": "warn",
      "@next/next/no-sync-scripts": "warn",
      "@next/next/no-title-in-document-head": "warn",
      "@next/next/no-typos": "warn",
      "@next/next/no-unwanted-polyfillio": "warn",
      "@next/next/inline-script-id": "error",
      "@next/next/no-assign-module-variable": "error",
      "@next/next/no-document-import-in-page": "error",
      "@next/next/no-duplicate-head": "error",
      "@next/next/no-head-import-in-document": "error",
      "@next/next/no-script-component-in-head": "error",
      // React rules
      "react/no-unknown-property": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // React Hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  // TypeScript configuration
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint,
      security,
      import: importPlugin,

      "unused-imports": unusedImports,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        React: "readonly",
        NodeJS: "readonly",
        RequestInit: "readonly",
        Response: "readonly",
        Headers: "readonly",
      },
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "no-loss-of-precision": "off",
      "no-redefine": "off",
      "no-redeclare": "off", // 禁用重复声明检查
      "no-case-declarations": "off", // 允许在 case 块中声明变量
      "no-empty": "off", // 允许空块语句
      "no-control-regex": "off", // 允许正则中的控制字符
      // Security rules
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-possible-timing-attacks": "error",
      "security/detect-non-literal-require": "error",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-eval-with-expression": "error",
      "security/detect-unsafe-regex": "off", // 禁用不安全的正则检查，存在误报
      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "warn", // 降为 warn，允许必要的 any 类型
      "@typescript-eslint/no-loss-of-precision": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      // React Hooks rules - 调整为 warn
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Unused imports rules
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      // Import ordering rules
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling", "index"],
            "object",
            "type",
          ],
          pathGroups: [
            {
              pattern: "react",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "next/**",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "@/**",
              group: "internal",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["react", "next"],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "import/no-duplicates": "off",
      "import/newline-after-import": "warn",
      "import/no-anonymous-default-export": "warn",
      "import/named": "off",
      "import/namespace": "off",

    },
  },
  // Services directory - internal services with lower object injection risk
  {
    files: ["services/**/*.ts"],
    rules: {
      "security/detect-object-injection": "off",
    },
  },
  // Test files - disable strict rules
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/consistent-type-imports": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "security/detect-object-injection": "off",
      "no-restricted-syntax": "off",
      "import/order": "off",
    },
  },
];
