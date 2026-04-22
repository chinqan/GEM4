import { describe, it, expect } from 'vitest';
import type { CellPos, GemColour } from '../../../types';
import {
  createBoard,
  createGem,
  getCell,
} from '../board';
import type { Board } from '../board';
import {
  activateLineBomb,
  activateAreaBomb,
  activateColourGem,
  findPassiveActivations,
  sortActivationOrder,
  processSpecialActivations,
} from '../special-gems';

// ─── 測試工具 ───────────────────────────────────────────────

/** 在棋盤上放置寶石的便利函式 */
function placeGem(
  board: Board,
  col: number,
  row: number,
  colour: GemColour,
  special: 'lineH' | 'lineV' | 'area' | 'colour' | null = null,
): void {
  board.cells[col][row].gem = createGem(colour, special);
}

/** 將 CellPos[] 轉為排序後的字串集合，方便比較 */
function posSet(positions: CellPos[]): string[] {
  return positions.map(([c, r]) => `${c},${r}`).sort();
}

// ─── 6.1 Line Bomb 啟動 ────────────────────────────────────

describe('activateLineBomb', () => {
  it('Line Bomb H 清除整列（同一 row 的所有格）', () => {
    const board = createBoard(5, 5);
    // 填滿整個棋盤
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        placeGem(board, c, r, 'R');
      }
    }
    // 在 [2,2] 放置 lineH bomb
    placeGem(board, 2, 2, 'R', 'lineH');

    const result = activateLineBomb(board, [2, 2]);

    // 應清除 row=2 的所有格：[0,2],[1,2],[2,2],[3,2],[4,2]
    expect(posSet(result.clearedCells)).toEqual(
      posSet([[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]]),
    );

    // 驗證這些格子的 gem 已被清除
    for (let c = 0; c < 5; c++) {
      expect(getCell(board, [c, 2])!.gem).toBeNull();
    }

    // 其他 row 的 gem 不受影響
    expect(getCell(board, [0, 0])!.gem).not.toBeNull();
    expect(getCell(board, [4, 4])!.gem).not.toBeNull();
  });

  it('Line Bomb V 清除整行（同一 col 的所有格）', () => {
    const board = createBoard(5, 5);
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        placeGem(board, c, r, 'B');
      }
    }
    placeGem(board, 3, 1, 'B', 'lineV');

    const result = activateLineBomb(board, [3, 1]);

    // 應清除 col=3 的所有格：[3,0],[3,1],[3,2],[3,3],[3,4]
    expect(posSet(result.clearedCells)).toEqual(
      posSet([[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]]),
    );

    for (let r = 0; r < 5; r++) {
      expect(getCell(board, [3, r])!.gem).toBeNull();
    }

    // 其他 col 不受影響
    expect(getCell(board, [0, 0])!.gem).not.toBeNull();
    expect(getCell(board, [4, 4])!.gem).not.toBeNull();
  });

  it('位置沒有 gem 時回傳空結果', () => {
    const board = createBoard(5, 5);
    const result = activateLineBomb(board, [2, 2]);
    expect(result.clearedCells).toEqual([]);
    expect(result.triggeredSpecials).toEqual([]);
  });

  it('位置的 gem 不是 line bomb 時回傳空結果', () => {
    const board = createBoard(5, 5);
    placeGem(board, 2, 2, 'R', 'area');
    const result = activateLineBomb(board, [2, 2]);
    expect(result.clearedCells).toEqual([]);
    expect(result.triggeredSpecials).toEqual([]);
  });
});

// ─── 6.2 Area Bomb 啟動 ────────────────────────────────────

