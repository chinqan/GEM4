import type { CellPos, GemColour, Objective, StarBasis, BlockerPlacement } from '../../types';

// ─── 型別定義 ───────────────────────────────────────────────

export interface LevelSpec {
  id: number;
  worldId: number;
  name: { 'zh-TW': string; en: string };
  board: {
    width: number;
    height: number;
    empty: CellPos[];
    deliveryCells?: CellPos[];
  };
  gems: {
    colours: GemColour[];
    weights?: Partial<Record<GemColour, number>>;
  };
  constraints: {
    moveBudget?: number;
    timeBudget?: number;
  };
  objective: Objective;
  stars: { one: number; two: number; three: number; basis: StarBasis };
  blockers?: BlockerPlacement[];
  specialRules?: string[];
}

// ─── 關卡註冊表 ─────────────────────────────────────────────

const levelRegistry = new Map<number, LevelSpec>();

/** 註冊關卡 */
export function registerLevel(spec: LevelSpec): void {
  levelRegistry.set(spec.id, spec);
}

/** 載入關卡 */
export function loadLevel(id: number): LevelSpec | null {
  return levelRegistry.get(id) ?? null;
}

/** 取得所有已註冊的關卡 ID */
export function getAllLevelIds(): number[] {
  return Array.from(levelRegistry.keys()).sort((a, b) => a - b);
}

/** 取得指定世界的關卡 */
export function getLevelsByWorld(worldId: number): LevelSpec[] {
  return Array.from(levelRegistry.values())
    .filter(l => l.worldId === worldId)
    .sort((a, b) => a.id - b.id);
}
