// ─── 棋盤初始化與重洗 ──────────────────────────────────────
// 純 TypeScript，零瀏覽器依賴

import type { CellPos, GemColour, BlockerPlacement } from '../../types';
import type { Board, Cell } from '../rules/board';
import { createBoard, createGem, getCell, cloneBoard } from '../rules/board';
import { detectMatches } from '../rules/match-detect';
import type { Mulberry32 } from '../rules/rng';
import type { LevelSpec } from '../level/level-spec';

// ─── 常數 ───────────────────────────────────────────────────

/** initBoard 最大重試次數（防止無限迴圈） */
const MAX_INIT_RETRIES = 100;

/** reshuffle 最大重試次數 */
const MAX_RESHUFFLE_RETRIES = 100;

// ─── 輔助：加權隨機選色 ─────────────────────────────────────

/**
 * 依權重從顏色池中隨機選一個顏色。
 * 若無權重設定，則均勻隨機。
 */
function pickWeightedColour(
  colours: readonly GemColour[],
  weights: Partial<Record<GemColour, number>> | undefined,
  rng: Mulberry32,
): GemColour {
  if (!weights) {
    return rng.pick(colours);
  }

  // 建立加權陣列
  const weightedEntries: { colour: GemColour; weight: number }[] = [];
  let totalWeight = 0;
  for (const c of colours) {
    const w = weights[c] ?? 1.0;
    weightedEntries.push({ colour: c, weight: w });
    totalWeight += w;
  }

  // 加權隨機選取
  let roll = rng.next() * totalWeight;
  for (const entry of weightedEntries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.colour;
  }

  // fallback（浮點誤差）
  return weightedEntries[weightedEntries.length - 1].colour;
}

// ─── 輔助：檢查放置某色是否會造成 3 連 ─────────────────────

/**
 * 檢查在 (col, row) 放置 colour 是否會造成水平或垂直 3+ 連。
 * 只檢查局部（左右 2 格、上下 2 格），比全盤 detectMatches 快。
 */
function wouldCreateMatch(
  board: Board,
  col: number,
  row: number,
  colour: GemColour,
): boolean {
  // 水平檢查：往左數同色 + 往右數同色
  let hCount = 1;
  // 往左
  for (let c = col - 1; c >= 0; c--) {
    const cell = board.cells[c][row];
    if (cell.isEmpty || !cell.gem || cell.gem.colour !== colour) break;
    hCount++;
  }
  // 往右
  for (let c = col + 1; c < board.width; c++) {
    const cell = board.cells[c][row];
    if (cell.isEmpty || !cell.gem || cell.gem.colour !== colour) break;
    hCount++;
  }
  if (hCount >= 3) return true;

  // 垂直檢查：往上數同色 + 往下數同色
  let vCount = 1;
  // 往上
  for (let r = row - 1; r >= 0; r--) {
    const cell = board.cells[col][r];
    if (cell.isEmpty || !cell.gem || cell.gem.colour !== colour) break;
    vCount++;
  }
  // 往下
  for (let r = row + 1; r < board.height; r++) {
    const cell = board.cells[col][r];
    if (cell.isEmpty || !cell.gem || cell.gem.colour !== colour) break;
    vCount++;
  }
  if (vCount >= 3) return true;

  return false;
}

// ─── 13.2 findValidSwaps ────────────────────────────────────

/**
 * 掃描棋盤上所有可能的有效交換。
 * 有效交換 = 交換兩個相鄰寶石後會產生至少一組 3+ 消除。
 * 回傳所有有效交換的 [from, to] 對。
 *
 * 邊界處理：
 * - 永久空格（isEmpty）不參與交換
 * - 無寶石的格子不參與交換
 * - locked 寶石（gem.locked）不參與交換
 * - lock blocker 的格子不參與交換（寶石不可移動）
 * - 只檢查右方和下方鄰居，避免重複計算
 * - 純函式：模擬交換後立即還原，不修改棋盤狀態
 */
export function findValidSwaps(board: Board): [CellPos, CellPos][] {
  const swaps: [CellPos, CellPos][] = [];

  for (let col = 0; col < board.width; col++) {
    for (let row = 0; row < board.height; row++) {
      const cell = board.cells[col][row];

      // 跳過：永久空格、完全空的格子（無 gem 也無 deliveryItem）
      if (cell.isEmpty) continue;
      if (!cell.gem && !cell.deliveryItem) continue;
      // locked 寶石不可移動
      if (cell.gem?.locked) continue;
      if (cell.blocker?.kind === 'lock') continue;

      // 只檢查右方和下方，避免重複
      const directions: CellPos[] = [
        [col + 1, row],
        [col, row + 1],
      ];

      for (const [nc, nr] of directions) {
        if (nc < 0 || nc >= board.width || nr < 0 || nr >= board.height) continue;
        const neighbor = board.cells[nc][nr];

        // 跳過：永久空格、完全空的格子
        if (neighbor.isEmpty) continue;
        if (!neighbor.gem && !neighbor.deliveryItem) continue;
        if (neighbor.gem?.locked) continue;
        if (neighbor.blocker?.kind === 'lock') continue;

        // 至少一邊要有 gem 才可能產生消除
        if (!cell.gem && !neighbor.gem) continue;

        // 模擬交換（gem + deliveryItem 一起交換）
        const tempGem = cell.gem;
        const tempDelivery = cell.deliveryItem;
        cell.gem = neighbor.gem;
        cell.deliveryItem = neighbor.deliveryItem;
        neighbor.gem = tempGem;
        neighbor.deliveryItem = tempDelivery;

        // 檢查是否產生消除
        const matches = detectMatches(board);

        // 還原交換
        neighbor.gem = cell.gem;
        neighbor.deliveryItem = cell.deliveryItem;
        cell.gem = tempGem;
        cell.deliveryItem = tempDelivery;

        if (matches.length > 0) {
          swaps.push([[col, row], [nc, nr]]);
        }
      }
    }
  }

  return swaps;
}

