import { describe, it, expect } from 'vitest';
import type { CellPos } from '../../../types';
import {
  createBoard,
  getCell,
} from '../board';
import {
  activateLineBomb,
  activateAreaBomb,
  activateColourGem,
  findPassiveActivations,
  sortActivationOrder,
  processSpecialActivations,
  type PassiveSpecialType,
} from '../special-gems';
import { placeGem } from '../../__tests__/test-helpers';

// ─── 測試工具 ───────────────────────────────────────────────

/** 將 CellPos[] 轉為排序後的字串集合，方便比較 */
function posSet(positions: CellPos[]): string[] {
  return positions.map(([c, r]) => `${c},${r}`).sort();
}

/** 建立特殊寶石快照 */
function buildSnapshot(entries: Array<[number, number, PassiveSpecialType]>): Map<string, PassiveSpecialType> {
  const map = new Map<string, PassiveSpecialType>();
  for (const [c, r, type] of entries) {
    map.set(`${c},${r}`, type);
  }
  return map;
}

// ─── 6.1 Line Bomb 啟動 ────────────────────────────────────

describe('activateLineBomb', () => {
  it('Line Bomb H 清除整列（同一 row 的所有格）', () => {
    const board = createBoard(5, 5);
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        placeGem(board, c, r, 'R');
      }
    }
    placeGem(board, 2, 2, 'R', 'lineH');

    const result = activateLineBomb(board, [2, 2]);

    expect(posSet(result.clearedCells)).toEqual(
      posSet([[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]]),
    );

    for (let c = 0; c < 5; c++) {
      expect(getCell(board, [c, 2])!.gem).toBeNull();
    }

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

    expect(posSet(result.clearedCells)).toEqual(
      posSet([[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]]),
    );

    for (let r = 0; r < 5; r++) {
      expect(getCell(board, [3, r])!.gem).toBeNull();
    }

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

  it('Line Bomb 爆炸範圍內的其他特殊寶石會被回報為 triggeredSpecials', () => {
    const board = createBoard(5, 5);
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        placeGem(board, c, r, 'R');
      }
    }
    // [2,2] 是 lineH bomb，[4,2] 是 area bomb（同一 row，會被 lineH 清除）
    placeGem(board, 2, 2, 'R', 'lineH');
    placeGem(board, 4, 2, 'G', 'area');

    const result = activateLineBomb(board, [2, 2]);

    // [4,2] 在爆炸範圍內且自身是 area bomb → 應出現在 triggeredSpecials
    expect(posSet(result.triggeredSpecials)).toContainEqual('4,2');
  });

  it('Line Bomb 爆炸範圍外的鄰居特殊寶石不會被觸發', () => {
    const board = createBoard(5, 5);
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        placeGem(board, c, r, 'R');
      }
    }
    // [2,2] 是 lineH bomb，[2,3] 是 area bomb（鄰居但不在同一 row）
    placeGem(board, 2, 2, 'R', 'lineH');
    placeGem(board, 2, 3, 'G', 'area');

    const result = activateLineBomb(board, [2, 2]);

    // [2,3] 不在 lineH 的爆炸範圍內 → 不應被觸發
    expect(posSet(result.triggeredSpecials)).not.toContainEqual('2,3');
    // [2,3] 的 gem 應該還在
    expect(getCell(board, [2, 3])!.gem).not.toBeNull();
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

    const expected: CellPos[] = [
      [1, 1], [1, 2], [1, 3],
      [2, 1], [2, 2], [2, 3],
      [3, 1], [3, 2], [3, 3],
    ];
    expect(posSet(result.clearedCells)).toEqual(posSet(expected));

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
    placeGem(board, 2, 0, 'W', 'area');

    const result = activateAreaBomb(board, [2, 0]);

    const expected: CellPos[] = [
      [1, 0], [1, 1],
      [2, 0], [2, 1],
      [3, 0], [3, 1],
    ];
    expect(posSet(result.clearedCells)).toEqual(posSet(expected));
  });

  it('Area Bomb 爆炸範圍內的其他特殊寶石會被回報為 triggeredSpecials', () => {
    const board = createBoard(5, 5);
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        placeGem(board, c, r, 'R');
      }
    }
    // [2,2] 是 area bomb，[3,3] 是 lineH（在 3×3 範圍內）
    placeGem(board, 2, 2, 'R', 'area');
    placeGem(board, 3, 3, 'G', 'lineH');

    const result = activateAreaBomb(board, [2, 2]);

    expect(posSet(result.triggeredSpecials)).toContainEqual('3,3');
  });
});

