// ─── 基礎型別 ───────────────────────────────────────────────

/** 格子座標，[col, row]，(0,0) 為左上角 */
export type CellPos = [col: number, row: number];

/** 基礎色代號 */
export type GemColour = 'R' | 'G' | 'B' | 'Y' | 'P' | 'W' | 'O';

/** 特殊寶石類型 */
export type SpecialGemType = 'lineH' | 'lineV' | 'area' | 'colour';

/** Blocker 種類 */
export type BlockerKind = 'jelly' | 'lock' | 'generator' | 'unstable';

/** Combo 類型（6 個唯一對，對稱消除） */
export type ComboType =
  | 'line.line'
  | 'bomb.line'
  | 'bomb.bomb'
  | 'colour.line'
  | 'colour.bomb'
  | 'colour.colour';

/** 消除形狀 */
export type MatchShape =
  | 'straight3'
  | 'straight4'
  | 'straight5'
  | 'T'
  | 'L'
  | 'cross';

// ─── 遊戲事件相關介面 ──────────────────────────────────────

/** 單次消除描述 */
export interface MatchDescriptor {
  cells: CellPos[];
  shape: MatchShape;
  colour: GemColour;
  spawnsSpecial?: SpecialGemType;
  spawnAt?: CellPos;
}

/** 目標進度差分 */
export interface ObjectiveDelta {
  type: string;
  progress: number; // 0..1
  completedSubObjectives?: number;
}

/** 欄掉落描述 */
export interface ColumnDrop {
  column: number;
  distance: number;
}

// ─── 遊戲結果與狀態介面 ────────────────────────────────────

/** 關卡結果 */
export interface LevelResult {
  levelId: number;
  cleared: boolean;
  stars: 0 | 1 | 2 | 3;
  score: number;
  chainMax: number;
  movesRemaining: number;
  /** 通關時剩餘秒數（計時關卡用，非計時關卡為 0） */
  timeRemaining?: number;
  specialSpawnedCount: number;
  durationMs: number;
}

/** Endless 結果 */
export interface EndlessResult {
  score: number;
  chainMax: number;
  specialSpawnedCount: number;
  durationMs: number;
  rank?: number;
}

/** 關卡內執行狀態 */
export interface RunState {
  phase:
    | 'loading'
    | 'intro'
    | 'playing'
    | 'resolving'
    | 'objectiveMet'
    | 'outOfMoves'
    | 'outOfTime';
  chainCount: number;
  score: number;
  movesRemaining?: number;
  timeRemainingMs?: number;
  intensity: number;
}

/** Endless 執行狀態 */
export interface EndlessRunState {
  phase: 'playing' | 'resolving' | 'gameOver';
  score: number;
  chainMax: number;
  difficulty: number;
  reshufflesUsed: number;
  reshufflesMax: number;
}

// ─── 目標相關型別 ──────────────────────────────────────────

/** 星門基準 */
export type StarBasis = 'score' | 'movesRemaining' | 'timeRemaining';

/** 目標（discriminated union） */
export type Objective =
  | { type: 'score'; target: number }
  | { type: 'clear'; target: Array<{ blocker: BlockerKind; count: number }> }
  | { type: 'collect'; target: Array<{ colour: GemColour; count: number }> }
  | { type: 'drop'; target: { count: number } }
  | { type: 'multi'; objectives: Exclude<Objective, { type: 'multi' }>[] };

/** Blocker 預置 */
export interface BlockerPlacement {
  type: BlockerKind;
  at: CellPos;
  layers?: number;
  generatorSpec?: { spawnKind: BlockerKind; everyNMoves: number };
  unstableSpec?: { countdown: number };
}