describe('activateAreaBomb', () => {
  it('Area Bomb 清除 3×3 區域', () => {
    const board = createBoard(5, 5);
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        placeGem(board, c, r, 'G');
      }
    }
    placeGem(board, 2, 2, 'G', 'area');

    const result = activateAreaBomb(board, [2, 2]);

    // 3×3 以 [2,2] 為中心：col 1-3, row 1-3
    const expected: CellPos[] = [
      [1, 1], [1, 2], [1, 3],
      [2, 1], [2, 2], [2, 3],
      [3, 1], [3, 2], [3, 3],
    ];
    expect(posSet(result.clearedCells)).toEqual(posSet(expected));

    // 驗證清除
    for (const [c, r] of expected) {
      expect(getCell(board, [c, r])!.gem).toBeNull();
    }
  });

  it('Area Bomb 在左上角 [0,0] 裁切為 2×2', () => {
    const board = createBoard(5, 5);
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        placeGem(board, c, r, 'Y');
      }
    }
    placeGem(board, 0, 0, 'Y', 'area');

    const result = activateAreaBomb(board, [0, 0]);

    // 只有 [0,0],[0,1],[1,0],[1,1] 在範圍內
    const expected: CellPos[] = [
      [0, 0], [0, 1],
      [1, 0], [1, 1],
    ];
    expect(posSet(result.clearedCells)).toEqual(posSet(expected));
  });

  it('Area Bomb 在右下角裁切', () => {
    const board = createBoard(5, 5);
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        placeGem(board, c, r, 'P');
      }
    }
    placeGem(board, 4, 4, 'P', 'area');

    const result = activateAreaBomb(board, [4, 4]);

    const expected: CellPos[] = [
      [3, 3], [3, 4],
      [4, 3], [4, 4],
    ];
    expect(posSet(result.clearedCells)).toEqual(posSet(expected));
  });

  it('Area Bomb 在邊緣（非角落）裁切為 2×3', () => {
    const board = createBoard(5, 5);
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        placeGem(board, c, r, 'W');
      }
    }
    // 上邊緣中間
    placeGem(board, 2, 0, 'W', 'area');

    const result = activateAreaBomb(board, [2, 0]);

    // row: 0-1 (裁切 -1), col: 1-3
    const expected: CellPos[] = [
      [1, 0], [1, 1],
      [2, 0], [2, 1],
      [3, 0], [3, 1],
    ];
    expect(posSet(result.clearedCells)).toEqual(posSet(expected));
  });
});

// ─── 6.3 Colour Gem 啟動 ───────────────────────────────────

describe('activateColourGem', () => {
  it('清除所有目標色寶石', () => {
    const board = createBoard(4, 4);
    // 放置混合顏色
    placeGem(board, 0, 0, 'R');
    placeGem(board, 1, 0, 'B');
    placeGem(board, 2, 0, 'R');
    placeGem(board, 3, 0, 'G');
    placeGem(board, 0, 1, 'B');
    placeGem(board, 1, 1, 'R');
    placeGem(board, 2, 1, 'B');
    placeGem(board, 3, 1, 'R');
    // Colour Gem 在 [0,3]
    board.cells[0][3].gem = {
      colour: null,
      special: 'colour',
      locked: false,
      unstable: null,
    };

    const result = activateColourGem(board, [0, 3], 'R');

    // 應清除所有 R 寶石 + Colour Gem 自身
    const expectedCleared: CellPos[] = [
      [0, 3], // colour gem 自身
      [0, 0], [2, 0], [1, 1], [3, 1], // R 寶石
    ];
    expect(posSet(result.clearedCells)).toEqual(posSet(expectedCleared));

    // B 和 G 寶石不受影響
    expect(getCell(board, [1, 0])!.gem!.colour).toBe('B');
    expect(getCell(board, [3, 0])!.gem!.colour).toBe('G');
    expect(getCell(board, [0, 1])!.gem!.colour).toBe('B');
    expect(getCell(board, [2, 1])!.gem!.colour).toBe('B');
  });

  it('不清除其他色寶石', () => {
    const board = createBoard(3, 3);
    placeGem(board, 0, 0, 'B');
    placeGem(board, 1, 0, 'G');
    placeGem(board, 2, 0, 'Y');
    placeGem(board, 0, 1, 'P');
    placeGem(board, 1, 1, 'W');
    placeGem(board, 2, 1, 'O');
    // Colour Gem
    board.cells[1][2].gem = {
      colour: null,
      special: 'colour',
      locked: false,
      unstable: null,
    };

    const result = activateColourGem(board, [1, 2], 'R');

    // 棋盤上沒有 R 寶石，只清除 Colour Gem 自身
    expect(posSet(result.clearedCells)).toEqual(posSet([[1, 2]]));

    // 所有其他寶石不受影響
    expect(getCell(board, [0, 0])!.gem!.colour).toBe('B');
    expect(getCell(board, [1, 0])!.gem!.colour).toBe('G');
    expect(getCell(board, [2, 0])!.gem!.colour).toBe('Y');
  });
});

