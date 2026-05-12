import { describe, it, expect } from 'vitest';
import type { CellPos, GemColour } from '../../../types';
import type { LevelSpec } from '../../level/level-spec';
import { createBoard, createGem } from '../../rules/board';
import { detectMatches } from '../../rules/match-detect';
import { Mulberry32 } from '../../rules/rng';
import { initBoard, findValidSwaps, reshuffle } from '../reshuffle';

// ─── 輔助 ───────────────────────────────────────────────────

/** 建立最小 LevelSpec 用於測試 */
function makeSpec(overrides: Partial<LevelSpec> = {}): LevelSpec {
  return {
    id: 1,
    worldId: 1,
    name: { 'zh-TW': '測試', en: 'Test' },
    board: { width: 6, height: 6, empty: [] },
    gems: { colours: ['R', 'G', 'B'] as GemColour[] },
    constraints: { moveBudget: 15 },
    objective: { type: 'score', target: 2000 },
    stars: { one: 2000, two: 3200, three: 5000, basis: 'score' },
    ...overrides,
  };
}

// ─── initBoard 單元測試 ─────────────────────────────────────

describe('initBoard', () => {
  it('生成正確尺寸的棋盤', () => {
    const spec = makeSpec({
      board: { width: 7, height: 8, empty: [] },
    });
    const rng = new Mulberry32(42);
    const board = initBoard(spec, rng);

    expect(board.width).toBe(7);
    expect(board.height).toBe(8);
    expect(board.cells.length).toBe(7);
    expect(board.cells[0].length).toBe(8);
  });

  it('所有非空格都有寶石', () => {
    const spec = makeSpec();
    const rng = new Mulberry32(123);
    const board = initBoard(spec, rng);

    for (let col = 0; col < board.width; col++) {
      for (let row = 0; row < board.height; row++) {
        const cell = board.cells[col][row];
        if (!cell.isEmpty) {
          expect(cell.gem).not.toBeNull();
          expect(cell.gem!.colour).not.toBeNull();
        }
      }
    }
  });

  it('寶石顏色來自指定的顏色池', () => {
    const colours: GemColour[] = ['R', 'G', 'B'];
    const spec = makeSpec({ gems: { colours } });
    const rng = new Mulberry32(456);
    const board = initBoard(spec, rng);

    const colourSet = new Set(colours);
    for (let col = 0; col < board.width; col++) {
      for (let row = 0; row < board.height; row++) {
        const cell = board.cells[col][row];
        if (cell.gem) {
          expect(colourSet.has(cell.gem.colour!)).toBe(true);
        }
      }
    }
  });

  it('無預存消除', () => {
    const spec = makeSpec();
    const rng = new Mulberry32(789);
    const board = initBoard(spec, rng);

    const matches = detectMatches(board);
    expect(matches.length).toBe(0);
  });

  it('至少有 1 組有效交換', () => {
    const spec = makeSpec();
    const rng = new Mulberry32(101112);
    const board = initBoard(spec, rng);

    const swaps = findValidSwaps(board);
    expect(swaps.length).toBeGreaterThan(0);
  });

  it('正確處理 empty cells', () => {
    const empty: CellPos[] = [[0, 0], [2, 3], [5, 5]];
    const spec = makeSpec({
      board: { width: 6, height: 6, empty },
    });
    const rng = new Mulberry32(131415);
    const board = initBoard(spec, rng);

    expect(board.cells[0][0].isEmpty).toBe(true);
    expect(board.cells[0][0].gem).toBeNull();
    expect(board.cells[2][3].isEmpty).toBe(true);
    expect(board.cells[2][3].gem).toBeNull();
    expect(board.cells[5][5].isEmpty).toBe(true);
    expect(board.cells[5][5].gem).toBeNull();
  });

  it('正確標記 delivery cells', () => {
    const spec = makeSpec({
      board: {
        width: 7,
        height: 7,
        empty: [],
        deliveryCells: [[2, 6], [3, 6], [4, 6]],
      },
    });
    const rng = new Mulberry32(161718);
    const board = initBoard(spec, rng);

    expect(board.cells[2][6].isDelivery).toBe(true);
    expect(board.cells[3][6].isDelivery).toBe(true);
    expect(board.cells[4][6].isDelivery).toBe(true);
    // 非 delivery 的格子
    expect(board.cells[0][0].isDelivery).toBe(false);
  });

  it('正確放置 blockers', () => {
    const spec = makeSpec({
      board: { width: 8, height: 8, empty: [] },
      gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
      blockers: [
        { type: 'jelly', at: [0, 0], layers: 2 },
        { type: 'lock', at: [1, 1] },
        {
          type: 'generator',
          at: [3, 3],
          generatorSpec: { spawnKind: 'jelly', everyNMoves: 4 },
        },
        {
          type: 'unstable',
          at: [5, 5],
          unstableSpec: { countdown: 8 },
        },
      ],
    });
    const rng = new Mulberry32(192021);
    const board = initBoard(spec, rng);

    // Jelly
    const jellyCell = board.cells[0][0];
    expect(jellyCell.blocker).toEqual({ kind: 'jelly', layers: 2 });

    // Lock
    const lockCell = board.cells[1][1];
    expect(lockCell.blocker).toEqual({ kind: 'lock' });

    // Generator
    const genCell = board.cells[3][3];
    expect(genCell.blocker).toEqual({
      kind: 'generator',
      spawnKind: 'jelly',
      everyNMoves: 4,
      movesSinceLastSpawn: 0,
    });

    // Unstable
    const unstableCell = board.cells[5][5];
    expect(unstableCell.blocker).toEqual({
      kind: 'unstable',
      countdown: 8,
    });
  });

  it('使用不同種子產生不同棋盤', () => {
    const spec = makeSpec();
    const board1 = initBoard(spec, new Mulberry32(1));
    const board2 = initBoard(spec, new Mulberry32(999));

    // 收集所有寶石顏色
    const colours1: string[] = [];
    const colours2: string[] = [];
    for (let col = 0; col < spec.board.width; col++) {
      for (let row = 0; row < spec.board.height; row++) {
        colours1.push(board1.cells[col][row].gem?.colour ?? '');
        colours2.push(board2.cells[col][row].gem?.colour ?? '');
      }
    }

    // 不同種子應產生不同棋盤（極小機率相同，但實際上不會）
    expect(colours1.join('')).not.toBe(colours2.join(''));
  });

  it('使用相同種子產生相同棋盤（確定性）', () => {
    const spec = makeSpec();
    const board1 = initBoard(spec, new Mulberry32(42));
    const board2 = initBoard(spec, new Mulberry32(42));

    for (let col = 0; col < spec.board.width; col++) {
      for (let row = 0; row < spec.board.height; row++) {
        expect(board1.cells[col][row].gem?.colour).toBe(
          board2.cells[col][row].gem?.colour,
        );
      }
    }
  });

  it('多種顏色池（4-7 色）都能正確生成', () => {
    const colourSets: GemColour[][] = [
      ['R', 'G', 'B', 'Y'],
      ['R', 'G', 'B', 'Y', 'P'],
      ['R', 'G', 'B', 'Y', 'P', 'W'],
      ['R', 'G', 'B', 'Y', 'P', 'W', 'O'],
    ];

    for (const colours of colourSets) {
      const spec = makeSpec({
        board: { width: 8, height: 8, empty: [] },
        gems: { colours },
      });
      const rng = new Mulberry32(42);
      const board = initBoard(spec, rng);

      // 無預存消除
      expect(detectMatches(board).length).toBe(0);
      // 至少 1 組有效交換
      expect(findValidSwaps(board).length).toBeGreaterThan(0);
    }
  });

  it('帶權重的顏色生成', () => {
    const spec = makeSpec({
      board: { width: 8, height: 8, empty: [] },
      gems: {
        colours: ['R', 'G', 'B', 'Y'],
        weights: { R: 3.0, G: 1.0, B: 1.0, Y: 1.0 },
      },
    });
    const rng = new Mulberry32(42);
    const board = initBoard(spec, rng);

    // 統計顏色分佈
    const counts: Record<string, number> = { R: 0, G: 0, B: 0, Y: 0 };
    for (let col = 0; col < board.width; col++) {
      for (let row = 0; row < board.height; row++) {
        const c = board.cells[col][row].gem?.colour;
        if (c) counts[c]++;
      }
    }

    // R 應該明顯多於其他顏色（權重 3x）
    // 由於 re-roll 機制，不能保證精確比例，但 R 應該是最多的
    expect(counts['R']).toBeGreaterThan(counts['G']);
  });
});

