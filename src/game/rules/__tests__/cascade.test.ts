import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { CellPos, GemColour } from '../../../types';
import { createBoard, createGem } from '../board';
import type { Board, Gem } from '../board';
import { Mulberry32 } from '../rng';
import { applyGravity, fillFromTop, runCascade } from '../cascade';
import { detectMatches } from '../match-detect';
import { setGem, getColour } from '../../__tests__/test-helpers';

// ─── 工具函式 ───────────────────────────────────────────────

/** 建立一個填滿指定寶石的棋盤 */
function fillBoard(board: Board, colours: GemColour[][]): void {
  for (let col = 0; col < board.width; col++) {
    for (let row = 0; row < board.height; row++) {
      if (colours[row] && colours[row][col]) {
        board.cells[col][row].gem = createGem(colours[row][col]);
      }
    }
  }
}

// ─── 8.6 單元測試 ───────────────────────────────────────────

describe('applyGravity', () => {
  it('1. 簡單掉落：一個空格，上方寶石下落', () => {
    // 3x3 棋盤，col 1 中間有空格
    const board = createBoard(3, 3);
    setGem(board, 1, 0, 'R'); // 頂部有寶石
    // board.cells[1][1].gem = null  (空格)
    setGem(board, 1, 2, 'B'); // 底部有寶石

    const drops = applyGravity(board);

    // R 應該從 row 0 掉到 row 1
    expect(getColour(board, 1, 1)).toBe('R');
    expect(getColour(board, 1, 2)).toBe('B'); // 不動
    expect(board.cells[1][0].gem).toBeNull(); // 頂部變空

    // col 1 的掉落距離應為 1
    const col1Drop = drops.find((d) => d.column === 1);
    expect(col1Drop?.distance).toBe(1);
  });

  it('2. 多個空格掉落', () => {
    // 5x1 棋盤（5 行 1 欄），頂部有寶石，中間多個空格
    const board = createBoard(1, 5);
    setGem(board, 0, 0, 'R'); // row 0
    // row 1, 2, 3 空
    setGem(board, 0, 4, 'B'); // row 4（底部）

    const drops = applyGravity(board);

    // R 應該從 row 0 掉到 row 3
    expect(getColour(board, 0, 3)).toBe('R');
    expect(getColour(board, 0, 4)).toBe('B');
    expect(board.cells[0][0].gem).toBeNull();
    expect(board.cells[0][1].gem).toBeNull();
    expect(board.cells[0][2].gem).toBeNull();

    expect(drops[0].distance).toBe(3);
  });

  it('3. isEmpty 格子不參與', () => {
    // 1x4 棋盤，row 2 是 isEmpty
    const board = createBoard(1, 4);
    board.cells[0][2].isEmpty = true;
    setGem(board, 0, 0, 'R'); // row 0
    // row 1 空
    // row 2 isEmpty
    // row 3 空

    applyGravity(board);

    // R 應該掉到 row 3（跳過 isEmpty 的 row 2）
    // 可用 slots（非 isEmpty）：row 0, 1, 3（從底到頂：3, 1, 0）
    // 寶石 R 在 row 0 → 填入 slot 3
    expect(getColour(board, 0, 3)).toBe('R');
    expect(board.cells[0][0].gem).toBeNull();
    expect(board.cells[0][1].gem).toBeNull();
    expect(board.cells[0][2].isEmpty).toBe(true);
  });

  it('4. locked 寶石不移動', () => {
    const board = createBoard(1, 4);
    setGem(board, 0, 0, 'R');
    // row 1 空
    const lockedGem = createGem('G');
    lockedGem.locked = true;
    board.cells[0][2].gem = lockedGem;
    // row 3 空

    applyGravity(board);

    // locked G 應該留在 row 2
    expect(getColour(board, 0, 2)).toBe('G');
    expect(board.cells[0][2].gem!.locked).toBe(true);

    // R 應該掉到 row 3（locked 寶石上方的空位被跳過，R 掉到 locked 下方的空位）
    // 可用 free slots（非 locked、非 isEmpty）：row 0, 1, 3（從底到頂：3, 1, 0）
    // 可移動寶石：R（from row 0）
    // R 填入 slot 3
    expect(getColour(board, 0, 3)).toBe('R');
    expect(board.cells[0][0].gem).toBeNull();
    expect(board.cells[0][1].gem).toBeNull();
  });

  it('5. 無空格時 drops 全為 0', () => {
    const board = createBoard(3, 3);
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 3; row++) {
        setGem(board, col, row, 'R');
      }
    }

    const drops = applyGravity(board);

    for (const drop of drops) {
      expect(drop.distance).toBe(0);
    }
  });
});

