import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { CellPos, GemColour } from '../../../types';
import {
  createBoard,
  createGem,
  getCell,
} from '../../../game/rules/board';
import type { Board, BlockerState } from '../../../game/rules/board';
import { Mulberry32 } from '../../../game/rules/rng';
import {
  JellyOverlay,
  processJellyOnClear,
  isLocked,
  breakLock,
  tickGenerators,
  tickUnstables,
  processBlockersOnClear,
} from '../blocker';

// ─── 輔助函式 ───────────────────────────────────────────────

/** 建立一個有寶石的棋盤 */
function createBoardWithGems(width: number, height: number): Board {
  const board = createBoard(width, height);
  const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
  for (let col = 0; col < width; col++) {
    for (let row = 0; row < height; row++) {
      board.cells[col][row].gem = createGem(colours[(col + row) % colours.length]);
    }
  }
  return board;
}

// ─── 12.7 單元測試 ──────────────────────────────────────────

// 1. JellyOverlay：設定/取得/減層/移除
describe('JellyOverlay：基本操作', () => {
  it('設定與取得 layers', () => {
    const overlay = new JellyOverlay();
    overlay.setLayers([2, 3], 2);
    expect(overlay.getLayers([2, 3])).toBe(2);
    expect(overlay.hasJelly([2, 3])).toBe(true);
  });

  it('未設定的位置回傳 0', () => {
    const overlay = new JellyOverlay();
    expect(overlay.getLayers([0, 0])).toBe(0);
    expect(overlay.hasJelly([0, 0])).toBe(false);
  });

  it('reduceLayer 減一層', () => {
    const overlay = new JellyOverlay();
    overlay.setLayers([1, 1], 3);
    const remaining = overlay.reduceLayer([1, 1]);
    expect(remaining).toBe(2);
    expect(overlay.getLayers([1, 1])).toBe(2);
  });

  it('reduceLayer 對無 jelly 的位置回傳 0', () => {
    const overlay = new JellyOverlay();
    expect(overlay.reduceLayer([5, 5])).toBe(0);
  });
});

// 2. JellyOverlay：多層堆疊（1/2/3 層）
describe('JellyOverlay：多層堆疊', () => {
  it('支援 1 層', () => {
    const overlay = new JellyOverlay();
    overlay.setLayers([0, 0], 1);
    expect(overlay.getLayers([0, 0])).toBe(1);
  });

  it('支援 2 層', () => {
    const overlay = new JellyOverlay();
    overlay.setLayers([0, 0], 2);
    expect(overlay.getLayers([0, 0])).toBe(2);
  });

  it('支援 3 層', () => {
    const overlay = new JellyOverlay();
    overlay.setLayers([0, 0], 3);
    expect(overlay.getLayers([0, 0])).toBe(3);
  });

  it('超過 3 層被截斷為 3', () => {
    const overlay = new JellyOverlay();
    overlay.setLayers([0, 0], 5);
    expect(overlay.getLayers([0, 0])).toBe(3);
  });

  it('getTotalLayers 加總所有層', () => {
    const overlay = new JellyOverlay();
    overlay.setLayers([0, 0], 1);
    overlay.setLayers([1, 1], 2);
    overlay.setLayers([2, 2], 3);
    expect(overlay.getTotalLayers()).toBe(6);
  });

  it('getCellCount 回傳格子數', () => {
    const overlay = new JellyOverlay();
    overlay.setLayers([0, 0], 1);
    overlay.setLayers([1, 1], 2);
    expect(overlay.getCellCount()).toBe(2);
  });
});

// 3. JellyOverlay：減到 0 時自動移除
describe('JellyOverlay：減到 0 時自動移除', () => {
  it('1 層減到 0 後 hasJelly 為 false', () => {
    const overlay = new JellyOverlay();
    overlay.setLayers([3, 3], 1);
    const remaining = overlay.reduceLayer([3, 3]);
    expect(remaining).toBe(0);
    expect(overlay.hasJelly([3, 3])).toBe(false);
    expect(overlay.getCellCount()).toBe(0);
  });

  it('3 層逐步減到 0', () => {
    const overlay = new JellyOverlay();
    overlay.setLayers([1, 1], 3);

    expect(overlay.reduceLayer([1, 1])).toBe(2);
    expect(overlay.reduceLayer([1, 1])).toBe(1);
    expect(overlay.reduceLayer([1, 1])).toBe(0);
    expect(overlay.hasJelly([1, 1])).toBe(false);
  });

  it('setLayers(pos, 0) 移除 jelly', () => {
    const overlay = new JellyOverlay();
    overlay.setLayers([2, 2], 2);
    overlay.setLayers([2, 2], 0);
    expect(overlay.hasJelly([2, 2])).toBe(false);
    expect(overlay.getCellCount()).toBe(0);
  });

  it('getAllPositions 不包含已移除的位置', () => {
    const overlay = new JellyOverlay();
    overlay.setLayers([0, 0], 1);
    overlay.setLayers([1, 1], 2);
    overlay.reduceLayer([0, 0]); // 減到 0，移除

    const positions = overlay.getAllPositions();
    expect(positions.length).toBe(1);
    expect(positions[0]).toEqual([1, 1]);
  });
});

