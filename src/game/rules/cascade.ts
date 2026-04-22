import type { CellPos, GemColour, MatchDescriptor, ColumnDrop } from '../../types';
import type { Board } from './board';
import { getCell, createGem } from './board';
import { detectMatches } from './match-detect';
import { Mulberry32 } from './rng';
import { processSpecialActivations } from './special-gems';

// ─── 型別定義 ───────────────────────────────────────────────

/** 單一 cascade 步驟的結果 */
export interface CascadeStep {
  step: number; // 步驟編號（從 1 開始）
  chain: number; // 當前連鎖數
  matches: MatchDescriptor[];
  drops: ColumnDrop[]; // 每欄的掉落距離
  clearedCells: CellPos[];
}

/** 完整 cascade 結果 */
export interface CascadeResult {
  steps: CascadeStep[];
  totalChain: number;
  totalCleared: CellPos[];
  overrun: boolean; // 是否觸發安全上限
}

const MAX_CASCADE_STEPS = 50;

// ─── 8.1 重力下落 ───────────────────────────────────────────

/**
 * 對棋盤執行重力下落：每欄從底部往上掃，將寶石向下填入空格。
 * locked 寶石不移動。isEmpty 格子不參與（跳過）。
 * 回傳每欄的最大掉落距離。
 */
export function applyGravity(board: Board): ColumnDrop[] {
  const drops: ColumnDrop[] = [];

  for (let col = 0; col < board.width; col++) {
    let maxDrop = 0;

    // writePos 指向當前最低的可寫入位置（從底部往上）
    let writePos = board.height - 1;

    // 從底部往上掃描
    for (let row = board.height - 1; row >= 0; row--) {
      const cell = board.cells[col][row];

      // 跳過 isEmpty 格子 — 它們不參與重力
      if (cell.isEmpty) {
        // 遇到 isEmpty 時，writePos 也需要跳過這個位置
        // 重置 writePos 到 isEmpty 上方繼續
        if (writePos === row) {
          writePos = row - 1;
        }
        continue;
      }

      if (cell.gem !== null) {
        // locked 寶石不移動
        if (cell.gem.locked) {
          // locked 寶石佔據當前位置，writePos 需要跳到它上方
          if (writePos >= row) {
            writePos = row - 1;
          }
          continue;
        }

        // 有寶石：移動到 writePos
        // 但 writePos 必須 >= row（不能往上移）且不能是 isEmpty
        // 先找到有效的 writePos
        // writePos 已經在正確位置了
      } else {
        // 空格（gem === null 且 !isEmpty）：跳過，讓 writePos 保持
        continue;
      }
    }

    // 重新用更清晰的演算法：收集非 locked 寶石，從底部填入非 isEmpty 空位
    // 先收集欄中所有非 isEmpty 的位置（從底到頂）
    const slots: number[] = []; // 可用的 row 位置（非 isEmpty），從底到頂
    for (let row = board.height - 1; row >= 0; row--) {
      if (!board.cells[col][row].isEmpty) {
        slots.push(row);
      }
    }

    // 收集所有寶石（保持從底到頂的順序）
    // locked 寶石需要留在原位
    // 先處理 locked 寶石：它們佔據固定 slot
    const lockedPositions = new Set<number>();
    for (let row = 0; row < board.height; row++) {
      const cell = board.cells[col][row];
      if (!cell.isEmpty && cell.gem !== null && cell.gem.locked) {
        lockedPositions.add(row);
      }
    }

    // 可用 slots（排除 locked 佔據的位置），從底到頂
    const freeSlots: number[] = [];
    for (const s of slots) {
      if (!lockedPositions.has(s)) {
        freeSlots.push(s);
      }
    }

    // 收集可移動的寶石（非 locked），從底到頂
    const movableGems: { gem: typeof board.cells[0][0]['gem']; fromRow: number }[] = [];
    for (let row = board.height - 1; row >= 0; row--) {
      const cell = board.cells[col][row];
      if (!cell.isEmpty && cell.gem !== null && !cell.gem.locked) {
        movableGems.push({ gem: cell.gem, fromRow: row });
      }
    }

    // 清空所有非 locked、非 isEmpty 的格子
    for (const s of freeSlots) {
      board.cells[col][s].gem = null;
    }

    // 將可移動寶石填入 freeSlots（從底部開始）
    maxDrop = 0;
    for (let i = 0; i < movableGems.length && i < freeSlots.length; i++) {
      const targetRow = freeSlots[i];
      const { gem, fromRow } = movableGems[i];
      board.cells[col][targetRow].gem = gem;
      const drop = targetRow - fromRow;
      if (drop > maxDrop) {
        maxDrop = drop;
      }
    }

    drops.push({ column: col, distance: maxDrop });
  }

  return drops;
}

