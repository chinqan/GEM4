// ─── 暗示系統 ───────────────────────────────────────────────
// 純 TypeScript，零瀏覽器依賴

import type { CellPos } from '../../types';
import type { Board } from '../rules/board';
import { cloneBoard } from '../rules/board';
import { detectMatches } from '../rules/match-detect';
import { findValidSwaps } from './reshuffle';

// ─── Event Bus 最小介面 ─────────────────────────────────────
// 事件系統（task 16）尚未完整實作，此處定義最小介面供 HintTimer 使用。
// 待 EventBusImpl 完成後可直接替換。

/** hint.shown 事件 */
export interface HintShownEvent {
  kind: 'hint.shown';
  cells: CellPos[];
}

/** HintTimer 所需的 event bus 最小介面 */
export interface HintEventBus {
  emit(event: HintShownEvent): void;
}

// ─── 輔助：評估交換品質 ─────────────────────────────────────

/**
 * 評估一組交換的品質分數。
 * 較高分數 = 較好的暗示（優先推薦）。
 *
 * 評分依據：
 * - 消除格數越多越好
 * - 能生成特殊寶石的交換更好
 * - 特殊寶石優先序：colour > area > lineH/lineV
 */
function scoreSwap(board: Board, from: CellPos, to: CellPos): number {
  // 模擬交換
  const sim = cloneBoard(board);
  const [fc, fr] = from;
  const [tc, tr] = to;

  const tempGem = sim.cells[fc][fr].gem;
  sim.cells[fc][fr].gem = sim.cells[tc][tr].gem;
  sim.cells[tc][tr].gem = tempGem;

  const matches = detectMatches(sim, { swapPos: to });

  if (matches.length === 0) return 0;

  let score = 0;

  for (const match of matches) {
    // 基礎分：消除格數
    score += match.cells.length;

    // 特殊寶石加分
    if (match.spawnsSpecial) {
      switch (match.spawnsSpecial) {
        case 'colour':
          score += 100;
          break;
        case 'area':
          score += 50;
          break;
        case 'lineH':
        case 'lineV':
          score += 20;
          break;
      }
    }
  }

  return score;
}

// ─── 主函式 ────────────────────────────────────────────────

/**
 * 找一組有效交換作為暗示。
 *
 * 演算法：
 * 1. 使用 findValidSwaps 取得所有有效交換
 * 2. 對每組交換評分（偏好能產生特殊寶石或更大消除的交換）
 * 3. 回傳最高分的交換
 * 4. 若無有效交換，回傳 null（棋盤需要重洗）
 *
 * 純函式，不修改棋盤狀態。
 */
export function findHint(board: Board): [CellPos, CellPos] | null {
  const swaps = findValidSwaps(board);

  if (swaps.length === 0) return null;

  let bestSwap = swaps[0];
  let bestScore = scoreSwap(board, swaps[0][0], swaps[0][1]);

  for (let i = 1; i < swaps.length; i++) {
    const s = scoreSwap(board, swaps[i][0], swaps[i][1]);
    if (s > bestScore) {
      bestScore = s;
      bestSwap = swaps[i];
    }
  }

  return bestSwap;
}

/**
 * 回傳暗示高亮需要涵蓋的所有格子：
 * 模擬交換後偵測會被消除的格子，加上交換的兩個來源格。
 */
function getSwapHighlightCells(board: Board, from: CellPos, to: CellPos): CellPos[] {
  const sim = cloneBoard(board);
  const [fc, fr] = from;
  const [tc, tr] = to;
  const tempGem = sim.cells[fc][fr].gem;
  sim.cells[fc][fr].gem = sim.cells[tc][tr].gem;
  sim.cells[tc][tr].gem = tempGem;

  const matches = detectMatches(sim, { swapPos: to });
  const seen = new Set<string>();
  const cells: CellPos[] = [];

  const add = (pos: CellPos): void => {
    const key = `${pos[0]},${pos[1]}`;
    if (!seen.has(key)) { seen.add(key); cells.push(pos); }
  };

  add(from);
  add(to);
  for (const match of matches) {
    for (const cell of match.cells) add(cell);
  }
  return cells;
}

// ─── 暗示計時器 ────────────────────────────────────────────

/**
 * 追蹤玩家閒置時間，超過 hintDelayMs 後觸發暗示。
 *
 * 使用方式：
 * - 每幀呼叫 `update(dt)` 累加閒置時間
 * - 玩家操作時呼叫 `reset()` 重置計時器
 * - 遊戲暫停時呼叫 `pause()`，恢復時呼叫 `resume()`
 *
 * 觸發暗示後不會重複觸發，直到下次 `reset()` 為止。
 */
export class HintTimer {
  /** 累計閒置時間（毫秒） */
  private elapsed = 0;

  /** 是否已暫停 */
  private paused = false;

  /** 本次 reset 週期內是否已顯示暗示 */
  private hintShown = false;

  /**
   * @param getBoard    取得當前棋盤狀態的 getter
   * @param eventBus    事件匯流排（emit hint.shown）
   * @param hintDelayMs 閒置多久後觸發暗示（毫秒），0 表示停用
   * @param onNoHint    找不到有效交換時呼叫（棋盤無解）；呼叫端應執行 reshuffle
   */
  constructor(
    private readonly getBoard: () => Board,
    private readonly eventBus: HintEventBus,
    private readonly hintDelayMs: number,
    private readonly onNoHint?: () => void,
  ) {}

  /**
   * 每幀呼叫，累加閒置時間。
   * 當累計時間 ≥ hintDelayMs 且尚未顯示暗示時，觸發暗示。
   *
   * @param dt 自上一幀的經過時間（毫秒）
   */
  update(dt: number): void {
    // 停用、已暫停、或已顯示暗示 → 不累加
    if (this.hintDelayMs <= 0 || this.paused || this.hintShown) return;

    this.elapsed += dt;

    if (this.elapsed >= this.hintDelayMs) {
      this.triggerHint();
    }
  }

  /**
   * 玩家執行操作時呼叫，重置閒置計時器。
   */
  reset(): void {
    this.elapsed = 0;
    this.hintShown = false;
  }

  /**
   * 暫停計時器（例如遊戲暫停時）。
   * 暫停期間 update() 不會累加時間。
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * 恢復計時器（例如遊戲繼續時）。
   */
  resume(): void {
    this.paused = false;
  }

  /** 是否已暫停 */
  get isPaused(): boolean {
    return this.paused;
  }

  /** 是否已顯示暗示（本次 reset 週期內） */
  get isHintShown(): boolean {
    return this.hintShown;
  }

  /** 當前累計閒置時間（毫秒） */
  get elapsedMs(): number {
    return this.elapsed;
  }

  // ─── 內部 ──────────────────────────────────────────────

  /**
   * 觸發暗示：呼叫 findHint 取得有效交換，
   * 若找到則 emit hint.shown 事件。
   */
  private triggerHint(): void {
    const board = this.getBoard();
    const hint = findHint(board);

    if (hint) {
      const [from, to] = hint;
      this.eventBus.emit({
        kind: 'hint.shown',
        cells: getSwapHighlightCells(board, from, to),
      });
    } else {
      // 棋盤無解：通知呼叫端執行 reshuffle，並重置計時器讓重洗後可再次提示
      this.onNoHint?.();
      this.reset();
      return;
    }

    // 找到暗示才標記為已顯示，避免重複觸發
    this.hintShown = true;
  }
}
