#!/usr/bin/env node
/**
 * perf-validation.mjs
 *
 * Performance validation stubs for CI/manual testing.
 * Validates runtime performance metrics:
 * - 60 FPS target (worst-case ≥55)
 * - Draw calls ≤80/frame
 * - 30-minute memory drift ≤10MB
 *
 * These are stubs that define the validation framework.
 * Actual measurement requires a running browser instance (Playwright).
 *
 * Usage: node build-tools/perf-validation.mjs
 */

// ─── Performance Budgets ────────────────────────────────────

const PERF_BUDGETS = {
  fps: {
    label: 'Frame Rate',
    target: 60,
    minimum: 55,
    unit: 'FPS',
  },
  frameTime99: {
    label: '99th Percentile Frame Time',
    maximum: 25,
    unit: 'ms',
  },
  gameLogicTime: {
    label: 'Game Logic Per Frame',
    maximum: 4,
    unit: 'ms',
  },
  drawCalls: {
    label: 'Draw Calls Per Frame',
    maximum: 80,
    unit: 'calls',
  },
  memoryDrift30min: {
    label: '30-min Memory Drift',
    maximum: 10,
    unit: 'MB',
  },
  levelSwitchHeapDelta: {
    label: 'Level Switch Heap Delta',
    maximum: 2,
    unit: 'MB',
  },
  tti: {
    label: 'Time to Interactive',
    maximum: 3000,
    unit: 'ms',
  },
};

// ─── Validation Stubs ───────────────────────────────────────

/**
 * Validate FPS metrics from a performance trace.
 * @param {number[]} frameTimes - Array of frame times in ms
 * @returns {{ passed: boolean, avgFps: number, minFps: number, p99FrameTime: number }}
 */
function validateFps(frameTimes) {
  if (frameTimes.length === 0) {
    return { passed: false, avgFps: 0, minFps: 0, p99FrameTime: Infinity };
  }

  const sorted = [...frameTimes].sort((a, b) => a - b);
  const p99Index = Math.floor(sorted.length * 0.99);
  const p99FrameTime = sorted[p99Index] ?? sorted[sorted.length - 1];

  const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  const avgFps = 1000 / avgFrameTime;
  const minFps = 1000 / Math.max(...frameTimes);

  return {
    passed: minFps >= PERF_BUDGETS.fps.minimum && p99FrameTime <= PERF_BUDGETS.frameTime99.maximum,
    avgFps: Math.round(avgFps * 10) / 10,
    minFps: Math.round(minFps * 10) / 10,
    p99FrameTime: Math.round(p99FrameTime * 10) / 10,
  };
}

/**
 * Validate draw call count.
 * @param {number[]} drawCallCounts - Array of draw call counts per frame
 * @returns {{ passed: boolean, maxDrawCalls: number, avgDrawCalls: number }}
 */
function validateDrawCalls(drawCallCounts) {
  if (drawCallCounts.length === 0) {
    return { passed: true, maxDrawCalls: 0, avgDrawCalls: 0 };
  }

  const max = Math.max(...drawCallCounts);
  const avg = drawCallCounts.reduce((a, b) => a + b, 0) / drawCallCounts.length;

  return {
    passed: max <= PERF_BUDGETS.drawCalls.maximum,
    maxDrawCalls: max,
    avgDrawCalls: Math.round(avg),
  };
}

/**
 * Validate memory drift over a session.
 * @param {number} startHeapMB - Heap size at start in MB
 * @param {number} endHeapMB - Heap size at end in MB
 * @param {number} durationMinutes - Session duration in minutes
 * @returns {{ passed: boolean, driftMB: number }}
 */
function validateMemoryDrift(startHeapMB, endHeapMB, durationMinutes) {
  const driftMB = endHeapMB - startHeapMB;
  const budget = durationMinutes >= 30
    ? PERF_BUDGETS.memoryDrift30min.maximum
    : PERF_BUDGETS.memoryDrift30min.maximum * (durationMinutes / 30);

  return {
    passed: driftMB <= budget,
    driftMB: Math.round(driftMB * 100) / 100,
  };
}

// ─── Report ─────────────────────────────────────────────────

function printBudgets() {
  console.log('Performance Budgets\n');
  console.log('Metric'.padEnd(35) + 'Budget'.padEnd(15) + 'Unit');
  console.log('─'.repeat(60));

  for (const [, budget] of Object.entries(PERF_BUDGETS)) {
    const value = budget.maximum ?? budget.minimum ?? budget.target;
    const qualifier = budget.maximum ? '≤' : budget.minimum ? '≥' : '=';
    console.log(
      `${budget.label.padEnd(35)}${qualifier} ${String(value).padEnd(12)}${budget.unit}`,
    );
  }

  console.log('─'.repeat(60));
  console.log('\nNote: Actual validation requires a running browser instance.');
  console.log('Use Playwright tests (e2e/) to measure runtime performance.');
}

// ─── Main ───────────────────────────────────────────────────

function main() {
  printBudgets();

  // Run stub validations with sample data to verify the functions work
  console.log('\n--- Stub Validation (sample data) ---\n');

  const sampleFrameTimes = Array.from({ length: 100 }, () => 14 + Math.random() * 4);
  const fpsResult = validateFps(sampleFrameTimes);
  console.log(`FPS: avg=${fpsResult.avgFps}, min=${fpsResult.minFps}, p99=${fpsResult.p99FrameTime}ms → ${fpsResult.passed ? 'PASS' : 'FAIL'}`);

  const sampleDrawCalls = Array.from({ length: 100 }, () => Math.floor(30 + Math.random() * 40));
  const dcResult = validateDrawCalls(sampleDrawCalls);
  console.log(`Draw Calls: max=${dcResult.maxDrawCalls}, avg=${dcResult.avgDrawCalls} → ${dcResult.passed ? 'PASS' : 'FAIL'}`);

  const memResult = validateMemoryDrift(50, 55, 30);
  console.log(`Memory Drift: ${memResult.driftMB}MB over 30min → ${memResult.passed ? 'PASS' : 'FAIL'}`);
}

main();