// 4. isLocked：有 lock 回傳 true、無 lock 回傳 false
describe('isLocked', () => {
  it('有 lock blocker 回傳 true', () => {
    const board = createBoard(6, 6);
    board.cells[2][3].blocker = { kind: 'lock' };
    board.cells[2][3].gem = createGem('R');
    expect(isLocked(board, [2, 3])).toBe(true);
  });

  it('無 blocker 回傳 false', () => {
    const board = createBoard(6, 6);
    expect(isLocked(board, [2, 3])).toBe(false);
  });

  it('有其他 blocker 回傳 false', () => {
    const board = createBoard(6, 6);
    board.cells[2][3].blocker = { kind: 'jelly', layers: 1 };
    expect(isLocked(board, [2, 3])).toBe(false);
  });

  it('超出範圍回傳 false', () => {
    const board = createBoard(6, 6);
    expect(isLocked(board, [-1, 0])).toBe(false);
    expect(isLocked(board, [6, 6])).toBe(false);
  });
});

// 5. breakLock：移除 lock 並清除寶石
describe('breakLock', () => {
  it('移除 lock 並清除寶石', () => {
    const board = createBoard(6, 6);
    board.cells[2][3].blocker = { kind: 'lock' };
    board.cells[2][3].gem = createGem('R');

    const result = breakLock(board, [2, 3]);
    expect(result).toBe(true);
    expect(board.cells[2][3].blocker).toBeNull();
    expect(board.cells[2][3].gem).toBeNull();
  });

  it('無 lock 時回傳 false', () => {
    const board = createBoard(6, 6);
    board.cells[2][3].gem = createGem('R');
    expect(breakLock(board, [2, 3])).toBe(false);
  });

  it('有其他 blocker 時回傳 false', () => {
    const board = createBoard(6, 6);
    board.cells[2][3].blocker = { kind: 'jelly', layers: 2 };
    expect(breakLock(board, [2, 3])).toBe(false);
    // blocker 不應被修改
    expect(board.cells[2][3].blocker).toEqual({ kind: 'jelly', layers: 2 });
  });

  it('超出範圍回傳 false', () => {
    const board = createBoard(6, 6);
    expect(breakLock(board, [-1, 0])).toBe(false);
  });
});

// 6. tickGenerators：達到 N 手時生成 blocker
describe('tickGenerators：生成 blocker', () => {
  it('達到 everyNMoves 時在空鄰格生成 blocker', () => {
    const board = createBoard(6, 6);
    // 在 (2,2) 放置 generator，everyNMoves=2，已過 1 手
    board.cells[2][2].blocker = {
      kind: 'generator',
      spawnKind: 'jelly',
      everyNMoves: 2,
      movesSinceLastSpawn: 1,
    };
    // 確保鄰格有空格（gem=null, blocker=null）
    // (2,1), (2,3), (1,2), (3,2) 都是空的

    const rng = new Mulberry32(42);
    const spawned = tickGenerators(board, rng);

    expect(spawned.length).toBe(1);
    // 確認生成的位置是 generator 的鄰格之一
    const [sc, sr] = spawned[0];
    const dist = Math.abs(sc - 2) + Math.abs(sr - 2);
    expect(dist).toBe(1);

    // 確認生成了 jelly blocker
    const spawnedCell = getCell(board, spawned[0])!;
    expect(spawnedCell.blocker).toEqual({ kind: 'jelly', layers: 1 });
  });

  it('未達到 everyNMoves 時不生成', () => {
    const board = createBoard(6, 6);
    board.cells[2][2].blocker = {
      kind: 'generator',
      spawnKind: 'jelly',
      everyNMoves: 3,
      movesSinceLastSpawn: 0,
    };

    const rng = new Mulberry32(42);
    const spawned = tickGenerators(board, rng);
    expect(spawned.length).toBe(0);

    // movesSinceLastSpawn 應該增加了
    const gen = board.cells[2][2].blocker;
    expect(gen?.kind === 'generator' && gen.movesSinceLastSpawn).toBe(1);
  });

  it('生成後重置 movesSinceLastSpawn', () => {
    const board = createBoard(6, 6);
    board.cells[2][2].blocker = {
      kind: 'generator',
      spawnKind: 'lock',
      everyNMoves: 1,
      movesSinceLastSpawn: 0,
    };

    const rng = new Mulberry32(42);
    tickGenerators(board, rng);

    const gen = board.cells[2][2].blocker;
    expect(gen?.kind === 'generator' && gen.movesSinceLastSpawn).toBe(0);
  });
});

