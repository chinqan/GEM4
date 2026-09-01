import type { CellPos, GemColour } from '../../types';
import type { Board } from './board';
import { getCell, isValidPos } from './board';
import type { Mulberry32 } from './rng';

// ─── 型別定義 ───────────────────────────────────────────────

/** 可被動觸發的特殊寶石類型（Colour Gem 被動啟動會隨機挑選目標色） */
export type PassiveSpecialType = 'lineH' | 'lineV' | 'area' | 'colour';

/** 清除過程中被摧毀的 blocker（lock/generator），供目標追蹤計數 */
export interface DestroyedBlocker {
  pos: CellPos;
  kind: 'lock' | 'generator';
}

/** 清除結果 */
export interface ClearResult {
  clearedCells: CellPos[];
  triggeredSpecials: CellPos[];
  destroyedBlockers?: DestroyedBlocker[];
}

// ─── 內部工具 ───────────────────────────────────────────────

/** 將 CellPos 轉為字串 key，用於 Set 去重 */
function posKey(pos: CellPos): string {
  return `${pos[0]},${pos[1]}`;
}

/**
 * 在清除前快照一組座標中帶有 Line/Area Bomb 的特殊寶石狀態。
 * 用於在 clearPositions 之後仍能判斷哪些格子原本是特殊寶石。
 */
function snapshotSpecials(
  board: Board,
  positions: CellPos[],
): Map<string, PassiveSpecialType> {
  const map = new Map<string, PassiveSpecialType>();
  for (const pos of positions) {
    const cell = getCell(board, pos);
    const sp = cell?.gem?.special;
    if (sp === 'lineH' || sp === 'lineV' || sp === 'area' || sp === 'colour') {
      map.set(posKey(pos), sp);
    }
  }
  return map;
}

/**
 * 清除單一格子：移除 gem，破壞 lock / generator blocker。
 * 回傳 true 表示該格確實被清除（有 gem 或有可破壞的 blocker）。
 */
function clearCell(board: Board, pos: CellPos, destroyed?: DestroyedBlocker[]): boolean {
  const cell = getCell(board, pos);
  if (!cell) return false;

  let cleared = false;

  // 清除 gem（immovableCore 的 locked gem 不可消）
  if (cell.gem && !cell.gem.locked) {
    cell.gem = null;
    cleared = true;
  }

  // 破壞 lock 或 generator blocker
  if (cell.blocker) {
    if (cell.blocker.kind === 'lock' || cell.blocker.kind === 'generator') {
      destroyed?.push({ pos, kind: cell.blocker.kind });
      cell.blocker = null;
      cleared = true;
    }
  }

  return cleared;
}

/**
 * 對一組座標執行清除，回傳實際被清除的座標列表。
 */
function clearPositions(
  board: Board,
  positions: CellPos[],
  destroyed?: DestroyedBlocker[],
): CellPos[] {
  const cleared: CellPos[] = [];
  for (const pos of positions) {
    if (clearCell(board, pos, destroyed)) {
      cleared.push(pos);
    }
  }
  return cleared;
}

/**
 * 計算 Line Bomb 的爆炸目標格（不執行清除）。
 */
function lineBombTargets(board: Board, pos: CellPos, direction: 'lineH' | 'lineV'): CellPos[] {
  const [col, row] = pos;
  const targets: CellPos[] = [];
  if (direction === 'lineH') {
    for (let c = 0; c < board.width; c++) targets.push([c, row]);
  } else {
    for (let r = 0; r < board.height; r++) targets.push([col, r]);
  }
  return targets;
}

/**
 * 計算 Area Bomb 的爆炸目標格（不執行清除）。
 */
function areaBombTargets(board: Board, pos: CellPos): CellPos[] {
  const [col, row] = pos;
  const targets: CellPos[] = [];
  for (let c = col - 1; c <= col + 1; c++) {
    for (let r = row - 1; r <= row + 1; r++) {
      const p: CellPos = [c, r];
      if (isValidPos(board, p)) targets.push(p);
    }
  }
  return targets;
}

// ─── 6.1 Line Bomb 啟動 ────────────────────────────────────

/**
 * 啟動 Line Bomb。
 * - lineH：清除 bomb 所在 row 的所有格（整列）
 * - lineV：清除 bomb 所在 col 的所有格（整行）
 *
 * 如果該位置沒有 gem 或 gem.special 不是 lineH/lineV，回傳空結果。
 *
 * triggeredSpecials：爆炸範圍內自身帶有 Line/Area Bomb 的格子
 * （它們因為被消除而需要被動啟動）。
 */
