#!/usr/bin/env tsx
/**
 * File Scanner
 *
 * Scans directories for files matching specific patterns.
 * Uses Node.js built-in modules for better compatibility.
 */

/* eslint-disable security/detect-non-literal-fs-filename */
import * as fs from 'fs';
import * as path from 'path';

export interface ScanOptions {
  extensions?: string[];
  ignorePatterns?: RegExp[];
  maxDepth?: number;
}

export class FileScanner {
  private options: ScanOptions;

  constructor(options: ScanOptions = {}) {
    this.options = {
      extensions: ['.ts', '.tsx'],
      ignorePatterns: [/node_modules/, /\.test\./, /\.spec\./, /__tests__/, /__mocks__/],
      maxDepth: 20,
      ...options,
    };
  }

  /**
   * Scan directory for files
   */
  async scan(dir: string): Promise<string[]> {
    const files: string[] = [];
    await this.scanRecursive(dir, '', 0, files);
    return files;
  }

  /**
   * Recursively scan directory
   */
  private async scanRecursive(
    baseDir: string,
    relativePath: string,
    depth: number,
    files: string[],
  ): Promise<void> {
    if (depth > (this.options.maxDepth ?? 20)) {
      return;
    }

    const currentDir = path.join(baseDir, relativePath);

    try {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const entryRelativePath = path.join(relativePath, entry.name);

        // Check ignore patterns
        if (this.shouldIgnore(entryRelativePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          await this.scanRecursive(baseDir, entryRelativePath, depth + 1, files);
        } else if (entry.isFile() && this.hasValidExtension(entry.name)) {
          files.push(entryRelativePath);
        }
      }
    } catch {
      // Directory read error, skip
    }
  }

  /**
   * Check if path should be ignored
   */
  private shouldIgnore(relativePath: string): boolean {
    return (this.options.ignorePatterns ?? []).some((pattern) => pattern.test(relativePath));
  }

  /**
   * Check if file has valid extension
   */
  private hasValidExtension(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return (this.options.extensions ?? []).includes(ext);
  }

  /**
   * Get scan statistics
   */
  getStats(): { extensions: string[]; ignorePatterns: string[] } {
    return {
      extensions: this.options.extensions ?? [],
      ignorePatterns: (this.options.ignorePatterns ?? []).map((p) => p.source),
    };
  }
}
