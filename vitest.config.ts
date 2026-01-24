import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    coverage: {
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/**/*.spec.ts",
        "src/**/*.bench.ts",
        "src/types/**",
        "src/app/**/*.tsx",
        "src/i18n/**",
        "src/lib/mockData.ts",
        "src/instrumentation.ts",
        "src/middleware.ts",
      ],
      include: ["src/**/*.{ts,tsx}"],
      provider: "v8",
      reporter: ["text", "json", "html", "lcov", "cobertura"],
      reportsDirectory: "./coverage",
      reportsOnFailure: true,
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
        perFile: true,
        skipFullyCovered: true,
        autoUpdate: {
          head: true,
        },
      },
      watermark: {
        lines: [50, 80],
        functions: [50, 80],
        branches: [50, 80],
        statements: [50, 80],
      },
    },
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec,bench}.?(c|m)[jt]s?(x)"],
    exclude: ["tests/**", "node_modules/**"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    maxConcurrency: 5,
    minExpections: 1,
  },
});
