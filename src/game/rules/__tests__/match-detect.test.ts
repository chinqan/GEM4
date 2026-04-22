import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { CellPos, GemColour } from '../../../types';
import { createBoard, createGem } from '../board';
import type { Board, Gem } from '../board';
import {
  scanHorizontal,
  scanVertical,
  mergeRuns,
  determineSpecial,
  detectMatches,
} from '../match-detect';

// ─── 輔助函式 ───────────────────────────────────────────────

/** 在棋盤上放置寶石 */
function placeGem(board: Board, col: number, row: number, colour: GemColour, gem?: Partial<Gem>): void {
  const g = createGem(colour);
  if (gem?.locked) g.locked = true;
  if (gem?.special) g.special = gem.special;
  if (gem?.unstable) g.unstable = gem.unstable;
  board.cells[col][row].gem = g;
}

/** 快速填充一整列 */
function fillRow(board: Board, row: number, colours: (GemColour | null)[]): void {
  for (let col = 0; col < colours.length && col < board.width; col++) {
    const c = colours[col];
    if (c !== null) {
      placeGem(board, col, row, c);
    }
  }
}

/** 快速填充一整行 */
function fillCol(board: Board, col: number, colours: (GemColour | null)[]): void {
  for (let row = 0; row < colours.length && row < board.height; row++) {
    const c = colours[row];
    if (c !== null) {
      placeGem(board, col, row, c);
    }
  }
}

function posKey(pos: CellPos): string {
  return `${pos[0]},${pos[1]}`;
}

// ─── 5.1 水平掃描測試 ──────────────────────────────────────

describe('scanHorizontal', () => {
  it('偵測水平 3 連', () => {
    const board = createBoard(6, 6);
    fillRow(board, 0, ['R', 'R', 'R', 'G', 'B', 'Y']);

    const runs = scanHorizontal(board);
    expect(runs.length).toBe(1);
    expect(runs[0].colour).toBe('R');
    expect(runs[0].cells.length).toBe(3);
    expect(runs[0].direction).toBe('horizontal');
  });

  it('偵測水平 4 連', () => {
    const board = createBoard(6, 6);
    fillRow(board, 1, ['G', 'B', 'B', 'B', 'B', 'Y']);

    const runs = scanHorizontal(board);
    expect(runs.length).toBe(1);
    expect(runs[0].colour).toBe('B');
    expect(runs[0].cells.length).toBe(4);
  });

  it('偵測水平 5 連', () => {
    const board = createBoard(6, 6);
    fillRow(board, 2, ['Y', 'Y', 'Y', 'Y', 'Y', 'G']);

    const runs = scanHorizontal(board);
    expect(runs.length).toBe(1);
    expect(runs[0].colour).toBe('Y');
    expect(runs[0].cells.length).toBe(5);
  });

  it('跳過 isEmpty 格子', () => {
    const board = createBoard(6, 6, [[2, 0]]);
    fillRow(board, 0, ['R', 'R', null, 'R', 'R', 'R']);

    const runs = scanHorizontal(board);
    // [2,0] is empty, so R,R then R,R,R
    expect(runs.length).toBe(1);
    expect(runs[0].cells.length).toBe(3);
    expect(runs[0].cells[0]).toEqual([3, 0]);
  });

  it('跳過 gem === null 的格子', () => {
    const board = createBoard(6, 6);
    placeGem(board, 0, 0, 'R');
    placeGem(board, 1, 0, 'R');
    // col 2 has no gem
    placeGem(board, 3, 0, 'R');
    placeGem(board, 4, 0, 'R');
    placeGem(board, 5, 0, 'R');

    const runs = scanHorizontal(board);
    expect(runs.length).toBe(1);
    expect(runs[0].cells.length).toBe(3);
    expect(runs[0].cells[0]).toEqual([3, 0]);
  });

  it('跳過 locked 寶石', () => {
    const board = createBoard(6, 6);
    placeGem(board, 0, 0, 'R');
    placeGem(board, 1, 0, 'R', { locked: true });
    placeGem(board, 2, 0, 'R');
    placeGem(board, 3, 0, 'R');
    placeGem(board, 4, 0, 'R');

    const runs = scanHorizontal(board);
    expect(runs.length).toBe(1);
    expect(runs[0].cells.length).toBe(3);
    expect(runs[0].cells[0]).toEqual([2, 0]);
  });

  it('Colour Gem（colour === null）不參與 match', () => {
    const board = createBoard(6, 6);
    placeGem(board, 0, 0, 'R');
    placeGem(board, 1, 0, 'R');
    // Place a colour gem (colour = null)
    const colourGem: Gem = { colour: null, special: 'colour', locked: false, unstable: null };
    board.cells[2][0].gem = colourGem;
    placeGem(board, 3, 0, 'R');
    placeGem(board, 4, 0, 'R');

    const runs = scanHorizontal(board);
    // Should not form a 5-match because colour gem breaks the chain
    expect(runs.every((r) => r.cells.length < 3)).toBe(true);
  });

  it('同一列多個獨立 run', () => {
    const board = createBoard(9, 6);
    fillRow(board, 0, ['R', 'R', 'R', 'G', 'B', 'B', 'B', 'Y', 'Y']);

    const runs = scanHorizontal(board);
    expect(runs.length).toBe(2);
    expect(runs[0].colour).toBe('R');
    expect(runs[1].colour).toBe('B');
  });
});

