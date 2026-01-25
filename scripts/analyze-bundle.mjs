#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function getBundleInfo(dir, indent = 0) {
  const items = fs.readdirSync(dir);
  const result = [];
  let totalSize = 0;

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const subResult = getBundleInfo(fullPath, indent + 2);
      result.push(...subResult);
    } else if (item.endsWith(".js") || item.endsWith(".css")) {
      const size = stat.size;
      totalSize += size;
      const padding = "  ".repeat(indent);
      const sizeKB = (size / 1024).toFixed(2);
      result.push({
        path: path.relative(dir, fullPath),
        size: sizeKB,
        sizeBytes: size,
      });
    }
  }

  return result.sort((a, b) => b.sizeBytes - a.sizeBytes);
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function analyzeBundle() {
  const bundleDir = path.join(__dirname, ".next/static");

  if (!fs.existsSync(bundleDir)) {
    console.log("Bundle directory not found. Run 'npm run build' first.");
    return;
  }

  const chunks = getBundleInfo(path.join(bundleDir, "chunks"));
  const css = getBundleInfo(path.join(bundleDir, "css"));

  const totalJS = chunks.reduce((sum, c) => sum + c.sizeBytes, 0);
  const totalCSS = css.reduce((sum, c) => sum + c.sizeBytes, 0);

  console.log("\n📦 Bundle Analysis Report\n");
  console.log("═".repeat(50));
  console.log(`\n📊 JavaScript Bundles (${chunks.length} files):`);
  console.log("-".repeat(50));
  console.log("Size      File");
  console.log("-".repeat(50));

  for (const chunk of chunks.slice(0, 20)) {
    const bar = "█".repeat(Math.min(Math.ceil(chunk.sizeBytes / 50000), 30));
    console.log(`${formatSize(chunk.sizeBytes).padStart(10)} ${chunk.path}`);
  }

  if (chunks.length > 20) {
    console.log(`  ... and ${chunks.length - 20} more files`);
  }

  console.log(`\n${"-".repeat(50)}`);
  console.log(`Total JS: ${formatSize(totalJS)}`);

  console.log("\n🎨 CSS Bundles:");
  console.log("-".repeat(50));
  for (const sheet of css.slice(0, 10)) {
    console.log(`${formatSize(sheet.sizeBytes).padStart(10)} ${sheet.path}`);
  }
  console.log(`\nTotal CSS: ${formatSize(totalCSS)}`);

  console.log("\n" + "═".repeat(50));
  console.log(`\n📈 Total Bundle Size: ${formatSize(totalJS + totalCSS)}`);
  console.log(`   - JavaScript: ${formatSize(totalJS)} (${((totalJS / (totalJS + totalCSS)) * 100).toFixed(1)}%)`);
  console.log(`   - CSS: ${formatSize(totalCSS)} (${((totalCSS / (totalJS + totalCSS)) * 100).toFixed(1)}%)`);

  console.log("\n💡 Optimization Tips:");
  if (totalJS > 500 * 1024) {
    console.log("  ⚠️  JS bundle > 500KB, consider:");
    console.log("     - Code splitting for routes");
    console.log("     - Dynamic imports for large components");
    console.log("     - Tree shaking unused code");
  }
  if (totalCSS > 100 * 1024) {
    console.log("  ⚠️  CSS bundle > 100KB, consider:");
    console.log("     - Remove unused styles");
    console.log("     - PurgeCSS configuration");
  }
  console.log("");
}

if (require.main === module) {
  analyzeBundle();
}

module.exports = { getBundleInfo, analyzeBundle };