// ─── 輔助：放置 blockers ────────────────────────────────────

/**
 * 依 LevelSpec.blockers 放置 blocker 到棋盤上。
 */
function placeBLockers(board: Board, blockers: BlockerPlacement[]): void {
  for (const bp of blockers) {
    const [col, row] = bp.at;
    const cell = getCell(board, [col, row]);
    if (!cell) continue;

    switch (bp.type) {
      case 'jelly':
        cell.blocker = { kind: 'jelly', layers: (bp.layers ?? 1) as 1 | 2 | 3 };
        break;
      case 'lock':
        cell.blocker = { kind: 'lock' };
        break;
      case 'generator':
        cell.blocker = {
          kind: 'generator',
          spawnKind: bp.generatorSpec?.spawnKind ?? 'jelly',
          everyNMoves: bp.generatorSpec?.everyNMoves ?? 3,
          movesSinceLastSpawn: 0,
        };
        break;
      case 'unstable':
        cell.blocker = {
          kind: 'unstable',
          countdown: bp.unstableSpec?.countdown ?? 6,
        };
        break;
    }
  }
}

// ─── 13.1 initBoard ─────────────────────────────────────────

/**
 * 依關卡規格生成初始棋盤。
 *
 * 保證：
 * 1. 無預存消除（no pre-existing matches）
 * 2. 至少 1 組有效交換（at least 1 valid swap）
 *
 * 演算法：
 * 1. 建立空棋盤（含 empty cells）
 * 2. 標記 delivery cells
 * 3. 放置 blockers
 * 4. 逐格填入隨機寶石，使用 re-roll 避免 3 連
 * 5. 若無有效交換，重新生成整個棋盤
 *
 * @param spec 關卡規格
 * @param rng  boardInit RNG 串流
 */
export function initBoard(spec: LevelSpec, rng: Mulberry32): Board {
  const { width, height, empty, deliveryCells, deliveryItems } = spec.board;
  const { colours, weights } = spec.gems;

  for (let attempt = 0; attempt < MAX_INIT_RETRIES; attempt++) {
    // 1. 建立空棋盤
    const board = createBoard(width, height, empty);

    // 2. 標記 delivery cells
    if (deliveryCells) {
      for (const [col, row] of deliveryCells) {
        const cell = getCell(board, [col, row]);
        if (cell) {
          cell.isDelivery = true;
        }
      }
    }

    // 2.5 放置傳送道具（獨立物件）
    if (deliveryItems) {
      let nextId = 1;
      for (const [col, row] of deliveryItems) {
        const cell = getCell(board, [col, row]);
        if (cell) {
          cell.deliveryItem = { id: nextId++ };
        }
      }
    }

    // 3. 放置 blockers
    if (spec.blockers) {
      placeBLockers(board, spec.blockers);
    }

    // 4. 逐格填入隨機寶石（避免 3 連）
    //    遍歷順序：從左到右、從上到下，這樣 wouldCreateMatch 只需看左方和上方
    fillBoardNoMatches(board, colours, weights, rng);

    // 5. 驗證：用 detectMatches 做最終確認（防禦性）
    const matches = detectMatches(board);
    if (matches.length > 0) {
      // 極少發生，但若 re-roll 邏輯有邊界情況，重試整個棋盤
      continue;
    }

    // 6. 檢查至少 1 組有效交換
    const validSwaps = findValidSwaps(board);
    if (validSwaps.length > 0) {
      applyFixedGems(board, spec.board.fixedGems);
      return board;
    }

    // 無有效交換 → 重試
  }

  // 安全閥：若所有重試都失敗，回傳最後一次嘗試的棋盤
  // （理論上不應發生，除非顏色池太小或棋盤太小）
  const fallback = createBoard(width, height, empty);
  if (deliveryCells) {
    for (const [col, row] of deliveryCells) {
      const cell = getCell(fallback, [col, row]);
      if (cell) cell.isDelivery = true;
    }
  }
  if (deliveryItems) {
    let nextId = 1;
    for (const [col, row] of deliveryItems) {
      const cell = getCell(fallback, [col, row]);
      if (cell) cell.deliveryItem = { id: nextId++ };
    }
  }
  if (spec.blockers) {
    placeBLockers(fallback, spec.blockers);
  }
  fillBoardNoMatches(fallback, colours, weights, rng);
  applyFixedGems(fallback, spec.board.fixedGems);
  return fallback;
}

