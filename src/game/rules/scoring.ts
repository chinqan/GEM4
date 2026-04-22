import type { MatchShape, ComboType } from '../../types';

const BASE_SCORES: Record<MatchShape, number> = {
  straight3: 60,
  straight4: 120,
  straight5: 200,
  T: 200,
  L: 200,
  cross: 300,
};

const COMBO_BASE: Record<ComboType, number> = {
  'line.line': 3000,
  'bomb.line': 4000,
  'bomb.bomb': 5000,
  'colour.line': 6000,
  'colour.bomb': 7000,
  'colour.colour': 10000,
};

/** 9.1 連鎖倍率：multiplier(chain) = min(1.0 + (chain - 1) × 0.5, 4.0) */
export function chainMultiplier(chain: number): number {
  if (chain < 1) return 1.0;
  return Math.min(1.0 + (chain - 1) * 0.5, 4.0);
}

/** 9.2 消除得分：base × multiplier + cascadeBonus */
export function matchScore(
  shape: MatchShape,
  chain: number,
  cascadeStep: number,
): number {
  const base = BASE_SCORES[shape];
  const mult = chainMultiplier(chain);
  const cascadeBonus = cascadeStep > 0 ? 50 : 0;
  return Math.round(base * mult + cascadeBonus);
}

/** 9.3 特殊寶石啟動得分：(60 × clearedCount + colourBonus) × multiplier */
export function specialActivationScore(
  clearedCount: number,
  chain: number,
  isColour: boolean,
): number {
  const base = 60 * clearedCount + (isColour ? 500 : 0);
  return Math.round(base * chainMultiplier(chain));
}

/** 9.4 組合得分：comboBase × multiplier */
export function comboScore(type: ComboType, chain: number): number {
  return Math.round(COMBO_BASE[type] * chainMultiplier(chain));
}

/** 9.5 剩餘手數獎勵：1000 × moves */
export function remainingMovesBonus(moves: number): number {
  return Math.max(0, moves) * 1000;
}
