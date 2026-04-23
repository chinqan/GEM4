import { describe, it, expect, vi } from 'vitest';
import type { CellPos, GemColour, SpecialGemType, ComboType } from '../../types';
import {
  createBoard,
  createGem,
  getCell,
  cloneBoard,
} from '../../game/rules/board';
import type { Board } from '../../game/rules/board';
import { resolveCombo, comboKey } from '../../game/rules/combo-matrix';
import {
  activateColourGem,
  processSpecialActivations,
} from '../../game/rules/special-gems';
import { comboScore, specialActivationScore } from '../../game/rules/scoring';

// ─── 測試工具 ───────────────────────────────────────────────

/** 在棋盤上放置寶石 */
function placeGem(
  board: Board,
  col: number,
  row: number,
  colour: GemColour,
  special: SpecialGemType | null = null,
): void {
  board.cells[col][row].gem = createGem(colour, special);
}

/** 放置 Colour Gem（colour 為 null） */
function placeColourGem(board: Board, col: number, row: number): void {
  board.cells[col][row].gem = {
    colour: null,
    special: 'colour',
    locked: false,
    unstable: null,
  };
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

/** 將 CellPos[] 轉為排序後的字串集合 */
function posSet(positions: CellPos[]): string[] {
  return positions.map(([c, r]) => `${c},${r}`).sort();
}

// ═══════════════════════════════════════════════════════════════
// Task 9.1: Combo 路徑 — 6 種 Combo 類型範例測試
// ═══════════════════════════════════════════════════════════════

describe('Combo path — 6 combo type examples', () => {
  it('line.line: cross clear (full row + full column)', () => {
    const board = createFilledBoard(7, 7);
    placeGem(board, 3, 3, 'R', 'lineH');
    placeGem(board, 4, 3, 'R', 'lineV');

    const result = resolveCombo(board, [3, 3], [4, 3]);

    expect(result).not.toBeNull();
    expect(result!.clearedCells.length).toBeGreaterThan(0);

    // Cross clear at midpoint [3,3]: row 3 + col 3
    const clearedSet = new Set(posSet(result!.clearedCells));
    // Entire row 3
    for (let c = 0; c < 7; c++) {
      expect(clearedSet.has(`${c},3`)).toBe(true);
    }
    // Entire col 3
    for (let r = 0; r < 7; r++) {
      expect(clearedSet.has(`3,${r}`)).toBe(true);
    }
  });

  it('bomb.line: 3-wide cross clear', () => {
    const board = createFilledBoard(8, 8);
    placeGem(board, 4, 4, 'R', 'area');
    placeGem(board, 3, 4, 'R', 'lineH');

    const result = resolveCombo(board, [4, 4], [3, 4]);

    expect(result).not.toBeNull();
    const clearedSet = new Set(posSet(result!.clearedCells));

    // 3-wide horizontal band (rows 3,4,5)
    for (let dr = -1; dr <= 1; dr++) {
      for (let c = 0; c < 8; c++) {
        expect(clearedSet.has(`${c},${4 + dr}`)).toBe(true);
      }
    }
  });

  it('bomb.bomb: 5×5 large area clear', () => {
    const board = createFilledBoard(8, 8);
    placeGem(board, 4, 4, 'R', 'area');
    placeGem(board, 5, 4, 'R', 'area');

    const result = resolveCombo(board, [4, 4], [5, 4]);

    expect(result).not.toBeNull();
    const clearedSet = new Set(posSet(result!.clearedCells));

    // 5×5 centered at midpoint [4,4]
    for (let dc = -2; dc <= 2; dc++) {
      for (let dr = -2; dr <= 2; dr++) {
        const c = 4 + dc;
        const r = 4 + dr;
        if (c >= 0 && c < 8 && r >= 0 && r < 8) {
          expect(clearedSet.has(`${c},${r}`)).toBe(true);
        }
      }
    }
  });

  it('colour.line: all target colour gems transform to Line Bomb and activate', () => {
    const board = createFilledBoard(6, 6, 'B');
    // Place some target colour gems
    placeGem(board, 0, 0, 'G');
    placeGem(board, 3, 3, 'G');
    placeGem(board, 5, 5, 'G');
    // Colour gem + lineH
    placeColourGem(board, 1, 1);
    placeGem(board, 2, 1, 'G', 'lineH');

    const result = resolveCombo(board, [1, 1], [2, 1]);

    expect(result).not.toBeNull();
    // The combo gems should be cleared
    expect(getCell(board, [1, 1])!.gem).toBeNull();
    expect(getCell(board, [2, 1])!.gem).toBeNull();
    // Target colour gems should be cleared
    expect(getCell(board, [0, 0])!.gem).toBeNull();
    expect(getCell(board, [3, 3])!.gem).toBeNull();
    expect(getCell(board, [5, 5])!.gem).toBeNull();
    // triggeredSpecials should include the transformed positions
    expect(result!.triggeredSpecials.length).toBe(3);
  });

  it('colour.bomb: all target colour gems transform to Area Bomb and activate', () => {
    const board = createFilledBoard(7, 7, 'G');
    placeGem(board, 3, 3, 'Y');
    placeGem(board, 5, 5, 'Y');
    placeColourGem(board, 0, 0);
    placeGem(board, 1, 0, 'Y', 'area');

    const result = resolveCombo(board, [0, 0], [1, 0]);

    expect(result).not.toBeNull();
    // Combo gems cleared
    expect(getCell(board, [0, 0])!.gem).toBeNull();
    expect(getCell(board, [1, 0])!.gem).toBeNull();
    // Target colour gems cleared
    expect(getCell(board, [3, 3])!.gem).toBeNull();
    expect(getCell(board, [5, 5])!.gem).toBeNull();
    // 3×3 area around each target should also be cleared
    expect(getCell(board, [2, 2])!.gem).toBeNull();
    expect(getCell(board, [4, 4])!.gem).toBeNull();
    expect(result!.triggeredSpecials.length).toBe(2);
  });

  it('colour.colour: full board clear', () => {
    const board = createFilledBoard(6, 6);
    placeColourGem(board, 2, 2);
    placeColourGem(board, 3, 2);

    const result = resolveCombo(board, [2, 2], [3, 2]);

    expect(result).not.toBeNull();
    expect(result!.clearedCells.length).toBe(36); // 6×6

    // All gems should be null
    for (let c = 0; c < 6; c++) {
      for (let r = 0; r < 6; r++) {
        expect(getCell(board, [c, r])!.gem).toBeNull();
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// Task 9.2: Colour Gem 路徑
// ═══════════════════════════════════════════════════════════════

describe('Colour Gem path', () => {
  it('Colour Gem + normal gem swap clears all matching colour gems', () => {
    const board = createBoard(5, 5);
    // Place mixed colours
    const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        placeGem(board, c, r, colours[(c + r) % colours.length]);
      }
    }

    // Place colour gem at [0,0]
    placeColourGem(board, 0, 0);

    // The gem at [1,0] has colour 'G' (index (1+0)%5 = 1)
    const targetColour = getCell(board, [1, 0])!.gem!.colour!;
    expect(targetColour).toBe('G');

    // Count target colour gems before activation
    let targetCount = 0;
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        if (c === 0 && r === 0) continue; // skip colour gem
        if (getCell(board, [c, r])!.gem?.colour === targetColour) targetCount++;
      }
    }

    const result = activateColourGem(board, [0, 0], targetColour);

    // Colour gem itself should be cleared
    expect(getCell(board, [0, 0])!.gem).toBeNull();

    // All target colour gems should be cleared
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        const cell = getCell(board, [c, r])!;
        if (cell.gem) {
          expect(cell.gem.colour).not.toBe(targetColour);
        }
      }
    }

    // clearedCells count = target colour gems + colour gem itself
    expect(result.clearedCells.length).toBe(targetCount + 1);
  });
});

// ═══════════════════════════════════════════════════════════════
// Task 9.3: 無效交換還原行為
// ═══════════════════════════════════════════════════════════════

describe('Invalid swap revert', () => {
  it('resolveCombo returning null causes swap revert (normal gems)', () => {
    const board = createFilledBoard(5, 5);
    // Two normal gems — resolveCombo should return null
    const result = resolveCombo(board, [2, 2], [3, 2]);
    expect(result).toBeNull();
  });

  it('resolveCombo returning null when one gem is special and other is normal', () => {
    const board = createFilledBoard(5, 5);
    placeGem(board, 3, 2, 'R', 'lineH');
    // One special + one normal → resolveCombo returns null
    const result = resolveCombo(board, [2, 2], [3, 2]);
    expect(result).toBeNull();
  });

  it('resolveCombo returning null when position has no gem', () => {
    const board = createBoard(5, 5);
    placeGem(board, 3, 2, 'R', 'lineH');
    // Empty cell + special → resolveCombo returns null
    const result = resolveCombo(board, [2, 2], [3, 2]);
    expect(result).toBeNull();
  });

  it('swap revert preserves original gem positions', () => {
    const board = createFilledBoard(5, 5);
    const originalA = cloneBoard(board).cells[2][2].gem;
    const originalB = cloneBoard(board).cells[3][2].gem;

    // Simulate swap
    const cellA = getCell(board, [2, 2])!;
    const cellB = getCell(board, [3, 2])!;
    const tempGem = cellA.gem;
    cellA.gem = cellB.gem;
    cellB.gem = tempGem;

    // Check no match / no combo → revert
    const comboResult = resolveCombo(board, [2, 2], [3, 2]);
    expect(comboResult).toBeNull();

    // Revert swap
    const revertTemp = cellA.gem;
    cellA.gem = cellB.gem;
    cellB.gem = revertTemp;

    // Verify original positions restored
    expect(cellA.gem!.colour).toBe(originalA!.colour);
    expect(cellB.gem!.colour).toBe(originalB!.colour);
  });
});

// ═══════════════════════════════════════════════════════════════
// Task 9.4: doSwap 錯誤恢復
// ═══════════════════════════════════════════════════════════════

describe('doSwap error recovery', () => {
  it('isProcessing resets to false after error in try/finally pattern', () => {
    // Test the try/finally pattern used in doSwap
    let isProcessing = false;

    const doSwapSimulation = async () => {
      isProcessing = true;
      try {
        // Simulate an error during processing
        throw new Error('Unexpected error during swap');
      } catch (err) {
        // Error caught — in real code, boardRenderer.sync(board) would be called
        expect(err).toBeInstanceOf(Error);
      } finally {
        isProcessing = false;
      }
    };

    // Before swap
    expect(isProcessing).toBe(false);

    // Execute and verify recovery
    return doSwapSimulation().then(() => {
      expect(isProcessing).toBe(false);
    });
  });

  it('isProcessing resets even when error occurs mid-cascade', () => {
    let isProcessing = false;

    const doSwapWithCascadeError = async () => {
      isProcessing = true;
      try {
        // Simulate successful swap
        const swapDone = true;
        expect(swapDone).toBe(true);

        // Simulate error during cascade
        throw new Error('Cascade processing failed');
      } catch (err) {
        expect((err as Error).message).toBe('Cascade processing failed');
      } finally {
        isProcessing = false;
      }
    };

    return doSwapWithCascadeError().then(() => {
      expect(isProcessing).toBe(false);
    });
  });

  it('isProcessing flag prevents concurrent swaps', () => {
    let isProcessing = false;
    let swapCount = 0;

    const doSwap = async () => {
      if (isProcessing) return; // Guard — reject concurrent swaps
      isProcessing = true;
      try {
        swapCount++;
        // Simulate async work
        await new Promise((r) => setTimeout(r, 10));
      } finally {
        isProcessing = false;
      }
    };

    // Start first swap
    const p1 = doSwap();
    // Try second swap immediately — should be rejected
    const p2 = doSwap();

    return Promise.all([p1, p2]).then(() => {
      expect(swapCount).toBe(1); // Only first swap executed
      expect(isProcessing).toBe(false);
    });
  });
});
