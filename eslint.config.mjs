import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  { ignores: ["contracts/**", "test/**", "hardhat.config.ts"] },
  js.configs.recommended,
  ...compat.extends("next/core-web-vitals", "next/typescript")
];