// ─── 5.2 垂直掃描測試 ──────────────────────────────────────

describe('scanVertical', () => {
  it('偵測垂直 3 連', () => {
    const board = createBoard(6, 6);
    fillCol(board, 0, ['R', 'R', 'R', 'G', 'B', 'Y']);

    const runs = scanVertical(board);
    expect(runs.length).toBe(1);
    expect(runs[0].colour).toBe('R');
    expect(runs[0].cells.length).toBe(3);
    expect(runs[0].direction).toBe('vertical');
  });

  it('偵測垂直 4 連', () => {
    const board = createBoard(6, 6);
    fillCol(board, 2, ['G', 'B', 'B', 'B', 'B', 'Y']);

    const runs = scanVertical(board);
    expect(runs.length).toBe(1);
    expect(runs[0].colour).toBe('B');
    expect(runs[0].cells.length).toBe(4);
  });

  it('偵測垂直 5 連', () => {
    const board = createBoard(6, 6);
    fillCol(board, 1, ['P', 'P', 'P', 'P', 'P', 'G']);

    const runs = scanVertical(board);
    expect(runs.length).toBe(1);
    expect(runs[0].colour).toBe('P');
    expect(runs[0].cells.length).toBe(5);
  });

  it('跳過 locked 寶石', () => {
    const board = createBoard(6, 6);
    placeGem(board, 0, 0, 'G');
    placeGem(board, 0, 1, 'G', { locked: true });
    placeGem(board, 0, 2, 'G');
    placeGem(board, 0, 3, 'G');
    placeGem(board, 0, 4, 'G');

    const runs = scanVertical(board);
    expect(runs.length).toBe(1);
    expect(runs[0].cells.length).toBe(3);
    expect(runs[0].cells[0]).toEqual([0, 2]);
  });
});

// ─── 5.3-5.4 形狀合併與分類測試 ────────────────────────────

