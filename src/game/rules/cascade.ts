import type { CellPos, GemColour, MatchDescriptor, ColumnDrop } from '../../types';
import type { Board } from './board';
import { getCell, createGem } from './board';
import { detectMatches } from './match-detect';
import { Mulberry32 } from './rng';
import { processSpecialActivations, type PassiveSpecialType } from './special-gems';

// ─── 型別定義 ───────────────────────────────────────────────

/** 單一 cascade 步驟的結果 */
export interface CascadeStep {
  step: number; // 步驟編號（從 1 開始）
  chain: number; // 當前連鎖數
  matches: MatchDescriptor[];
  drops: ColumnDrop[]; // 每欄的掉落距離
  clearedCells: CellPos[];
  deliveryCollected: CellPos[]; // 本步收集的傳送道具位置
}

/** 完整 cascade 結果 */
export interface CascadeResult {
  steps: CascadeStep[];
  totalChain: number;
  totalCleared: CellPos[];
  totalDeliveryCollected: CellPos[]; // 整個 cascade 收集的傳送道具位置
  overrun: boolean; // 是否觸發安全上限
}

const MAX_CASCADE_STEPS = 50;

// ─── 8.1 重力下落 ───────────────────────────────────────────

/**
 * 對棋盤執行重力下落：每欄從底部往上掃，將寶石和傳送道具向下填入空格。
 * locked 寶石不移動。isEmpty 格子不參與（跳過）。
 * 傳送道具與寶石互斥，各自獨立佔格，但都受重力影響。
 * 回傳每欄的最大掉落距離。
 */
export function applyGravity(board: Board): ColumnDrop[] {
  const drops: ColumnDrop[] = [];

  for (let col = 0; col < board.width; col++) {
    let maxDrop = 0;

    // 先收集欄中所有非 isEmpty 的位置（從底到頂）
    const slots: number[] = [];
    for (let row = board.height - 1; row >= 0; row--) {
      if (!board.cells[col][row].isEmpty) {
        slots.push(row);
      }
    }

    // locked 寶石佔據固定 slot
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

    // 收集可移動的物件（寶石或傳送道具，非 locked），從底到頂
    // gem 與 deliveryItem 互斥，一格只會有其中一個
    const movableItems: { gem: typeof board.cells[0][0]['gem']; deliveryItem: typeof board.cells[0][0]['deliveryItem']; fromRow: number }[] = [];
    for (let row = board.height - 1; row >= 0; row--) {
      const cell = board.cells[col][row];
      if (cell.isEmpty) continue;
      // 有寶石（非 locked）
      if (cell.gem !== null && !cell.gem.locked) {
        movableItems.push({ gem: cell.gem, deliveryItem: null, fromRow: row });
      }
      // 有傳送道具（無寶石）
      else if (cell.deliveryItem !== null && cell.gem === null) {
        movableItems.push({ gem: null, deliveryItem: cell.deliveryItem, fromRow: row });
      }
    }

    // 清空所有非 locked、非 isEmpty 的格子
    for (const s of freeSlots) {
      board.cells[col][s].gem = null;
      board.cells[col][s].deliveryItem = null;
    }

    // 將可移動物件填入 freeSlots（從底部開始）
    maxDrop = 0;
    for (let i = 0; i < movableItems.length && i < freeSlots.length; i++) {
      const targetRow = freeSlots[i];
      const { gem, deliveryItem, fromRow } = movableItems[i];
      board.cells[col][targetRow].gem = gem;
      board.cells[col][targetRow].deliveryItem = deliveryItem;
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
 * 逐欄從頂部往下掃，找到 gem === null 且 !isEmpty 且無 deliveryItem 的格子，
 * 用 rng.pick(colours) 生成新寶石填入。
 * 新寶石為普通寶石（無 special、無 locked）。
 * 有 deliveryItem 的格子不補寶石（兩者互斥）。
 */
export function fillFromTop(
  board: Board,
  rng: Mulberry32,
  colours: GemColour[],
): void {
  for (let col = 0; col < board.width; col++) {
    for (let row = 0; row < board.height; row++) {
      const cell = board.cells[col][row];
      if (cell.gem === null && !cell.isEmpty && cell.deliveryItem === null) {
        cell.gem = createGem(rng.pick(colours));
      }
    }
  }
}

// ─── 8.3-8.5 完整 cascade 流程 ──────────────────────────────

/**
 * 檢查並收集已到達 delivery cell 的傳送道具。
 * 傳送道具到達 isDelivery 標記的格子時即完成收集，從棋盤移除。
 * 回傳收集到的道具位置陣列。
 */
export function collectDeliveryItems(board: Board): CellPos[] {
  const collected: CellPos[] = [];
  for (let col = 0; col < board.width; col++) {
    for (let row = 0; row < board.height; row++) {
      const cell = board.cells[col][row];
      if (cell.isDelivery && cell.deliveryItem !== null) {
        cell.deliveryItem = null;
        collected.push([col, row]);
      }
    }
  }
  return collected;
}

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
    //    特殊寶石為獨立道具：colour=null，不依附於消除前的顏色寶石
    for (const match of matches) {
      if (match.spawnsSpecial && match.spawnAt) {
        const [sc, sr] = match.spawnAt;
        const spawnCell = board.cells[sc][sr];
        if (spawnCell.gem) {
          spawnCell.gem.colour = null;
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

    // 8. 在清除前快照 matched cells 中的特殊寶石狀態
    const specialSnapshot = new Map<string, PassiveSpecialType>();
    for (const pos of matchedCells) {
      const cell = getCell(board, pos);
      const sp = cell?.gem?.special;
      if (sp === 'lineH' || sp === 'lineV' || sp === 'area' || sp === 'colour') {
        specialSnapshot.set(`${pos[0]},${pos[1]}`, sp);
      }
    }

    // 9. 清除 matched cells 的 gem
    //    gem 與 deliveryItem 互斥，matched cell 必定有 gem 無 deliveryItem，
    //    所以清除 gem 不會影響任何 deliveryItem。
    const clearedCells: CellPos[] = [...matchedCells];
    for (const pos of matchedCells) {
      const [c, r] = pos;
      const cell = board.cells[c][r];
      cell.gem = null;
    }

    // 10. 若有特殊寶石被消除，觸發 processSpecialActivations（傳入快照）
    if (specialSnapshot.size > 0) {
      const specialResult = processSpecialActivations(board, clearedCells, specialSnapshot, {
        rng,
        colours,
      });
      // 合併額外清除的格子
      for (const pos of specialResult.clearedCells) {
        const key = `${pos[0]},${pos[1]}`;
        if (!matchedCellKeys.has(key)) {
          matchedCellKeys.add(key);
          clearedCells.push(pos);
        }
      }
    }

    // 11. 收集到達 delivery cell 的傳送道具
    const deliveryCollected = collectDeliveryItems(board);

    // 12. 記錄 CascadeStep
    steps.push({
      step: stepCount,
      chain,
      matches,
      drops,
      clearedCells,
      deliveryCollected,
    });

    // 13. 累計清除
    totalCleared.push(...clearedCells);
  }

  // cascade 結束後再做一次收集（最後一次重力可能讓道具到達底部）
  const finalDeliveryCollected = collectDeliveryItems(board);
  const totalDeliveryCollected: CellPos[] = [];
  for (const s of steps) totalDeliveryCollected.push(...s.deliveryCollected);
  totalDeliveryCollected.push(...finalDeliveryCollected);

  return {
    steps,
    totalChain: chain,
    totalCleared,
    totalDeliveryCollected,
    overrun,
  };
}
