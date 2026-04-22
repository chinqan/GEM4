// ─── Blocker 系統 ────────────────────────────────────────────
// 純 TypeScript，零瀏覽器依賴
// 處理 Jelly、Lock、Generator、Unstable 四種 blocker

import type { CellPos, BlockerKind } from '../../types';
import type { Board, BlockerState } from '../../game/rules/board';
import { getCell, isValidPos, getNeighbors } from '../../game/rules/board';
import { Mulberry32 } from '../../game/rules/rng';

// ─── 12.6 JellyOverlay ─────────────────────────────────────
// Jelly 作為獨立 overlay，不佔用 Cell.blocker 欄位
// 這允許 jelly 與 lock/generator/unstable 共存

export class JellyOverlay {
  private layers = new Map<string, number>();

  private key(pos: CellPos): string {
    return `${pos[0]},${pos[1]}`;
  }

  setLayers(pos: CellPos, layers: number): void {
    if (layers <= 0) this.layers.delete(this.key(pos));
    else this.layers.set(this.key(pos), Math.min(3, layers));
  }

  getLayers(pos: CellPos): number {
    return this.layers.get(this.key(pos)) ?? 0;
  }

  hasJelly(pos: CellPos): boolean {
    return this.getLayers(pos) > 0;
  }

  /** 減一層，回傳剩餘層數 */
  reduceLayer(pos: CellPos): number {
    const current = this.getLayers(pos);
    if (current <= 0) return 0;
    const newLayers = current - 1;
    this.setLayers(pos, newLayers);
    return newLayers;
  }

  /** 取得所有有 jelly 的位置 */
  getAllPositions(): CellPos[] {
    return Array.from(this.layers.entries())
      .filter(([_, v]) => v > 0)
      .map(([k]) => {
        const [col, row] = k.split(',').map(Number);
        return [col, row] as CellPos;
      });
  }

  /** 總 jelly 數量（所有層加總） */
  getTotalLayers(): number {
    let total = 0;
    for (const v of this.layers.values()) total += v;
    return total;
  }

  /** jelly 格子數量 */
  getCellCount(): number {
    return this.layers.size;
  }
}

// ─── 12.1 Jelly 處理 ───────────────────────────────────────

/**
 * 處理 jelly：消除時減一層。
 * 若該格有 jelly blocker（在 Cell.blocker 中），減一層。
 * layers 降到 0 時移除 blocker。
 * 回傳是否有 jelly 被處理。
 */
export function processJellyOnClear(board: Board, pos: CellPos): boolean {
  const cell = getCell(board, pos);
  if (!cell) return false;

  if (cell.blocker?.kind === 'jelly') {
    const newLayers = cell.blocker.layers - 1;
    if (newLayers <= 0) {
      cell.blocker = null;
    } else {
      cell.blocker = { kind: 'jelly', layers: newLayers as 1 | 2 | 3 };
    }
    return true;
  }
  return false;
}

// ─── 12.2 Lock 處理 ────────────────────────────────────────

/** 檢查格子是否被 lock 鎖定 */
export function isLocked(board: Board, pos: CellPos): boolean {
  const cell = getCell(board, pos);
  if (!cell) return false;
  return cell.blocker?.kind === 'lock';
}

/**
 * 破壞 lock：移除 lock blocker 並清除該格寶石。
 * 回傳是否有 lock 被破壞。
 */
export function breakLock(board: Board, pos: CellPos): boolean {
  const cell = getCell(board, pos);
  if (!cell) return false;

  if (cell.blocker?.kind === 'lock') {
    cell.blocker = null;
    cell.gem = null;
    return true;
  }
  return false;
}

// ─── 12.3 Generator 處理 ───────────────────────────────────

/**
 * Generator tick：每手結束時呼叫。
 * 遍歷所有 generator blocker，movesSinceLastSpawn++。
 * 若達到 everyNMoves，在 4-鄰空格中隨機選一個生成 spawnKind blocker。
 * 回傳新生成 blocker 的位置列表。
 */