// ─── 6.4 被動啟動 ──────────────────────────────────────────

describe('findPassiveActivations', () => {
  it('Line Bomb 鄰近消除時觸發', () => {
    const board = createBoard(5, 5);
    // 在 [2,2] 放 lineH bomb
    placeGem(board, 2, 2, 'R', 'lineH');
    // 在 [2,1] 放普通寶石（將被消除）
    placeGem(board, 2, 1, 'B');

    // 模擬 [2,1] 被消除
    const clearedCells: CellPos[] = [[2, 1]];

    const result = findPassiveActivations(board, clearedCells);

    // [2,2] 是 [2,1] 的鄰居且有 lineH，應被觸發
    expect(posSet(result)).toContainEqual('2,2');
  });

  it('Area Bomb 鄰近消除時觸發', () => {
    const board = createBoard(5, 5);
    placeGem(board, 3, 3, 'G', 'area');
    placeGem(board, 3, 2, 'B');

    const clearedCells: CellPos[] = [[3, 2]];
    const result = findPassiveActivations(board, clearedCells);

    expect(posSet(result)).toContainEqual('3,3');
  });

  it('Colour Gem 不被動觸發', () => {
    const board = createBoard(5, 5);
    // Colour Gem 在 [2,2]
    board.cells[2][2].gem = {
      colour: null,
      special: 'colour',
      locked: false,
      unstable: null,
    };
    placeGem(board, 2, 1, 'B');

    const clearedCells: CellPos[] = [[2, 1]];
    const result = findPassiveActivations(board, clearedCells);

    // Colour Gem 不應出現在被動觸發列表中
    expect(posSet(result)).not.toContainEqual('2,2');
    expect(result.length).toBe(0);
  });

  it('已清除的格子不會被當作被動觸發', () => {
    const board = createBoard(5, 5);
    placeGem(board, 1, 1, 'R', 'lineH');

    // [1,1] 本身也在 clearedCells 中
    const clearedCells: CellPos[] = [[1, 1], [1, 0]];
    const result = findPassiveActivations(board, clearedCells);

    // [1,1] 已在 clearedCells 中，不應被觸發
    expect(posSet(result)).not.toContainEqual('1,1');
  });
});

// ─── 6.5 啟動順序排序 ──────────────────────────────────────

describe('sortActivationOrder', () => {
  it('左上到右下排序：先 row 小，再 col 小', () => {
    const positions: CellPos[] = [
      [3, 2],
      [1, 0],
      [0, 2],
      [2, 0],
      [1, 1],
    ];

    const sorted = sortActivationOrder(positions);

    expect(sorted).toEqual([
      [1, 0], // row=0, col=1
      [2, 0], // row=0, col=2
      [1, 1], // row=1, col=1
      [0, 2], // row=2, col=0
      [3, 2], // row=2, col=3
    ]);
  });

  it('空陣列回傳空陣列', () => {
    expect(sortActivationOrder([])).toEqual([]);
  });

  it('不修改原始陣列', () => {
    const positions: CellPos[] = [[2, 1], [0, 0]];
    const sorted = sortActivationOrder(positions);
    expect(positions[0]).toEqual([2, 1]); // 原始未變
    expect(sorted[0]).toEqual([0, 0]);
  });
});

// ─── Blocker 清除 ──────────────────────────────────────────