// 7. tickGenerators：4-鄰無空格時略過
describe('tickGenerators：4-鄰無空格時略過', () => {
  it('所有鄰格都有寶石時不生成', () => {
    const board = createBoardWithGems(6, 6);
    board.cells[2][2].blocker = {
      kind: 'generator',
      spawnKind: 'jelly',
      everyNMoves: 1,
      movesSinceLastSpawn: 0,
    };

    const rng = new Mulberry32(42);
    const spawned = tickGenerators(board, rng);
    expect(spawned.length).toBe(0);
  });

  it('所有鄰格都有 blocker 時不生成', () => {
    const board = createBoard(6, 6);
    board.cells[2][2].blocker = {
      kind: 'generator',
      spawnKind: 'jelly',
      everyNMoves: 1,
      movesSinceLastSpawn: 0,
    };
    // 設定所有鄰格有 blocker
    board.cells[2][1].blocker = { kind: 'lock' };
    board.cells[2][3].blocker = { kind: 'lock' };
    board.cells[1][2].blocker = { kind: 'lock' };
    board.cells[3][2].blocker = { kind: 'lock' };

    const rng = new Mulberry32(42);
    const spawned = tickGenerators(board, rng);
    expect(spawned.length).toBe(0);
  });

  it('角落 generator 只有 2 個鄰格', () => {
    const board = createBoard(6, 6);
    board.cells[0][0].blocker = {
      kind: 'generator',
      spawnKind: 'jelly',
      everyNMoves: 1,
      movesSinceLastSpawn: 0,
    };

    const rng = new Mulberry32(42);
    const spawned = tickGenerators(board, rng);
    expect(spawned.length).toBe(1);
    // 只能在 (0,1) 或 (1,0)
    const [sc, sr] = spawned[0];
    expect(
      (sc === 0 && sr === 1) || (sc === 1 && sr === 0),
    ).toBe(true);
  });
});

// 8. tickGenerators：被摧毀後不再生成
describe('tickGenerators：被摧毀後不再生成', () => {
  it('generator blocker 被移除後不再生成', () => {
    const board = createBoard(6, 6);
    board.cells[2][2].blocker = {
      kind: 'generator',
      spawnKind: 'jelly',
      everyNMoves: 1,
      movesSinceLastSpawn: 0,
    };

    // 模擬摧毀 generator
    board.cells[2][2].blocker = null;

    const rng = new Mulberry32(42);
    const spawned = tickGenerators(board, rng);
    expect(spawned.length).toBe(0);
  });
});

// 9. tickUnstables：倒數遞減
describe('tickUnstables：倒數遞減', () => {
  it('每次 tick 倒數減 1', () => {
    const board = createBoard(6, 6);
    board.cells[2][2].blocker = { kind: 'unstable', countdown: 6 };

    tickUnstables(board);

    const blocker = board.cells[2][2].blocker;
    expect(blocker?.kind === 'unstable' && blocker.countdown).toBe(5);
  });

  it('多個 unstable 同時遞減', () => {
    const board = createBoard(6, 6);
    board.cells[0][0].blocker = { kind: 'unstable', countdown: 3 };
    board.cells[5][5].blocker = { kind: 'unstable', countdown: 4 };

    tickUnstables(board);

    expect(
      board.cells[0][0].blocker?.kind === 'unstable' &&
        board.cells[0][0].blocker.countdown,
    ).toBe(2);
    expect(
      board.cells[5][5].blocker?.kind === 'unstable' &&
        board.cells[5][5].blocker.countdown,
    ).toBe(3);
  });
});

