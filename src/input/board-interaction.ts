// ─── Board Interaction ──────────────────────────────────────
// Extracted from GameIntegration.startLevel() to encapsulate
// all pointer event handling for the game board.
//
// Handles: tap-to-select, tap-tap-swap, drag-swap, tap-activate.
// Emits high-level intents (swap, activate) via callbacks.
//
// Drag behaviour: once the player drags past a directional threshold,
// the swap is immediately committed (both gems animate together).
// No single-gem dragging visual — the interaction confirms a direction
// then triggers the full two-gem swap animation.

import type { Container } from 'pixi.js';
import type { CellPos } from '../types';

// ─── Types ──────────────────────────────────────────────────

export interface BoardInteractionConfig {
  /** The PixiJS container that receives pointer events */
  boardLayer: Container;
  /** Board dimensions in cells */
  boardWidth: number;
  boardHeight: number;
  /** Cell size in pixels */
  cellSize: number;
  /** Get the sprite at a cell position (for drag visual) */
  getSprite: (col: number, row: number) => any | undefined;
  /** Check if a cell has a standalone special gem (colour === null) */
  isStandaloneSpecial: (pos: CellPos) => boolean;
  /** Check if the session is currently processing */
  isProcessing: () => boolean;
}

export interface BoardInteractionCallbacks {
  /** Called when the player requests a swap between two adjacent cells */
  onSwap?: (from: CellPos, to: CellPos) => void;
  /** Called when the player taps a standalone special gem to activate it */
  onActivate?: (at: CellPos) => void;
  /** Called when selection changes (for visual highlight) */
  onSelectionChange?: (cell: CellPos | null) => void;
}

// ─── Constants ──────────────────────────────────────────────

/** Minimum drag distance (in pixels) to confirm a directional swap */
const DRAG_THRESHOLD_RATIO = 0.25; // 25% of cell size

// ─── Board Interaction ──────────────────────────────────────

/**
 * Manages all pointer interactions on the game board.
 *
 * Supports three interaction modes:
 * 1. Tap-tap: select a cell, then tap an adjacent cell to swap
 * 2. Drag: press and drag past threshold to confirm direction → swap fires immediately
 * 3. Tap-activate: tap a standalone special gem to activate it
 *
 * Drag behaviour:
 * - No single-gem visual dragging. Once the drag direction is confirmed
 *   (past threshold), onSwap fires and both gems animate together.
 */
export class BoardInteraction {
  private readonly config: BoardInteractionConfig;
  private callbacks: BoardInteractionCallbacks = {};

  private tapStartCell: CellPos | null = null;
  private selectedCell: CellPos | null = null;
  private dragOriginPixel: { x: number; y: number } | null = null;
  private dragCommitted = false;

  private boundPointerDown: (e: any) => void;
  private boundPointerMove: (e: any) => void;
  private boundPointerUp: (e: any) => void;
  private boundPointerUpOutside: () => void;

  constructor(config: BoardInteractionConfig) {
    this.config = config;

    // Bind event handlers
    this.boundPointerDown = this.onPointerDown.bind(this);
    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerUp = this.onPointerUp.bind(this);
    this.boundPointerUpOutside = this.onPointerUpOutside.bind(this);
  }

  // ─── Public API ─────────────────────────────────────────

  /**
   * Attach pointer event listeners to the board layer.
   */
  attach(callbacks: BoardInteractionCallbacks): void {
    this.callbacks = callbacks;
    const { boardLayer, boardWidth, boardHeight, cellSize } = this.config;

    boardLayer.eventMode = 'static';
    boardLayer.hitArea = {
      contains: (x: number, y: number) => {
        return x >= 0 && x < boardWidth * cellSize &&
               y >= 0 && y < boardHeight * cellSize;
      },
    };

    boardLayer.on('pointerdown', this.boundPointerDown);
    boardLayer.on('pointermove', this.boundPointerMove);
    boardLayer.on('pointerup', this.boundPointerUp);
    boardLayer.on('pointerupoutside', this.boundPointerUpOutside);
  }

  /**
   * Detach all pointer event listeners and reset state.
   */
  detach(): void {
    const { boardLayer } = this.config;
    boardLayer.off('pointerdown', this.boundPointerDown);
    boardLayer.off('pointermove', this.boundPointerMove);
    boardLayer.off('pointerup', this.boundPointerUp);
    boardLayer.off('pointerupoutside', this.boundPointerUpOutside);
    boardLayer.eventMode = 'auto';

    this.tapStartCell = null;
    this.selectedCell = null;
    this.dragOriginPixel = null;
    this.dragCommitted = false;
    this.callbacks = {};
  }

  /**
   * Clear the current selection (e.g., after a swap completes).
   */
  clearSelection(): void {
    this.selectedCell = null;
    this.callbacks.onSelectionChange?.(null);
  }

  // ─── Private: Event Handlers ────────────────────────────

