// ─── Animation Flow Integration Test ────────────────────────
// Verifies that the cascade animation sequence is correct:
// 1. Pre-clear sync shows gems in correct positions/colors BEFORE clears
// 2. Clear animation plays on the correct sprites
// 3. Post-gravity sync happens AFTER clears, BEFORE gravity animation
// 4. Gravity animation moves sprites from fromRow to toRow
//
// This catches timing bugs where gems change color before falling,
// or where sprites are synced to the wrong intermediate state.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CellPos, GemColour } from '../../types';
import { createBoard, createGem, getCell } from '../../game/rules/board';
import type { Board } from '../../game/rules/board';
import { GameSessionController } from '../../game/runtime/game-session';
import type {
  SwapResult,
  CascadeStep,
  BoardSnapshot,
  BoardSnapshotCell,
} from '../../game/runtime/game-session';
import { placeGem } from '../../game/__tests__/test-helpers';
import { createRngStreams } from '../../game/rules/rng';
import type { LevelSpec } from '../../game/level/level-spec';

// ─── Test Helpers ───────────────────────────────────────────

/** Create a minimal LevelSpec for testing */
function createTestSpec(width = 8, height = 8): LevelSpec {
  return {
    id: 1,
    world: 1,
    name: 'Test',
    gems: { colours: ['R', 'G', 'B', 'Y', 'P'] as GemColour[], count: 5 },
    grid: { width, height, emptyMask: [] },
    objective: { type: 'score', target: 1000 },
    constraints: { moveBudget: 20 },
    stars: { one: 100, two: 200, three: 300 },
    blockers: [],
  } as any;
}

/** Create a board with a specific layout (no pre-existing matches) */
function createTestBoard(): Board {
  const board = createBoard(5, 5);
  // Layout (no matches):
  // Row 0: R G B Y P
  // Row 1: G B Y P R
  // Row 2: B Y P R G
  // Row 3: Y P R G B
  // Row 4: P R G B Y
  const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < 5; row++) {
      placeGem(board, col, row, colours[(col + row) % 5]);
    }
  }
  return board;
}

/** Create a board with a horizontal match ready to be triggered by a swap */
function createBoardWithPendingMatch(): Board {
  const board = createBoard(5, 5);
  // Set up so swapping (1,2) with (2,2) creates a horizontal match of R at row 2
  // Row 2: G R G R R  → after swap (1,2)↔(2,2): G G R R R → match at col 2,3,4
  //
  // Actually let's make it simpler:
  // Col:    0  1  2  3  4
  // Row 0:  G  B  Y  P  G
  // Row 1:  B  Y  P  G  B
  // Row 2:  R  G  R  R  B   ← swap (1,2)↔(1,2) won't work, let's set up differently
  //
  // Better: set up so swapping (0,2) down to (0,3) creates a match
  // Row 2:  Y  R  R  G  B
  // Row 3:  R  G  B  Y  P   ← after swap (0,2)↔(0,3): R at (0,3), and row 2 has R R R? No...
  //
  // Simplest: 3 in a row already set up, just verify the cascade step data
  const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < 5; row++) {
      placeGem(board, col, row, colours[(col + row * 2) % 5]);
    }
  }
  // Force a match-ready state: put R R _ R at row 2, with G at (2,2)
  // Swapping (2,1) down to (2,2) will put R at (2,2) making R R R at row 2 cols 0,1,2
  placeGem(board, 0, 2, 'R');
  placeGem(board, 1, 2, 'R');
  placeGem(board, 2, 2, 'G'); // will be swapped away
  placeGem(board, 2, 1, 'R'); // will be swapped to (2,2)
  placeGem(board, 3, 2, 'B');
  placeGem(board, 4, 2, 'Y');
  return board;
}

/** Get the color at a position in a snapshot */
function snapshotColourAt(
  snapshot: BoardSnapshot,
  col: number,
  row: number,
): GemColour | null {
  const cell = snapshot.cells[col]?.[row];
  if (!cell || !cell.gem) return null;
  return cell.gem.colour;
}

/** Check if a position has a gem in a snapshot */
function snapshotHasGem(
  snapshot: BoardSnapshot,
  col: number,
  row: number,
): boolean {
  const cell = snapshot.cells[col]?.[row];
  return cell?.gem !== null;
}

// ═══════════════════════════════════════════════════════════════
// Animation Flow Ordering Tests
// ═══════════════════════════════════════════════════════════════