// 10. tickUnstables：歸零時爆炸（3×3 清除 + 300 罰分）
describe('tickUnstables：歸零時爆炸', () => {
  it('countdown 歸零時 3×3 清除 + 300 罰分', () => {
    const board = createBoardWithGems(6, 6);
    board.cells[3][3].blocker = { kind: 'unstable', countdown: 1 };

    const result = tickUnstables(board);

    expect(result.exploded.length).toBe(1);
    expect(result.exploded[0]).toEqual([3, 3]);
    expect(result.penalty).toBe(300);

    // 3×3 區域的寶石和 blocker 都被清除
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const cell = getCell(board, [3 + dc, 3 + dr]);
        expect(cell!.gem).toBeNull();
        expect(cell!.blocker).toBeNull();
      }
    }
  });

  it('邊角的 unstable 爆炸只清除有效範圍', () => {
    const board = createBoardWithGems(6, 6);
    board.cells[0][0].blocker = { kind: 'unstable', countdown: 1 };

    const result = tickUnstables(board);

    expect(result.exploded.length).toBe(1);
    expect(result.penalty).toBe(300);

    // (0,0) 的 3×3 只有 (0,0), (1,0), (0,1), (1,1) 有效
    expect(getCell(board, [0, 0])!.gem).toBeNull();
    expect(getCell(board, [1, 0])!.gem).toBeNull();
    expect(getCell(board, [0, 1])!.gem).toBeNull();
    expect(getCell(board, [1, 1])!.gem).toBeNull();

    // 範圍外的寶石不受影響
    expect(getCell(board, [2, 0])!.gem).not.toBeNull();
    expect(getCell(board, [0, 2])!.gem).not.toBeNull();
  });

  it('多個 unstable 同時爆炸累加罰分', () => {
    const board = createBoardWithGems(8, 8);
    board.cells[1][1].blocker = { kind: 'unstable', countdown: 1 };
    board.cells[6][6].blocker = { kind: 'unstable', countdown: 1 };

    const result = tickUnstables(board);

    expect(result.exploded.length).toBe(2);
    expect(result.penalty).toBe(600);
  });
});

// 11. tickUnstables：被 match 清除後不爆炸
describe('tickUnstables：被清除後不爆炸', () => {
  it('blocker 被移除後不會在 tick 中爆炸', () => {
    const board = createBoardWithGems(6, 6);
    board.cells[2][2].blocker = { kind: 'unstable', countdown: 1 };

    // 模擬被 match 清除：移除 blocker
    board.cells[2][2].blocker = null;

    const result = tickUnstables(board);
    expect(result.exploded.length).toBe(0);
    expect(result.penalty).toBe(0);
  });
});

// 12. processBlockersOnClear：jelly 減層
describe('processBlockersOnClear：jelly 減層', () => {
  it('清除時 jelly 減一層', () => {
    const board = createBoard(6, 6);
    board.cells[2][2].blocker = { kind: 'jelly', layers: 3 };
    board.cells[2][2].gem = createGem('R');

    processBlockersOnClear(board, [[2, 2]]);

    const blocker = board.cells[2][2].blocker;
    expect(blocker?.kind === 'jelly' && blocker.layers).toBe(2);
  });

  it('jelly 1 層減到 0 時移除 blocker', () => {
    const board = createBoard(6, 6);
    board.cells[2][2].blocker = { kind: 'jelly', layers: 1 };

    processBlockersOnClear(board, [[2, 2]]);

    expect(board.cells[2][2].blocker).toBeNull();
  });

  it('多個不同格子的 jelly 都被處理', () => {
    const board = createBoard(6, 6);
    board.cells[0][0].blocker = { kind: 'jelly', layers: 2 };
    board.cells[3][3].blocker = { kind: 'jelly', layers: 1 };

    processBlockersOnClear(board, [
      [0, 0],
      [3, 3],
    ]);

    expect(board.cells[0][0].blocker).toEqual({ kind: 'jelly', layers: 1 });
    expect(board.cells[3][3].blocker).toBeNull();
  });
});

