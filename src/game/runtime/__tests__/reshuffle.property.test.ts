import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { CellPos, GemColour } from '../../../types';
import type { LevelSpec } from '../../level/level-spec';
import { createGem, getCell } from '../../rules/board';
import { detectMatches } from '../../rules/match-detect';
import { Mulberry32 } from '../../rules/rng';
import { initBoard, findValidSwaps, reshuffle } from '../reshuffle';

// ─── 輔助 ───────────────────────────────────────────────────

const ALL_COLOURS: GemColour[] = ['R', 'G', 'B', 'Y', 'P', 'W', 'O'];

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

/**
 * Arbitrary for a valid LevelSpec with random dimensions, colours, and empty cells.
 * Width/height: 3–9, colours: 3–7, empty cells: random subset.
 */
function arbLevelSpec(): fc.Arbitrary<LevelSpec> {
  return fc
    .record({
      width: fc.integer({ min: 3, max: 9 }),
      height: fc.integer({ min: 3, max: 9 }),
      numColours: fc.integer({ min: 3, max: 7 }),
      seed: fc.integer({ min: 1, max: 2 ** 31 - 1 }),
      emptyFraction: fc.double({ min: 0, max: 0.3, noNaN: true }),
    })
    .chain(({ width, height, numColours, seed, emptyFraction }) => {
      const colours = ALL_COLOURS.slice(0, numColours);
      const totalCells = width * height;
      const maxEmpty = Math.floor(totalCells * emptyFraction);

      return fc
        .uniqueArray(
          fc.tuple(
            fc.integer({ min: 0, max: width - 1 }),
            fc.integer({ min: 0, max: height - 1 }),
          ),
          {
            minLength: 0,
            maxLength: maxEmpty,
            comparator: (a, b) => a[0] === b[0] && a[1] === b[1],
          },
        )
        .map((empty) => {
          const spec = makeSpec({
            board: {
              width,
              height,
              empty: empty as CellPos[],
            },
            gems: { colours },
          });
          return { spec, seed };
        });
    })
    .map(({ spec, seed }) => ({ ...spec, _seed: seed }) as LevelSpec & { _seed: number });
}

/**
 * Validates all board invariants expected after initBoard or reshuffle:
 * - Correct dimensions
 * - All non-empty cells have a gem with a valid colour from the pool
 * - Empty cells from spec are correctly marked and have no gem
 * - No pre-existing matches
 * - At least 1 valid swap exists
 */
function assertBoardValid(
  board: ReturnType<typeof initBoard>,
  spec: LevelSpec,
  label: string,
): void {
  // Correct dimensions
  expect(board.width, `${label}: width`).toBe(spec.board.width);
  expect(board.height, `${label}: height`).toBe(spec.board.height);
  expect(board.cells.length, `${label}: cells columns`).toBe(spec.board.width);

  const emptySet = new Set(
    spec.board.empty.map(([c, r]) => `${c},${r}`),
  );
  const colourSet = new Set(spec.gems.colours);

  for (let col = 0; col < board.width; col++) {
    expect(board.cells[col].length, `${label}: col ${col} rows`).toBe(board.height);
    for (let row = 0; row < board.height; row++) {
      const cell = board.cells[col][row];
      const key = `${col},${row}`;

      if (emptySet.has(key)) {
        expect(cell.isEmpty, `${label}: (${col},${row}) isEmpty`).toBe(true);
        expect(cell.gem, `${label}: (${col},${row}) gem should be null`).toBeNull();
      } else {
        expect(cell.gem, `${label}: (${col},${row}) gem should exist`).not.toBeNull();
        if (cell.gem && cell.gem.special === null) {
          // Normal gems must have a valid colour from the pool
          expect(
            colourSet.has(cell.gem.colour!),
            `${label}: (${col},${row}) colour ${cell.gem.colour} in pool`,
          ).toBe(true);
        }
      }
    }
  }

  // No pre-existing matches
  const matches = detectMatches(board);
  expect(matches.length, `${label}: no pre-existing matches`).toBe(0);

  // At least 1 valid swap
  const swaps = findValidSwaps(board);
  expect(swaps.length, `${label}: at least 1 valid swap`).toBeGreaterThan(0);
}