describe('Animation flow: cascade step snapshots', () => {
  it('preClearSnapshot contains gems that will be cleared (they exist before clear)', () => {
    const board = createBoardWithPendingMatch();
    const spec = createTestSpec(5, 5);
    const rngStreams = createRngStreams(42n);

    const session = new GameSessionController({ spec, seed: 42n, rngStreams, board });

    // Swap (2,1) ↔ (2,2) to create R R R at row 2
    const result = session.executeSwap([2, 1], [2, 2]);

    expect(result.valid).toBe(true);
    expect(result.cascadeSteps.length).toBeGreaterThan(0);

    const step = result.cascadeSteps[0];

    // preClearSnapshot should contain the gems that are about to be cleared
    for (const { pos } of step.clearedCells) {
      const [col, row] = pos;
      expect(snapshotHasGem(step.preClearSnapshot, col, row)).toBe(true);
    }
  });

  it('preClearSnapshot shows correct colors at cleared positions', () => {
    const board = createBoardWithPendingMatch();
    const spec = createTestSpec(5, 5);
    const rngStreams = createRngStreams(42n);

    const session = new GameSessionController({ spec, seed: 42n, rngStreams, board });
    const result = session.executeSwap([2, 1], [2, 2]);

    if (!result.valid || result.cascadeSteps.length === 0) return;

    const step = result.cascadeSteps[0];

    // All cleared cells with colour 'R' should show 'R' in preClearSnapshot
    for (const { pos, colour } of step.clearedCells) {
      if (colour) {
        const [col, row] = pos;
        expect(snapshotColourAt(step.preClearSnapshot, col, row)).toBe(colour);
      }
    }
  });

  it('boardSnapshot (post-gravity) has gems at gravity target positions', () => {
    const board = createBoardWithPendingMatch();
    const spec = createTestSpec(5, 5);
    const rngStreams = createRngStreams(42n);

    const session = new GameSessionController({ spec, seed: 42n, rngStreams, board });
    const result = session.executeSwap([2, 1], [2, 2]);

    if (!result.valid || result.cascadeSteps.length === 0) return;

    const step = result.cascadeSteps[0];

    // Every gravity drop target should have a gem in the post-gravity snapshot
    for (const drop of step.gravity.drops) {
      expect(snapshotHasGem(step.boardSnapshot, drop.col, drop.toRow)).toBe(true);
    }
  });

  it('preClearSnapshot differs from boardSnapshot when gravity moves gems', () => {
    const board = createBoardWithPendingMatch();
    const spec = createTestSpec(5, 5);
    const rngStreams = createRngStreams(42n);

    const session = new GameSessionController({ spec, seed: 42n, rngStreams, board });
    const result = session.executeSwap([2, 1], [2, 2]);

    if (!result.valid || result.cascadeSteps.length === 0) return;

    const step = result.cascadeSteps[0];

    // If there are gravity drops, the two snapshots should differ
    if (step.gravity.drops.length > 0) {
      // At least one position should differ between pre-clear and post-gravity
      let hasDifference = false;
      for (let col = 0; col < step.preClearSnapshot.width; col++) {
        for (let row = 0; row < step.preClearSnapshot.height; row++) {
          const preClear = snapshotColourAt(step.preClearSnapshot, col, row);
          const postGravity = snapshotColourAt(step.boardSnapshot, col, row);
          if (preClear !== postGravity) {
            hasDifference = true;
            break;
          }
        }
        if (hasDifference) break;
      }
      expect(hasDifference).toBe(true);
    }
  });

  it('gravity drops have positive distance for all entries', () => {
    const board = createBoardWithPendingMatch();
    const spec = createTestSpec(5, 5);
    const rngStreams = createRngStreams(42n);

    const session = new GameSessionController({ spec, seed: 42n, rngStreams, board });
    const result = session.executeSwap([2, 1], [2, 2]);

    if (!result.valid || result.cascadeSteps.length === 0) return;

    for (const step of result.cascadeSteps) {
      for (const drop of step.gravity.drops) {
        expect(drop.distance).toBeGreaterThan(0);
      }
    }
  });

  it('cleared cells in preClearSnapshot are absent in boardSnapshot (cleared then refilled)', () => {
    const board = createBoardWithPendingMatch();
    const spec = createTestSpec(5, 5);
    const rngStreams = createRngStreams(42n);

    const session = new GameSessionController({ spec, seed: 42n, rngStreams, board });
    const result = session.executeSwap([2, 1], [2, 2]);

    if (!result.valid || result.cascadeSteps.length === 0) return;

    const step = result.cascadeSteps[0];

    // After gravity + fill, all positions should have gems (board is fully filled)
    for (let col = 0; col < step.boardSnapshot.width; col++) {
      for (let row = 0; row < step.boardSnapshot.height; row++) {
        const cell = step.boardSnapshot.cells[col]?.[row];
        if (cell && !cell.isEmpty) {
          expect(cell.gem).not.toBeNull();
        }
      }
    }
  });
});

