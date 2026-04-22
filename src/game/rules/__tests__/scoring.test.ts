import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  chainMultiplier,
  matchScore,
  specialActivationScore,
  comboScore,
  remainingMovesBonus,
} from '../scoring';
import type { MatchShape } from '../../../types';

// ─── 9.6 單元測試 ───────────────────────────────────────────

describe('chainMultiplier', () => {
  it('chain 1→1.0, 2→1.5, 3→2.0, 4→2.5, 5→3.0, 6→3.5, 7→4.0, 8→4.0（cap）', () => {
    expect(chainMultiplier(1)).toBe(1.0);
    expect(chainMultiplier(2)).toBe(1.5);
    expect(chainMultiplier(3)).toBe(2.0);
    expect(chainMultiplier(4)).toBe(2.5);
    expect(chainMultiplier(5)).toBe(3.0);
    expect(chainMultiplier(6)).toBe(3.5);
    expect(chainMultiplier(7)).toBe(4.0);
    expect(chainMultiplier(8)).toBe(4.0);
  });

  it('chain 0 或負數→1.0', () => {
    expect(chainMultiplier(0)).toBe(1.0);
    expect(chainMultiplier(-1)).toBe(1.0);
    expect(chainMultiplier(-100)).toBe(1.0);
  });
});

describe('matchScore', () => {
  it('straight3 chain 1 → 60', () => {
    expect(matchScore('straight3', 1, 0)).toBe(60);
  });

  it('straight4 chain 1 → 120', () => {
    expect(matchScore('straight4', 1, 0)).toBe(120);
  });

  it('straight5 chain 2 → 200 × 1.5 = 300', () => {
    expect(matchScore('straight5', 2, 0)).toBe(300);
  });

  it('cascadeStep > 0 加 50 bonus', () => {
    // straight3 chain 1 + cascade bonus = 60 + 50 = 110
    expect(matchScore('straight3', 1, 1)).toBe(110);
    expect(matchScore('straight3', 1, 5)).toBe(110);
  });

  it('GDD §6.8 校驗範例 A：3-match chain 1 → 60', () => {
    expect(matchScore('straight3', 1, 0)).toBe(60);
  });

  it('GDD §6.8 校驗範例 B：4-match chain 1 = 120, 3-match chain 2 = 60×1.5+50 = 140, 總計 260', () => {
    const first = matchScore('straight4', 1, 0); // 120
    const second = matchScore('straight3', 2, 1); // 60×1.5 + 50 = 90 + 50 = 140
    expect(first).toBe(120);
    expect(second).toBe(140);
    expect(first + second).toBe(260);
  });
});

describe('specialActivationScore', () => {
  it('Line Bomb 清 8 格 chain 1 → 60×8×1.0 = 480', () => {
    expect(specialActivationScore(8, 1, false)).toBe(480);
  });

  it('Colour Gem 清 10 格 chain 2 → (60×10+500)×1.5 = 1650', () => {
    expect(specialActivationScore(10, 2, true)).toBe(1650);
  });
});

describe('comboScore', () => {
  it('line.line chain 1 → 3000', () => {
    expect(comboScore('line.line', 1)).toBe(3000);
  });

  it('colour.colour chain 2 → 10000×1.5 = 15000', () => {
    expect(comboScore('colour.colour', 2)).toBe(15000);
  });

  it('GDD §6.8 校驗範例 C：Colour×Colour chain ≥2 → 10000×2.0 = 20000', () => {
    // chain 3 → multiplier 2.0
    expect(comboScore('colour.colour', 3)).toBe(20000);
  });
});

describe('remainingMovesBonus', () => {
  it('5 手 → 5000', () => {
    expect(remainingMovesBonus(5)).toBe(5000);
  });

  it('0 手 → 0', () => {
    expect(remainingMovesBonus(0)).toBe(0);
  });

  it('負數 → 0', () => {
    expect(remainingMovesBonus(-1)).toBe(0);
    expect(remainingMovesBonus(-10)).toBe(0);
  });
});

// ─── 9.7 CP-2 Property Test：分數單調性 ────────────────────

/**
 * **Validates: Requirements CP-2**
 *
 * CP-2 分數單調性：
 * - 對任意 chain (1-100) 和 cascadeStep (0-50)，matchScore 結果 ≥ 0
 * - 對任意 chain，chainMultiplier(chain) × base ≥ base（倍率 ≥ 1.0）
 */
describe('CP-2: 分數單調性', () => {
  const ALL_SHAPES: MatchShape[] = [
    'straight3',
    'straight4',
    'straight5',
    'T',
    'L',
    'cross',
  ];

  it('matchScore 對任意 chain (1-100) 和 cascadeStep (0-50) 結果 ≥ 0', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_SHAPES),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 50 }),
        (shape, chain, cascadeStep) => {
          const score = matchScore(shape, chain, cascadeStep);
          expect(score).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('chainMultiplier(chain) × base ≥ base（倍率 ≥ 1.0）', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (chain) => {
          const mult = chainMultiplier(chain);
          expect(mult).toBeGreaterThanOrEqual(1.0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── 9.8 CP-3 Property Test：連鎖倍率邊界 [1.0, 4.0] ──────

/**
 * **Validates: Requirements CP-3**
 *
 * CP-3 連鎖倍率邊界：
 * 對任意 chain (1-10000)，chainMultiplier 結果在 [1.0, 4.0]
 */
describe('CP-3: 連鎖倍率邊界 [1.0, 4.0]', () => {
  it('chainMultiplier 結果在 [1.0, 4.0]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        (chain) => {
          const mult = chainMultiplier(chain);
          expect(mult).toBeGreaterThanOrEqual(1.0);
          expect(mult).toBeLessThanOrEqual(4.0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
