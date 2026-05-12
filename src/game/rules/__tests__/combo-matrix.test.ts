import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { CellPos, GemColour, SpecialGemType } from '../../../types';
import {
  createBoard,
  getCell,
  cloneBoard,
} from '../board';
import type { Board } from '../board';
import { comboKey, resolveCombo, midpoint } from '../combo-matrix';
import { placeGem } from '../../__tests__/test-helpers';

// ─── 測試工具 ───────────────────────────────────────────────

/** 放置 Colour Gem（colour 為 null） */
function placeColourGem(board: Board, col: number, row: number): void {
  board.cells[col][row].gem = {
    colour: null,
    special: 'colour',
    locked: false,
    unstable: null,
  };
}

/** 將 CellPos[] 轉為排序後的字串集合，方便比較 */
function posSet(positions: CellPos[]): string[] {
  return positions.map(([c, r]) => `${c},${r}`).sort();
}

/** 建立填滿寶石的棋盤 */
function createFilledBoard(
  width: number,
  height: number,
  colour: GemColour = 'R',
): Board {
  const board = createBoard(width, height);
  for (let c = 0; c < width; c++) {
    for (let r = 0; r < height; r++) {
      placeGem(board, c, r, colour);
    }
  }
  return board;
}

// ─── 7.1 comboKey 正規化 ───────────────────────────────────

describe('comboKey', () => {
  it('lineH + lineV → line.line', () => {
    expect(comboKey('lineH', 'lineV')).toBe('line.line');
  });

  it('lineH + lineH → line.line', () => {
    expect(comboKey('lineH', 'lineH')).toBe('line.line');
  });

  it('lineV + lineV → line.line', () => {
    expect(comboKey('lineV', 'lineV')).toBe('line.line');
  });

  it('area + lineH → bomb.line', () => {
    expect(comboKey('area', 'lineH')).toBe('bomb.line');
  });

  it('lineV + area → bomb.line', () => {
    expect(comboKey('lineV', 'area')).toBe('bomb.line');
  });

  it('area + area → bomb.bomb', () => {
    expect(comboKey('area', 'area')).toBe('bomb.bomb');
  });

  it('colour + lineH → colour.line', () => {
    expect(comboKey('colour', 'lineH')).toBe('colour.line');
  });

  it('colour + lineV → colour.line', () => {
    expect(comboKey('colour', 'lineV')).toBe('colour.line');
  });

  it('colour + area → colour.bomb', () => {
    expect(comboKey('colour', 'area')).toBe('colour.bomb');
  });

  it('colour + colour → colour.colour', () => {
    expect(comboKey('colour', 'colour')).toBe('colour.colour');
  });

  // 對稱性
  it('comboKey(a, b) === comboKey(b, a) 對稱性', () => {
    const types: SpecialGemType[] = ['lineH', 'lineV', 'area', 'colour'];
    for (const a of types) {
      for (const b of types) {
        expect(comboKey(a, b)).toBe(comboKey(b, a));
      }
    }
  });
});

// ─── 7.3 midpoint ──────────────────────────────────────────

describe('midpoint', () => {
  it('相鄰水平格的中點', () => {
    expect(midpoint([2, 3], [3, 3])).toEqual([2, 3]);
  });

  it('相鄰垂直格的中點', () => {
    expect(midpoint([3, 2], [3, 3])).toEqual([3, 2]);
  });

  it('同一格的中點是自身', () => {
    expect(midpoint([4, 5], [4, 5])).toEqual([4, 5]);
  });

  it('向下取整', () => {
    // (1+2)/2 = 1.5 → 1, (3+4)/2 = 3.5 → 3
    expect(midpoint([1, 3], [2, 4])).toEqual([1, 3]);
  });
});

// ─── 7.2 line.line 十字清除 ────────────────────────────────

