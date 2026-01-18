import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

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
    ],
  },
  js.configs.recommended,
  ...compat.extends("next/core-web-vitals", "next/typescript")
];

export default config;