// ─── 8.2 頂端補充 ───────────────────────────────────────────

/**
 * 逐欄從頂部往下掃，找到 gem === null 且 !isEmpty 的格子，
 * 用 rng.pick(colours) 生成新寶石填入。
 * 新寶石為普通寶石（無 special、無 locked）。
 */
export function fillFromTop(
  board: Board,
  rng: Mulberry32,
  colours: GemColour[],
): void {
  for (let col = 0; col < board.width; col++) {
    for (let row = 0; row < board.height; row++) {
      const cell = board.cells[col][row];
      if (cell.gem === null && !cell.isEmpty) {
        cell.gem = createGem(rng.pick(colours));
      }
    }
  }
}

// ─── 8.3-8.5 完整 cascade 流程 ──────────────────────────────

/**
 * 執行完整 cascade 流程：
 * 1. applyGravity → fillFromTop → detectMatches
 * 2. 若有 match → 清除 → chain++ → 記錄 CascadeStep → 繼續
 * 3. 若無 match → cascade 結束
 * 4. 安全上限：步驟數 > MAX_CASCADE_STEPS 時中止
 */
export function runCascade(
  board: Board,
  rng: Mulberry32,
  colours: GemColour[],
  startChain: number = 0,
): CascadeResult {
  const steps: CascadeStep[] = [];
  const totalCleared: CellPos[] = [];
  let chain = startChain;
  let stepCount = 0;
  let overrun = false;

  while (true) {
    stepCount++;

    if (stepCount > MAX_CASCADE_STEPS) {
      overrun = true;
      break;
    }

    // 1. 重力下落
    const drops = applyGravity(board);

    // 2. 頂端補充
    fillFromTop(board, rng, colours);

    // 3. 消除偵測
    const matches = detectMatches(board);

    // 4. 若無消除 → cascade 結束
    if (matches.length === 0) {
      break;
    }

    // 5. chain++
    chain++;

    // 6. 收集所有 matched cells
    const matchedCellKeys = new Set<string>();
    const matchedCells: CellPos[] = [];
    for (const match of matches) {
      for (const cell of match.cells) {
        const key = `${cell[0]},${cell[1]}`;
        if (!matchedCellKeys.has(key)) {
          matchedCellKeys.add(key);
          matchedCells.push(cell);
        }
      }
    }

    // 7. 生成特殊寶石（在清除之前）
    for (const match of matches) {
      if (match.spawnsSpecial && match.spawnAt) {
        const [sc, sr] = match.spawnAt;
        const spawnCell = board.cells[sc][sr];
        if (spawnCell.gem) {
          spawnCell.gem.special = match.spawnsSpecial;
          // 不清除這個格子（它會保留為特殊寶石）
          const spawnKey = `${sc},${sr}`;
          matchedCellKeys.delete(spawnKey);
          // 從 matchedCells 中移除
          const idx = matchedCells.findIndex(
            (c) => c[0] === sc && c[1] === sr,
          );
          if (idx !== -1) {
            matchedCells.splice(idx, 1);
          }
        }
      }
    }

    // 8. 檢查 matched cells 中是否有特殊寶石需要觸發
    // 先清除普通格子，收集特殊寶石位置
    const specialPositions: CellPos[] = [];
    for (const pos of matchedCells) {
      const cell = getCell(board, pos);
      if (cell?.gem?.special) {
        specialPositions.push(pos);
      }
    }

    // 9. 清除 matched cells 的 gem
    const clearedCells: CellPos[] = [...matchedCells];
    for (const pos of matchedCells) {
      const [c, r] = pos;
      const cell = board.cells[c][r];
      cell.gem = null;
    }

    // 10. 若有特殊寶石被消除，觸發 processSpecialActivations
    if (specialPositions.length > 0) {
      const specialResult = processSpecialActivations(board, clearedCells);
      // 合併額外清除的格子
      for (const pos of specialResult.clearedCells) {
        const key = `${pos[0]},${pos[1]}`;
        if (!matchedCellKeys.has(key)) {
          matchedCellKeys.add(key);
          clearedCells.push(pos);
        }
      }
    }

    // 11. 記錄 CascadeStep
    steps.push({
      step: stepCount,
      chain,
      matches,
      drops,
      clearedCells,
    });

    // 12. 累計清除
    totalCleared.push(...clearedCells);
  }

  return {
    steps,
    totalChain: chain,
    totalCleared,
    overrun,
  };
}