export function tickGenerators(board: Board, rng: Mulberry32): CellPos[] {
  const spawned: CellPos[] = [];

  for (let col = 0; col < board.width; col++) {
    for (let row = 0; row < board.height; row++) {
      const cell = board.cells[col][row];
      if (cell.blocker?.kind !== 'generator') continue;

      const gen = cell.blocker;
      gen.movesSinceLastSpawn++;

      if (gen.movesSinceLastSpawn >= gen.everyNMoves) {
        // 找 4-鄰空格（gem === null 且 blocker === null 且非永久空格）
        const neighbors = getNeighbors(board, [col, row]);
        const emptyNeighbors = neighbors.filter((nPos) => {
          const nCell = getCell(board, nPos);
          return nCell && !nCell.isEmpty && nCell.gem === null && nCell.blocker === null;
        });

        if (emptyNeighbors.length > 0) {
          const target = rng.pick(emptyNeighbors);
          const targetCell = getCell(board, target)!;

          // 生成 spawnKind blocker
          targetCell.blocker = createBlockerByKind(gen.spawnKind);
          spawned.push(target);
          gen.movesSinceLastSpawn = 0;
        }
        // 若 4-鄰無空格則略過（不重置計數器）
      }
    }
  }

  return spawned;
}

/** 依 BlockerKind 建立預設 BlockerState */
function createBlockerByKind(kind: BlockerKind): BlockerState {
  switch (kind) {
    case 'jelly':
      return { kind: 'jelly', layers: 1 };
    case 'lock':
      return { kind: 'lock' };
    case 'generator':
      return {
        kind: 'generator',
        spawnKind: 'jelly',
        everyNMoves: 3,
        movesSinceLastSpawn: 0,
      };
    case 'unstable':
      return { kind: 'unstable', countdown: 6 };
  }
}

// ─── 12.4 Unstable 處理 ────────────────────────────────────

/** Unstable 罰分常數 */
const UNSTABLE_PENALTY = 300;

/**
 * Unstable tick：每手結束時呼叫。
 * 遍歷所有 unstable blocker，countdown--。
 * 歸零時：3×3 清除（不計分）+ 300 罰分。
 * 回傳爆炸的位置列表與總罰分。
 */
export function tickUnstables(board: Board): { exploded: CellPos[]; penalty: number } {
  const exploded: CellPos[] = [];
  let penalty = 0;

  // 先收集所有 unstable 位置，避免遍歷時修改
  const unstables: CellPos[] = [];
  for (let col = 0; col < board.width; col++) {
    for (let row = 0; row < board.height; row++) {
      if (board.cells[col][row].blocker?.kind === 'unstable') {
        unstables.push([col, row]);
      }
    }
  }

  for (const pos of unstables) {
    const [col, row] = pos;
    const cell = board.cells[col][row];
    if (cell.blocker?.kind !== 'unstable') continue;

    cell.blocker.countdown--;

    if (cell.blocker.countdown <= 0) {
      // 爆炸：3×3 清除
      exploded.push(pos);
      penalty += UNSTABLE_PENALTY;

      // 清除 3×3 區域
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          const clearPos: CellPos = [col + dc, row + dr];
          if (isValidPos(board, clearPos)) {
            const clearCell = getCell(board, clearPos)!;
            clearCell.gem = null;
            // 也清除該格的 blocker（包括自身的 unstable）
            clearCell.blocker = null;
          }
        }
      }
    }
  }

  return { exploded, penalty };
}

// ─── 12.5 Blocker × Special 交互 ──────────────────────────

/**
 * 處理特殊寶石清除路徑上的 blocker。
 * 對每個被清除的格子：
 * - 如果有 jelly → 減一層（一個 clear event 對一格的 jelly 只扣 1 層）
 *
 * 注意：lock 和 generator 的破壞已在 special-gems.ts 中處理。
 * 這裡只處理 jelly 的減層。
 */
export function processBlockersOnClear(board: Board, clearedCells: CellPos[]): void {
  // 使用 Set 確保每格只處理一次（一個 clear event 只扣 1 層）
  const processed = new Set<string>();

  for (const pos of clearedCells) {
    const key = `${pos[0]},${pos[1]}`;
    if (processed.has(key)) continue;
    processed.add(key);

    processJellyOnClear(board, pos);
  }
}