// ─── CP-1: Board Validity Invariant after initBoard ─────────

/**
 * **Validates: Requirements FR-1, FR-8, CP-1**
 *
 * CP-1 棋盤有效性不變式（initBoard 整合版）：
 * 對任意有效 LevelSpec（隨機 width 3-9、height 3-9、顏色 3-7、隨機空格），
 * initBoard(spec, rng) 產生的棋盤必須滿足：
 * - board.width === spec.board.width
 * - board.height === spec.board.height
 * - 所有非空格都有寶石，且顏色來自 spec 的顏色池
 * - 無預存消除（detectMatches 回傳空）
 * - 至少 1 組有效交換
 * - spec 中的空格正確標記為 isEmpty
 */
describe('CP-1: Board Validity Invariant after initBoard', () => {
  it('initBoard produces a valid board for any valid LevelSpec', () => {
    fc.assert(
      fc.property(
        arbLevelSpec(),
        (specWithSeed) => {
          const seed = (specWithSeed as LevelSpec & { _seed: number })._seed;
          const rng = new Mulberry32(seed);
          const board = initBoard(specWithSeed, rng);
          assertBoardValid(board, specWithSeed, 'initBoard');
        },
      ),
      { numRuns: 50 },
    );
  });

  it('delivery cells from spec are correctly marked after initBoard', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 9 }),
        fc.integer({ min: 5, max: 9 }),
        fc.integer({ min: 1, max: 2 ** 31 - 1 }),
        (width, height, seed) => {
          // Place delivery cells along the bottom row
          const deliveryCells: CellPos[] = [];
          const numDelivery = Math.min(3, width);
          for (let i = 0; i < numDelivery; i++) {
            deliveryCells.push([i, height - 1]);
          }

          const spec = makeSpec({
            board: { width, height, empty: [], deliveryCells },
            gems: { colours: ['R', 'G', 'B', 'Y'] },
          });

          const rng = new Mulberry32(seed);
          const board = initBoard(spec, rng);

          // Verify delivery cells are marked
          for (const [col, row] of deliveryCells) {
            const cell = getCell(board, [col, row]);
            expect(cell?.isDelivery, `(${col},${row}) isDelivery`).toBe(true);
          }

          // Verify non-delivery cells are not marked
          expect(board.cells[width - 1][0].isDelivery).toBe(false);
        },
      ),
      { numRuns: 30 },
    );
  });
});

// ─── CP-1: Board Validity Invariant after reshuffle ─────────

/**
 * **Validates: Requirements FR-8, CP-1**
 *
 * CP-1 棋盤有效性不變式（reshuffle 整合版）：
 * 對任意由 initBoard 產生的棋盤，reshuffle 後必須滿足：
 * - 相同的有效性不變式（正確尺寸、有效顏色、無消除、有有效交換）
 * - 特殊寶石保留在原位
 * - Blocker 保留在原位
 */