// ─── 6.3 Colour Gem 啟動 ───────────────────────────────────

describe('activateColourGem', () => {
  it('清除所有目標色寶石', () => {
    const board = createBoard(4, 4);
    placeGem(board, 0, 0, 'R');
    placeGem(board, 1, 0, 'B');
    placeGem(board, 2, 0, 'R');
    placeGem(board, 3, 0, 'G');
    placeGem(board, 0, 1, 'B');
    placeGem(board, 1, 1, 'R');
    placeGem(board, 2, 1, 'B');
    placeGem(board, 3, 1, 'R');
    board.cells[0][3].gem = {
      colour: null,
      special: 'colour',
      locked: false,
      unstable: null,
    };

    const result = activateColourGem(board, [0, 3], 'R');

    const expectedCleared: CellPos[] = [
      [0, 3],
      [0, 0], [2, 0], [1, 1], [3, 1],
    ];
    expect(posSet(result.clearedCells)).toEqual(posSet(expectedCleared));

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
    board.cells[1][2].gem = {
      colour: null,
      special: 'colour',
      locked: false,
      unstable: null,
    };

    const result = activateColourGem(board, [1, 2], 'R');

    expect(posSet(result.clearedCells)).toEqual(posSet([[1, 2]]));

    expect(getCell(board, [0, 0])!.gem!.colour).toBe('B');
    expect(getCell(board, [1, 0])!.gem!.colour).toBe('G');
    expect(getCell(board, [2, 0])!.gem!.colour).toBe('Y');
  });
});

// ─── 6.4 被動啟動 ──────────────────────────────────────────

describe('findPassiveActivations', () => {
  it('被清除的格子自身是 Line Bomb 時觸發', () => {
    // 快照記錄 [2,2] 原本是 lineH
    const snapshot = buildSnapshot([[2, 2, 'lineH']]);
    const clearedCells: CellPos[] = [[2, 1], [2, 2], [2, 3]];

    const result = findPassiveActivations(clearedCells, snapshot);

    // [2,2] 自身是 lineH → 應被觸發
    expect(posSet(result)).toContainEqual('2,2');
    expect(result.length).toBe(1);
  });

  it('被清除的格子自身是 Area Bomb 時觸發', () => {
    const snapshot = buildSnapshot([[3, 3, 'area']]);
    const clearedCells: CellPos[] = [[3, 2], [3, 3]];

    const result = findPassiveActivations(clearedCells, snapshot);

    expect(posSet(result)).toContainEqual('3,3');
    expect(result.length).toBe(1);
  });

  it('Colour Gem 被動觸發：自身被消除時出現在 findPassiveActivations 結果中', () => {
    const snapshot = buildSnapshot([[2, 2, 'colour']]);
    const clearedCells: CellPos[] = [[2, 1], [2, 2]];

    const result = findPassiveActivations(clearedCells, snapshot);

    expect(posSet(result)).toContainEqual('2,2');
    expect(result.length).toBe(1);
  });

  it('鄰居有特殊寶石但自身不是特殊寶石時不觸發', () => {
    // 快照中只有 [2,2] 是 lineH，但 clearedCells 只有 [2,1]（鄰居）
    const snapshot = buildSnapshot([[2, 2, 'lineH']]);
    const clearedCells: CellPos[] = [[2, 1]];

    const result = findPassiveActivations(clearedCells, snapshot);

    // [2,1] 不在快照中 → 不觸發
    // [2,2] 不在 clearedCells 中 → 不觸發
    expect(result.length).toBe(0);
  });

  it('不重複回報同一格', () => {
    const snapshot = buildSnapshot([[1, 1, 'lineH']]);
    // clearedCells 中 [1,1] 出現兩次
    const clearedCells: CellPos[] = [[1, 1], [1, 0], [1, 1]];

    const result = findPassiveActivations(clearedCells, snapshot);

    expect(result.length).toBe(1);
    expect(posSet(result)).toEqual(['1,1']);
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
      [1, 0],
      [2, 0],
      [1, 1],
      [0, 2],
      [3, 2],
    ]);
  });

  it('空陣列回傳空陣列', () => {
    expect(sortActivationOrder([])).toEqual([]);
  });

  it('不修改原始陣列', () => {
    const positions: CellPos[] = [[2, 1], [0, 0]];
    const sorted = sortActivationOrder(positions);
    expect(positions[0]).toEqual([2, 1]);
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
    board.cells[3][2].blocker = { kind: 'lock' };
    placeGem(board, 2, 2, 'R', 'lineH');

    const result = activateLineBomb(board, [2, 2]);

    expect(posSet(result.clearedCells)).toContainEqual('3,2');
    expect(getCell(board, [3, 2])!.blocker).toBeNull();
  });

  it('清除時摧毀 Generator blocker', () => {
    const board = createBoard(5, 5);
    for (let c = 0; c < 5; c++) {
      placeGem(board, c, 2, 'B');
    }
    board.cells[1][2].blocker = {
      kind: 'generator',
      spawnKind: 'jelly',
      everyNMoves: 3,
      movesSinceLastSpawn: 0,
    };
    placeGem(board, 2, 2, 'B', 'lineH');

    const result = activateLineBomb(board, [2, 2]);

    expect(posSet(result.clearedCells)).toContainEqual('1,2');
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

    expect(getCell(board, [3, 2])!.blocker).toEqual({ kind: 'jelly', layers: 2 });
  });
});