describe('resolveCombo — line.line', () => {
  it('十字清除：整列 + 整行', () => {
    const board = createFilledBoard(7, 7);
    // 在 [3,3] 放 lineH，[4,3] 放 lineV
    placeGem(board, 3, 3, 'R', 'lineH');
    placeGem(board, 4, 3, 'R', 'lineV');

    const result = resolveCombo(board, [3, 3], [4, 3]);
    expect(result).not.toBeNull();

    // 中點 = midpoint([3,3],[4,3]) = [3,3]
    // 清除 row=3 的所有格 + col=3 的所有格
    const expectedRow: CellPos[] = [];
    for (let c = 0; c < 7; c++) expectedRow.push([c, 3]);
    const expectedCol: CellPos[] = [];
    for (let r = 0; r < 7; r++) expectedCol.push([3, r]);

    const expected = [...expectedRow, ...expectedCol];
    // 所有十字格都應被清除
    for (const pos of expected) {
      expect(posSet(result!.clearedCells)).toContainEqual(`${pos[0]},${pos[1]}`);
    }

    // 驗證格子已清除
    for (let c = 0; c < 7; c++) {
      expect(getCell(board, [c, 3])!.gem).toBeNull();
    }
    for (let r = 0; r < 7; r++) {
      expect(getCell(board, [3, r])!.gem).toBeNull();
    }

    // 非十字格不受影響
    expect(getCell(board, [0, 0])!.gem).not.toBeNull();
    expect(getCell(board, [6, 6])!.gem).not.toBeNull();
  });
});

// ─── 7.2 bomb.line 3 格寬十字 ─────────────────────────────

describe('resolveCombo — bomb.line', () => {
  it('3 格寬十字清除', () => {
    const board = createFilledBoard(8, 8);
    // area 在 [4,4]，lineH 在 [3,4]
    placeGem(board, 4, 4, 'R', 'area');
    placeGem(board, 3, 4, 'R', 'lineH');

    const result = resolveCombo(board, [4, 4], [3, 4]);
    expect(result).not.toBeNull();

    // 中點 = midpoint([4,4],[3,4]) = [3,4]
    // 3 格寬水平帶：row 3,4,5 的所有 col
    // 3 格寬垂直帶：col 2,3,4 的所有 row
    const clearedSet = new Set(posSet(result!.clearedCells));

    // 水平帶
    for (let dr = -1; dr <= 1; dr++) {
      const r = 4 + dr;
      for (let c = 0; c < 8; c++) {
        expect(clearedSet.has(`${c},${r}`)).toBe(true);
      }
    }

    // 垂直帶
    for (let dc = -1; dc <= 1; dc++) {
      const c = 3 + dc;
      for (let r = 0; r < 8; r++) {
        expect(clearedSet.has(`${c},${r}`)).toBe(true);
      }
    }
  });
});

// ─── 7.2 bomb.bomb 5×5 清除 ───────────────────────────────

describe('resolveCombo — bomb.bomb', () => {
  it('5×5 大爆炸', () => {
    const board = createFilledBoard(8, 8);
    placeGem(board, 4, 4, 'R', 'area');
    placeGem(board, 5, 4, 'R', 'area');

    const result = resolveCombo(board, [4, 4], [5, 4]);
    expect(result).not.toBeNull();

    // 中點 = midpoint([4,4],[5,4]) = [4,4]
    // 5×5 以 [4,4] 為中心：col 2-6, row 2-6
    const clearedSet = new Set(posSet(result!.clearedCells));

    for (let dc = -2; dc <= 2; dc++) {
      for (let dr = -2; dr <= 2; dr++) {
        const c = 4 + dc;
        const r = 4 + dr;
        if (c >= 0 && c < 8 && r >= 0 && r < 8) {
          expect(clearedSet.has(`${c},${r}`)).toBe(true);
        }
      }
    }

    // 5×5 外的格子不受影響
    expect(getCell(board, [0, 0])!.gem).not.toBeNull();
    expect(getCell(board, [7, 7])!.gem).not.toBeNull();
  });

  it('5×5 在角落裁切', () => {
    const board = createFilledBoard(6, 6);
    placeGem(board, 0, 0, 'R', 'area');
    placeGem(board, 1, 0, 'R', 'area');

    const result = resolveCombo(board, [0, 0], [1, 0]);
    expect(result).not.toBeNull();

    // 中點 = [0,0]
    // 5×5 以 [0,0] 為中心，裁切後只有 col 0-2, row 0-2
    const clearedSet = new Set(posSet(result!.clearedCells));
    for (let c = 0; c <= 2; c++) {
      for (let r = 0; r <= 2; r++) {
        expect(clearedSet.has(`${c},${r}`)).toBe(true);
      }
    }
  });
});

