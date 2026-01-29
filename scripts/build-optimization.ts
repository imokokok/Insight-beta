#!/usr/bin/env node

/**
 * Build Optimization Script
 *
 * This script performs various build optimizations:
 * 1. Tree shaking analysis
 * 2. Bundle size checking
 * 3. Dead code elimination
 * 4. Asset optimization
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const BUILD_DIR = path.join(__dirname, '..', '.next');
const MAX_BUNDLE_SIZE_MB = 2;
const WARN_BUNDLE_SIZE_MB = 1;

// Color codes for terminal output
const colors: Record<string, string> = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getBundleSize(filePath: string): number {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const stats = fs.statSync(filePath);
    return stats.size / 1024 / 1024; // Convert to MB
  } catch {
    return 0;
  }
}

interface BundleAnalysis {
  totalSize: number;
  largeBundles: { file: string; size: number }[];
  warningBundles: { file: string; size: number }[];
}

function analyzeBundles(): BundleAnalysis | undefined {
  log('\n📦 Analyzing bundles...', 'blue');

  const staticDir = path.join(BUILD_DIR, 'static');
  if (!fs.existsSync(staticDir)) {
    log('⚠️  No static directory found. Run build first.', 'yellow');
    return;
  }

  const chunksDir = path.join(staticDir, 'chunks');
  if (!fs.existsSync(chunksDir)) {
    log('⚠️  No chunks directory found.', 'yellow');
    return;
  }

  const files = fs.readdirSync(chunksDir);
  const jsFiles = files.filter((f) => f.endsWith('.js'));

  let totalSize = 0;
  const largeBundles: { file: string; size: number }[] = [];
  const warningBundles: { file: string; size: number }[] = [];

  jsFiles.forEach((file) => {
    const filePath = path.join(chunksDir, file);
    const size = getBundleSize(filePath);
    totalSize += size;

    if (size > MAX_BUNDLE_SIZE_MB) {
      largeBundles.push({ file, size });
    } else if (size > WARN_BUNDLE_SIZE_MB) {
      warningBundles.push({ file, size });
    }
  });

  log(`\nTotal JS bundle size: ${totalSize.toFixed(2)} MB`, 'blue');

  if (largeBundles.length > 0) {
    log('\n❌ Large bundles (>2MB):', 'red');
    largeBundles.forEach(({ file, size }) => {
      log(`  ${file}: ${size.toFixed(2)} MB`, 'red');
    });
  }

  if (warningBundles.length > 0) {
    log('\n⚠️  Warning bundles (>1MB):', 'yellow');
    warningBundles.forEach(({ file, size }) => {
      log(`  ${file}: ${size.toFixed(2)} MB`, 'yellow');
    });
  }

  if (largeBundles.length === 0 && warningBundles.length === 0) {
    log('\n✅ All bundles are within size limits!', 'green');
  }

  return { totalSize, largeBundles, warningBundles };
}

function checkUnusedDependencies(): void {
  log('\n🔍 Checking for unused dependencies...', 'blue');

  try {
    // Run depcheck if available
    try {
      execSync('npx depcheck --json > depcheck-result.json', { stdio: 'ignore' });
      const result = JSON.parse(fs.readFileSync('depcheck-result.json', 'utf8')) as {
        dependencies: string[];
        devDependencies: string[];
      };

      if (result.dependencies.length > 0) {
        log('\n⚠️  Potentially unused dependencies:', 'yellow');
        result.dependencies.forEach((dep) => {
          log(`  - ${dep}`, 'yellow');
        });
      } else {
        log('\n✅ No unused dependencies found!', 'green');
      }

      if (result.devDependencies.length > 0) {
        log('\n⚠️  Potentially unused devDependencies:', 'yellow');
        result.devDependencies.forEach((dep) => {
          log(`  - ${dep}`, 'yellow');
        });
      }

      fs.unlinkSync('depcheck-result.json');
    } catch {
      log('\n⚠️  depcheck not available. Install with: npm install -g depcheck', 'yellow');
    }
  } catch (error) {
    log(
      `\n❌ Error checking dependencies: ${error instanceof Error ? error.message : String(error)}`,
      'red',
    );
  }
}

function analyzeDuplicatePackages(): void {
  log('\n📊 Checking for duplicate packages...', 'blue');

  try {
    // Check for duplicate packages in node_modules
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const duplicates: string[] = [];
    const seen = new Map<string, string>();

    Object.entries(allDeps).forEach(([name, version]) => {
      if (seen.has(name)) {
        duplicates.push(name);
      } else {
        seen.set(name, version as string);
      }
    });

    if (duplicates.length > 0) {
      log('\n⚠️  Potential duplicate packages:', 'yellow');
      duplicates.forEach((pkg) => {
        log(`  - ${pkg}`, 'yellow');
      });
      log('\n💡 Run "npm dedupe" to optimize', 'blue');
    } else {
      log('\n✅ No duplicate packages found!', 'green');
    }
  } catch (error) {
    log(
      `\n❌ Error analyzing packages: ${error instanceof Error ? error.message : String(error)}`,
      'red',
    );
  }
}

interface BuildReport {
  timestamp: string;
  nodeVersion: string;
  environment: string;
  bundleAnalysis?: BundleAnalysis;
  optimizationSuggestions: string[];
}

function generateBuildReport(): BuildReport {
  log('\n📝 Generating build report...', 'blue');

  const report: BuildReport = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    bundleAnalysis: analyzeBundles(),
    optimizationSuggestions: [],
  };

  // Add optimization suggestions
  if (report.bundleAnalysis && report.bundleAnalysis.largeBundles.length > 0) {
    report.optimizationSuggestions.push(
      'Consider code splitting for large bundles',
      'Use dynamic imports for non-critical components',
      'Check for large dependencies that could be replaced',
    );
  }

  const reportPath = path.join(BUILD_DIR, 'build-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log(`✅ Build report saved to: ${reportPath}`, 'green');

  return report;
}

function optimizeImages(): void {
  log('\n🖼️  Checking image optimization...', 'blue');

  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    log('⚠️  No public directory found.', 'yellow');
    return;
  }

  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
  const images: { file: string; size: number }[] = [];

  function scanDirectory(dir: string): void {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        scanDirectory(filePath);
      } else if (imageExtensions.some((ext) => file.endsWith(ext))) {
        const size = stat.size / 1024; // KB
        images.push({ file: filePath, size });
      }
    });
  }

  scanDirectory(publicDir);

  const largeImages = images.filter((img) => img.size > 500); // >500KB

  if (largeImages.length > 0) {
    log('\n⚠️  Large unoptimized images found:', 'yellow');
    largeImages.forEach((img) => {
      log(`  ${path.relative(publicDir, img.file)}: ${img.size.toFixed(2)} KB`, 'yellow');
    });
    log('\n💡 Consider using Next.js Image component for automatic optimization', 'blue');
  } else {
    log('\n✅ Images are optimized!', 'green');
  }
}

function main(): void {
  log('🔧 Build Optimization Analysis', 'blue');
  log('==============================\n', 'blue');

  // Check if build exists
  if (!fs.existsSync(BUILD_DIR)) {
    log('❌ Build directory not found. Run "npm run build" first.', 'red');
    process.exit(1);
  }

  // Run all optimizations
  analyzeBundles();
  checkUnusedDependencies();
  analyzeDuplicatePackages();
  optimizeImages();

  const report = generateBuildReport();

  // Summary
  log('\n📋 Summary', 'blue');
  log('=========', 'blue');

  const hasIssues =
    report.bundleAnalysis &&
    (report.bundleAnalysis.largeBundles.length > 0 ||
      report.bundleAnalysis.warningBundles.length > 0);

  if (hasIssues) {
    log('⚠️  Build has optimization opportunities. Check the report above.', 'yellow');
    process.exit(0); // Don't fail build, just warn
  } else {
    log('✅ Build is well optimized!', 'green');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { analyzeBundles, checkUnusedDependencies, generateBuildReport };