// 13. processBlockersOnClear：一個 clear event 只扣 1 層
describe('processBlockersOnClear：一個 clear event 只扣 1 層', () => {
  it('同格出現多次只扣 1 層', () => {
    const board = createBoard(6, 6);
    board.cells[2][2].blocker = { kind: 'jelly', layers: 3 };

    // 同一格出現多次（模擬多個清除來源命中同格）
    processBlockersOnClear(board, [
      [2, 2],
      [2, 2],
      [2, 2],
    ]);

    const blocker = board.cells[2][2].blocker;
    expect(blocker?.kind === 'jelly' && blocker.layers).toBe(2);
  });
});

// 14. 堆疊 blocker：lock + jelly 共存時，破鎖不影響 jelly
describe('堆疊 blocker：lock + jelly 共存', () => {
  it('JellyOverlay 與 Cell.blocker(lock) 獨立運作', () => {
    const board = createBoard(6, 6);
    const overlay = new JellyOverlay();

    // 設定 lock blocker 在 Cell 上
    board.cells[2][2].blocker = { kind: 'lock' };
    board.cells[2][2].gem = createGem('R');

    // 設定 jelly overlay
    overlay.setLayers([2, 2], 2);

    // 破鎖
    const lockBroken = breakLock(board, [2, 2]);
    expect(lockBroken).toBe(true);
    expect(board.cells[2][2].blocker).toBeNull();
    expect(board.cells[2][2].gem).toBeNull();

    // jelly overlay 不受影響
    expect(overlay.hasJelly([2, 2])).toBe(true);
    expect(overlay.getLayers([2, 2])).toBe(2);
  });

  it('減 jelly 層不影響 Cell.blocker', () => {
    const board = createBoard(6, 6);
    const overlay = new JellyOverlay();

    board.cells[2][2].blocker = { kind: 'lock' };
    overlay.setLayers([2, 2], 1);

    // 減 jelly
    overlay.reduceLayer([2, 2]);
    expect(overlay.hasJelly([2, 2])).toBe(false);

    // lock 不受影響
    expect(board.cells[2][2].blocker).toEqual({ kind: 'lock' });
  });
});

// ─── processJellyOnClear 單元測試 ──────────────────────────

describe('processJellyOnClear', () => {
  it('有 jelly 時減一層並回傳 true', () => {
    const board = createBoard(6, 6);
    board.cells[1][1].blocker = { kind: 'jelly', layers: 2 };

    const result = processJellyOnClear(board, [1, 1]);
    expect(result).toBe(true);
    expect(board.cells[1][1].blocker).toEqual({ kind: 'jelly', layers: 1 });
  });

  it('jelly 1 層減到 0 時移除 blocker', () => {
    const board = createBoard(6, 6);
    board.cells[1][1].blocker = { kind: 'jelly', layers: 1 };

    const result = processJellyOnClear(board, [1, 1]);
    expect(result).toBe(true);
    expect(board.cells[1][1].blocker).toBeNull();
  });

  it('無 jelly 時回傳 false', () => {
    const board = createBoard(6, 6);
    expect(processJellyOnClear(board, [1, 1])).toBe(false);
  });

  it('有其他 blocker 時回傳 false', () => {
    const board = createBoard(6, 6);
    board.cells[1][1].blocker = { kind: 'lock' };
    expect(processJellyOnClear(board, [1, 1])).toBe(false);
  });

  it('超出範圍回傳 false', () => {
    const board = createBoard(6, 6);
    expect(processJellyOnClear(board, [-1, 0])).toBe(false);
  });
});


// ─── CP-10 Property Test：Blocker 層級完整性 ────────────────
/**
 * **Validates: Requirements CP-10**
 *
 * 單一清除事件對一個 jelly 格僅移除恰好 1 層，
 * 無論同一 tick 內有多少重疊清除來源命中該格。
 */