describe('清除時破壞 blocker', () => {
  it('清除時破壞 Lock blocker', () => {
    const board = createBoard(5, 5);
    for (let c = 0; c < 5; c++) {
      placeGem(board, c, 2, 'R');
    }
    // 在 [3,2] 加上 lock blocker
    board.cells[3][2].blocker = { kind: 'lock' };
    placeGem(board, 2, 2, 'R', 'lineH');

    const result = activateLineBomb(board, [2, 2]);

    // [3,2] 應被清除
    expect(posSet(result.clearedCells)).toContainEqual('3,2');
    // lock blocker 應被移除
    expect(getCell(board, [3, 2])!.blocker).toBeNull();
  });

  it('清除時摧毀 Generator blocker', () => {
    const board = createBoard(5, 5);
    for (let c = 0; c < 5; c++) {
      placeGem(board, c, 2, 'B');
    }
    // 在 [1,2] 加上 generator blocker
    board.cells[1][2].blocker = {
      kind: 'generator',
      spawnKind: 'jelly',
      everyNMoves: 3,
      movesSinceLastSpawn: 0,
    };
    placeGem(board, 2, 2, 'B', 'lineH');

    const result = activateLineBomb(board, [2, 2]);

    expect(posSet(result.clearedCells)).toContainEqual('1,2');
    // generator blocker 應被移除
    expect(getCell(board, [1, 2])!.blocker).toBeNull();
  });

  it('Jelly blocker 不被特殊寶石清除移除', () => {
    const board = createBoard(5, 5);
    for (let c = 0; c < 5; c++) {
      placeGem(board, c, 2, 'R');
    }
    board.cells[3][2].blocker = { kind: 'jelly', layers: 2 };
    placeGem(board, 2, 2, 'R', 'lineH');

    activateLineBomb(board, [2, 2]);

    // jelly blocker 不應被移除（只有 lock 和 generator 會被清除）
    expect(getCell(board, [3, 2])!.blocker).toEqual({ kind: 'jelly', layers: 2 });
  });
});

// ─── processSpecialActivations 遞迴處理 ────────────────────

describe('processSpecialActivations', () => {
  it('遞迴處理鏈式觸發', () => {
    // 設置場景：
    // 初始清除 [0,0]，其鄰居 [1,0] 有 lineH bomb
    // lineH bomb 清除 row=0 的所有格
    // row=0 的某格鄰居有 lineV bomb，會被動觸發
    const board = createBoard(5, 5);

    // 填滿棋盤
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        placeGem(board, c, r, 'R');
      }
    }

    // [1,0] 放 lineH bomb
    placeGem(board, 1, 0, 'R', 'lineH');
    // [4,1] 放 lineV bomb（[4,0] 被 lineH 清除後，[4,1] 是鄰居）
    placeGem(board, 4, 1, 'B', 'lineV');

    // 模擬初始清除 [0,0]
    board.cells[0][0].gem = null; // 先清除
    const initialCleared: CellPos[] = [[0, 0]];

    const result = processSpecialActivations(board, initialCleared);

    // [1,0] 的 lineH 應被觸發（[0,0] 的鄰居）
    expect(posSet(result.triggeredSpecials)).toContainEqual('1,0');

    // lineH 清除 row=0 後，[4,0] 被清除，[4,1] 的 lineV 應被觸發
    expect(posSet(result.triggeredSpecials)).toContainEqual('4,1');

    // lineV 清除 col=4 的所有格
    for (let r = 0; r < 5; r++) {
      expect(getCell(board, [4, r])!.gem).toBeNull();
    }
  });

  it('不會無限迴圈（已處理的位置不重複啟動）', () => {
    const board = createBoard(3, 3);
    for (let c = 0; c < 3; c++) {
      for (let r = 0; r < 3; r++) {
        placeGem(board, c, r, 'R');
      }
    }

    // 兩個相鄰的 line bomb
    placeGem(board, 0, 0, 'R', 'lineH');
    placeGem(board, 1, 0, 'R', 'lineV');

    // 清除 [0,1]（[0,0] 的鄰居）
    board.cells[0][1].gem = null;
    const initialCleared: CellPos[] = [[0, 1]];

    // 不應拋出錯誤或無限迴圈
    const result = processSpecialActivations(board, initialCleared);

    // 應有觸發
    expect(result.triggeredSpecials.length).toBeGreaterThan(0);
    // 結果應包含清除的格子
    expect(result.clearedCells.length).toBeGreaterThan(0);
  });

  it('無被動觸發時回傳初始清除', () => {
    const board = createBoard(5, 5);
    // 只有普通寶石
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        placeGem(board, c, r, 'R');
      }
    }

    // 清除一些格子
    board.cells[1][1].gem = null;
    board.cells[2][1].gem = null;
    const initialCleared: CellPos[] = [[1, 1], [2, 1]];

    const result = processSpecialActivations(board, initialCleared);

    expect(posSet(result.clearedCells)).toEqual(posSet(initialCleared));
    expect(result.triggeredSpecials).toEqual([]);
  });
});