// ─── 7.2 colour.line 全色轉 Line Bomb ─────────────────────

describe('resolveCombo — colour.line', () => {
  it('全盤同色寶石轉為 Line Bomb 並清除', () => {
    const board = createFilledBoard(5, 5, 'B');
    // 放一些 R 寶石
    placeGem(board, 0, 0, 'R');
    placeGem(board, 2, 2, 'R');
    placeGem(board, 4, 4, 'R');
    // colour gem 在 [1,0]，lineH 在 [0,0] 但我們需要 R 色的非 colour 寶石
    // 重新設計：colour gem 在 [1,1]，lineH 在 [2,1]（colour=B）
    placeColourGem(board, 1, 1);
    placeGem(board, 2, 1, 'R', 'lineH');

    const result = resolveCombo(board, [1, 1], [2, 1]);
    expect(result).not.toBeNull();

    // 目標色 = R（非 colour 的那顆的顏色）
    // R 寶石在 [0,0], [2,2], [4,4]
    // 這些都會被轉為 lineH 並啟動
    // 啟動後清除各自的整行

    // 組合的兩顆寶石應被清除
    expect(getCell(board, [1, 1])!.gem).toBeNull();
    expect(getCell(board, [2, 1])!.gem).toBeNull();

    // R 寶石位置應被清除
    expect(getCell(board, [0, 0])!.gem).toBeNull();
    expect(getCell(board, [2, 2])!.gem).toBeNull();
    expect(getCell(board, [4, 4])!.gem).toBeNull();

    // triggeredSpecials 應包含轉換的位置
    expect(result!.triggeredSpecials.length).toBe(3);
  });
});

// ─── 7.2 colour.bomb 全色轉 Area Bomb ─────────────────────

describe('resolveCombo — colour.bomb', () => {
  it('全盤同色寶石轉為 Area Bomb 並清除', () => {
    const board = createFilledBoard(7, 7, 'G');
    // 放一些 Y 寶石
    placeGem(board, 3, 3, 'Y');
    placeGem(board, 5, 5, 'Y');
    // colour gem 在 [0,0]，area bomb 在 [1,0]（colour=Y）
    placeColourGem(board, 0, 0);
    placeGem(board, 1, 0, 'Y', 'area');

    const result = resolveCombo(board, [0, 0], [1, 0]);
    expect(result).not.toBeNull();

    // 目標色 = Y
    // Y 寶石在 [3,3], [5,5]
    // 這些會被轉為 area bomb 並啟動（3×3 清除）

    // 組合的兩顆寶石應被清除
    expect(getCell(board, [0, 0])!.gem).toBeNull();
    expect(getCell(board, [1, 0])!.gem).toBeNull();

    // Y 寶石位置應被清除
    expect(getCell(board, [3, 3])!.gem).toBeNull();
    expect(getCell(board, [5, 5])!.gem).toBeNull();

    // 3×3 區域也應被清除
    // [3,3] 的 3×3：col 2-4, row 2-4
    expect(getCell(board, [2, 2])!.gem).toBeNull();
    expect(getCell(board, [4, 4])!.gem).toBeNull();

    // triggeredSpecials 應包含轉換的位置
    expect(result!.triggeredSpecials.length).toBe(2);
  });
});

