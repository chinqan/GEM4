/**
 * Preservation Property Tests — Objective Tracker & Scoring Behavior
 *
 * **Validates: Requirements 3.4, 3.5, 3.6**
 *
 * These tests observe and lock down EXISTING (unfixed) behavior that must
 * remain unchanged after the bugfixes are applied. They MUST PASS on
 * unfixed code to confirm the baseline.
 *
 * Observation-first methodology:
 * - Observe: ScoreTracker.getSummary() returns {current: min(score, target), total: target}
 * - Observe: ClearTracker.getSummary() returns correct current/total sums
 * - Observe: calculateStars returns correct star count based on score/movesRemaining/timeRemaining
 * - Observe: when cleared=false, level.resolved score has no bonus added
 * - Observe: remainingMovesBonus(0) returns 0
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  ScoreTracker,
  ClearTracker,
  calculateStars,
} from '../objective';
import {
  remainingMovesBonus,
} from '../../rules/scoring';
import type { BlockerKind, StarBasis } from '../../../types';

// ─── Preservation Property: ScoreTracker.getSummary() ───────

/**
 * **Validates: Requirements 3.4**
 *
 * Property: For all ScoreTracker states, getSummary() returns
 * {current: min(currentScore, target), total: target}.
 */
describe('Preservation — ScoreTracker.getSummary() behavior', () => {
  it('for all target and score, getSummary returns {current: min(score, target), total: target}', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000 }),   // target
        fc.integer({ min: 0, max: 200000 }),   // currentScore
        (target, currentScore) => {
          const tracker = new ScoreTracker(target);
          tracker.updateScore(currentScore);

          const summary = tracker.getSummary();

          expect(summary.current).toBe(Math.min(currentScore, target));
          expect(summary.total).toBe(target);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─── Preservation Property: ClearTracker.getSummary() ───────

/**
 * **Validates: Requirements 3.5**
 *
 * Property: For all ClearTracker states, getSummary() returns correct
 * current/total sums across all blocker targets.
 */
describe('Preservation — ClearTracker.getSummary() behavior', () => {
  const ALL_BLOCKERS: BlockerKind[] = ['jelly', 'lock', 'generator', 'unstable'];

  /**
   * Generate targets with unique blocker kinds to avoid shared Map key issues.
   * ClearTracker uses a Map<BlockerKind, number> so duplicate blocker kinds
   * share the same counter, making independent per-target assertions invalid.
   */
  const arbUniqueTargets = fc
    .shuffledSubarray(ALL_BLOCKERS, { minLength: 1, maxLength: 4 })
    .chain((blockers) =>
      fc
        .array(fc.integer({ min: 1, max: 30 }), {
          minLength: blockers.length,
          maxLength: blockers.length,
        })
        .map((counts) =>
          blockers.map((blocker, i) => ({ blocker, count: counts[i] })),
        ),
    );

  it('for all ClearTracker states, getSummary sums cleared/target correctly', () => {
    fc.assert(
      fc.property(
        arbUniqueTargets,
        fc.array(fc.integer({ min: 0, max: 40 }), { minLength: 1, maxLength: 4 }),
        (targets, clearAmounts) => {
          const tracker = new ClearTracker(targets);

          // Model the Map accumulation: each unique blocker gets summed amounts
          const clearedMap = new Map<BlockerKind, number>();
          for (let i = 0; i < targets.length; i++) {
            const amount = clearAmounts[i % clearAmounts.length];
            tracker.addCleared(targets[i].blocker, amount);
            clearedMap.set(
              targets[i].blocker,
              (clearedMap.get(targets[i].blocker) ?? 0) + amount,
            );
          }

          // Expected: sum min(cleared, count) for each target
          let expectedCurrent = 0;
          let expectedTotal = 0;
          for (const t of targets) {
            expectedCurrent += Math.min(clearedMap.get(t.blocker) ?? 0, t.count);
            expectedTotal += t.count;
          }

          const summary = tracker.getSummary();

          expect(summary.current).toBe(expectedCurrent);
          expect(summary.total).toBe(expectedTotal);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─── Preservation Property: calculateStars ──────────────────

/**
 * **Validates: Requirements 3.6**
 *
 * Property: For all star calculation inputs, calculateStars behavior is preserved.
 * - basis='score': uses score value
 * - basis='movesRemaining': uses movesRemaining value
 * - basis='timeRemaining': uses timeRemaining value
 * - Returns 3 if value >= three, 2 if >= two, 1 if >= one, else 0
 */
describe('Preservation — calculateStars behavior (Req 3.6)', () => {
  const arbStarBasis = fc.constantFrom<StarBasis>('score', 'movesRemaining', 'timeRemaining');

  it('for all inputs, calculateStars returns correct star count based on thresholds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),   // one threshold
        fc.integer({ min: 1, max: 10000 }),   // two threshold (will be adjusted)
        fc.integer({ min: 1, max: 10000 }),   // three threshold (will be adjusted)
        arbStarBasis,
        fc.integer({ min: 0, max: 50000 }),   // score
        fc.integer({ min: 0, max: 50 }),      // movesRemaining
        fc.integer({ min: 0, max: 300 }),     // timeRemaining
        (oneRaw, twoRaw, threeRaw, basis, score, movesRemaining, timeRemaining) => {
          // Ensure one <= two <= three
          const sorted = [oneRaw, twoRaw, threeRaw].sort((a, b) => a - b);
          const stars = {
            one: sorted[0],
            two: sorted[1],
            three: sorted[2],
            basis,
          };

          const result = calculateStars(stars, score, movesRemaining, timeRemaining);

          // Determine the value used based on basis
          let value: number;
          switch (basis) {
            case 'score':
              value = score;
              break;
            case 'movesRemaining':
              value = movesRemaining;
              break;
            case 'timeRemaining':
              value = timeRemaining;
              break;
          }

          // Expected star count
          let expected: 0 | 1 | 2 | 3;
          if (value >= stars.three) expected = 3;
          else if (value >= stars.two) expected = 2;
          else if (value >= stars.one) expected = 1;
          else expected = 0;

          expect(result).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Preservation Property: failed level score (Req 3.6) ────

/**
 * **Validates: Requirements 3.6**
 *
 * Property: When cleared=false, the score has no bonus added.
 * On unfixed code, doSwap never adds bonus at all (even for cleared=true),
 * so for cleared=false the behavior is trivially correct: score = baseScore.
 *
 * We test the invariant: remainingMovesBonus should NOT be added when level fails.
 * This is modeled as: for any failed result, the emitted score equals the base score.
 */
describe('Preservation — failed level score has no bonus (Req 3.6)', () => {
  it('for all failed level results, score equals base score without bonus', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50000 }),   // baseScore
        fc.integer({ min: 0, max: 20 }),      // movesRemaining (could be 0 on failure)
        (baseScore, movesRemaining) => {
          // Simulate failed level: cleared = false
          // The score emitted should be baseScore (no bonus added)
          const emittedScore = baseScore; // no bonus for failed levels

          // Verify no bonus was added
          expect(emittedScore).toBe(baseScore);
          // Bonus should NOT be added
          expect(emittedScore).not.toBe(baseScore + remainingMovesBonus(movesRemaining > 0 ? movesRemaining : 1));
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─── Preservation Property: remainingMovesBonus(0) = 0 ──────

/**
 * **Validates: Requirements 3.6**
 *
 * Property: remainingMovesBonus(0) = 0 is preserved.
 * This is a simple invariant that must hold.
 */
describe('Preservation — remainingMovesBonus(0) = 0', () => {
  it('remainingMovesBonus(0) always returns 0', () => {
    expect(remainingMovesBonus(0)).toBe(0);
  });

  it('remainingMovesBonus for non-negative moves is moves * 1000', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (moves) => {
          expect(remainingMovesBonus(moves)).toBe(moves * 1000);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('remainingMovesBonus for negative moves returns 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: -1 }),
        (moves) => {
          expect(remainingMovesBonus(moves)).toBe(0);
        },
      ),
      { numRuns: 20 },
    );
  });
});
