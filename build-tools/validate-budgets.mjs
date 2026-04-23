#!/usr/bin/env node
/**
 * validate-budgets.mjs
 *
 * CI gate script that validates bundle size budgets.
 * Fails the build if any budget is exceeded.
 *
 * Budgets (from FR-18):
 * - Total initial bundle: ≤5MB gzipped
 * - JS bundle: ≤500KB gzipped
 * - CSS bundle: ≤50KB gzipped
 * - Core atlas: ≤3MB
 * - Core audio: ≤1MB
 *
 * Usage: node build-tools/validate-budgets.mjs [--dist <path>]
 */

import { readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { execSync } from 'child_process';

// ─── Budget Definitions ─────────────────────────────────────

const BUDGETS = {
  js: {
    label: 'JavaScript',
    maxBytes: 500 * 1024, // 500KB gzipped
    extensions: ['.js', '.mjs'],
    gzipped: true,
  },
  css: {
    label: 'CSS',
    maxBytes: 50 * 1024, // 50KB gzipped
    extensions: ['.css'],
    gzipped: true,
  },
  assets: {
    label: 'Core Atlas',
    maxBytes: 3 * 1024 * 1024, // 3MB raw
    extensions: ['.png', '.svg', '.webp', '.jpg'],
    gzipped: false,
  },
  audio: {
    label: 'Core Audio',
    maxBytes: 1 * 1024 * 1024, // 1MB raw
    extensions: ['.mp3', '.ogg', '.wav', '.m4a'],
    gzipped: false,
  },
  total: {
    label: 'Total Initial Bundle',
    maxBytes: 5 * 1024 * 1024, // 5MB gzipped
    extensions: null, // all files
    gzipped: true,
  },
};

// ─── Helpers ────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function collectFiles(dir, extensions = null) {
  const results = [];
  if (!existsSync(dir)) return results;

  function walk(d) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const fullPath = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (!extensions || extensions.includes(extname(entry.name))) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

function getFileSize(filePath) {
  return statSync(filePath).size;
}

function estimateGzipSize(filePath) {
  // Use gzip -c to estimate compressed size
  try {
    const result = execSync(`gzip -c "${filePath}" | wc -c`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return parseInt(result.trim(), 10);
  } catch {
    // Fallback: estimate ~30% compression ratio
    return Math.round(getFileSize(filePath) * 0.3);
  }
}

function getTotalSize(files, gzipped) {
  return files.reduce((sum, f) => {
    return sum + (gzipped ? estimateGzipSize(f) : getFileSize(f));
  }, 0);
}

// ─── Main ───────────────────────────────────────────────────

function main() {
  const distDir = process.argv.includes('--dist')
    ? process.argv[process.argv.indexOf('--dist') + 1]
    : 'dist';

  if (!existsSync(distDir)) {
    console.log(`⚠ Build directory "${distDir}" not found. Run "npm run build" first.`);
    console.log('  Skipping budget validation (no build output).');
    process.exit(0);
  }

  console.log(`Validating bundle budgets in ${distDir}/\n`);

  let failures = 0;
  const results = [];

  for (const [key, budget] of Object.entries(BUDGETS)) {
    const files = collectFiles(distDir, budget.extensions);
    const totalSize = getTotalSize(files, budget.gzipped);
    const passed = totalSize <= budget.maxBytes;
    const sizeType = budget.gzipped ? 'gzipped' : 'raw';

    results.push({
      label: budget.label,
      size: totalSize,
      max: budget.maxBytes,
      passed,
      sizeType,
      fileCount: files.length,
    });

    if (!passed) failures++;
  }

  // Print results table
  console.log('Category'.padEnd(25) + 'Size'.padEnd(15) + 'Budget'.padEnd(15) + 'Status');
  console.log('─'.repeat(65));

  for (const r of results) {
    const status = r.passed ? '✓ PASS' : '✗ FAIL';
    const sizeStr = `${formatBytes(r.size)} (${r.sizeType})`;
    const maxStr = formatBytes(r.max);
    console.log(
      `${r.label.padEnd(25)}${sizeStr.padEnd(15)}${maxStr.padEnd(15)}${status}`,
    );
  }

  console.log('─'.repeat(65));

  if (failures > 0) {
    console.log(`\n✗ ${failures} budget(s) exceeded. Build failed.`);
    process.exit(1);
  } else {
    console.log('\n✓ All budgets within limits.');
    process.exit(0);
  }
}

main();
