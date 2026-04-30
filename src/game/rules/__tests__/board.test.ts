import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { CellPos, GemColour } from '../../../types';
import {
  createBoard,
  createGem,
  isValidPos,
  getCell,
  setCell,
  getNeighbors,
  cloneBoard,
} from '../board';
import type { Cell, Gem } from '../board';

// ─── 單元測試 ───────────────────────────────────────────────

describe('createBoard', () => {
  it('建立正確尺寸的棋盤', () => {
    const board = createBoard(8, 7);
    expect(board.width).toBe(8);
    expect(board.height).toBe(7);
    // cells 是 column-major: cells[col][row]
    expect(board.cells.length).toBe(8); // 8 columns
    expect(board.cells[0].length).toBe(7); // 7 rows each
  });

  it('所有格子初始為空', () => {
    const board = createBoard(6, 6);
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 6; row++) {
        const cell = board.cells[col][row];
        expect(cell.gem).toBeNull();
        expect(cell.blocker).toBeNull();
        expect(cell.isDelivery).toBe(false);
        expect(cell.isEmpty).toBe(false);
      }
    }
  });

  it('空格正確標記', () => {
    const empty: CellPos[] = [
      [0, 0],
      [2, 3],
      [5, 5],
    ];
    const board = createBoard(6, 6, empty);

    expect(board.cells[0][0].isEmpty).toBe(true);
    expect(board.cells[2][3].isEmpty).toBe(true);
    expect(board.cells[5][5].isEmpty).toBe(true);

    // 非空格的格子不應被標記
    expect(board.cells[1][1].isEmpty).toBe(false);
    expect(board.cells[3][3].isEmpty).toBe(false);
  });

  it('超出範圍的空格座標被忽略', () => {
    const empty: CellPos[] = [
      [-1, 0],
      [0, -1],
      [6, 0],
      [0, 6],
    ];
    // 不應拋出錯誤
    const board = createBoard(6, 6, empty);
    expect(board.width).toBe(6);
  });
});

describe('isValidPos', () => {
  const board = createBoard(7, 8);

  it('有效座標回傳 true', () => {
    expect(isValidPos(board, [0, 0])).toBe(true);
    expect(isValidPos(board, [6, 7])).toBe(true);
    expect(isValidPos(board, [3, 4])).toBe(true);
  });

  it('無效座標回傳 false', () => {
    expect(isValidPos(board, [-1, 0])).toBe(false);
    expect(isValidPos(board, [0, -1])).toBe(false);
    expect(isValidPos(board, [7, 0])).toBe(false);
    expect(isValidPos(board, [0, 8])).toBe(false);
    expect(isValidPos(board, [7, 8])).toBe(false);
  });
});

describe('getCell', () => {
  it('正常取得格子', () => {
    const board = createBoard(6, 6);
    const cell = getCell(board, [2, 3]);
    expect(cell).not.toBeNull();
    expect(cell!.gem).toBeNull();
    expect(cell!.isEmpty).toBe(false);
  });

  it('超出範圍回傳 null', () => {
    const board = createBoard(6, 6);
    expect(getCell(board, [-1, 0])).toBeNull();
    expect(getCell(board, [6, 0])).toBeNull();
    expect(getCell(board, [0, 6])).toBeNull();
  });
});

describe('setCell', () => {
  it('正確設定格子', () => {
    const board = createBoard(6, 6);
    const newCell: Cell = {
      gem: createGem('R'),
      blocker: null,
      deliveryItem: null,
      isDelivery: true,
      isEmpty: false,
    };
    setCell(board, [2, 3], newCell);

    const retrieved = getCell(board, [2, 3]);
    expect(retrieved).toBe(newCell);
    expect(retrieved!.gem!.colour).toBe('R');
    expect(retrieved!.isDelivery).toBe(true);
  });

  it('超出範圍不拋錯', () => {
    const board = createBoard(6, 6);
    const cell: Cell = {
      gem: null,
      blocker: null,
      deliveryItem: null,
      isDelivery: false,
      isEmpty: false,
    };
    // 不應拋出錯誤
    setCell(board, [-1, 0], cell);
    setCell(board, [6, 6], cell);
  });
});

