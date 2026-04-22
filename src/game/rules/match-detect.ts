import type { CellPos, GemColour, SpecialGemType, MatchShape, MatchDescriptor } from '../../types';
import type { Board } from './board';
import { getCell } from './board';

// ─── 內部型別 ───────────────────────────────────────────────

/** 原始連續同色區段 */
export interface RawRun {
  cells: CellPos[];
  colour: GemColour;
  direction: 'horizontal' | 'vertical';
}

/** 偵測選項 */
export interface DetectOptions {
  swapPos?: CellPos; // 玩家交換後到達的位置（swap 觸發時提供）
}

// ─── 5.1 水平掃描 ──────────────────────────────────────────

/** 水平掃描：逐列從左到右，找連續同色 ≥3 的區段 */
export function scanHorizontal(board: Board): RawRun[] {
  const runs: RawRun[] = [];

  for (let row = 0; row < board.height; row++) {
    let runStart = 0;
    let runColour: GemColour | null = null;
    let runLength = 0;

    for (let col = 0; col <= board.width; col++) {
      let cellColour: GemColour | null = null;

      if (col < board.width) {
        const cell = board.cells[col][row];
        if (!cell.isEmpty && cell.gem && !cell.gem.locked && cell.gem.colour !== null) {
          cellColour = cell.gem.colour;
        }
      }

      if (cellColour !== null && cellColour === runColour) {
        runLength++;
      } else {
        // Flush previous run if ≥3
        if (runColour !== null && runLength >= 3) {
          const cells: CellPos[] = [];
          for (let c = runStart; c < runStart + runLength; c++) {
            cells.push([c, row]);
          }
          runs.push({ cells, colour: runColour, direction: 'horizontal' });
        }
        // Start new run
        runStart = col;
        runColour = cellColour;
        runLength = cellColour !== null ? 1 : 0;
      }
    }
  }

  return runs;
}

// ─── 5.2 垂直掃描 ──────────────────────────────────────────

/** 垂直掃描：逐行從上到下，找連續同色 ≥3 的區段 */
export function scanVertical(board: Board): RawRun[] {
  const runs: RawRun[] = [];

  for (let col = 0; col < board.width; col++) {
    let runStart = 0;
    let runColour: GemColour | null = null;
    let runLength = 0;

    for (let row = 0; row <= board.height; row++) {
      let cellColour: GemColour | null = null;

      if (row < board.height) {
        const cell = board.cells[col][row];
        if (!cell.isEmpty && cell.gem && !cell.gem.locked && cell.gem.colour !== null) {
          cellColour = cell.gem.colour;
        }
      }

      if (cellColour !== null && cellColour === runColour) {
        runLength++;
      } else {
        // Flush previous run if ≥3
        if (runColour !== null && runLength >= 3) {
          const cells: CellPos[] = [];
          for (let r = runStart; r < runStart + runLength; r++) {
            cells.push([col, r]);
          }
          runs.push({ cells, colour: runColour, direction: 'vertical' });
        }
        // Start new run
        runStart = row;
        runColour = cellColour;
        runLength = cellColour !== null ? 1 : 0;
      }
    }
  }

  return runs;
}

// ─── 5.3-5.4 形狀合併與分類 ────────────────────────────────

/** 將 CellPos 轉為字串 key */
function posKey(pos: CellPos): string {
  return `${pos[0]},${pos[1]}`;
}

/** 找出兩個 run 共享的格子 */
function findSharedCells(a: RawRun, b: RawRun): CellPos[] {
  const setA = new Set(a.cells.map(posKey));
  return b.cells.filter((c) => setA.has(posKey(c)));
}

/** 判斷一個格子是否是 run 的端點（第一個或最後一個） */
function isEndpoint(run: RawRun, pos: CellPos): boolean {
  const key = posKey(pos);
  const first = posKey(run.cells[0]);
  const last = posKey(run.cells[run.cells.length - 1]);
  return key === first || key === last;
}

/** 判斷一個格子是否是 run 的中間格（非端點） */
function isMiddle(run: RawRun, pos: CellPos): boolean {
  if (run.cells.length < 3) return false;
  const key = posKey(pos);
  // 中間格 = 不是第一個也不是最後一個
  for (let i = 1; i < run.cells.length - 1; i++) {
    if (posKey(run.cells[i]) === key) return true;
  }
  return false;
}

/** 合併兩個 run 的所有格子（去重） */
function mergeCells(a: RawRun, b: RawRun): CellPos[] {
  const seen = new Set<string>();
  const result: CellPos[] = [];
  for (const c of [...a.cells, ...b.cells]) {
    const k = posKey(c);
    if (!seen.has(k)) {
      seen.add(k);
      result.push(c);
    }
  }
  return result;
}