  private onPointerDown(e: any): void {
    if (this.config.isProcessing()) return;

    const { boardLayer } = this.config;
    const local = e.getLocalPosition(boardLayer);
    const cell = this.pixelToGrid(local.x, local.y);

    if (!cell) return;

    this.tapStartCell = cell;
    this.dragOriginPixel = { x: local.x, y: local.y };
    this.dragCommitted = false;
  }

  private onPointerMove(e: any): void {
    // If already committed a drag swap this gesture, or processing, ignore
    if (this.dragCommitted || this.config.isProcessing()) return;
    if (!this.tapStartCell || !this.dragOriginPixel) return;

    const { boardLayer, cellSize } = this.config;
    const local = e.getLocalPosition(boardLayer);
    const dx = local.x - this.dragOriginPixel.x;
    const dy = local.y - this.dragOriginPixel.y;

    const threshold = cellSize * DRAG_THRESHOLD_RATIO;

    // Check if drag exceeds threshold in a clear direction
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < threshold && absDy < threshold) return;

    // Determine primary direction
    let targetCell: CellPos;
    const [col, row] = this.tapStartCell;

    if (absDx > absDy) {
      // Horizontal
      targetCell = dx > 0 ? [col + 1, row] : [col - 1, row];
    } else {
      // Vertical
      targetCell = dy > 0 ? [col, row + 1] : [col, row - 1];
    }

    // Validate target is within bounds
    if (!this.isInBounds(targetCell)) {
      // Dragging towards edge — ignore, wait for release or different direction
      return;
    }

    // Commit the drag swap immediately
    this.dragCommitted = true;
    this.selectedCell = null;
    this.callbacks.onSelectionChange?.(null);
    this.callbacks.onSwap?.(this.tapStartCell, targetCell);
  }

  private onPointerUp(e: any): void {
    // If drag already committed a swap, just reset state
    if (this.dragCommitted) {
      this.tapStartCell = null;
      this.dragOriginPixel = null;
      this.dragCommitted = false;
      return;
    }

    if (this.config.isProcessing()) {
      this.tapStartCell = null;
      this.dragOriginPixel = null;
      return;
    }

    const { boardLayer } = this.config;
    const local = e.getLocalPosition(boardLayer);
    const cell = this.pixelToGrid(local.x, local.y);

    if (!cell || !this.tapStartCell) {
      this.tapStartCell = null;
      this.dragOriginPixel = null;
      return;
    }

    // If pointer up is on a different cell (slow drag that didn't hit threshold)
    // treat as adjacent swap if valid
    if (this.tapStartCell[0] !== cell[0] || this.tapStartCell[1] !== cell[1]) {
      if (this.isAdjacent(this.tapStartCell, cell)) {
        this.selectedCell = null;
        this.callbacks.onSelectionChange?.(null);
        this.callbacks.onSwap?.(this.tapStartCell, cell);
      }
      this.tapStartCell = null;
      this.dragOriginPixel = null;
      return;
    }

    // Same cell: check for standalone special (tap-activate)
    if (this.config.isStandaloneSpecial(cell)) {
      this.selectedCell = null;
      this.callbacks.onSelectionChange?.(null);
      this.callbacks.onActivate?.(cell);
      this.tapStartCell = null;
      this.dragOriginPixel = null;
      return;
    }

    // Same cell: tap-tap swap logic
    if (!this.selectedCell) {
      this.selectedCell = cell;
      this.callbacks.onSelectionChange?.(cell);
    } else if (this.selectedCell[0] === cell[0] && this.selectedCell[1] === cell[1]) {
      // Deselect
      this.selectedCell = null;
      this.callbacks.onSelectionChange?.(null);
    } else if (this.isAdjacent(this.selectedCell, cell)) {
      // Swap with selected
      this.callbacks.onSwap?.(this.selectedCell, cell);
      this.selectedCell = null;
      this.callbacks.onSelectionChange?.(null);
    } else {
      // Select new cell
      this.selectedCell = cell;
      this.callbacks.onSelectionChange?.(cell);
    }

    this.tapStartCell = null;
    this.dragOriginPixel = null;
  }

  private onPointerUpOutside(): void {
    this.tapStartCell = null;
    this.dragOriginPixel = null;
    this.dragCommitted = false;
  }

  // ─── Private: Utilities ─────────────────────────────────

  private pixelToGrid(localX: number, localY: number): CellPos | null {
    const { cellSize, boardWidth, boardHeight } = this.config;
    const col = Math.floor(localX / cellSize);
    const row = Math.floor(localY / cellSize);
    if (col < 0 || col >= boardWidth || row < 0 || row >= boardHeight) return null;
    return [col, row];
  }

  private isInBounds(cell: CellPos): boolean {
    const { boardWidth, boardHeight } = this.config;
    return cell[0] >= 0 && cell[0] < boardWidth && cell[1] >= 0 && cell[1] < boardHeight;
  }

  private isAdjacent(a: CellPos, b: CellPos): boolean {
    const dc = Math.abs(a[0] - b[0]);
    const dr = Math.abs(a[1] - b[1]);
    return (dc === 1 && dr === 0) || (dc === 0 && dr === 1);
  }
}
