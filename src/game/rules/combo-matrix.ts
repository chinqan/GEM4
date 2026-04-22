import type { SpecialGemType, ComboType, CellPos, GemColour } from '../../types';
import type { Board } from './board';
import { getCell, isValidPos } from './board';
import type { ClearResult } from './special-gems';

// ─── 內部工具 ───────────────────────────────────────────────

/** 將 CellPos 轉為字串 key，用於 Set 去重 */
function posKey(pos: CellPos): string {
  return `${pos[0]},${pos[1]}`;
}

/**
 * 清除單一格子：移除 gem，破壞 lock / generator blocker。
 * 回傳 true 表示該格確實被清除（有 gem 或有可破壞的 blocker）。
 */
function clearCell(board: Board, pos: CellPos): boolean {
  const cell = getCell(board, pos);
  if (!cell) return false;

  let cleared = false;

  if (cell.gem) {
    cell.gem = null;
    cleared = true;
  }

  if (cell.blocker) {
    if (cell.blocker.kind === 'lock' || cell.blocker.kind === 'generator') {
      cell.blocker = null;
      cleared = true;
    }
  }

  return cleared;
}

/**
 * 對一組座標執行清除，回傳實際被清除的座標列表（去重）。
 */
function clearPositions(board: Board, positions: CellPos[]): CellPos[] {
  const seen = new Set<string>();
  const cleared: CellPos[] = [];
  for (const pos of positions) {
    const key = posKey(pos);
    if (seen.has(key)) continue;
    seen.add(key);
    if (clearCell(board, pos)) {
      cleared.push(pos);
    }
  }
  return cleared;
}

// ─── 7.3 中點格計算 ────────────────────────────────────────

/**
 * 取兩個座標的中點（向下取整）。
 */
export function midpoint(a: CellPos, b: CellPos): CellPos {
  return [
    Math.floor((a[0] + b[0]) / 2),
    Math.floor((a[1] + b[1]) / 2),
  ];
}

// ─── 7.1 comboKey 正規化 ───────────────────────────────────

/** 將 SpecialGemType 歸類為正規化類別 */
function normalizeType(t: SpecialGemType): 'line' | 'bomb' | 'colour' {
  switch (t) {
    case 'lineH':
    case 'lineV':
      return 'line';
    case 'area':
      return 'bomb';
    case 'colour':
      return 'colour';
  }
}

/**
 * 正規化排序順序。
 * ComboType 定義中較大的類別在前：
 * line.line, bomb.line, bomb.bomb, colour.line, colour.bomb, colour.colour
 */
const SORT_ORDER: Record<string, number> = {
  line: 0,
  bomb: 1,
  colour: 2,
};

/**
 * 將兩個 SpecialGemType 正規化為 ComboType（A×B = B×A）。
 */
export function comboKey(a: SpecialGemType, b: SpecialGemType): ComboType | null {
  const na = normalizeType(a);
  const nb = normalizeType(b);

  // 較大的排前面（colour > bomb > line）
  let first: string;
  let second: string;
  if (SORT_ORDER[na] >= SORT_ORDER[nb]) {
    first = na;
    second = nb;
  } else {
    first = nb;
    second = na;
  }

  const key = `${first}.${second}`;

  const VALID_COMBOS: Set<string> = new Set([
    'line.line',
    'bomb.line',
    'bomb.bomb',
    'colour.line',
    'colour.bomb',
    'colour.colour',
  ]);

  return VALID_COMBOS.has(key) ? (key as ComboType) : null;
}

// ─── 7.2 組合效果 ──────────────────────────────────────────

/**
 * line.line：十字清除（整列 + 整行）
 */
function crossClear(board: Board, origin: CellPos): ClearResult {
  const [col, row] = origin;
  const targets: CellPos[] = [];

  // 整行（同一 row）
  for (let c = 0; c < board.width; c++) {
    const p: CellPos = [c, row];
    if (isValidPos(board, p)) targets.push(p);
  }

  // 整列（同一 col）
  for (let r = 0; r < board.height; r++) {
    const p: CellPos = [col, r];
    if (isValidPos(board, p)) targets.push(p);
  }

  const clearedCells = clearPositions(board, targets);
  return { clearedCells, triggeredSpecials: [] };
}

/**
 * bomb.line：3 格寬十字清除
 * 中央行 ±1 列 + 中央列 ±1 行
 */
function wideCrossClear(board: Board, origin: CellPos): ClearResult {
  const [col, row] = origin;
  const targets: CellPos[] = [];

  // 3 格寬的水平帶（row-1, row, row+1 的所有 col）
  for (let dr = -1; dr <= 1; dr++) {
    const r = row + dr;
    for (let c = 0; c < board.width; c++) {
      const p: CellPos = [c, r];
      if (isValidPos(board, p)) targets.push(p);
    }
  }

  // 3 格寬的垂直帶（col-1, col, col+1 的所有 row）
  for (let dc = -1; dc <= 1; dc++) {
    const c = col + dc;
    for (let r = 0; r < board.height; r++) {
      const p: CellPos = [c, r];
      if (isValidPos(board, p)) targets.push(p);
    }
  }

  const clearedCells = clearPositions(board, targets);
  return { clearedCells, triggeredSpecials: [] };
}

/**
 * bomb.bomb：5×5 大爆炸
 */
function largeAreaClear(board: Board, origin: CellPos): ClearResult {
  const [col, row] = origin;
  const targets: CellPos[] = [];

  for (let dc = -2; dc <= 2; dc++) {
    for (let dr = -2; dr <= 2; dr++) {
      const p: CellPos = [col + dc, row + dr];
      if (isValidPos(board, p)) targets.push(p);
    }
  }

  const clearedCells = clearPositions(board, targets);
  return { clearedCells, triggeredSpecials: [] };
}