describe('getNeighbors', () => {
  const board = createBoard(7, 7);

  it('中央格有 4 個鄰居', () => {
    const neighbors = getNeighbors(board, [3, 3]);
    expect(neighbors.length).toBe(4);
    expect(neighbors).toContainEqual([3, 2]); // 上
    expect(neighbors).toContainEqual([3, 4]); // 下
    expect(neighbors).toContainEqual([2, 3]); // 左
    expect(neighbors).toContainEqual([4, 3]); // 右
  });

  it('左上角有 2 個鄰居', () => {
    const neighbors = getNeighbors(board, [0, 0]);
    expect(neighbors.length).toBe(2);
    expect(neighbors).toContainEqual([0, 1]); // 下
    expect(neighbors).toContainEqual([1, 0]); // 右
  });

  it('右下角有 2 個鄰居', () => {
    const neighbors = getNeighbors(board, [6, 6]);
    expect(neighbors.length).toBe(2);
    expect(neighbors).toContainEqual([6, 5]); // 上
    expect(neighbors).toContainEqual([5, 6]); // 左
  });

  it('邊緣（非角落）有 3 個鄰居', () => {
    // 上邊緣中間
    const neighbors = getNeighbors(board, [3, 0]);
    expect(neighbors.length).toBe(3);
    expect(neighbors).toContainEqual([3, 1]); // 下
    expect(neighbors).toContainEqual([2, 0]); // 左
    expect(neighbors).toContainEqual([4, 0]); // 右
  });
});

describe('cloneBoard', () => {
  it('深拷貝：修改 clone 不影響原始', () => {
    const board = createBoard(6, 6);
    const gem = createGem('B', 'lineH');
    board.cells[2][3].gem = gem;
    board.cells[2][3].blocker = { kind: 'jelly', layers: 2 };

    const clone = cloneBoard(board);

    // 值相等
    expect(clone.cells[2][3].gem!.colour).toBe('B');
    expect(clone.cells[2][3].gem!.special).toBe('lineH');
    expect(clone.cells[2][3].blocker).toEqual({ kind: 'jelly', layers: 2 });

    // 修改 clone 不影響原始
    clone.cells[2][3].gem!.colour = 'R';
    expect(board.cells[2][3].gem!.colour).toBe('B');

    // 修改 clone 的 blocker 不影響原始
    if (clone.cells[2][3].blocker?.kind === 'jelly') {
      clone.cells[2][3].blocker.layers = 1;
    }
    expect(
      board.cells[2][3].blocker?.kind === 'jelly' &&
        board.cells[2][3].blocker.layers,
    ).toBe(2);
  });

  it('深拷貝 generator blocker', () => {
    const board = createBoard(6, 6);
    board.cells[0][0].blocker = {
      kind: 'generator',
      spawnKind: 'jelly',
      everyNMoves: 3,
      movesSinceLastSpawn: 1,
    };

    const clone = cloneBoard(board);
    const clonedBlocker = clone.cells[0][0].blocker;
    expect(clonedBlocker).toEqual({
      kind: 'generator',
      spawnKind: 'jelly',
      everyNMoves: 3,
      movesSinceLastSpawn: 1,
    });

    // 修改 clone 不影響原始
    if (clonedBlocker?.kind === 'generator') {
      clonedBlocker.movesSinceLastSpawn = 2;
    }
    expect(
      board.cells[0][0].blocker?.kind === 'generator' &&
        board.cells[0][0].blocker.movesSinceLastSpawn,
    ).toBe(1);
  });

  it('深拷貝 unstable gem 狀態', () => {
    const board = createBoard(6, 6);
    const gem = createGem('Y');
    gem.unstable = { countdown: 4 };
    board.cells[1][1].gem = gem;

    const clone = cloneBoard(board);
    expect(clone.cells[1][1].gem!.unstable!.countdown).toBe(4);

    // 修改 clone 不影響原始
    clone.cells[1][1].gem!.unstable!.countdown = 0;
    expect(board.cells[1][1].gem!.unstable!.countdown).toBe(4);
  });

  it('深拷貝保留尺寸與空格', () => {
    const board = createBoard(8, 9, [[0, 0], [7, 8]]);
    const clone = cloneBoard(board);
    expect(clone.width).toBe(8);
    expect(clone.height).toBe(9);
    expect(clone.cells[0][0].isEmpty).toBe(true);
    expect(clone.cells[7][8].isEmpty).toBe(true);
    expect(clone.cells[1][1].isEmpty).toBe(false);
  });
});