/** 判斷合併後的形狀 */
function classifyMergedShape(
  hRun: RawRun,
  vRun: RawRun,
  shared: CellPos[],
): MatchShape {
  const totalCells = mergeCells(hRun, vRun).length;

  // 兩個 4+ 連交叉 → cross
  if (hRun.cells.length >= 4 && vRun.cells.length >= 4) {
    return 'cross';
  }

  // ≥6 格 → cross
  if (totalCells >= 6) {
    return 'cross';
  }

  // 共享恰好 1 個格子
  if (shared.length === 1) {
    const sharedPos = shared[0];

    // T 形判斷：一個 run 的中間格是另一個 run 的端點
    // 或者：共享格是某個 run 的中間格
    const isMiddleOfH = isMiddle(hRun, sharedPos);
    const isMiddleOfV = isMiddle(vRun, sharedPos);

    if (isMiddleOfH || isMiddleOfV) {
      return 'T';
    }

    // L 形判斷：兩個 run 共享一個端點格
    const isEndpointOfH = isEndpoint(hRun, sharedPos);
    const isEndpointOfV = isEndpoint(vRun, sharedPos);

    if (isEndpointOfH && isEndpointOfV) {
      return 'L';
    }

    // 其他情況（一個端點一個非端點）→ T
    return 'T';
  }

  // 多個共享格 → cross
  return 'cross';
}

/** 對獨立 run 分類形狀 */
function classifySingleRun(run: RawRun): MatchShape {
  const len = run.cells.length;
  if (len >= 6) return 'cross';
  if (len === 5) return 'straight5';
  if (len === 4) return 'straight4';
  return 'straight3';
}

/** 決定合併 match 的主方向 */
function getMergedDirection(
  hRun: RawRun,
  vRun: RawRun,
): 'horizontal' | 'vertical' {
  // 較長的 run 決定方向；相同長度時水平優先
  if (vRun.cells.length > hRun.cells.length) return 'vertical';
  return 'horizontal';
}

/** 合併重疊的 runs 為 MatchDescriptor[] */
export function mergeRuns(runs: RawRun[]): MatchDescriptor[] {
  const hRuns = runs.filter((r) => r.direction === 'horizontal');
  const vRuns = runs.filter((r) => r.direction === 'vertical');

  // 追蹤已被合併的 run
  const mergedH = new Set<number>();
  const mergedV = new Set<number>();

  const results: MatchDescriptor[] = [];

  // 嘗試合併水平+垂直 run 對（同色且共享格子）
  for (let hi = 0; hi < hRuns.length; hi++) {
    for (let vi = 0; vi < vRuns.length; vi++) {
      if (mergedH.has(hi) || mergedV.has(vi)) continue;

      const hRun = hRuns[hi];
      const vRun = vRuns[vi];

      // 必須同色
      if (hRun.colour !== vRun.colour) continue;

      const shared = findSharedCells(hRun, vRun);
      if (shared.length === 0) continue;

      // 合併
      mergedH.add(hi);
      mergedV.add(vi);

      const cells = mergeCells(hRun, vRun);
      const shape = classifyMergedShape(hRun, vRun, shared);
      const direction = getMergedDirection(hRun, vRun);
      const special = determineSpecial(shape, direction);

      const desc: MatchDescriptor = {
        cells,
        shape,
        colour: hRun.colour,
      };

      if (special !== undefined) {
        desc.spawnsSpecial = special;
      }

      results.push(desc);
    }
  }

  // 處理未被合併的獨立 run
  for (let hi = 0; hi < hRuns.length; hi++) {
    if (mergedH.has(hi)) continue;
    const run = hRuns[hi];
    const shape = classifySingleRun(run);
    const special = determineSpecial(shape, 'horizontal');

    const desc: MatchDescriptor = {
      cells: [...run.cells],
      shape,
      colour: run.colour,
    };

    if (special !== undefined) {
      desc.spawnsSpecial = special;
    }

    results.push(desc);
  }

  for (let vi = 0; vi < vRuns.length; vi++) {
    if (mergedV.has(vi)) continue;
    const run = vRuns[vi];
    const shape = classifySingleRun(run);
    const special = determineSpecial(shape, 'vertical');

    const desc: MatchDescriptor = {
      cells: [...run.cells],
      shape,
      colour: run.colour,
    };

    if (special !== undefined) {
      desc.spawnsSpecial = special;
    }

    results.push(desc);
  }

  return results;
}

// ─── 5.5 特殊寶石決定 ──────────────────────────────────────

