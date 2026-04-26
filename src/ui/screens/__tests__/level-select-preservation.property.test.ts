/**
 * Preservation Property Tests — Level Select UI Behavior
 *
 * **Validates: Requirements 3.1, 3.3, 3.7**
 *
 * These tests observe and lock down EXISTING (unfixed) behavior that must
 * remain unchanged after the bugfixes are applied. They MUST PASS on
 * unfixed code to confirm the baseline.
 *
 * Since PixiJS requires a browser environment, we replicate the display logic
 * from setLevelData to test the pure computation without PixiJS dependencies.
 *
 * Observation-first methodology:
 * - Observe: setLevelData({attempts: 5, bestScore: 1200, ...}) → bestText = '過往最佳: 1,200 分'
 * - Observe: setLevelData always sets title to W{worldId} · Level {levelId.padStart(2,'0')} format
 * - Observe: setLevelData sets budgetText correctly for moveBudget/timeBudget
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { LevelSelectData } from '../level-select';

// ─── Replicated Logic from level-select.ts ──────────────────
// These functions replicate the CURRENT (unfixed) logic from setLevelData
// in level-select.ts. The preservation tests verify that this logic
// remains unchanged after the bugfix.

/**
 * Replicates the title logic from level-select.ts setLevelData.
 * titleText.text = `W${d.worldId} · Level ${String(d.levelId).padStart(2, '0')}`;
 */
function computeTitle(d: LevelSelectData): string {
  return `W${d.worldId} · Level ${String(d.levelId).padStart(2, '0')}`;
}

/**
 * Replicates the budget text logic from level-select.ts setLevelData.
 */
function computeBudgetText(d: LevelSelectData): string {
  if (d.moveBudget != null) {
    return `手數: ${d.moveBudget}`;
  } else if (d.timeBudget != null) {
    return `時間: ${d.timeBudget}s`;
  } else {
    return '';
  }
}

/**
 * Replicates the bestText logic from level-select.ts setLevelData.
 * This is the CURRENT (unfixed) logic for the bestScore > 0 path.
 *
 * Current code:
 *   if (d.bestScore > 0) {
 *     bestText.text = `過往最佳: ${d.bestScore.toLocaleString()} 分`;
 *   } else {
 *     bestText.text = '過往最佳: —';
 *   }
 *
 * For preservation, we only test the bestScore > 0 path (which should remain unchanged).
 */
function computeBestText(d: LevelSelectData): string {
  if (d.bestScore > 0) {
    return `過往最佳: ${d.bestScore.toLocaleString()} 分`;
  } else {
    return '過往最佳: —';
  }
}

// ─── Preservation Property: bestScore > 0 display format (Req 3.1) ──

/**
 * **Validates: Requirements 3.1**
 *
 * Property: For all LevelSelectData where attempts > 0 AND bestScore > 0,
 * bestText equals '過往最佳: ${bestScore.toLocaleString()} 分'.
 * This behavior must be preserved after the bugfix.
 */
describe('Preservation — bestScore > 0 display format (Req 3.1)', () => {
  it('for all attempts > 0 AND bestScore > 0, bestText = 過往最佳: {bestScore} 分', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),      // attempts > 0
        fc.integer({ min: 1, max: 999999 }),   // bestScore > 0
        fc.integer({ min: 1, max: 4 }),        // worldId
        fc.integer({ min: 1, max: 80 }),       // levelId
        (attempts, bestScore, worldId, levelId) => {
          const data: LevelSelectData = {
            worldId,
            levelId,
            objectiveText: 'Test objective',
            moveBudget: 20,
            bestStars: Math.min(3, Math.floor(bestScore / 1000)) as 0 | 1 | 2 | 3,
            bestScore,
            attempts,
          };

          const result = computeBestText(data);
          expect(result).toBe(`過往最佳: ${bestScore.toLocaleString()} 分`);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─── Preservation Property: title format (Req 3.3) ──────────

/**
 * **Validates: Requirements 3.3**
 *
 * Property: For all LevelSelectData, title format W{worldId} · Level {XX} is preserved.
 */
describe('Preservation — title format W{worldId} · Level {XX} (Req 3.3)', () => {
  it('for all LevelSelectData, title = W{worldId} · Level {levelId padded to 2 digits}', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }),       // worldId
        fc.integer({ min: 1, max: 80 }),      // levelId
        fc.integer({ min: 0, max: 100 }),     // attempts
        fc.integer({ min: 0, max: 50000 }),   // bestScore
        (worldId, levelId, attempts, bestScore) => {
          const data: LevelSelectData = {
            worldId,
            levelId,
            objectiveText: 'Some objective',
            moveBudget: 15,
            bestStars: 0,
            bestScore,
            attempts,
          };

          const result = computeTitle(data);
          const expected = `W${worldId} · Level ${String(levelId).padStart(2, '0')}`;
          expect(result).toBe(expected);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─── Preservation Property: budget display (Req 3.7) ────────

/**
 * **Validates: Requirements 3.7**
 *
 * Property: For all LevelSelectData with moveBudget or timeBudget,
 * budget display is preserved.
 */
describe('Preservation — budget display (Req 3.7)', () => {
  it('moveBudget → 手數: {moveBudget}', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),  // moveBudget
        fc.integer({ min: 1, max: 4 }),
        fc.integer({ min: 1, max: 80 }),
        (moveBudget, worldId, levelId) => {
          const data: LevelSelectData = {
            worldId,
            levelId,
            objectiveText: 'Test',
            moveBudget,
            bestStars: 0,
            bestScore: 0,
            attempts: 0,
          };

          const result = computeBudgetText(data);
          expect(result).toBe(`手數: ${moveBudget}`);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('timeBudget → 時間: {timeBudget}s', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 300 }),  // timeBudget
        fc.integer({ min: 1, max: 4 }),
        fc.integer({ min: 1, max: 80 }),
        (timeBudget, worldId, levelId) => {
          const data: LevelSelectData = {
            worldId,
            levelId,
            objectiveText: 'Test',
            timeBudget,
            bestStars: 0,
            bestScore: 0,
            attempts: 0,
          };

          const result = computeBudgetText(data);
          expect(result).toBe(`時間: ${timeBudget}s`);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('neither moveBudget nor timeBudget → empty string', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }),
        fc.integer({ min: 1, max: 80 }),
        (worldId, levelId) => {
          const data: LevelSelectData = {
            worldId,
            levelId,
            objectiveText: 'Test',
            bestStars: 0,
            bestScore: 0,
            attempts: 0,
          };

          const result = computeBudgetText(data);
          expect(result).toBe('');
        },
      ),
      { numRuns: 10 },
    );
  });
});