function applyFixedGems(
  board: Board,
  fixedGems: LevelSpec['board']['fixedGems'],
): void {
  if (!fixedGems) return;
  for (const fg of fixedGems) {
    const cell = getCell(board, fg.at);
    if (!cell) continue;
    if (!cell.gem) cell.gem = { colour: null, special: null, locked: false, unstable: null };
    const gem = cell.gem;
    gem.colour = fg.colour ?? null;
    gem.special = fg.special ?? null;
  }
}

// ─── 輔助：填充棋盤（無 3 連） ─────────────────────────────

/**
 * 逐格填入隨機寶石，使用 re-roll 避免 3 連。
 * 遍歷順序：col 從左到右、row 從上到下。
 * 對每格最多嘗試 colours.length × 3 次 re-roll。
 * 若所有顏色都會造成 3 連，則選擇最後一個嘗試的顏色（極端情況）。
 */
function fillBoardNoMatches(
  board: Board,
  colours: readonly GemColour[],
  weights: Partial<Record<GemColour, number>> | undefined,
  rng: Mulberry32,
): void {
  const maxRerolls = colours.length * 3;

  for (let col = 0; col < board.width; col++) {
    for (let row = 0; row < board.height; row++) {
      const cell = board.cells[col][row];

      // 跳過：永久空格、已有寶石（preSeeded）、有 lock blocker 的格子不放寶石
      // 有 deliveryItem 的格子也不放寶石（兩者互斥）
      if (cell.isEmpty) continue;
      if (cell.gem !== null) continue;
      if (cell.deliveryItem !== null) continue;

      let chosenColour = pickWeightedColour(colours, weights, rng);

      // Re-roll 避免 3 連
      for (let r = 0; r < maxRerolls; r++) {
        if (!wouldCreateMatch(board, col, row, chosenColour)) {
          break;
        }
        chosenColour = pickWeightedColour(colours, weights, rng);
      }

      cell.gem = createGem(chosenColour);
    }
  }
}

// ─── 13.3 reshuffle（基礎實作） ─────────────────────────────

/**
 * 重洗棋盤：保留特殊寶石與 blocker，只重新排列普通寶石。
 *
 * 保證重洗後：
 * 1. 無預存消除
 * 2. 至少 1 組有效交換
 *
 * @param board 當前棋盤（會被原地修改）
 * @param rng   boardInit RNG 串流
 * @param colours 可用顏色池
 */
export function reshuffle(
  board: Board,
  rng: Mulberry32,
  colours: readonly GemColour[],
): void {
  for (let attempt = 0; attempt < MAX_RESHUFFLE_RETRIES; attempt++) {
    // 1. 收集所有可重洗的格子位置與其顏色
    const reshufflePositions: CellPos[] = [];
    const reshuffleColours: GemColour[] = [];

    for (let col = 0; col < board.width; col++) {
      for (let row = 0; row < board.height; row++) {
        const cell = board.cells[col][row];
        if (cell.isEmpty || !cell.gem) continue;
        // 保留特殊寶石和 locked 寶石
        if (cell.gem.special !== null || cell.gem.locked) continue;
        // 有 deliveryItem 的格子不參與重洗（不應有 gem，但防禦性跳過）
        if (cell.deliveryItem) continue;

        reshufflePositions.push([col, row]);
        reshuffleColours.push(cell.gem.colour!);
      }
    }

    // 2. Fisher-Yates 洗牌顏色（保留 deliveryItem 在原位）
    for (let i = reshuffleColours.length - 1; i > 0; i--) {
      const j = rng.int(0, i + 1);
      const temp = reshuffleColours[i];
      reshuffleColours[i] = reshuffleColours[j];
      reshuffleColours[j] = temp;
    }

    // 3. 重新放置
    for (let i = 0; i < reshufflePositions.length; i++) {
      const [col, row] = reshufflePositions[i];
      board.cells[col][row].gem = createGem(reshuffleColours[i]);
    }

    // 4. 檢查無預存消除
    const matches = detectMatches(board);
    if (matches.length > 0) continue;

    // 5. 檢查至少 1 組有效交換
    const validSwaps = findValidSwaps(board);
    if (validSwaps.length > 0) return;
  }

  // 安全閥：若所有重試都失敗，用 fillBoardNoMatches 重新填充
  // 清除所有可重洗的寶石
  for (let col = 0; col < board.width; col++) {
    for (let row = 0; row < board.height; row++) {
      const cell = board.cells[col][row];
      if (cell.isEmpty || !cell.gem) continue;
      if (cell.gem.special !== null || cell.gem.locked) continue;
      cell.gem = null;
    }
  }
  fillBoardNoMatches(board, colours, undefined, rng);
}