// ─── findValidSwaps 單元測試 ────────────────────────────────

describe('findValidSwaps', () => {
  it('空棋盤無有效交換', () => {
    const board = createBoard(6, 6);
    const swaps = findValidSwaps(board);
    expect(swaps.length).toBe(0);
  });

  it('偵測到水平 3 連的有效交換', () => {
    // 手動建立一個有明確有效交換的棋盤
    const board = createBoard(4, 4);

    // 設定：
    // Row 0: R G R B
    // Row 1: G R R B
    // Row 2: B B G G
    // Row 3: G R B R
    const layout: GemColour[][] = [
      ['R', 'G', 'B', 'G'], // col 0
      ['G', 'R', 'B', 'R'], // col 1
      ['R', 'R', 'G', 'B'], // col 2
      ['B', 'B', 'G', 'R'], // col 3
    ];

    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        board.cells[col][row].gem = createGem(layout[col][row]);
      }
    }

    const swaps = findValidSwaps(board);
    // 應該找到至少一組有效交換
    // 交換 (1,1)R 和 (2,1)R 不會產生消除（同色）
    // 但交換 (0,1)G 和 (1,1)R 可能產生 R-R-R 在 row 1
    expect(swaps.length).toBeGreaterThan(0);
  });

  it('locked 寶石不參與交換', () => {
    const board = createBoard(4, 1);
    // R(locked) R G R
    board.cells[0][0].gem = createGem('R');
    board.cells[0][0].gem!.locked = true;
    board.cells[1][0].gem = createGem('R');
    board.cells[2][0].gem = createGem('G');
    board.cells[3][0].gem = createGem('R');

    const swaps = findValidSwaps(board);
    // locked 的 (0,0) 不應出現在任何交換中
    for (const [from, to] of swaps) {
      expect(from[0] === 0 && from[1] === 0).toBe(false);
      expect(to[0] === 0 && to[1] === 0).toBe(false);
    }
  });
});