describe('fillFromTop', () => {
  it('6. 填充空格', () => {
    const board = createBoard(3, 3);
    // 留一些空格
    setGem(board, 0, 0, 'R');
    setGem(board, 1, 1, 'G');
    // 其餘都是空的

    const rng = new Mulberry32(42);
    const colours: GemColour[] = ['R', 'G', 'B'];

    fillFromTop(board, rng, colours);

    // 所有非 isEmpty 的格子都應該有寶石
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 3; row++) {
        expect(board.cells[col][row].gem).not.toBeNull();
        expect(board.cells[col][row].gem!.special).toBeNull();
        expect(board.cells[col][row].gem!.locked).toBe(false);
      }
    }
  });

  it('7. 不填充 isEmpty 格子', () => {
    const board = createBoard(3, 3);
    board.cells[1][1].isEmpty = true;

    const rng = new Mulberry32(42);
    const colours: GemColour[] = ['R', 'G', 'B'];

    fillFromTop(board, rng, colours);

    // isEmpty 格子不應被填充
    expect(board.cells[1][1].gem).toBeNull();
    expect(board.cells[1][1].isEmpty).toBe(true);

    // 其他格子應該被填充
    expect(board.cells[0][0].gem).not.toBeNull();
    expect(board.cells[2][2].gem).not.toBeNull();
  });
});