describe('CP-1: Board Validity Invariant after reshuffle', () => {
  it('reshuffle preserves board validity invariants', () => {
    fc.assert(
      fc.property(
        arbLevelSpec(),
        fc.integer({ min: 1, max: 2 ** 31 - 1 }),
        (specWithSeed, reshuffleSeed) => {
          const seed = (specWithSeed as LevelSpec & { _seed: number })._seed;
          const rng = new Mulberry32(seed);
          const board = initBoard(specWithSeed, rng);

          // Reshuffle
          const reshuffleRng = new Mulberry32(reshuffleSeed);
          reshuffle(board, reshuffleRng, specWithSeed.gems.colours);

          // Verify board validity after reshuffle
          assertBoardValid(board, specWithSeed, 'reshuffle');
        },
      ),
      { numRuns: 50 },
    );
  });

  it('reshuffle preserves special gems', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 9 }),
        fc.integer({ min: 5, max: 9 }),
        fc.integer({ min: 1, max: 2 ** 31 - 1 }),
        fc.integer({ min: 1, max: 2 ** 31 - 1 }),
        fc.constantFrom('lineH' as const, 'lineV' as const, 'area' as const, 'colour' as const),
        (width, height, initSeed, reshuffleSeed, specialType) => {
          const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
          const spec = makeSpec({
            board: { width, height, empty: [] },
            gems: { colours },
          });

          const board = initBoard(spec, new Mulberry32(initSeed));

          // Place a special gem at the center
          const cx = Math.floor(width / 2);
          const cy = Math.floor(height / 2);
          board.cells[cx][cy].gem = createGem('R', specialType);

          reshuffle(board, new Mulberry32(reshuffleSeed), colours);

          // Special gem should be preserved
          expect(board.cells[cx][cy].gem?.special).toBe(specialType);
          expect(board.cells[cx][cy].gem?.colour).toBe('R');
        },
      ),
      { numRuns: 30 },
    );
  });

  it('reshuffle preserves blockers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2 ** 31 - 1 }),
        fc.integer({ min: 1, max: 2 ** 31 - 1 }),
        (initSeed, reshuffleSeed) => {
          const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
          const spec = makeSpec({
            board: { width: 8, height: 8, empty: [] },
            gems: { colours },
            blockers: [
              { type: 'jelly', at: [1, 1], layers: 2 },
              { type: 'lock', at: [3, 3] },
            ],
          });

          const board = initBoard(spec, new Mulberry32(initSeed));

          reshuffle(board, new Mulberry32(reshuffleSeed), colours);

          // Blockers should be preserved
          expect(board.cells[1][1].blocker).toEqual({ kind: 'jelly', layers: 2 });
          expect(board.cells[3][3].blocker).toEqual({ kind: 'lock' });
        },
      ),
      { numRuns: 30 },
    );
  });
});

// ─── CP-1: Board Validity after initBoard + reshuffle sequence ──

/**
 * **Validates: Requirements FR-8, CP-1**
 *
 * 對任意 initBoard + 多次 reshuffle 操作序列，棋盤始終保持有效。
 */