describe('CP-10: Blocker 層級完整性', () => {
  it('每次 processBlockersOnClear 呼叫只扣 1 層，無論重疊清除來源數量', () => {
    fc.assert(
      fc.property(
        // 棋盤尺寸
        fc.integer({ min: 6, max: 9 }),
        fc.integer({ min: 6, max: 9 }),
        // jelly 位置與初始層數
        fc.array(
          fc.record({
            col: fc.integer({ min: 0, max: 8 }),
            row: fc.integer({ min: 0, max: 8 }),
            layers: fc.integer({ min: 1, max: 3 }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        // 每格被命中的次數（模擬多個重疊清除來源）
        fc.integer({ min: 1, max: 10 }),
        (width, height, jellySpecs, hitCount) => {
          const board = createBoard(width, height);

          // 過濾出有效位置並設定 jelly
          const validJellies = jellySpecs.filter(
            (j) => j.col < width && j.row < height,
          );
          if (validJellies.length === 0) return; // 跳過無效情況

          for (const j of validJellies) {
            board.cells[j.col][j.row].blocker = {
              kind: 'jelly',
              layers: j.layers as 1 | 2 | 3,
            };
          }

          // 記錄每格的初始層數
          const initialLayers = new Map<string, number>();
          for (const j of validJellies) {
            const key = `${j.col},${j.row}`;
            // 可能有重複位置，取最後一個設定的值
            initialLayers.set(key, j.layers);
          }

          // 建立清除列表：每個 jelly 格出現 hitCount 次
          const clearedCells: CellPos[] = [];
          for (const j of validJellies) {
            for (let i = 0; i < hitCount; i++) {
              clearedCells.push([j.col, j.row]);
            }
          }

          // 執行一次 processBlockersOnClear
          processBlockersOnClear(board, clearedCells);

          // 驗證：每格只扣了 1 層
          for (const j of validJellies) {
            const key = `${j.col},${j.row}`;
            const initial = initialLayers.get(key)!;
            const cell = board.cells[j.col][j.row];

            if (initial === 1) {
              // 應該被移除
              expect(cell.blocker).toBeNull();
            } else {
              // 應該只減了 1 層
              expect(cell.blocker?.kind).toBe('jelly');
              if (cell.blocker?.kind === 'jelly') {
                expect(cell.blocker.layers).toBe(initial - 1);
              }
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── CP-4 Property Test：手數計數一致性 ─────────────────────
/**
 * **Validates: Requirements CP-4**
 *
 * 驗證 tickGenerators 和 tickUnstables 只在玩家手數時觸發。
 * 模擬：每次呼叫 tick 代表一次玩家有效交換。
 * - Generator 的 movesSinceLastSpawn 每次 tick 恰好 +1
 * - Unstable 的 countdown 每次 tick 恰好 -1
 * - cascade 不計（不呼叫 tick）
 */
describe('CP-4: 手數計數一致性', () => {
  it('Generator movesSinceLastSpawn 每次 tick 恰好 +1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // tick 次數
        fc.integer({ min: 2, max: 10 }), // everyNMoves
        (ticks, everyNMoves) => {
          const board = createBoard(7, 7);
          // 在中央放 generator，周圍保持空格
          board.cells[3][3].blocker = {
            kind: 'generator',
            spawnKind: 'jelly',
            everyNMoves,
            movesSinceLastSpawn: 0,
          };

          const rng = new Mulberry32(12345);
          let expectedMoves = 0;
          let spawns = 0;

          for (let i = 0; i < ticks; i++) {
            // 檢查 tick 前的狀態
            const gen = board.cells[3][3].blocker;
            if (gen?.kind !== 'generator') break; // generator 被摧毀

            const prevMoves = gen.movesSinceLastSpawn;

            const spawnedThisTick = tickGenerators(board, rng);

            const genAfter = board.cells[3][3].blocker;
            if (genAfter?.kind !== 'generator') break;

            if (spawnedThisTick.length > 0) {
              // 生成了 blocker，movesSinceLastSpawn 被重置為 0
              expect(genAfter.movesSinceLastSpawn).toBe(0);
              spawns++;
              expectedMoves = 0;
            } else {
              // 沒生成，movesSinceLastSpawn 應該 +1
              expectedMoves = prevMoves + 1;
              expect(genAfter.movesSinceLastSpawn).toBe(expectedMoves);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Unstable countdown 每次 tick 恰好 -1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }), // 初始 countdown
        (initialCountdown) => {
          const board = createBoardWithGems(7, 7);
          board.cells[3][3].blocker = {
            kind: 'unstable',
            countdown: initialCountdown,
          };

          // tick 到爆炸前一步
          for (let i = 0; i < initialCountdown - 1; i++) {
            const blocker = board.cells[3][3].blocker;
            expect(blocker?.kind).toBe('unstable');
            if (blocker?.kind === 'unstable') {
              expect(blocker.countdown).toBe(initialCountdown - i);
            }

            const result = tickUnstables(board);
            expect(result.exploded.length).toBe(0);
            expect(result.penalty).toBe(0);
          }

          // 最後一次 tick 應該爆炸
          const result = tickUnstables(board);
          expect(result.exploded.length).toBe(1);
          expect(result.penalty).toBe(300);
        },
      ),
      { numRuns: 100 },
    );
  });
});