export function activateLineBomb(board: Board, pos: CellPos): ClearResult {
  const cell = getCell(board, pos);
  if (!cell?.gem?.special || (cell.gem.special !== 'lineH' && cell.gem.special !== 'lineV')) {
    return { clearedCells: [], triggeredSpecials: [] };
  }

  const direction = cell.gem.special;
  const targets = lineBombTargets(board, pos, direction);

  // 在清除前快照：爆炸範圍內哪些格子本身帶有特殊寶石
  const snapshot = snapshotSpecials(board, targets);

  const destroyedBlockers: DestroyedBlocker[] = [];
  const clearedCells = clearPositions(board, targets, destroyedBlockers);

  // 被動觸發 = 被清除的格子中，自身原本帶有 Line/Area Bomb 的
  const triggeredSpecials = findPassiveActivations(clearedCells, snapshot);

  return { clearedCells, triggeredSpecials, destroyedBlockers };
}

// ─── 6.2 Area Bomb 啟動 ────────────────────────────────────

/**
 * 啟動 Area Bomb：清除以自身為中心的 3×3 區域，邊緣自動裁切。
 *
 * triggeredSpecials：爆炸範圍內自身帶有 Line/Area Bomb 的格子。
 */
export function activateAreaBomb(board: Board, pos: CellPos): ClearResult {
  const cell = getCell(board, pos);
  if (!cell?.gem?.special || cell.gem.special !== 'area') {
    return { clearedCells: [], triggeredSpecials: [] };
  }

  const targets = areaBombTargets(board, pos);

  // 在清除前快照
  const snapshot = snapshotSpecials(board, targets);

  const destroyedBlockers: DestroyedBlocker[] = [];
  const clearedCells = clearPositions(board, targets, destroyedBlockers);
  const triggeredSpecials = findPassiveActivations(clearedCells, snapshot);

  return { clearedCells, triggeredSpecials, destroyedBlockers };
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
      if (c === pos[0] && r === pos[1]) continue;

      const scanCell = getCell(board, p);
      if (scanCell?.gem?.colour === targetColour && !scanCell.gem.locked) {
        targets.push(p);
      }
    }
  }

  // 在清除前快照
  const snapshot = snapshotSpecials(board, targets);

  const destroyedBlockers: DestroyedBlocker[] = [];
  const clearedCells = clearPositions(board, targets, destroyedBlockers);
  // 被清除的格子中若本身帶有特殊寶石也會被動觸發
  const triggeredSpecials = findPassiveActivations(clearedCells, snapshot);

  return { clearedCells, triggeredSpecials, destroyedBlockers };
}

// ─── 6.4 被動啟動判斷 ──────────────────────────────────────

/**
 * 找出 clearedCells 中本身帶有 Line/Area Bomb 的格子（不含 Colour Gem）。
 * 這些特殊寶石因為自身被消除而被動觸發。
 *
 * 使用 specialSnapshot 查詢清除前的 special 狀態（因為 clearPositions
 * 會將 gem 設為 null，事後無法從 board 判斷）。
 */
export function findPassiveActivations(
  clearedCells: CellPos[],
  specialSnapshot: Map<string, PassiveSpecialType>,
): CellPos[] {
  const seen = new Set<string>();
  const result: CellPos[] = [];

  for (const pos of clearedCells) {
    const key = posKey(pos);
    if (seen.has(key)) continue;
    seen.add(key);

    const special = specialSnapshot.get(key);
    if (special) {
      result.push(pos);
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
    if (a[1] !== b[1]) return a[1] - b[1];
    return a[0] - b[0];
  });
}

// ─── 主函式：遞迴處理特殊寶石啟動 ─────────────────────────

/**
 * 處理一組清除並遞迴處理被動啟動。
 *
 * 規則：特殊寶石（Line/Area Bomb）在**自身被消除**時觸發，
 * 而非鄰居被消除時觸發。
 *
 * @param board 棋盤
 * @param initialCleared 初始被清除的格子（gem 已為 null）
 * @param initialSnapshot 初始清除前的特殊寶石快照（記錄哪些格子原本帶有 Line/Area Bomb）
 *
 * 流程：
 * 1. 從 initialCleared + initialSnapshot 找出自身被消除的特殊寶石
 * 2. 排序啟動順序
 * 3. 依序啟動每個特殊寶石（使用快照中記錄的類型）
 * 4. 每次啟動產生新的清除 + 新的快照 → 找下一輪被動觸發
 * 5. 遞迴直到無更多觸發
 * 6. 用 Set 追蹤已處理的位置避免無限迴圈
 */