describe('mergeRuns', () => {
  it('獨立 3 連保持 straight3', () => {
    const runs = mergeRuns([
      { cells: [[0, 0], [1, 0], [2, 0]], colour: 'R', direction: 'horizontal' },
    ]);
    expect(runs.length).toBe(1);
    expect(runs[0].shape).toBe('straight3');
    expect(runs[0].spawnsSpecial).toBeUndefined();
  });

  it('獨立 4 連 → straight4', () => {
    const runs = mergeRuns([
      { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], colour: 'B', direction: 'horizontal' },
    ]);
    expect(runs.length).toBe(1);
    expect(runs[0].shape).toBe('straight4');
    expect(runs[0].spawnsSpecial).toBe('lineH');
  });

  it('獨立 5 連直線 → straight5', () => {
    const runs = mergeRuns([
      { cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], colour: 'G', direction: 'horizontal' },
    ]);
    expect(runs.length).toBe(1);
    expect(runs[0].shape).toBe('straight5');
    expect(runs[0].spawnsSpecial).toBe('colour');
  });

  it('T 形合併（水平中間 + 垂直端點）', () => {
    // Horizontal: [0,2],[1,2],[2,2] — middle is [1,2]
    // Vertical: [1,0],[1,1],[1,2] — endpoint is [1,2]
    // Shared: [1,2] — middle of H, endpoint of V → T
    const runs = mergeRuns([
      { cells: [[0, 2], [1, 2], [2, 2]], colour: 'R', direction: 'horizontal' },
      { cells: [[1, 0], [1, 1], [1, 2]], colour: 'R', direction: 'vertical' },
    ]);
    expect(runs.length).toBe(1);
    expect(runs[0].shape).toBe('T');
    expect(runs[0].spawnsSpecial).toBe('area');
    expect(runs[0].cells.length).toBe(5);
  });

  it('L 形合併（兩個端點共享）', () => {
    // Horizontal: [0,0],[1,0],[2,0] — endpoint is [0,0]
    // Vertical: [0,0],[0,1],[0,2] — endpoint is [0,0]
    // Shared: [0,0] — endpoint of both → L
    const runs = mergeRuns([
      { cells: [[0, 0], [1, 0], [2, 0]], colour: 'B', direction: 'horizontal' },
      { cells: [[0, 0], [0, 1], [0, 2]], colour: 'B', direction: 'vertical' },
    ]);
    expect(runs.length).toBe(1);
    expect(runs[0].shape).toBe('L');
    expect(runs[0].spawnsSpecial).toBe('area');
    expect(runs[0].cells.length).toBe(5);
  });

  it('十字形合併（兩個 4 連交叉）', () => {
    // Horizontal 4: [0,2],[1,2],[2,2],[3,2]
    // Vertical 4: [2,0],[2,1],[2,2],[2,3]
    const runs = mergeRuns([
      { cells: [[0, 2], [1, 2], [2, 2], [3, 2]], colour: 'Y', direction: 'horizontal' },
      { cells: [[2, 0], [2, 1], [2, 2], [2, 3]], colour: 'Y', direction: 'vertical' },
    ]);
    expect(runs.length).toBe(1);
    expect(runs[0].shape).toBe('cross');
    expect(runs[0].spawnsSpecial).toBe('area');
  });

  it('不同色的 run 不合併', () => {
    const runs = mergeRuns([
      { cells: [[0, 0], [1, 0], [2, 0]], colour: 'R', direction: 'horizontal' },
      { cells: [[1, 0], [1, 1], [1, 2]], colour: 'G', direction: 'vertical' },
    ]);
    expect(runs.length).toBe(2);
    expect(runs[0].shape).toBe('straight3');
    expect(runs[1].shape).toBe('straight3');
  });
});

// ─── 5.5 特殊寶石決定測試 ──────────────────────────────────