// ─── reshuffle 單元測試 ─────────────────────────────────────

describe('reshuffle', () => {
  it('重洗後無預存消除', () => {
    const spec = makeSpec({
      board: { width: 8, height: 8, empty: [] },
      gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
    });
    const rng = new Mulberry32(42);
    const board = initBoard(spec, rng);

    // 重洗
    reshuffle(board, new Mulberry32(999), ['R', 'G', 'B', 'Y', 'P']);

    const matches = detectMatches(board);
    expect(matches.length).toBe(0);
  });

  it('重洗後至少有 1 組有效交換', () => {
    const spec = makeSpec({
      board: { width: 8, height: 8, empty: [] },
      gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
    });
    const rng = new Mulberry32(42);
    const board = initBoard(spec, rng);

    reshuffle(board, new Mulberry32(999), ['R', 'G', 'B', 'Y', 'P']);

    const swaps = findValidSwaps(board);
    expect(swaps.length).toBeGreaterThan(0);
  });

  it('重洗保留特殊寶石', () => {
    const spec = makeSpec({
      board: { width: 8, height: 8, empty: [] },
      gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
    });
    const rng = new Mulberry32(42);
    const board = initBoard(spec, rng);

    // 手動放置一顆特殊寶石
    board.cells[3][3].gem = createGem('R', 'lineH');

    reshuffle(board, new Mulberry32(999), ['R', 'G', 'B', 'Y', 'P']);

    // 特殊寶石應保留在原位
    expect(board.cells[3][3].gem!.special).toBe('lineH');
    expect(board.cells[3][3].gem!.colour).toBe('R');
  });

  it('重洗保留 blocker', () => {
    const spec = makeSpec({
      board: { width: 8, height: 8, empty: [] },
      gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
      blockers: [{ type: 'jelly', at: [2, 2], layers: 2 }],
    });
    const rng = new Mulberry32(42);
    const board = initBoard(spec, rng);

    reshuffle(board, new Mulberry32(999), ['R', 'G', 'B', 'Y', 'P']);

    // Blocker 應保留
    expect(board.cells[2][2].blocker).toEqual({ kind: 'jelly', layers: 2 });
  });
});