describe('createGem', () => {
  it('建立普通寶石', () => {
    const gem = createGem('R');
    expect(gem.colour).toBe('R');
    expect(gem.special).toBeNull();
    expect(gem.locked).toBe(false);
    expect(gem.unstable).toBeNull();
  });

  it('建立特殊寶石', () => {
    const gem = createGem('G', 'area');
    expect(gem.colour).toBe('G');
    expect(gem.special).toBe('area');
    expect(gem.locked).toBe(false);
    expect(gem.unstable).toBeNull();
  });

  it('建立各種特殊類型', () => {
    const lineH = createGem('B', 'lineH');
    expect(lineH.special).toBe('lineH');

    const lineV = createGem('Y', 'lineV');
    expect(lineV.special).toBe('lineV');

    const colour = createGem('P', 'colour');
    expect(colour.special).toBe('colour');
  });
});

// ─── CP-1 Property Test（基礎版本） ────────────────────────

/**
 * **Validates: Requirements FR-1**
 *
 * CP-1 棋盤有效性不變式（基礎版本）：
 * 對任意 width (6-9)、height (6-9)、隨機 empty cells，
 * createBoard 後所有非空格的 gem 為 null。
 */
describe('CP-1: 棋盤有效性不變式（基礎版本）', () => {
  it('createBoard 後所有非空格的 gem 為 null', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 6, max: 9 }),
        fc.integer({ min: 6, max: 9 }),
        fc.array(
          fc.tuple(
            fc.integer({ min: 0, max: 8 }),
            fc.integer({ min: 0, max: 8 }),
          ),
          { minLength: 0, maxLength: 10 },
        ),
        (width, height, rawEmpty) => {
          // 過濾出在範圍內的空格座標
          const empty: CellPos[] = rawEmpty
            .filter(([c, r]) => c >= 0 && c < width && r >= 0 && r < height)
            .map(([c, r]) => [c, r] as CellPos);

          const board = createBoard(width, height, empty);

          // 建立空格集合以便快速查找
          const emptySet = new Set(empty.map(([c, r]) => `${c},${r}`));

          // 驗證棋盤尺寸
          expect(board.width).toBe(width);
          expect(board.height).toBe(height);
          expect(board.cells.length).toBe(width);

          for (let col = 0; col < width; col++) {
            expect(board.cells[col].length).toBe(height);
            for (let row = 0; row < height; row++) {
              const cell = board.cells[col][row];
              const key = `${col},${row}`;

              if (emptySet.has(key)) {
                // 空格應標記為 isEmpty
                expect(cell.isEmpty).toBe(true);
              } else {
                // 非空格的 gem 應為 null（尚未填充）
                expect(cell.gem).toBeNull();
                expect(cell.isEmpty).toBe(false);
              }

              // 所有格子的 blocker 和 isDelivery 都應為初始值
              expect(cell.blocker).toBeNull();
              expect(cell.isDelivery).toBe(false);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