describe('runCascade', () => {
  it('8. 無 match 時回傳空步驟', () => {
    // 建立一個無 match 的棋盤
    const board = createBoard(3, 3);
    const pattern: GemColour[][] = [
      ['R', 'G', 'B'],
      ['G', 'B', 'R'],
      ['B', 'R', 'G'],
    ];
    fillBoard(board, pattern);

    const rng = new Mulberry32(42);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];

    const result = runCascade(board, rng, colours);

    expect(result.steps.length).toBe(0);
    expect(result.totalChain).toBe(0);
    expect(result.totalCleared.length).toBe(0);
    expect(result.overrun).toBe(false);
  });

  it('9. 單層 cascade（掉落後產生 match）', () => {
    // 建立一個棋盤，重力掉落 + 填充後會產生 match
    // 5x5 棋盤
    const board = createBoard(5, 5);

    // 在底部兩行放置寶石，第三行有空格
    // 設計：col 0-2 的 row 3-4 放 R，row 2 有空格
    // 掉落後 col 0-2 的 row 2 會被填充，可能產生 match

    // 更簡單的方式：直接在棋盤上製造一個空格場景
    // col 0: row 4=R, row 3=null, row 2=R, row 1=null, row 0=null
    // col 1: row 4=R, row 3=null, row 2=R, row 1=null, row 0=null
    // col 2: row 4=R, row 3=null, row 2=R, row 1=null, row 0=null
    // 重力後：col 0-2 的 row 3-4 都是 R → 底部兩行 R
    // 但這不會產生 3 match（需要同行 3 個同色）

    // 更好的設計：
    // 底部 row 4: R R R G G → 已經有 match
    // 但我們要測試的是掉落後產生 match
    // 所以先清除底部的 match，讓上方寶石掉下來形成新 match

    // 最簡單的方式：
    // 棋盤有一些空格，掉落+填充後恰好形成 match
    // 用固定 seed 的 RNG 來確保填充結果可預測

    // 改用更直接的方式：
    // 在 row 4 放 R R _ G G（col 2 空）
    // 在 row 3 放 _ _ R _ _（col 2 有 R）
    // 重力後 R 掉到 row 4 col 2 → row 4 變成 R R R G G → match!
    setGem(board, 0, 4, 'R');
    setGem(board, 1, 4, 'R');
    // col 2, row 4 空
    setGem(board, 3, 4, 'G');
    setGem(board, 4, 4, 'G');
    setGem(board, 2, 3, 'R'); // 會掉到 row 4

    // 其他格子空，會被 fillFromTop 填充
    // 用足夠多的顏色避免填充後產生額外 match
    const rng = new Mulberry32(12345);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P', 'W', 'O'];

    const result = runCascade(board, rng, colours);

    // 應該至少有 1 步（R R R match）
    expect(result.steps.length).toBeGreaterThanOrEqual(1);
    expect(result.totalChain).toBeGreaterThanOrEqual(1);
    expect(result.totalCleared.length).toBeGreaterThanOrEqual(3);
    expect(result.overrun).toBe(false);
  });

  it('10. 多層 cascade（chain 遞增）', () => {
    // 設計一個會產生多層 cascade 的棋盤
    // 使用 5 col x 6 row 棋盤
    // 策略：
    //   第一層 match：row 5 (底部) col 0-2 形成 R R R
    //   清除 R R R 後，上方的 G G G 掉到 row 5 形成第二層 match
    //
    // 初始佈局（col-major，但用 row 表示）：
    //   col 0: [5]=R, [4]=G, [3]=Y, [2]=P, [1]=B, [0]=W
    //   col 1: [5]=R, [4]=G, [3]=P, [2]=Y, [1]=W, [0]=B
    //   col 2: [5]=_, [4]=R, [3]=G, [2]=B, [1]=Y, [0]=P
    //   col 3: [5]=B, [4]=Y, [3]=P, [2]=W, [1]=R, [0]=G
    //   col 4: [5]=Y, [4]=P, [3]=W, [2]=B, [1]=G, [0]=R
    //
    // Step 1: gravity → col 2 R drops to row 5 → row 5 = R R R B Y
    //         fillFromTop fills col 2 row 0 (was empty after gravity)
    //         match: R R R at row 5 col 0-2 → clear
    // Step 2: gravity → col 0 G drops to 5, col 1 G drops to 5, col 2 G drops to 5
    //         row 5 = G G G B Y → match!

    const board = createBoard(5, 6);

    // col 0
    setGem(board, 0, 5, 'R');
    setGem(board, 0, 4, 'G');
    setGem(board, 0, 3, 'Y');
    setGem(board, 0, 2, 'P');
    setGem(board, 0, 1, 'B');
    setGem(board, 0, 0, 'W');

    // col 1
    setGem(board, 1, 5, 'R');
    setGem(board, 1, 4, 'G');
    setGem(board, 1, 3, 'P');
    setGem(board, 1, 2, 'Y');
    setGem(board, 1, 1, 'W');
    setGem(board, 1, 0, 'B');

    // col 2: row 5 空, row 4 有 R（會掉到 row 5）, row 3 有 G
    setGem(board, 2, 4, 'R');
    setGem(board, 2, 3, 'G');
    setGem(board, 2, 2, 'B');
    setGem(board, 2, 1, 'Y');
    setGem(board, 2, 0, 'P');

    // col 3
    setGem(board, 3, 5, 'B');
    setGem(board, 3, 4, 'Y');
    setGem(board, 3, 3, 'P');
    setGem(board, 3, 2, 'W');
    setGem(board, 3, 1, 'R');
    setGem(board, 3, 0, 'G');

    // col 4
    setGem(board, 4, 5, 'Y');
    setGem(board, 4, 4, 'P');
    setGem(board, 4, 3, 'W');
    setGem(board, 4, 2, 'B');
    setGem(board, 4, 1, 'G');
    setGem(board, 4, 0, 'R');

    // 用 7 種顏色避免 fillFromTop 產生意外 match
    const rng = new Mulberry32(99999);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P', 'W', 'O'];

    const result = runCascade(board, rng, colours);

    // 應該至少有 2 步
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
    // chain 應該遞增
    expect(result.totalChain).toBeGreaterThanOrEqual(2);
    if (result.steps.length >= 2) {
      expect(result.steps[1].chain).toBeGreaterThan(result.steps[0].chain);
    }
    expect(result.overrun).toBe(false);
  });

  it('11. 安全上限觸發（模擬超過 50 步）', () => {
    // 要觸發 50 步很難自然做到，我們用一個技巧：
    // 建立一個 3x3 棋盤，只用 1 種顏色
    // 這樣每次填充都會產生 match，無限循環直到 overrun
    const board = createBoard(3, 3);

    // 用只有 1 種顏色的 palette，這樣填充後必定產生 match
    const rng = new Mulberry32(42);
    const colours: GemColour[] = ['R']; // 只有一種顏色！

    // 先製造一些空格讓 cascade 開始
    // 全空棋盤 → fillFromTop 全填 R → 整個棋盤都是 R → 大量 match
    const result = runCascade(board, rng, colours);

    expect(result.overrun).toBe(true);
    expect(result.steps.length).toBe(50);
  });

  it('startChain 參數正確傳遞', () => {
    const board = createBoard(3, 3);
    // 全空棋盤，用單色觸發 cascade
    const rng = new Mulberry32(42);
    const colours: GemColour[] = ['R'];

    const result = runCascade(board, rng, colours, 5);

    // chain 應該從 5 開始遞增
    expect(result.steps[0].chain).toBe(6);
  });
});

