// ─── Board Interaction ──────────────────────────────────────
// Extracted from GameIntegration.startLevel() to encapsulate
// all pointer event handling for the game board.
//
// Handles: tap-to-select, tap-tap-swap, drag-swap, tap-activate.
// Emits high-level intents (swap, activate) via callbacks.

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

// ─── Board Interaction ──────────────────────────────────────

/**
 * Manages all pointer interactions on the game board.
 *
 * Supports three interaction modes:
 * 1. Tap-tap: select a cell, then tap an adjacent cell to swap
 * 2. Drag: press and drag to an adjacent cell to swap
 * 3. Tap-activate: tap a standalone special gem to activate it
 */
export class BoardInteraction {
  private readonly config: BoardInteractionConfig;
  private callbacks: BoardInteractionCallbacks = {};

  private tapStartCell: CellPos | null = null;
  private selectedCell: CellPos | null = null;
  private dragState: {
    sprite: any;
    startCell: CellPos;
    originX: number;
    originY: number;
  } | null = null;

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
    this.dragState = null;
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
    const { boardLayer } = this.config;
    const local = e.getLocalPosition(boardLayer);
    this.tapStartCell = this.pixelToGrid(local.x, local.y);

    if (this.tapStartCell && !this.config.isProcessing()) {
      const [sc, sr] = this.tapStartCell;
      const spr = this.config.getSprite(sc, sr);
      if (spr) {
        this.dragState = {
          sprite: spr,
          startCell: this.tapStartCell,
          originX: sc * this.config.cellSize + this.config.cellSize / 2,
          originY: sr * this.config.cellSize + this.config.cellSize / 2,
        };
      }
    }
  }

  private onPointerMove(e: any): void {
    if (!this.dragState || this.config.isProcessing()) return;

    const { boardLayer, cellSize } = this.config;
    const local = e.getLocalPosition(boardLayer);
    const dx = local.x - this.dragState.originX;
    const dy = local.y - this.dragState.originY;
    const maxDist = cellSize;

    const clampedDx = Math.max(-maxDist, Math.min(maxDist, dx));
    const clampedDy = Math.max(-maxDist, Math.min(maxDist, dy));

    // Lock to primary axis
    if (Math.abs(clampedDx) > Math.abs(clampedDy)) {
      this.dragState.sprite.position.set(this.dragState.originX + clampedDx, this.dragState.originY);
    } else {
      this.dragState.sprite.position.set(this.dragState.originX, this.dragState.originY + clampedDy);
    }
  }

  private onPointerUp(e: any): void {
    const { boardLayer } = this.config;
    const local = e.getLocalPosition(boardLayer);
    const cell = this.pixelToGrid(local.x, local.y);

    // Reset drag sprite position
    if (this.dragState) {
      this.dragState.sprite.position.set(this.dragState.originX, this.dragState.originY);
      this.dragState = null;
    }

    if (!cell || !this.tapStartCell) {
      this.tapStartCell = null;
      return;
    }

    // Drag swap: down and up in different adjacent cells
    if (this.tapStartCell[0] !== cell[0] || this.tapStartCell[1] !== cell[1]) {
      if (this.isAdjacent(this.tapStartCell, cell)) {
        this.callbacks.onSwap?.(this.tapStartCell, cell);
        this.selectedCell = null;
        this.callbacks.onSelectionChange?.(null);
      }
      this.tapStartCell = null;
      return;
    }

    // Same cell: check for standalone special (tap-activate)
    if (this.config.isStandaloneSpecial(cell)) {
      this.selectedCell = null;
      this.callbacks.onSelectionChange?.(null);
      this.callbacks.onActivate?.(cell);
      this.tapStartCell = null;
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
  }

  private onPointerUpOutside(): void {
    if (this.dragState) {
      this.dragState.sprite.position.set(this.dragState.originX, this.dragState.originY);
      this.dragState = null;
    }
    this.tapStartCell = null;
  }

  // ─── Private: Utilities ─────────────────────────────────

  private pixelToGrid(localX: number, localY: number): CellPos | null {
    const { cellSize, boardWidth, boardHeight } = this.config;
    const col = Math.floor(localX / cellSize);
    const row = Math.floor(localY / cellSize);
    if (col < 0 || col >= boardWidth || row < 0 || row >= boardHeight) return null;
    return [col, row];
  }

  private isAdjacent(a: CellPos, b: CellPos): boolean {
    const dc = Math.abs(a[0] - b[0]);
    const dr = Math.abs(a[1] - b[1]);
    return (dc === 1 && dr === 0) || (dc === 0 && dr === 1);
  }
}