// ─── 7.2 colour.colour 全棋盤清除 ─────────────────────────

describe('resolveCombo — colour.colour', () => {
  it('清除整個棋盤所有寶石', () => {
    const board = createFilledBoard(6, 6);
    placeColourGem(board, 2, 2);
    placeColourGem(board, 3, 2);

    const result = resolveCombo(board, [2, 2], [3, 2]);
    expect(result).not.toBeNull();

    // 所有有寶石的格子都應被清除
    expect(result!.clearedCells.length).toBe(36); // 6×6

    // 驗證所有格子的 gem 為 null
    for (let c = 0; c < 6; c++) {
      for (let r = 0; r < 6; r++) {
        expect(getCell(board, [c, r])!.gem).toBeNull();
      }
    }
  });
});

// ─── 非特殊寶石組合回傳 null ──────────────────────────────

describe('resolveCombo — null cases', () => {
  it('普通寶石 + 普通寶石回傳 null', () => {
    const board = createFilledBoard(5, 5);
    const result = resolveCombo(board, [2, 2], [3, 2]);
    expect(result).toBeNull();
  });

  it('普通寶石 + 特殊寶石回傳 null', () => {
    const board = createFilledBoard(5, 5);
    placeGem(board, 3, 2, 'R', 'lineH');
    const result = resolveCombo(board, [2, 2], [3, 2]);
    expect(result).toBeNull();
  });

  it('空格 + 特殊寶石回傳 null', () => {
    const board = createBoard(5, 5);
    placeGem(board, 3, 2, 'R', 'lineH');
    const result = resolveCombo(board, [2, 2], [3, 2]);
    expect(result).toBeNull();
  });
});

// ─── 7.5 CP-9 property test：組合對稱性 ───────────────────

describe('CP-9: 組合對稱性', () => {
  /**
   * **Validates: Requirements FR-4**
   *
   * 對任意兩顆特殊寶石 A 與 B，
   * resolveCombo(board, posA, posB) 的 clearedCells 集合
   * 與 resolveCombo(board, posB, posA) 相同。
   */
  const specialTypes: SpecialGemType[] = ['lineH', 'lineV', 'area', 'colour'];
  const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P', 'W', 'O'];

  const arbSpecialType = fc.constantFrom(...specialTypes);
  const arbColour = fc.constantFrom(...colours);

  it('resolveCombo(board, posA, posB) 的 clearedCells 與 resolveCombo(board, posB, posA) 相同', () => {
    fc.assert(
      fc.property(
        arbSpecialType,
        arbSpecialType,
        arbColour,
        arbColour,
        (typeA, typeB, colourA, colourB) => {
          // 建立兩個相同的棋盤
          const board1 = createFilledBoard(8, 8, 'R');
          const board2 = cloneBoard(board1);

          const posA: CellPos = [3, 4];
          const posB: CellPos = [4, 4];

          // 放置特殊寶石
          if (typeA === 'colour') {
            placeColourGem(board1, posA[0], posA[1]);
            placeColourGem(board2, posA[0], posA[1]);
          } else {
            placeGem(board1, posA[0], posA[1], colourA, typeA);
            placeGem(board2, posA[0], posA[1], colourA, typeA);
          }

          if (typeB === 'colour') {
            placeColourGem(board1, posB[0], posB[1]);
            placeColourGem(board2, posB[0], posB[1]);
          } else {
            placeGem(board1, posB[0], posB[1], colourB, typeB);
            placeGem(board2, posB[0], posB[1], colourB, typeB);
          }

          const result1 = resolveCombo(board1, posA, posB);
          const result2 = resolveCombo(board2, posB, posA);

          if (result1 === null) {
            expect(result2).toBeNull();
          } else {
            expect(result2).not.toBeNull();
            expect(posSet(result1!.clearedCells)).toEqual(
              posSet(result2!.clearedCells),
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