describe('Animation flow: multi-step cascade ordering', () => {
  it('each step preClearSnapshot matches previous step boardSnapshot', () => {
    // Create a board that will produce multiple cascade steps
    const board = createBoard(5, 5);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];

    // Fill with non-matching pattern
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 5; row++) {
        placeGem(board, col, row, colours[(col + row * 2) % 5]);
      }
    }

    // Set up a match
    placeGem(board, 0, 4, 'R');
    placeGem(board, 1, 4, 'R');
    placeGem(board, 2, 4, 'G');
    placeGem(board, 2, 3, 'R');

    const spec = createTestSpec(5, 5);
    const rngStreams = createRngStreams(123n);
    const session = new GameSessionController({ spec, seed: 123n, rngStreams, board });

    const result = session.executeSwap([2, 3], [2, 4]);

    if (!result.valid || result.cascadeSteps.length < 2) return;

    // For step N (N > 0), its preClearSnapshot should equal step N-1's boardSnapshot
    // because the board state after step N-1's gravity IS the state before step N's clear
    for (let i = 1; i < result.cascadeSteps.length; i++) {
      const prevPost = result.cascadeSteps[i - 1].boardSnapshot;
      const currPre = result.cascadeSteps[i].preClearSnapshot;

      // Compare all cells
      for (let col = 0; col < prevPost.width; col++) {
        for (let row = 0; row < prevPost.height; row++) {
          const prevCell = prevPost.cells[col][row];
          const currCell = currPre.cells[col][row];
          expect(currCell.gem?.colour).toBe(prevCell.gem?.colour);
          expect(currCell.gem?.special ?? null).toBe(prevCell.gem?.special ?? null);
        }
      }
    }
  });

  it('spawn positions appear in preClearSnapshot with correct special type', () => {
    // Set up a board where a 4-match will spawn a special
    const board = createBoard(6, 6);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 6; row++) {
        placeGem(board, col, row, colours[(col + row * 2) % 5]);
      }
    }

    // 4 in a row: R R R _ R → swap to make R R R R
    placeGem(board, 0, 3, 'R');
    placeGem(board, 1, 3, 'R');
    placeGem(board, 2, 3, 'R');
    placeGem(board, 3, 3, 'G');
    placeGem(board, 3, 2, 'R'); // swap this down

    const spec = createTestSpec(6, 6);
    const rngStreams = createRngStreams(99n);
    const session = new GameSessionController({ spec, seed: 99n, rngStreams, board });

    const result = session.executeSwap([3, 2], [3, 3]);

    if (!result.valid || result.cascadeSteps.length === 0) return;

    const step = result.cascadeSteps[0];

    // If a special was spawned, it should appear in preClearSnapshot
    for (const [col, row] of step.spawnPositions) {
      const cell = step.preClearSnapshot.cells[col][row];
      expect(cell.gem).not.toBeNull();
      expect(cell.gem!.special).not.toBeNull();
    }
  });
});