describe('CP-1: Board Validity after initBoard + reshuffle sequence', () => {
  it('board remains valid after multiple reshuffles', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 9 }),
        fc.integer({ min: 5, max: 9 }),
        fc.integer({ min: 4, max: 7 }),
        fc.integer({ min: 1, max: 2 ** 31 - 1 }),
        fc.integer({ min: 2, max: 5 }),
        (width, height, numColours, seed, numReshuffles) => {
          const colours = ALL_COLOURS.slice(0, numColours);
          const spec = makeSpec({
            board: { width, height, empty: [] },
            gems: { colours },
          });

          const rng = new Mulberry32(seed);
          const board = initBoard(spec, rng);
          assertBoardValid(board, spec, 'initBoard');

          for (let i = 0; i < numReshuffles; i++) {
            const reshuffleRng = new Mulberry32(seed + i + 1);
            reshuffle(board, reshuffleRng, colours);
            assertBoardValid(board, spec, `reshuffle #${i + 1}`);
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});

// ─── Additional Unit Tests ──────────────────────────────────

describe('initBoard — additional edge cases', () => {
  it('very small board (3×3) with 3 colours', () => {
    const spec = makeSpec({
      board: { width: 3, height: 3, empty: [] },
      gems: { colours: ['R', 'G', 'B'] },
    });
    const rng = new Mulberry32(42);
    const board = initBoard(spec, rng);

    expect(board.width).toBe(3);
    expect(board.height).toBe(3);
    expect(detectMatches(board).length).toBe(0);
    expect(findValidSwaps(board).length).toBeGreaterThan(0);
  });

  it('board with many empty cells (>25%)', () => {
    // Create a 7×7 board with ~30% empty cells
    const empty: CellPos[] = [
      [0, 0], [0, 1], [1, 0],
      [6, 6], [6, 5], [5, 6],
      [3, 0], [3, 6], [0, 3],
      [6, 3], [2, 2], [4, 4],
      [1, 5], [5, 1],
    ];
    const spec = makeSpec({
      board: { width: 7, height: 7, empty },
      gems: { colours: ['R', 'G', 'B', 'Y'] },
    });
    const rng = new Mulberry32(123);
    const board = initBoard(spec, rng);

    // Verify empty cells
    for (const [col, row] of empty) {
      expect(board.cells[col][row].isEmpty).toBe(true);
      expect(board.cells[col][row].gem).toBeNull();
    }

    // Board should still be valid
    expect(detectMatches(board).length).toBe(0);
    expect(findValidSwaps(board).length).toBeGreaterThan(0);
  });

  it('board with all blocker types simultaneously', () => {
    const spec = makeSpec({
      board: { width: 8, height: 8, empty: [] },
      gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
      blockers: [
        { type: 'jelly', at: [0, 0], layers: 1 },
        { type: 'jelly', at: [1, 0], layers: 2 },
        { type: 'jelly', at: [2, 0], layers: 3 },
        { type: 'lock', at: [4, 4] },
        {
          type: 'generator',
          at: [6, 6],
          generatorSpec: { spawnKind: 'jelly', everyNMoves: 3 },
        },
        {
          type: 'unstable',
          at: [7, 7],
          unstableSpec: { countdown: 6 },
        },
      ],
    });
    const rng = new Mulberry32(999);
    const board = initBoard(spec, rng);

    // Verify all blockers placed
    expect(board.cells[0][0].blocker).toEqual({ kind: 'jelly', layers: 1 });
    expect(board.cells[1][0].blocker).toEqual({ kind: 'jelly', layers: 2 });
    expect(board.cells[2][0].blocker).toEqual({ kind: 'jelly', layers: 3 });
    expect(board.cells[4][4].blocker).toEqual({ kind: 'lock' });
    expect(board.cells[6][6].blocker?.kind).toBe('generator');
    expect(board.cells[7][7].blocker).toEqual({ kind: 'unstable', countdown: 6 });

    // Board should still be valid
    expect(detectMatches(board).length).toBe(0);
    expect(findValidSwaps(board).length).toBeGreaterThan(0);
  });

  it('3×3 board with 1 empty cell still produces valid board', () => {
    const spec = makeSpec({
      board: { width: 3, height: 3, empty: [[1, 1]] },
      gems: { colours: ['R', 'G', 'B'] },
    });
    const rng = new Mulberry32(77);
    const board = initBoard(spec, rng);

    expect(board.cells[1][1].isEmpty).toBe(true);
    expect(board.cells[1][1].gem).toBeNull();
    expect(detectMatches(board).length).toBe(0);
    expect(findValidSwaps(board).length).toBeGreaterThan(0);
  });
});

describe('reshuffle — additional edge cases', () => {
  it('reshuffle on a small board (4×4) preserves validity', () => {
    const colours: GemColour[] = ['R', 'G', 'B'];
    const spec = makeSpec({
      board: { width: 4, height: 4, empty: [] },
      gems: { colours },
    });
    const board = initBoard(spec, new Mulberry32(42));

    reshuffle(board, new Mulberry32(999), colours);

    expect(detectMatches(board).length).toBe(0);
    expect(findValidSwaps(board).length).toBeGreaterThan(0);
  });

  it('reshuffle preserves empty cells', () => {
    const empty: CellPos[] = [[0, 0], [3, 3], [5, 5]];
    const colours: GemColour[] = ['R', 'G', 'B', 'Y'];
    const spec = makeSpec({
      board: { width: 6, height: 6, empty },
      gems: { colours },
    });
    const board = initBoard(spec, new Mulberry32(42));

    reshuffle(board, new Mulberry32(999), colours);

    // Empty cells should remain empty
    for (const [col, row] of empty) {
      expect(board.cells[col][row].isEmpty).toBe(true);
      expect(board.cells[col][row].gem).toBeNull();
    }
  });

  it('reshuffle with multiple special gems preserves all of them', () => {
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    const spec = makeSpec({
      board: { width: 8, height: 8, empty: [] },
      gems: { colours },
    });
    const board = initBoard(spec, new Mulberry32(42));

    // Place multiple special gems
    board.cells[1][1].gem = createGem('R', 'lineH');
    board.cells[3][3].gem = createGem('G', 'lineV');
    board.cells[5][5].gem = createGem('B', 'area');
    board.cells[7][7].gem = createGem('Y', 'colour');

    reshuffle(board, new Mulberry32(999), colours);

    expect(board.cells[1][1].gem?.special).toBe('lineH');
    expect(board.cells[3][3].gem?.special).toBe('lineV');
    expect(board.cells[5][5].gem?.special).toBe('area');
    expect(board.cells[7][7].gem?.special).toBe('colour');
  });
});