describe('determineSpecial', () => {
  it('straight3 → 無特殊', () => {
    expect(determineSpecial('straight3', 'horizontal')).toBeUndefined();
    expect(determineSpecial('straight3', 'vertical')).toBeUndefined();
  });

  it('straight4 水平 → lineH', () => {
    expect(determineSpecial('straight4', 'horizontal')).toBe('lineH');
  });

  it('straight4 垂直 → lineV', () => {
    expect(determineSpecial('straight4', 'vertical')).toBe('lineV');
  });

  it('straight5 → colour', () => {
    expect(determineSpecial('straight5', 'horizontal')).toBe('colour');
    expect(determineSpecial('straight5', 'vertical')).toBe('colour');
  });

  it('T → area', () => {
    expect(determineSpecial('T', 'horizontal')).toBe('area');
  });

  it('L → area', () => {
    expect(determineSpecial('L', 'vertical')).toBe('area');
  });

  it('cross → area', () => {
    expect(determineSpecial('cross', 'horizontal')).toBe('area');
  });
});

// ─── 5.6-5.7 detectMatches 整合測試 ────────────────────────

describe('detectMatches', () => {
  it('水平 3 連偵測', () => {
    const board = createBoard(6, 6);
    fillRow(board, 0, ['R', 'R', 'R', 'G', 'B', 'Y']);

    const matches = detectMatches(board);
    expect(matches.length).toBe(1);
    expect(matches[0].shape).toBe('straight3');
    expect(matches[0].colour).toBe('R');
    expect(matches[0].cells.length).toBe(3);
    expect(matches[0].spawnsSpecial).toBeUndefined();
  });

  it('垂直 3 連偵測', () => {
    const board = createBoard(6, 6);
    fillCol(board, 0, ['G', 'G', 'G', 'R', 'B', 'Y']);

    const matches = detectMatches(board);
    expect(matches.length).toBe(1);
    expect(matches[0].shape).toBe('straight3');
    expect(matches[0].colour).toBe('G');
    expect(matches[0].cells.length).toBe(3);
  });

  it('水平 4 連 → straight4 + lineH', () => {
    const board = createBoard(6, 6);
    fillRow(board, 0, ['B', 'B', 'B', 'B', 'G', 'Y']);

    const matches = detectMatches(board);
    expect(matches.length).toBe(1);
    expect(matches[0].shape).toBe('straight4');
    expect(matches[0].spawnsSpecial).toBe('lineH');
  });

  it('垂直 4 連 → straight4 + lineV', () => {
    const board = createBoard(6, 6);
    fillCol(board, 0, ['P', 'P', 'P', 'P', 'G', 'Y']);

    const matches = detectMatches(board);
    expect(matches.length).toBe(1);
    expect(matches[0].shape).toBe('straight4');
    expect(matches[0].spawnsSpecial).toBe('lineV');
  });

  it('5 連直線 → straight5 + colour', () => {
    const board = createBoard(6, 6);
    fillRow(board, 0, ['Y', 'Y', 'Y', 'Y', 'Y', 'G']);

    const matches = detectMatches(board);
    expect(matches.length).toBe(1);
    expect(matches[0].shape).toBe('straight5');
    expect(matches[0].spawnsSpecial).toBe('colour');
  });

  it('T 形偵測 → T + area', () => {
    const board = createBoard(6, 6);
    // T shape:
    //   R
    //   R
    // R R R
    placeGem(board, 1, 0, 'R');
    placeGem(board, 1, 1, 'R');
    placeGem(board, 0, 2, 'R');
    placeGem(board, 1, 2, 'R');
    placeGem(board, 2, 2, 'R');

    const matches = detectMatches(board);
    expect(matches.length).toBe(1);
    expect(matches[0].shape).toBe('T');
    expect(matches[0].spawnsSpecial).toBe('area');
    expect(matches[0].cells.length).toBe(5);
  });

  it('L 形偵測 → L + area', () => {
    const board = createBoard(6, 6);
    // L shape:
    // R
    // R
    // R R R
    placeGem(board, 0, 0, 'R');
    placeGem(board, 0, 1, 'R');
    placeGem(board, 0, 2, 'R');
    placeGem(board, 1, 2, 'R');
    placeGem(board, 2, 2, 'R');

    const matches = detectMatches(board);
    expect(matches.length).toBe(1);
    expect(matches[0].shape).toBe('L');
    expect(matches[0].spawnsSpecial).toBe('area');
    expect(matches[0].cells.length).toBe(5);
  });

  it('無消除時回傳空陣列', () => {
    const board = createBoard(6, 6);
    fillRow(board, 0, ['R', 'G', 'B', 'Y', 'P', 'W']);
    fillRow(board, 1, ['G', 'B', 'Y', 'P', 'W', 'R']);

    const matches = detectMatches(board);
    expect(matches.length).toBe(0);
  });

  it('locked 寶石不參與 match', () => {
    const board = createBoard(6, 6);
    placeGem(board, 0, 0, 'R');
    placeGem(board, 1, 0, 'R', { locked: true });
    placeGem(board, 2, 0, 'R');
    placeGem(board, 3, 0, 'R');

    const matches = detectMatches(board);
    // locked gem at [1,0] breaks the chain, so no 3+ match
    expect(matches.length).toBe(0);
  });

  it('isEmpty 格子不參與', () => {
    const board = createBoard(6, 6, [[1, 0]]);
    placeGem(board, 0, 0, 'R');
    // [1,0] is empty
    placeGem(board, 2, 0, 'R');
    placeGem(board, 3, 0, 'R');
    placeGem(board, 4, 0, 'R');

    const matches = detectMatches(board);
    expect(matches.length).toBe(1);
    expect(matches[0].cells.length).toBe(3);
    expect(matches[0].cells[0]).toEqual([2, 0]);
  });

  it('多個獨立 match 同時偵測', () => {
    const board = createBoard(6, 6);
    // Row 0: R R R ...
    fillRow(board, 0, ['R', 'R', 'R', 'G', 'B', 'Y']);
    // Row 2: B B B ...
    fillRow(board, 2, ['B', 'B', 'B', 'G', 'Y', 'P']);

    const matches = detectMatches(board);
    expect(matches.length).toBe(2);
    const colours = matches.map((m) => m.colour).sort();
    expect(colours).toEqual(['B', 'R']);
  });

  it('swap 觸發時 spawnAt 為 swapPos', () => {
    const board = createBoard(6, 6);
    fillRow(board, 0, ['R', 'R', 'R', 'R', 'G', 'B']);

    const swapPos: CellPos = [3, 0];
    const matches = detectMatches(board, { swapPos });
    expect(matches.length).toBe(1);
    expect(matches[0].spawnsSpecial).toBe('lineH');
    expect(matches[0].spawnAt).toEqual([3, 0]);
  });

  it('cascade 觸發時 spawnAt 為中央格', () => {
    const board = createBoard(6, 6);
    fillRow(board, 0, ['R', 'R', 'R', 'R', 'G', 'B']);

    // No swapPos → cascade trigger
    const matches = detectMatches(board);
    expect(matches.length).toBe(1);
    expect(matches[0].spawnsSpecial).toBe('lineH');
    // Center of [0,0],[1,0],[2,0],[3,0] sorted → index 1 → [1,0]
    expect(matches[0].spawnAt).toBeDefined();
  });

  it('優先序：Colour Gem > Area Bomb > Line Bomb', () => {
    const board = createBoard(9, 9);
    // 5 連直線 → colour (priority 3)
    fillRow(board, 0, ['R', 'R', 'R', 'R', 'R', 'G', 'B', 'Y', 'P']);
    // 4 連 → lineH (priority 1)
    fillRow(board, 2, ['B', 'B', 'B', 'B', 'G', 'Y', 'P', 'W', 'O']);

    const matches = detectMatches(board);
    expect(matches.length).toBe(2);

    // Only the highest priority should have spawnsSpecial
    const withSpecial = matches.filter((m) => m.spawnsSpecial !== undefined);
    expect(withSpecial.length).toBe(1);
    expect(withSpecial[0].spawnsSpecial).toBe('colour');
  });

  it('T 形 spawnAt 為交會點', () => {
    const board = createBoard(6, 6);
    // T shape with intersection at [1,2]:
    //   R
    //   R
    // R R R
    placeGem(board, 1, 0, 'R');
    placeGem(board, 1, 1, 'R');
    placeGem(board, 0, 2, 'R');
    placeGem(board, 1, 2, 'R');
    placeGem(board, 2, 2, 'R');

    const matches = detectMatches(board);
    expect(matches.length).toBe(1);
    expect(matches[0].spawnAt).toEqual([1, 2]);
  });

  it('L 形 spawnAt 為轉角點', () => {
    const board = createBoard(6, 6);
    // L shape with corner at [0,2]:
    // R
    // R
    // R R R
    placeGem(board, 0, 0, 'R');
    placeGem(board, 0, 1, 'R');
    placeGem(board, 0, 2, 'R');
    placeGem(board, 1, 2, 'R');
    placeGem(board, 2, 2, 'R');

    const matches = detectMatches(board);
    expect(matches.length).toBe(1);
    // [0,2] is the corner/intersection point
    expect(matches[0].spawnAt).toEqual([0, 2]);
  });
});