// ─── processSpecialActivations 遞迴處理 ────────────────────

describe('processSpecialActivations', () => {
  it('遞迴處理鏈式觸發：被清除的特殊寶石引爆後波及其他特殊寶石', () => {
    // 場景：
    // 初始清除包含 [1,0]（lineH bomb）
    // lineH bomb 清除 row=0 的所有格，其中 [4,0] 是 lineV bomb
    // lineV bomb 清除 col=4 的所有格
    const board = createBoard(5, 5);

    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        placeGem(board, c, r, 'R');
      }
    }

    // [1,0] 放 lineH bomb
    placeGem(board, 1, 0, 'R', 'lineH');
    // [4,0] 放 lineV bomb（在 lineH 的爆炸範圍內）
    placeGem(board, 4, 0, 'B', 'lineV');

    // 建立快照：記錄 [1,0] 原本是 lineH
    const snapshot = buildSnapshot([[1, 0, 'lineH']]);

    // 模擬初始清除 [0,0] 和 [1,0]
    board.cells[0][0].gem = null;
    // 注意：[1,0] 的 gem 也被清除了（它在 initialCleared 中）
    board.cells[1][0].gem = null;
    const initialCleared: CellPos[] = [[0, 0], [1, 0]];

    const result = processSpecialActivations(board, initialCleared, snapshot);

    // [1,0] 的 lineH 應被觸發（自身在 initialCleared 中）
    expect(posSet(result.triggeredSpecials)).toContainEqual('1,0');

    // lineH 清除 row=0 後，[4,0] 的 lineV 也被清除 → 觸發
    expect(posSet(result.triggeredSpecials)).toContainEqual('4,0');

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

    // 兩個相鄰的 line bomb，都在初始清除中
    placeGem(board, 0, 0, 'R', 'lineH');
    placeGem(board, 1, 0, 'R', 'lineV');

    const snapshot = buildSnapshot([[0, 0, 'lineH'], [1, 0, 'lineV']]);

    // 清除 [0,0] 和 [1,0]
    board.cells[0][0].gem = null;
    board.cells[1][0].gem = null;
    const initialCleared: CellPos[] = [[0, 0], [1, 0]];

    // 不應拋出錯誤或無限迴圈
    const result = processSpecialActivations(board, initialCleared, snapshot);

    expect(result.triggeredSpecials.length).toBeGreaterThan(0);
    expect(result.clearedCells.length).toBeGreaterThan(0);
  });

  it('無被動觸發時回傳初始清除', () => {
    const board = createBoard(5, 5);
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        placeGem(board, c, r, 'R');
      }
    }

    board.cells[1][1].gem = null;
    board.cells[2][1].gem = null;
    const initialCleared: CellPos[] = [[1, 1], [2, 1]];

    // 空快照 → 無特殊寶石
    const result = processSpecialActivations(board, initialCleared, new Map());

    expect(posSet(result.clearedCells)).toEqual(posSet(initialCleared));
    expect(result.triggeredSpecials).toEqual([]);
  });

  it('鄰居有特殊寶石但未被清除時不觸發', () => {
    const board = createBoard(5, 5);
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        placeGem(board, c, r, 'R');
      }
    }

    // [2,2] 是 lineH bomb，但不在初始清除中
    placeGem(board, 2, 2, 'R', 'lineH');

    // 只清除 [2,1]（[2,2] 的鄰居）
    board.cells[2][1].gem = null;
    const initialCleared: CellPos[] = [[2, 1]];

    // 快照中沒有 [2,1]（它不是特殊寶石）
    const result = processSpecialActivations(board, initialCleared, new Map());

    // [2,2] 不在 clearedCells 中 → 不應被觸發
    expect(result.triggeredSpecials.length).toBe(0);
    // [2,2] 的 gem 應該還在
    expect(getCell(board, [2, 2])!.gem!.special).toBe('lineH');
  });

  it('Colour Gem 被動啟動：被消除時隨機挑一色清除全盤該色寶石', async () => {
    const { Mulberry32 } = await import('../rng');
    const board = createBoard(4, 4);
    // 棋盤：滿版 R，僅 [0,0] 放一顆 B，[1,1] 放 Colour Gem
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        placeGem(board, c, r, 'R');
      }
    }
    placeGem(board, 0, 0, 'B');
    board.cells[1][1].gem = {
      colour: null,
      special: 'colour',
      locked: false,
      unstable: null,
    };

    const snapshot = buildSnapshot([[1, 1, 'colour']]);
    // 清除 [1,1]（Colour Gem 自身）
    board.cells[1][1].gem = null;

    const rng = new Mulberry32(42);
    const result = processSpecialActivations(board, [[1, 1]], snapshot, {
      rng,
      colours: ['R', 'B'],
    });

    // Colour Gem 被動觸發 → 挑一色後該色寶石全數被清除
    expect(posSet(result.triggeredSpecials)).toContainEqual('1,1');
    expect(result.clearedCells.length).toBeGreaterThan(1);

    // 挑 R → 所有 R（15 格）清空；挑 B → [0,0] 一格清空。
    // 無論挑哪色，棋盤上該色都應完全消失。
    const rCount = (() => {
      let n = 0;
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        if (board.cells[c][r].gem?.colour === 'R') n++;
      }
      return n;
    })();
    const bCount = (() => {
      let n = 0;
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        if (board.cells[c][r].gem?.colour === 'B') n++;
      }
      return n;
    })();
    expect(rCount === 0 || bCount === 0).toBe(true);
  });

  it('Colour Gem 被動啟動可引發連鎖：清到 Line Bomb 會再引爆', () => {
    const board = createBoard(5, 5);
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        placeGem(board, c, r, 'R');
      }
    }
    // [2,2] 是 Colour Gem；[4,0] 是紅色 lineV bomb
    board.cells[2][2].gem = {
      colour: null,
      special: 'colour',
      locked: false,
      unstable: null,
    };
    placeGem(board, 4, 0, 'R', 'lineV');

    const snapshot = buildSnapshot([[2, 2, 'colour']]);
    // 清除 [2,2]
    board.cells[2][2].gem = null;

    const result = processSpecialActivations(board, [[2, 2]], snapshot, {
      colours: ['R'],
    });

    // Colour Gem 會清所有 R（包含 [4,0] 的 lineV）→ lineV 再被動觸發清整欄
    expect(posSet(result.triggeredSpecials)).toContainEqual('2,2');
    expect(posSet(result.triggeredSpecials)).toContainEqual('4,0');
    // col=4 的整欄都該清空
    for (let r = 0; r < 5; r++) {
      expect(getCell(board, [4, r])!.gem).toBeNull();
    }
  });
});
