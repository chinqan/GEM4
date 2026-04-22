import type { CellPos, GemColour } from '../../types';
import type { Board, Cell } from './board';
import { getCell, isValidPos, getNeighbors } from './board';

// ─── 型別定義 ───────────────────────────────────────────────

/** 清除結果 */
export interface ClearResult {
  clearedCells: CellPos[];
  triggeredSpecials: CellPos[];
}

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

  // 清除 gem
  if (cell.gem) {
    cell.gem = null;
    cleared = true;
  }

  // 破壞 lock 或 generator blocker
  if (cell.blocker) {
    if (cell.blocker.kind === 'lock' || cell.blocker.kind === 'generator') {
      cell.blocker = null;
      cleared = true;
    }
  }

  return cleared;
}

/**
 * 對一組座標執行清除，回傳實際被清除的座標列表。
 */
function clearPositions(board: Board, positions: CellPos[]): CellPos[] {
  const cleared: CellPos[] = [];
  for (const pos of positions) {
    if (clearCell(board, pos)) {
      cleared.push(pos);
    }
  }
  return cleared;
}

// ─── 6.1 Line Bomb 啟動 ────────────────────────────────────

/**
 * 啟動 Line Bomb。
 * - lineH：清除 bomb 所在 row 的所有格（整列）
 * - lineV：清除 bomb 所在 col 的所有格（整行）
 *
 * 如果該位置沒有 gem 或 gem.special 不是 lineH/lineV，回傳空結果。
 */
export function activateLineBomb(board: Board, pos: CellPos): ClearResult {
  const cell = getCell(board, pos);
  if (!cell?.gem?.special || (cell.gem.special !== 'lineH' && cell.gem.special !== 'lineV')) {
    return { clearedCells: [], triggeredSpecials: [] };
  }

  const direction = cell.gem.special; // 'lineH' or 'lineV'
  const [col, row] = pos;

  const targets: CellPos[] = [];

  if (direction === 'lineH') {
    // 清除整列（同一 row 的所有 col）
    for (let c = 0; c < board.width; c++) {
      targets.push([c, row]);
    }
  } else {
    // 清除整行（同一 col 的所有 row）
    for (let r = 0; r < board.height; r++) {
      targets.push([col, r]);
    }
  }

  const clearedCells = clearPositions(board, targets);
  const triggeredSpecials = findPassiveActivations(board, clearedCells);

  return { clearedCells, triggeredSpecials };
}

// ─── 6.2 Area Bomb 啟動 ────────────────────────────────────

/**
 * 啟動 Area Bomb：清除以自身為中心的 3×3 區域，邊緣自動裁切。
 */
export function activateAreaBomb(board: Board, pos: CellPos): ClearResult {
  const cell = getCell(board, pos);
  if (!cell?.gem?.special || cell.gem.special !== 'area') {
    return { clearedCells: [], triggeredSpecials: [] };
  }

  const [col, row] = pos;
  const targets: CellPos[] = [];

  for (let c = col - 1; c <= col + 1; c++) {
    for (let r = row - 1; r <= row + 1; r++) {
      const p: CellPos = [c, r];
      if (isValidPos(board, p)) {
        targets.push(p);
      }
    }
  }

  const clearedCells = clearPositions(board, targets);
  const triggeredSpecials = findPassiveActivations(board, clearedCells);

  return { clearedCells, triggeredSpecials };
}

// ─── 6.3 Colour Gem 啟動 ───────────────────────────────────

/**
 * 啟動 Colour Gem：清除棋盤上所有 colour === targetColour 的寶石。
 * 同時也清除 Colour Gem 自身。
 */
export function activateColourGem(
  board: Board,
  pos: CellPos,
  targetColour: GemColour,
): ClearResult {
  const cell = getCell(board, pos);
  if (!cell?.gem?.special || cell.gem.special !== 'colour') {
    return { clearedCells: [], triggeredSpecials: [] };
  }

  const targets: CellPos[] = [];

  // 先加入 Colour Gem 自身
  targets.push(pos);

  // 掃描整個棋盤找所有目標色寶石
  for (let c = 0; c < board.width; c++) {
    for (let r = 0; r < board.height; r++) {
      const p: CellPos = [c, r];
      // 跳過自身（已加入）
      if (c === pos[0] && r === pos[1]) continue;

      const scanCell = getCell(board, p);
      if (scanCell?.gem?.colour === targetColour) {
        targets.push(p);
      }
    }
  }

  const clearedCells = clearPositions(board, targets);
  // Colour Gem 啟動後，被清除的格子中的鄰居特殊寶石也可能被動觸發
  const triggeredSpecials = findPassiveActivations(board, clearedCells);

  return { clearedCells, triggeredSpecials };
}