/** 依形狀與方向決定生成的特殊寶石類型 */
export function determineSpecial(
  shape: MatchShape,
  direction: 'horizontal' | 'vertical',
): SpecialGemType | undefined {
  switch (shape) {
    case 'straight3':
      return undefined;
    case 'straight4':
      return direction === 'horizontal' ? 'lineH' : 'lineV';
    case 'straight5':
      return 'colour';
    case 'T':
    case 'L':
    case 'cross':
      return 'area';
  }
}

// ─── 5.6 生成位置決定 ──────────────────────────────────────

/** 特殊寶石優先序數值（越大越優先） */
function specialPriority(special: SpecialGemType | undefined): number {
  if (special === undefined) return 0;
  switch (special) {
    case 'lineH':
    case 'lineV':
      return 1;
    case 'area':
      return 2;
    case 'colour':
      return 3;
  }
}

/** 計算 match 的中央格 */
function getCenterCell(cells: CellPos[]): CellPos {
  const midIdx = Math.floor((cells.length - 1) / 2);
  // 按位置排序後取中間
  const sorted = [...cells].sort((a, b) => {
    if (a[1] !== b[1]) return a[1] - b[1]; // row first
    return a[0] - b[0]; // then col
  });
  return sorted[midIdx];
}

/** 找出 T 形或 L 形的交會/轉角點 */
function getIntersectionCell(
  cells: CellPos[],
  shape: MatchShape,
): CellPos {
  // 對於 T/L/cross，交會點是同時在水平和垂直方向上有鄰居的格子
  // 簡化：找出在 cells 中同時有水平和垂直鄰居的格子
  const cellSet = new Set(cells.map(posKey));

  for (const cell of cells) {
    const [col, row] = cell;
    const hasLeft = cellSet.has(posKey([col - 1, row]));
    const hasRight = cellSet.has(posKey([col + 1, row]));
    const hasUp = cellSet.has(posKey([col, row - 1]));
    const hasDown = cellSet.has(posKey([col, row + 1]));

    const hasHorizontalNeighbor = hasLeft || hasRight;
    const hasVerticalNeighbor = hasUp || hasDown;

    if (hasHorizontalNeighbor && hasVerticalNeighbor) {
      return cell;
    }
  }

  // Fallback to center
  return getCenterCell(cells);
}

/** 決定 spawnAt 位置 */
function determineSpawnAt(
  match: MatchDescriptor,
  swapPos?: CellPos,
): CellPos | undefined {
  if (match.spawnsSpecial === undefined) return undefined;

  // swap 觸發：如果 swapPos 在 match 的 cells 中，spawnAt = swapPos
  if (swapPos) {
    const swapKey = posKey(swapPos);
    const inMatch = match.cells.some((c) => posKey(c) === swapKey);
    if (inMatch) {
      return swapPos;
    }
  }

  // T/L/cross：交會點
  if (match.shape === 'T' || match.shape === 'L' || match.shape === 'cross') {
    return getIntersectionCell(match.cells, match.shape);
  }

  // cascade 觸發（無 swapPos）或 swapPos 不在 match 中：中央格
  return getCenterCell(match.cells);
}

// ─── 主函式 ────────────────────────────────────────────────

/**
 * 偵測棋盤上所有消除。
 *
 * 演算法：
 * 1. 水平掃描 + 垂直掃描
 * 2. 合併重疊 runs 為複合形狀
 * 3. 決定特殊寶石與生成位置
 * 4. 套用優先序：單次 swap 僅生成一顆特殊寶石（最高優先者）
 */
export function detectMatches(
  board: Board,
  options?: DetectOptions,
): MatchDescriptor[] {
  const hRuns = scanHorizontal(board);
  const vRuns = scanVertical(board);
  const allRuns = [...hRuns, ...vRuns];

  if (allRuns.length === 0) return [];

  const matches = mergeRuns(allRuns);

  if (matches.length === 0) return [];

  // 決定生成位置
  for (const match of matches) {
    const spawnAt = determineSpawnAt(match, options?.swapPos);
    if (spawnAt) {
      match.spawnAt = spawnAt;
    }
  }

  // 套用優先序：僅保留最高優先的特殊寶石
  // 找出最高優先的 match
  let maxPriority = 0;
  let maxIdx = -1;
  for (let i = 0; i < matches.length; i++) {
    const p = specialPriority(matches[i].spawnsSpecial);
    if (p > maxPriority) {
      maxPriority = p;
      maxIdx = i;
    }
  }

  // 移除非最高優先的特殊寶石
  if (maxIdx >= 0) {
    for (let i = 0; i < matches.length; i++) {
      if (i !== maxIdx && matches[i].spawnsSpecial !== undefined) {
        delete matches[i].spawnsSpecial;
        delete matches[i].spawnAt;
      }
    }
  }

  return matches;
}
