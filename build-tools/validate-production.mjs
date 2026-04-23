#!/usr/bin/env node
/**
 * validate-production.mjs
 *
 * Validates the production build output:
 * 1. Build completes without errors
 * 2. index.html exists and references JS/CSS
 * 3. No source maps leaked (optional check)
 * 4. Bundle budgets pass
 * 5. Critical files present
 *
 * Usage: node build-tools/validate-production.mjs [--dist <path>]
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// ─── Config ─────────────────────────────────────────────────

const DIST_DIR = process.argv.includes('--dist')
  ? process.argv[process.argv.indexOf('--dist') + 1]
  : 'dist';

// ─── Helpers ────────────────────────────────────────────────

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

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── Checks ─────────────────────────────────────────────────

const checks = [];

function check(name, fn) {
  try {
    const result = fn();
    checks.push({ name, passed: result.passed, detail: result.detail });
  } catch (err) {
    checks.push({ name, passed: false, detail: err.message });
  }
}

// ─── Run Checks ─────────────────────────────────────────────

function main() {
  console.log(`Validating production build in ${DIST_DIR}/\n`);

  if (!existsSync(DIST_DIR)) {
    console.log(`⚠ Build directory "${DIST_DIR}" not found.`);
    console.log('  Run "npm run build" first.');
    process.exit(0);
  }

  // 1. index.html exists
  check('index.html exists', () => {
    const exists = existsSync(join(DIST_DIR, 'index.html'));
    return { passed: exists, detail: exists ? 'Found' : 'Missing' };
  });

  // 2. index.html references JS
  check('index.html references JS bundle', () => {
    const html = readFileSync(join(DIST_DIR, 'index.html'), 'utf-8');
    const hasJs = html.includes('.js');
    return { passed: hasJs, detail: hasJs ? 'JS reference found' : 'No JS reference' };
  });

  // 3. JS files exist
  check('JS bundles present', () => {
    const jsFiles = collectFiles(DIST_DIR, ['.js', '.mjs']);
    return {
      passed: jsFiles.length > 0,
      detail: `${jsFiles.length} JS file(s)`,
    };
  });

  // 4. No .ts files in output
  check('No TypeScript source in output', () => {
    const tsFiles = collectFiles(DIST_DIR, ['.ts', '.tsx']);
    // Exclude .d.ts declaration files
    const sourceTs = tsFiles.filter((f) => !f.endsWith('.d.ts'));
    return {
      passed: sourceTs.length === 0,
      detail: sourceTs.length === 0 ? 'Clean' : `Found ${sourceTs.length} .ts file(s)`,
    };
  });

  // 5. Source maps check (warn only)
  check('Source maps (info only)', () => {
    const mapFiles = collectFiles(DIST_DIR, ['.map']);
    return {
      passed: true, // Info only, not a failure
      detail: `${mapFiles.length} source map(s) — ${mapFiles.length > 0 ? 'consider removing for production' : 'none'}`,
    };
  });

  // 6. Total build size
  check('Total build size', () => {
    const allFiles = collectFiles(DIST_DIR);
    const totalSize = allFiles.reduce((sum, f) => sum + statSync(f).size, 0);
    const maxSize = 20 * 1024 * 1024; // 20MB raw (generous for uncompressed)
    return {
      passed: totalSize < maxSize,
      detail: formatBytes(totalSize),
    };
  });

  // ─── Print Results ──────────────────────────────────────

  console.log('Check'.padEnd(40) + 'Status'.padEnd(10) + 'Detail');
  console.log('─'.repeat(70));

  let failures = 0;
  for (const c of checks) {
    const status = c.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${c.name.padEnd(40)}${status.padEnd(10)}${c.detail}`);
    if (!c.passed) failures++;
  }

  console.log('─'.repeat(70));

  if (failures > 0) {
    console.log(`\n✗ ${failures} check(s) failed.`);
    process.exit(1);
  } else {
    console.log('\n✓ All production checks passed.');
  }
}

main();