// ─── 6.4 被動啟動判斷 ──────────────────────────────────────

/**
 * 找出 clearedCells 的鄰居中有 Line/Area Bomb 的（不含 Colour Gem）。
 * 這些特殊寶石會因為相鄰格被消除而被動觸發。
 */
export function findPassiveActivations(
  board: Board,
  clearedCells: CellPos[],
): CellPos[] {
  const seen = new Set<string>();
  const clearedSet = new Set<string>(clearedCells.map(posKey));
  const result: CellPos[] = [];

  for (const pos of clearedCells) {
    const neighbors = getNeighbors(board, pos);
    for (const neighbor of neighbors) {
      const key = posKey(neighbor);
      // 跳過已清除的格子和已見過的鄰居
      if (clearedSet.has(key) || seen.has(key)) continue;
      seen.add(key);

      const cell = getCell(board, neighbor);
      if (
        cell?.gem?.special &&
        (cell.gem.special === 'lineH' ||
          cell.gem.special === 'lineV' ||
          cell.gem.special === 'area')
      ) {
        result.push(neighbor);
      }
    }
  }

  return result;
}

// ─── 6.5 啟動順序排序 ──────────────────────────────────────

/**
 * 依左上到右下排序：先 row 小，再 col 小。
 * 確保啟動順序的確定性。
 */
export function sortActivationOrder(positions: CellPos[]): CellPos[] {
  return [...positions].sort((a, b) => {
    // 先比 row
    if (a[1] !== b[1]) return a[1] - b[1];
    // 再比 col
    return a[0] - b[0];
  });
}

// ─── 主函式：遞迴處理特殊寶石啟動 ─────────────────────────

/**
 * 處理一組清除並遞迴處理被動啟動。
 *
 * 流程：
 * 1. 從 initialCleared 找被動觸發的特殊寶石
 * 2. 排序啟動順序
 * 3. 依序啟動每個特殊寶石
 * 4. 每次啟動可能產生新的被動觸發
 * 5. 遞迴直到無更多觸發
 * 6. 用 Set 追蹤已處理的位置避免無限迴圈
 */
export function processSpecialActivations(
  board: Board,
  initialCleared: CellPos[],
): ClearResult {
  const allCleared = new Set<string>(initialCleared.map(posKey));
  const allClearedList: CellPos[] = [...initialCleared];
  const allTriggered: CellPos[] = [];
  const processed = new Set<string>();

  // 找初始被動觸發
  let pendingActivations = findPassiveActivations(board, initialCleared);

  while (pendingActivations.length > 0) {
    // 過濾掉已處理的
    pendingActivations = pendingActivations.filter(
      (p) => !processed.has(posKey(p)),
    );

    if (pendingActivations.length === 0) break;

    // 排序確保確定性
    const sorted = sortActivationOrder(pendingActivations);

    // 本輪新產生的清除
    const roundCleared: CellPos[] = [];

    for (const pos of sorted) {
      const key = posKey(pos);
      if (processed.has(key)) continue;
      processed.add(key);

      const cell = getCell(board, pos);
      if (!cell?.gem?.special) continue;

      let result: ClearResult;

      switch (cell.gem.special) {
        case 'lineH':
        case 'lineV':
          result = activateLineBomb(board, pos);
          break;
        case 'area':
          result = activateAreaBomb(board, pos);
          break;
        default:
          // colour gem 不被動啟動
          continue;
      }

      // 收集新清除的格子
      for (const cleared of result.clearedCells) {
        const ck = posKey(cleared);
        if (!allCleared.has(ck)) {
          allCleared.add(ck);
          allClearedList.push(cleared);
          roundCleared.push(cleared);
        }
      }

      // 收集觸發的特殊寶石
      allTriggered.push(pos);
    }

    // 從本輪新清除的格子找下一輪被動觸發
    pendingActivations = findPassiveActivations(board, roundCleared);
  }

  return {
    clearedCells: allClearedList,
    triggeredSpecials: allTriggered,
  };
}
