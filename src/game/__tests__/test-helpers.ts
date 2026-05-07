// ─── Shared Test Helpers ─────────────────────────────────────
// Common utilities used across game rule and runtime tests.
// Consolidates duplicated placeGem/setGem helpers into one module.

import type { GemColour, SpecialGemType } from '../../types';
import type { Board, Gem } from '../rules/board';
import { createGem } from '../rules/board';

/**
 * Place a gem on the board at the given position.
 *
 * Supports two calling styles:
 * - Simple: `placeGem(board, col, row, 'R')` or `placeGem(board, col, row, 'R', 'lineH')`
 * - Extended: `placeGem(board, col, row, 'R', { locked: true, special: 'area' })`
 */
export function placeGem(
  board: Board,
  col: number,
  row: number,
  colour: GemColour,
  options?: SpecialGemType | null | Partial<Gem>,
): void {
  if (options === null || options === undefined || typeof options === 'string') {
    // Simple mode: options is a SpecialGemType or null
    board.cells[col][row].gem = createGem(colour, options ?? null);
  } else {
    // Extended mode: options is Partial<Gem>
    const g = createGem(colour, options.special ?? null);
    if (options.locked) g.locked = true;
    if (options.unstable) g.unstable = options.unstable;
    board.cells[col][row].gem = g;
  }
}

/**
 * Alias for placeGem (used in cascade tests).
 */
export const setGem = placeGem;

/**
 * Get the gem colour at a board position, or null if empty.
 */
export function getColour(board: Board, col: number, row: number): GemColour | null {
  return board.cells[col][row].gem?.colour ?? null;
}