/**
 * colour.line：全盤所有該色轉為隨機方向 Line Bomb 並依序啟動
 * colour.bomb：全盤所有該色轉為 Area Bomb 並依序啟動
 *
 * 找出棋盤上所有與「非 colour 的那顆」同色的寶石，
 * 轉為指定特殊類型並清除。
 */
function colourTransform(
  board: Board,
  origin: CellPos,
  posA: CellPos,
  posB: CellPos,
  targetSpecial: 'lineH' | 'area',
): ClearResult {
  // 找出非 colour 的那顆寶石的顏色
  const cellA = getCell(board, posA);
  const cellB = getCell(board, posB);

  let targetColour: GemColour | null = null;

  if (cellA?.gem?.special === 'colour' && cellB?.gem?.colour) {
    targetColour = cellB.gem.colour;
  } else if (cellB?.gem?.special === 'colour' && cellA?.gem?.colour) {
    targetColour = cellA.gem.colour;
  }

  // 如果找不到目標色（例如兩顆都是 colour），不應走到這裡
  if (!targetColour) {
    return { clearedCells: [], triggeredSpecials: [] };
  }

  const allTargets: CellPos[] = [];
  const transformedPositions: CellPos[] = [];

  // 先清除兩顆組合的寶石
  allTargets.push(posA, posB);

  // 找出所有同色寶石
  for (let c = 0; c < board.width; c++) {
    for (let r = 0; r < board.height; r++) {
      const p: CellPos = [c, r];
      // 跳過 posA 和 posB
      if ((c === posA[0] && r === posA[1]) || (c === posB[0] && r === posB[1])) continue;

      const cell = getCell(board, p);
      if (cell?.gem?.colour === targetColour) {
        transformedPositions.push(p);
      }
    }
  }

  // 將同色寶石轉為指定特殊類型
  for (const pos of transformedPositions) {
    const cell = getCell(board, pos);
    if (cell?.gem) {
      cell.gem.special = targetSpecial;
    }
  }

  // 依序啟動轉換後的特殊寶石
  const allCleared = new Set<string>();
  const allClearedList: CellPos[] = [];

  // 先清除組合的兩顆寶石
  for (const pos of [posA, posB]) {
    if (clearCell(board, pos)) {
      const key = posKey(pos);
      if (!allCleared.has(key)) {
        allCleared.add(key);
        allClearedList.push(pos);
      }
    }
  }

  // 依序啟動每個轉換後的特殊寶石
  for (const pos of transformedPositions) {
    const cell = getCell(board, pos);
    if (!cell?.gem) continue;

    const special = cell.gem.special;
    let targets: CellPos[] = [];

    if (special === 'lineH') {
      const [, row] = pos;
      for (let c = 0; c < board.width; c++) {
        const p: CellPos = [c, row];
        if (isValidPos(board, p)) targets.push(p);
      }
    } else if (special === 'lineV') {
      const [col] = pos;
      for (let r = 0; r < board.height; r++) {
        const p: CellPos = [col, r];
        if (isValidPos(board, p)) targets.push(p);
      }
    } else if (special === 'area') {
      const [col, row] = pos;
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          const p: CellPos = [col + dc, row + dr];
          if (isValidPos(board, p)) targets.push(p);
        }
      }
    }

    for (const t of targets) {
      if (clearCell(board, t)) {
        const key = posKey(t);
        if (!allCleared.has(key)) {
          allCleared.add(key);
          allClearedList.push(t);
        }
      }
    }
  }

  return {
    clearedCells: allClearedList,
    triggeredSpecials: transformedPositions,
  };
}

/**
 * colour.colour：清除整個棋盤所有寶石
 */
function fullBoardClear(board: Board): ClearResult {
  const targets: CellPos[] = [];

  for (let c = 0; c < board.width; c++) {
    for (let r = 0; r < board.height; r++) {
      const p: CellPos = [c, r];
      if (isValidPos(board, p)) targets.push(p);
    }
  }

  const clearedCells = clearPositions(board, targets);
  return { clearedCells, triggeredSpecials: [] };
}

// ─── 7.2 resolveCombo 主函式 ───────────────────────────────

/**
 * 解析兩顆特殊寶石的組合效果。
 *
 * 若 posA 或 posB 的寶石不是特殊寶石，回傳 null。
 * 組合觸發位置為兩顆 Special 的中點格。
 */
export function resolveCombo(
  board: Board,
  posA: CellPos,
  posB: CellPos,
): ClearResult | null {
  const cellA = getCell(board, posA);
  const cellB = getCell(board, posB);

  if (!cellA?.gem?.special || !cellB?.gem?.special) {
    return null;
  }

  const specialA = cellA.gem.special;
  const specialB = cellB.gem.special;

  const key = comboKey(specialA, specialB);
  if (!key) return null;

  const origin = midpoint(posA, posB);

  switch (key) {
    case 'line.line':
      return crossClear(board, origin);

    case 'bomb.line':
      return wideCrossClear(board, origin);

    case 'bomb.bomb':
      return largeAreaClear(board, origin);

    case 'colour.line':
      return colourTransform(board, origin, posA, posB, 'lineH');

    case 'colour.bomb':
      return colourTransform(board, origin, posA, posB, 'area');

    case 'colour.colour':
      return fullBoardClear(board);

    default:
      return null;
  }
}