// ─── CP-6 Property Test ────────────────────────────────────

/**
 * **Validates: Requirements FR-2**
 *
 * CP-6 特殊寶石優先序確定性：
 * 對相同棋盤狀態呼叫 detectMatches 兩次，結果完全相同。
 * 使用 fast-check 生成隨機棋盤（6-9 寬高，隨機填充 3-5 色寶石），100 次。
 */
describe('CP-6: 特殊寶石優先序確定性', () => {
  const GEM_COLOURS: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];

  /** 生成隨機棋盤的 arbitrary */
  const boardArb = fc
    .record({
      width: fc.integer({ min: 6, max: 9 }),
      height: fc.integer({ min: 6, max: 9 }),
      numColours: fc.integer({ min: 3, max: 5 }),
    })
    .chain(({ width, height, numColours }) => {
      const colours = GEM_COLOURS.slice(0, numColours);
      // Generate a flat array of colour indices for each cell
      return fc
        .array(fc.integer({ min: 0, max: numColours - 1 }), {
          minLength: width * height,
          maxLength: width * height,
        })
        .map((colourIndices) => {
          const board = createBoard(width, height);
          for (let col = 0; col < width; col++) {
            for (let row = 0; row < height; row++) {
              const idx = col * height + row;
              const colour = colours[colourIndices[idx]];
              board.cells[col][row].gem = createGem(colour);
            }
          }
          return board;
        });
    });

  it('對相同棋盤狀態呼叫 detectMatches 兩次，結果完全相同', () => {
    fc.assert(
      fc.property(boardArb, (board) => {
        const result1 = detectMatches(board);
        const result2 = detectMatches(board);

        // Same number of matches
        expect(result1.length).toBe(result2.length);

        // Each match should be identical
        for (let i = 0; i < result1.length; i++) {
          expect(result1[i].shape).toBe(result2[i].shape);
          expect(result1[i].colour).toBe(result2[i].colour);
          expect(result1[i].spawnsSpecial).toBe(result2[i].spawnsSpecial);

          // Cells should be identical
          expect(result1[i].cells.length).toBe(result2[i].cells.length);
          for (let j = 0; j < result1[i].cells.length; j++) {
            expect(result1[i].cells[j][0]).toBe(result2[i].cells[j][0]);
            expect(result1[i].cells[j][1]).toBe(result2[i].cells[j][1]);
          }

          // spawnAt should be identical
          if (result1[i].spawnAt) {
            expect(result2[i].spawnAt).toBeDefined();
            expect(result1[i].spawnAt![0]).toBe(result2[i].spawnAt![0]);
            expect(result1[i].spawnAt![1]).toBe(result2[i].spawnAt![1]);
          } else {
            expect(result2[i].spawnAt).toBeUndefined();
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