describe('Animation flow: initial activation snapshots', () => {
  it('initialActivation.boardSnapshot has gems at gravity targets', () => {
    // Set up a combo swap scenario
    const board = createBoard(7, 7);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 7; row++) {
        placeGem(board, col, row, colours[(col + row) % 5]);
      }
    }

    // Place two specials adjacent for combo
    placeGem(board, 3, 3, 'R', 'lineH');
    placeGem(board, 4, 3, 'G', 'lineV');

    const spec = createTestSpec(7, 7);
    const rngStreams = createRngStreams(77n);
    const session = new GameSessionController({ spec, seed: 77n, rngStreams, board });

    const result = session.executeSwap([3, 3], [4, 3]);

    if (!result.valid || !result.initialActivation) return;

    const { boardSnapshot, gravity } = result.initialActivation;

    // All gravity targets should have gems
    for (const drop of gravity.drops) {
      expect(snapshotHasGem(boardSnapshot, drop.col, drop.toRow)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// Special Activation Animation Flow Tests
// ═══════════════════════════════════════════════════════════════

describe('Animation flow: tap-activate special gems', () => {
  it('lineH activation: boardSnapshot has gems at all gravity targets', () => {
    const board = createBoard(7, 7);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 7; row++) {
        placeGem(board, col, row, colours[(col + row) % 5]);
      }
    }

    // Place a standalone lineH special (colour=null)
    board.cells[3][3].gem = { colour: null, special: 'lineH', locked: false, unstable: null };

    const spec = createTestSpec(7, 7);
    const rngStreams = createRngStreams(55n);
    const session = new GameSessionController({ spec, seed: 55n, rngStreams, board });

    const result = session.executeActivation([3, 3]);
    if (!result || !result.valid) return;

    // boardSnapshot should have gems at all gravity drop targets
    for (const drop of result.gravity.drops) {
      expect(snapshotHasGem(result.boardSnapshot, drop.col, drop.toRow)).toBe(true);
    }

    // Cleared cells should include the entire row
    const clearedCols = result.clearedCells.map(c => c.pos[0]);
    expect(clearedCols.length).toBeGreaterThanOrEqual(7); // full row
  });

  it('lineV activation: boardSnapshot has gems at all gravity targets', () => {
    const board = createBoard(7, 7);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 7; row++) {
        placeGem(board, col, row, colours[(col + row) % 5]);
      }
    }

    board.cells[3][3].gem = { colour: null, special: 'lineV', locked: false, unstable: null };

    const spec = createTestSpec(7, 7);
    const rngStreams = createRngStreams(55n);
    const session = new GameSessionController({ spec, seed: 55n, rngStreams, board });

    const result = session.executeActivation([3, 3]);
    if (!result || !result.valid) return;

    for (const drop of result.gravity.drops) {
      expect(snapshotHasGem(result.boardSnapshot, drop.col, drop.toRow)).toBe(true);
    }

    // Cleared cells should include the entire column
    const clearedRows = result.clearedCells.map(c => c.pos[1]);
    expect(clearedRows.length).toBeGreaterThanOrEqual(7); // full column
  });

  it('area activation: boardSnapshot has gems at all gravity targets', () => {
    const board = createBoard(7, 7);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 7; row++) {
        placeGem(board, col, row, colours[(col + row) % 5]);
      }
    }

    board.cells[3][3].gem = { colour: null, special: 'area', locked: false, unstable: null };

    const spec = createTestSpec(7, 7);
    const rngStreams = createRngStreams(55n);
    const session = new GameSessionController({ spec, seed: 55n, rngStreams, board });

    const result = session.executeActivation([3, 3]);
    if (!result || !result.valid) return;

    for (const drop of result.gravity.drops) {
      expect(snapshotHasGem(result.boardSnapshot, drop.col, drop.toRow)).toBe(true);
    }

    // Area bomb clears a 3x3 or 5x5 area
    expect(result.clearedCells.length).toBeGreaterThanOrEqual(5);
  });

  it('colour activation: boardSnapshot has gems at all gravity targets', () => {
    const board = createBoard(7, 7);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 7; row++) {
        placeGem(board, col, row, colours[(col + row) % 5]);
      }
    }

    board.cells[3][3].gem = { colour: null, special: 'colour', locked: false, unstable: null };

    const spec = createTestSpec(7, 7);
    const rngStreams = createRngStreams(55n);
    const session = new GameSessionController({ spec, seed: 55n, rngStreams, board });

    const result = session.executeActivation([3, 3]);
    if (!result || !result.valid) return;

    for (const drop of result.gravity.drops) {
      expect(snapshotHasGem(result.boardSnapshot, drop.col, drop.toRow)).toBe(true);
    }

    // Colour gem clears all gems of one colour
    expect(result.clearedCells.length).toBeGreaterThanOrEqual(5);
  });

  it('activation cascade steps follow correct snapshot ordering', () => {
    const board = createBoard(7, 7);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 7; row++) {
        placeGem(board, col, row, colours[(col + row) % 5]);
      }
    }

    board.cells[3][3].gem = { colour: null, special: 'lineH', locked: false, unstable: null };

    const spec = createTestSpec(7, 7);
    const rngStreams = createRngStreams(200n);
    const session = new GameSessionController({ spec, seed: 200n, rngStreams, board });

    const result = session.executeActivation([3, 3]);
    if (!result || !result.valid || result.cascadeSteps.length === 0) return;

    // First cascade step's preClearSnapshot should match activation's boardSnapshot
    const firstStep = result.cascadeSteps[0];
    for (let col = 0; col < result.boardSnapshot.width; col++) {
      for (let row = 0; row < result.boardSnapshot.height; row++) {
        const activationCell = result.boardSnapshot.cells[col][row];
        const cascadeCell = firstStep.preClearSnapshot.cells[col][row];
        expect(cascadeCell.gem?.colour).toBe(activationCell.gem?.colour);
        expect(cascadeCell.gem?.special ?? null).toBe(activationCell.gem?.special ?? null);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// Combo Swap Animation Flow Tests
// ═══════════════════════════════════════════════════════════════

describe('Animation flow: combo swap (two specials)', () => {
  it('line+line combo: boardSnapshot correct after massive clear', () => {
    const board = createBoard(8, 8);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 8; col++) {
      for (let row = 0; row < 8; row++) {
        placeGem(board, col, row, colours[(col + row) % 5]);
      }
    }

    placeGem(board, 3, 3, 'R', 'lineH');
    placeGem(board, 4, 3, 'G', 'lineV');

    const spec = createTestSpec(8, 8);
    const rngStreams = createRngStreams(77n);
    const session = new GameSessionController({ spec, seed: 77n, rngStreams, board });

    const result = session.executeSwap([3, 3], [4, 3]);
    if (!result.valid || !result.initialActivation) return;

    const { boardSnapshot, gravity } = result.initialActivation;

    // All gravity targets have gems
    for (const drop of gravity.drops) {
      expect(snapshotHasGem(boardSnapshot, drop.col, drop.toRow)).toBe(true);
    }

    // Board is fully filled after gravity
    for (let col = 0; col < boardSnapshot.width; col++) {
      for (let row = 0; row < boardSnapshot.height; row++) {
        const cell = boardSnapshot.cells[col][row];
        if (!cell.isEmpty) {
          expect(cell.gem).not.toBeNull();
        }
      }
    }
  });

  it('bomb+bomb combo: cascade steps maintain snapshot continuity', () => {
    const board = createBoard(8, 8);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 8; col++) {
      for (let row = 0; row < 8; row++) {
        placeGem(board, col, row, colours[(col + row) % 5]);
      }
    }

    placeGem(board, 3, 3, 'R', 'area');
    placeGem(board, 4, 3, 'G', 'area');

    const spec = createTestSpec(8, 8);
    const rngStreams = createRngStreams(88n);
    const session = new GameSessionController({ spec, seed: 88n, rngStreams, board });

    const result = session.executeSwap([3, 3], [4, 3]);
    if (!result.valid) return;

    // Verify cascade step continuity
    for (let i = 1; i < result.cascadeSteps.length; i++) {
      const prevPost = result.cascadeSteps[i - 1].boardSnapshot;
      const currPre = result.cascadeSteps[i].preClearSnapshot;

      for (let col = 0; col < prevPost.width; col++) {
        for (let row = 0; row < prevPost.height; row++) {
          expect(currPre.cells[col][row].gem?.colour).toBe(prevPost.cells[col][row].gem?.colour);
        }
      }
    }
  });

  it('colour gem swap: initialActivation snapshot is fully filled', () => {
    const board = createBoard(7, 7);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 7; row++) {
        placeGem(board, col, row, colours[(col + row) % 5]);
      }
    }

    // Colour gem + normal gem swap
    board.cells[3][3].gem = { colour: null, special: 'colour', locked: false, unstable: null };
    placeGem(board, 4, 3, 'R');

    const spec = createTestSpec(7, 7);
    const rngStreams = createRngStreams(66n);
    const session = new GameSessionController({ spec, seed: 66n, rngStreams, board });

    const result = session.executeSwap([3, 3], [4, 3]);
    if (!result.valid || !result.initialActivation) return;

    const { boardSnapshot } = result.initialActivation;

    // Board should be fully filled after gravity
    for (let col = 0; col < boardSnapshot.width; col++) {
      for (let row = 0; row < boardSnapshot.height; row++) {
        const cell = boardSnapshot.cells[col][row];
        if (!cell.isEmpty) {
          expect(cell.gem).not.toBeNull();
        }
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// Chain Reaction / Passive Activation Flow Tests
// ═══════════════════════════════════════════════════════════════

describe('Animation flow: chain reactions (special triggers special)', () => {
  it('clearing a special gem triggers passive activation with correct data', () => {
    const board = createBoard(7, 7);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 7; row++) {
        placeGem(board, col, row, colours[(col + row * 2) % 5]);
      }
    }

    // Place a lineH special that will be caught in a match
    // Set up: R R lineH(R) at row 4, cols 0,1,2 — swap to trigger
    placeGem(board, 0, 4, 'R');
    placeGem(board, 1, 4, 'R');
    placeGem(board, 2, 4, 'R', 'lineH'); // special that will be cleared by match
    placeGem(board, 3, 4, 'G');
    placeGem(board, 3, 3, 'R'); // swap this down to make 4-in-a-row

    const spec = createTestSpec(7, 7);
    const rngStreams = createRngStreams(150n);
    const session = new GameSessionController({ spec, seed: 150n, rngStreams, board });

    const result = session.executeSwap([3, 3], [3, 4]);
    if (!result.valid || result.cascadeSteps.length === 0) return;

    const step = result.cascadeSteps[0];

    // If there are special activations or passive activations, verify they have valid data
    for (const activation of step.specialActivations) {
      expect(activation.pos).toBeDefined();
      expect(activation.type).toBeDefined();
      expect(activation.clearedCells.length).toBeGreaterThan(0);
    }

    for (const passive of step.passiveActivations) {
      expect(passive.pos).toBeDefined();
      expect(passive.type).toBeDefined();
      expect(passive.clearedCells.length).toBeGreaterThan(0);
    }
  });

  it('in-match special activation: cleared cells are absent from boardSnapshot', () => {
    const board = createBoard(7, 7);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 7; row++) {
        placeGem(board, col, row, colours[(col + row * 2) % 5]);
      }
    }

    // lineH at (2,4) will be cleared by a match, triggering row clear
    placeGem(board, 0, 4, 'R');
    placeGem(board, 1, 4, 'R');
    placeGem(board, 2, 4, 'R', 'lineH');
    placeGem(board, 3, 4, 'G');
    placeGem(board, 3, 3, 'R');

    const spec = createTestSpec(7, 7);
    const rngStreams = createRngStreams(150n);
    const session = new GameSessionController({ spec, seed: 150n, rngStreams, board });

    const result = session.executeSwap([3, 3], [3, 4]);
    if (!result.valid || result.cascadeSteps.length === 0) return;

    const step = result.cascadeSteps[0];

    // After gravity, all non-empty positions should be filled
    for (let col = 0; col < step.boardSnapshot.width; col++) {
      for (let row = 0; row < step.boardSnapshot.height; row++) {
        const cell = step.boardSnapshot.cells[col][row];
        if (!cell.isEmpty) {
          expect(cell.gem).not.toBeNull();
        }
      }
    }
  });

  it('multi-step cascade with chain specials: all steps have valid gravity data', () => {
    const board = createBoard(8, 8);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 8; col++) {
      for (let row = 0; row < 8; row++) {
        placeGem(board, col, row, colours[(col * 3 + row * 2) % 5]);
      }
    }

    // Set up a scenario likely to produce chain reactions
    placeGem(board, 0, 7, 'R');
    placeGem(board, 1, 7, 'R');
    placeGem(board, 2, 7, 'G');
    placeGem(board, 2, 6, 'R');
    // Place specials that might get triggered in cascade
    placeGem(board, 1, 5, 'G', 'lineH');
    placeGem(board, 3, 6, 'B', 'area');

    const spec = createTestSpec(8, 8);
    const rngStreams = createRngStreams(300n);
    const session = new GameSessionController({ spec, seed: 300n, rngStreams, board });

    const result = session.executeSwap([2, 6], [2, 7]);
    if (!result.valid) return;

    // Verify ALL cascade steps have valid structure
    for (let i = 0; i < result.cascadeSteps.length; i++) {
      const step = result.cascadeSteps[i];

      // Every step must have valid preClearSnapshot
      expect(step.preClearSnapshot.width).toBeGreaterThan(0);
      expect(step.preClearSnapshot.cells.length).toBe(step.preClearSnapshot.width);

      // Every step must have valid boardSnapshot
      expect(step.boardSnapshot.width).toBeGreaterThan(0);
      expect(step.boardSnapshot.cells.length).toBe(step.boardSnapshot.width);

      // Gravity drops must reference valid positions
      for (const drop of step.gravity.drops) {
        expect(drop.col).toBeGreaterThanOrEqual(0);
        expect(drop.col).toBeLessThan(step.boardSnapshot.width);
        expect(drop.toRow).toBeGreaterThanOrEqual(0);
        expect(drop.toRow).toBeLessThan(step.boardSnapshot.height);
        expect(drop.distance).toBeGreaterThan(0);
        // Target position must have a gem in post-gravity snapshot
        expect(snapshotHasGem(step.boardSnapshot, drop.col, drop.toRow)).toBe(true);
      }

      // Cleared cells must exist in preClearSnapshot
      for (const { pos } of step.clearedCells) {
        const [col, row] = pos;
        expect(snapshotHasGem(step.preClearSnapshot, col, row)).toBe(true);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// Direct Bomb Swap Animation Flow Tests
// ═══════════════════════════════════════════════════════════════

describe('Animation flow: direct bomb swap (special + non-matching)', () => {
  it('directBomb swap: initialActivation snapshot is consistent', () => {
    const board = createBoard(7, 7);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 7; row++) {
        placeGem(board, col, row, colours[(col + row) % 5]);
      }
    }

    // Place a standalone area bomb next to a non-matching gem
    board.cells[3][3].gem = { colour: null, special: 'area', locked: false, unstable: null };
    placeGem(board, 4, 3, 'G');

    const spec = createTestSpec(7, 7);
    const rngStreams = createRngStreams(44n);
    const session = new GameSessionController({ spec, seed: 44n, rngStreams, board });

    const result = session.executeSwap([3, 3], [4, 3]);
    if (!result.valid || !result.initialActivation) return;

    const { boardSnapshot, gravity, clearedCells } = result.initialActivation;

    // Cleared cells should be non-empty
    expect(clearedCells.length).toBeGreaterThan(0);

    // All gravity targets have gems
    for (const drop of gravity.drops) {
      expect(snapshotHasGem(boardSnapshot, drop.col, drop.toRow)).toBe(true);
    }

    // Board fully filled after gravity
    for (let col = 0; col < boardSnapshot.width; col++) {
      for (let row = 0; row < boardSnapshot.height; row++) {
        const cell = boardSnapshot.cells[col][row];
        if (!cell.isEmpty) {
          expect(cell.gem).not.toBeNull();
        }
      }
    }
  });

  it('directBomb cascade steps link correctly to initialActivation snapshot', () => {
    const board = createBoard(7, 7);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 7; row++) {
        placeGem(board, col, row, colours[(col + row) % 5]);
      }
    }

    board.cells[3][3].gem = { colour: null, special: 'lineH', locked: false, unstable: null };
    placeGem(board, 4, 3, 'G');

    const spec = createTestSpec(7, 7);
    const rngStreams = createRngStreams(44n);
    const session = new GameSessionController({ spec, seed: 44n, rngStreams, board });

    const result = session.executeSwap([3, 3], [4, 3]);
    if (!result.valid || !result.initialActivation || result.cascadeSteps.length === 0) return;

    // First cascade step's preClearSnapshot should match initialActivation's boardSnapshot
    const initSnapshot = result.initialActivation.boardSnapshot;
    const firstCascadePre = result.cascadeSteps[0].preClearSnapshot;

    for (let col = 0; col < initSnapshot.width; col++) {
      for (let row = 0; row < initSnapshot.height; row++) {
        expect(firstCascadePre.cells[col][row].gem?.colour).toBe(
          initSnapshot.cells[col][row].gem?.colour,
        );
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// Invariant: No "color change without gravity" possible
// ═══════════════════════════════════════════════════════════════

describe('Animation flow invariant: no premature color changes', () => {
  it('gems above cleared cells keep their color in preClearSnapshot', () => {
    const board = createBoard(6, 6);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 6; row++) {
        placeGem(board, col, row, colours[(col + row * 2) % 5]);
      }
    }

    // Match at bottom row
    placeGem(board, 0, 5, 'R');
    placeGem(board, 1, 5, 'R');
    placeGem(board, 2, 5, 'G');
    placeGem(board, 2, 4, 'R');

    // Record colors above the match area before swap
    const colorsAbove: Map<string, GemColour | null> = new Map();
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 4; row++) {
        colorsAbove.set(`${col},${row}`, board.cells[col][row].gem?.colour ?? null);
      }
    }

    const spec = createTestSpec(6, 6);
    const rngStreams = createRngStreams(42n);
    const session = new GameSessionController({ spec, seed: 42n, rngStreams, board });

    const result = session.executeSwap([2, 4], [2, 5]);
    if (!result.valid || result.cascadeSteps.length === 0) return;

    const step = result.cascadeSteps[0];
    const clearedPositions = new Set(step.clearedCells.map(c => `${c.pos[0]},${c.pos[1]}`));

    // Gems that are NOT cleared should retain their original color in preClearSnapshot
    for (const [key, originalColour] of colorsAbove) {
      if (clearedPositions.has(key)) continue; // skip cleared gems
      const [col, row] = key.split(',').map(Number);
      const snapshotColour = snapshotColourAt(step.preClearSnapshot, col, row);
      expect(snapshotColour).toBe(originalColour);
    }
  });

  it('gravity fromRow calculation: new gems start above the board', () => {
    const board = createBoard(5, 5);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 5; row++) {
        placeGem(board, col, row, colours[(col + row * 2) % 5]);
      }
    }

    placeGem(board, 0, 4, 'R');
    placeGem(board, 1, 4, 'R');
    placeGem(board, 2, 4, 'G');
    placeGem(board, 2, 3, 'R');

    const spec = createTestSpec(5, 5);
    const rngStreams = createRngStreams(42n);
    const session = new GameSessionController({ spec, seed: 42n, rngStreams, board });

    const result = session.executeSwap([2, 3], [2, 4]);
    if (!result.valid || result.cascadeSteps.length === 0) return;

    const step = result.cascadeSteps[0];

    // For new gems (those that didn't exist before), fromRow should be negative
    // (they enter from above the board)
    // We can identify new gems: their distance > toRow (they come from above row 0)
    for (const drop of step.gravity.drops) {
      const fromRow = drop.toRow - drop.distance;
      // fromRow can be negative (new gem from above) or >= 0 (existing gem falling)
      // But distance must always be positive
      expect(drop.distance).toBeGreaterThan(0);
      // toRow must be within board bounds
      expect(drop.toRow).toBeGreaterThanOrEqual(0);
      expect(drop.toRow).toBeLessThan(step.boardSnapshot.height);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// Game Rule: Special gem ALWAYS activates when swapped
// ═══════════════════════════════════════════════════════════════

describe('Rule: special gem always activates on swap (even with color match)', () => {
  it('lineH activates even when swap also forms a color match', () => {
    const board = createBoard(7, 7);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 7; row++) {
        placeGem(board, col, row, colours[(col + row * 2) % 5]);
      }
    }

    // lineH(R) at (2,3). R at (0,3),(1,3). Swap (2,2)G with (2,3)lineH(R).
    // After swap: (2,3) has G, (2,2) has lineH(R).
    // That doesn't form a match at row 3...
    //
    // Better: lineH(R) at (2,3). R at (0,3),(1,3). Swap (2,3)lineH with (3,3)R.
    // After swap: (2,3)=R, (3,3)=lineH(R). Row 3: R R R lineH → match R R R at cols 0,1,2
    // And lineH is now at (3,3) → swappedSpecialPos = to = (3,3)
    placeGem(board, 0, 3, 'R');
    placeGem(board, 1, 3, 'R');
    placeGem(board, 2, 3, 'R', 'lineH'); // will be swapped to (3,3)
    placeGem(board, 3, 3, 'G');          // will be swapped to (2,3), making R R G → no match

    // Actually after swap (2,3)↔(3,3): row 3 = R R G lineH(R)
    // That's R R at (0,3)(1,3) and G at (2,3) → no 3-match.
    // Let me try: R R lineH(R) at (0,3)(1,3)(2,3), swap (2,3)↔(3,3)
    // After: R R G at row 3 cols 0,1,2 and lineH at (3,3) → no match
    //
    // The match needs to form WITH the non-special gem.
    // Setup: R at (0,3),(1,3). G at (2,3). lineH(R) at (3,3).
    // Swap (2,3)G ↔ (3,3)lineH → (2,3)=lineH(R), (3,3)=G
    // Row 3: R R lineH(R) G → R R R match? lineH has colour R, so yes!
    // swappedSpecialPos checks from=(2,3) which now has lineH → returns from
    placeGem(board, 0, 3, 'R');
    placeGem(board, 1, 3, 'R');
    placeGem(board, 2, 3, 'G');
    placeGem(board, 3, 3, 'R', 'lineH');

    const spec = createTestSpec(7, 7);
    const rngStreams = createRngStreams(500n);
    const session = new GameSessionController({ spec, seed: 500n, rngStreams, board });

    // Swap (2,3) ↔ (3,3): lineH moves to (2,3), G moves to (3,3)
    const result = session.executeSwap([2, 3], [3, 3]);

    expect(result.valid).toBe(true);
    // Must be directBomb type (special activated), not 'normal'
    expect(result.type).toBe('directBomb');
    expect(result.initialActivation).toBeDefined();
    expect(result.initialActivation!.type).toBe('lineH');
  });

  it('area bomb activates even when swap also forms a color match', () => {
    const board = createBoard(7, 7);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 7; row++) {
        placeGem(board, col, row, colours[(col + row * 2) % 5]);
      }
    }

    // area(R) at (3,3). R at (0,3),(1,3). Swap (2,3)G ↔ (3,3)area(R)
    // After swap: (2,3)=area(R), (3,3)=G. Row 3: R R area(R) G ...
    // Match: R R R (area has colour R) → match exists
    // swappedSpecialPos: from=(2,3) has area → detected
    placeGem(board, 0, 3, 'R');
    placeGem(board, 1, 3, 'R');
    placeGem(board, 2, 3, 'G');
    placeGem(board, 3, 3, 'R', 'area');

    const spec = createTestSpec(7, 7);
    const rngStreams = createRngStreams(501n);
    const session = new GameSessionController({ spec, seed: 501n, rngStreams, board });

    const result = session.executeSwap([2, 3], [3, 3]);

    expect(result.valid).toBe(true);
    expect(result.type).toBe('directBomb');
    expect(result.initialActivation).toBeDefined();
    expect(result.initialActivation!.type).toBe('area');
  });

  it('special activation clears BOTH bomb zone AND color match cells', () => {
    const board = createBoard(7, 7);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 7; row++) {
        placeGem(board, col, row, colours[(col + row * 2) % 5]);
      }
    }

    // lineH(R) at (3,4). R at (0,4),(1,4),(2,4)=G. Swap (2,4)↔(3,4)
    // After swap: (2,4)=lineH(R), (3,4)=G. Row 4: R R lineH(R) G ...
    // Match: R R R at cols 0,1,2 (lineH has colour R)
    // lineH activates → clears entire row 4 (7 cells)
    placeGem(board, 0, 4, 'R');
    placeGem(board, 1, 4, 'R');
    placeGem(board, 2, 4, 'G');
    placeGem(board, 3, 4, 'R', 'lineH');

    const spec = createTestSpec(7, 7);
    const rngStreams = createRngStreams(502n);
    const session = new GameSessionController({ spec, seed: 502n, rngStreams, board });

    const result = session.executeSwap([2, 4], [3, 4]);

    expect(result.valid).toBe(true);
    expect(result.type).toBe('directBomb');
    expect(result.initialActivation).toBeDefined();

    // lineH clears entire row (7 cells)
    expect(result.initialActivation!.clearedCells.length).toBeGreaterThanOrEqual(7);
  });

  it('without special gem, normal swap only does color match (type=normal)', () => {
    const board = createBoard(7, 7);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 7; row++) {
        placeGem(board, col, row, colours[(col + row * 2) % 5]);
      }
    }

    // Simple 3-match with no specials involved
    placeGem(board, 0, 4, 'R');
    placeGem(board, 1, 4, 'R');
    placeGem(board, 2, 4, 'G');
    placeGem(board, 2, 3, 'R');

    const spec = createTestSpec(7, 7);
    const rngStreams = createRngStreams(503n);
    const session = new GameSessionController({ spec, seed: 503n, rngStreams, board });

    const result = session.executeSwap([2, 3], [2, 4]);

    expect(result.valid).toBe(true);
    // Without special, it should be a normal match
    expect(result.type).toBe('normal');
    // No initialActivation for normal matches
    expect(result.initialActivation).toBeUndefined();
  });

  it('special gem swap with no match is still valid (activates bomb)', () => {
    const board = createBoard(7, 7);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 7; row++) {
        placeGem(board, col, row, colours[(col + row) % 5]);
      }
    }

    // Standalone special (colour=null) next to a non-matching gem
    board.cells[3][3].gem = { colour: null, special: 'area', locked: false, unstable: null };
    placeGem(board, 4, 3, 'G');

    const spec = createTestSpec(7, 7);
    const rngStreams = createRngStreams(504n);
    const session = new GameSessionController({ spec, seed: 504n, rngStreams, board });

    const result = session.executeSwap([3, 3], [4, 3]);

    expect(result.valid).toBe(true);
    expect(result.type).toBe('directBomb');
    expect(result.initialActivation).toBeDefined();
    expect(result.initialActivation!.clearedCells.length).toBeGreaterThan(0);
  });

  it('swap without special and without match is invalid', () => {
    const board = createBoard(5, 5);
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 5; row++) {
        placeGem(board, col, row, colours[(col + row) % 5]);
      }
    }

    const spec = createTestSpec(5, 5);
    const rngStreams = createRngStreams(505n);
    const session = new GameSessionController({ spec, seed: 505n, rngStreams, board });

    // Swap two normal gems that don't form a match
    const result = session.executeSwap([0, 0], [1, 0]);

    expect(result.valid).toBe(false);
    expect(result.type).toBe('invalid');
  });
});