/** 從棋盤現有寶石中隨機挑選一個非 null 的顏色。無任何顏色時回傳 null。 */
function pickRandomBoardColour(
  board: Board,
  rng?: Mulberry32,
  fallbackColours?: readonly GemColour[],
): GemColour | null {
  // 優先從棋盤上現有的非 colour-gem 寶石挑色（讓被動觸發實際會清到東西）
  const present = new Set<GemColour>();
  for (let c = 0; c < board.width; c++) {
    for (let r = 0; r < board.height; r++) {
      const cell = board.cells[c][r];
      const g = cell.gem;
      if (g && g.special !== 'colour' && g.colour) {
        present.add(g.colour);
      }
    }
  }
  const pool: GemColour[] = present.size > 0
    ? [...present]
    : [...(fallbackColours ?? [])];
  if (pool.length === 0) return null;
  pool.sort(); // 穩定化 Set 迭代順序
  const idx = rng ? rng.int(0, pool.length) : 0;
  return pool[idx];
}

export interface ProcessOptions {
  rng?: Mulberry32;
  /** Colour Gem 被動啟動時的候選顏色（棋盤上若已無該色則用此 fallback） */
  colours?: readonly GemColour[];
}

export function processSpecialActivations(
  board: Board,
  initialCleared: CellPos[],
  initialSnapshot?: Map<string, PassiveSpecialType>,
  options?: ProcessOptions,
): ClearResult {
  const allCleared = new Set<string>(initialCleared.map(posKey));
  const allClearedList: CellPos[] = [...initialCleared];
  const allTriggered: CellPos[] = [];
  const allDestroyed: DestroyedBlocker[] = [];
  const processed = new Set<string>();

  // 合併所有已知的特殊寶石類型（跨輪次累積）
  const typeMap = new Map<string, PassiveSpecialType>(initialSnapshot ?? []);

  // 找初始被動觸發
  let pendingActivations = findPassiveActivations(initialCleared, typeMap);

  while (pendingActivations.length > 0) {
    pendingActivations = pendingActivations.filter(
      (p) => !processed.has(posKey(p)),
    );

    if (pendingActivations.length === 0) break;

    const sorted = sortActivationOrder(pendingActivations);
    const roundCleared: CellPos[] = [];

    for (const pos of sorted) {
      const key = posKey(pos);
      if (processed.has(key)) continue;
      processed.add(key);

      // 從 typeMap 取得該格原本的特殊類型（gem 已被清除，無法從 board 讀取）
      const specialType = typeMap.get(key);
      if (!specialType) continue;

      // 計算爆炸目標
      let targets: CellPos[];
      switch (specialType) {
        case 'lineH':
        case 'lineV':
          targets = lineBombTargets(board, pos, specialType);
          break;
        case 'area':
          targets = areaBombTargets(board, pos);
          break;
        case 'colour': {
          // Colour Gem 被動啟動：隨機挑選一種顏色，清除棋盤上所有該色寶石
          const picked = pickRandomBoardColour(board, options?.rng, options?.colours);
          if (!picked) continue;
          targets = [];
          for (let c = 0; c < board.width; c++) {
            for (let r = 0; r < board.height; r++) {
              const cell = board.cells[c][r];
              if (cell.gem && cell.gem.special !== 'colour' && cell.gem.colour === picked && !cell.gem.locked) {
                targets.push([c, r]);
              }
            }
          }
          break;
        }
        default:
          continue;
      }

      // 在清除前快照本輪爆炸範圍內的特殊寶石
      const roundSnapshot = snapshotSpecials(board, targets);
      for (const [k, v] of roundSnapshot) {
        if (!typeMap.has(k)) typeMap.set(k, v);
      }

      // 清除
      const cleared = clearPositions(board, targets, allDestroyed);

      for (const c of cleared) {
        const ck = posKey(c);
        if (!allCleared.has(ck)) {
          allCleared.add(ck);
          allClearedList.push(c);
          roundCleared.push(c);
        }
      }

      allTriggered.push(pos);
    }

    // 從本輪新清除的格子找下一輪被動觸發
    pendingActivations = findPassiveActivations(roundCleared, typeMap);
  }

  return {
    clearedCells: allClearedList,
    triggeredSpecials: allTriggered,
    destroyedBlockers: allDestroyed,
  };
}