// ─── 8.7 CP-5 Property Test：cascade 完成保證 ──────────────

/**
 * **Validates: Requirements CP-5**
 *
 * CP-5 Cascade 完成保證：
 * 使用 fast-check 生成隨機棋盤（有一些空格），執行 runCascade，
 * 驗證：cascade 結束後棋盤上無 3+ match（除非 overrun）。
 */
describe('CP-5: cascade 完成保證', () => {
  it('cascade 結束後棋盤上無 3+ match（除非 overrun）', () => {
    const allColours: GemColour[] = ['R', 'G', 'B', 'Y', 'P', 'W', 'O'];

    fc.assert(
      fc.property(
        // 棋盤尺寸 3-8
        fc.integer({ min: 3, max: 8 }),
        fc.integer({ min: 3, max: 8 }),
        // 使用的顏色數量 3-7
        fc.integer({ min: 3, max: 7 }),
        // RNG seed
        fc.integer({ min: 1, max: 2147483647 }),
        // 空格比例 0-50%
        fc.float({ min: 0, max: 0.5, noNaN: true }),
        (width, height, numColours, seed, emptyRatio) => {
          const colours = allColours.slice(0, numColours);
          const board = createBoard(width, height);

          // 隨機填充棋盤，有些格子留空
          const fillRng = new Mulberry32(seed);
          for (let col = 0; col < width; col++) {
            for (let row = 0; row < height; row++) {
              if (fillRng.next() < emptyRatio) {
                // 留空（模擬消除後的空格）
                board.cells[col][row].gem = null;
              } else {
                board.cells[col][row].gem = createGem(fillRng.pick(colours));
              }
            }
          }

          const cascadeRng = new Mulberry32(seed ^ 0xABCDEF);
          const result = runCascade(board, cascadeRng, colours);

          // 若非 overrun，棋盤上不應有 3+ match
          if (!result.overrun) {
            const remainingMatches = detectMatches(board);
            expect(remainingMatches.length).toBe(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
