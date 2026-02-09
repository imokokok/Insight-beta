import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import security from "eslint-plugin-security";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import unusedImports from "eslint-plugin-unused-imports";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
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
      import: importPlugin,
      "jsx-a11y": jsxA11y,
      "unused-imports": unusedImports,
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
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      // 对象注入检测 - 在处理内部配置或已知协议名时风险较低
      // 保持为 warn 级别，但允许在特定场景下使用 eslint-disable 注释
      "security/detect-object-injection": "warn",
      "security/detect-non-literal-fs-filename": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-possible-timing-attacks": "error",
      "security/detect-non-literal-require": "error",
      "security/detect-non-literal-regexp": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-unsafe-regex": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "no-loss-of-precision": "off",
      "@typescript-eslint/no-loss-of-precision": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { 
          vars: "all", 
          varsIgnorePattern: "^_", 
          args: "after-used", 
          argsIgnorePattern: "^_" 
        },
      ],
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
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
      "import/no-duplicates": "warn",
      "import/newline-after-import": "warn",
      // JSX Accessibility rules
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/heading-has-content": "error",
      "jsx-a11y/html-has-lang": "error",
      "jsx-a11y/img-redundant-alt": "warn",
      "jsx-a11y/interactive-supports-focus": "error",
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/media-has-caption": "warn",
      "jsx-a11y/mouse-events-have-key-events": "warn",
      "jsx-a11y/no-access-key": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/no-distracting-elements": "error",
      "jsx-a11y/no-interactive-element-to-noninteractive-role": "error",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-to-interactive-role": "error",
      "jsx-a11y/no-redundant-roles": "warn",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",
      "jsx-a11y/scope": "error",
      "jsx-a11y/tabindex-no-positive": "warn",
    },
  },
  // i18n rules for JSX files (non-test files only)
  // Note: i18n rule temporarily disabled due to large number of existing hardcoded strings
  // TODO: Enable this rule and fix all hardcoded text in a future iteration
  // {
  //   files: ["**/*.tsx", "**/*.ts"],
  //   ignores: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
  //   rules: {
  //     // Warn on hardcoded text in JSX (basic detection)
  //     "no-restricted-syntax": [
  //       "warn",
  //       {
  //         selector: "JSXText[value=/\\s*[a-zA-Z]{3,}\\s*$/]",
  //         message: "Hardcoded text detected. Use i18n t() function instead.",
  //       },
  //     ],
  //   },
  // },
  // Services directory - internal services with lower object injection risk
  {
    files: ["services/**/*.ts"],
    rules: {
      // 后端服务处理内部配置，对象注入风险较低
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

export default config;
