// ─── 棋盤輸入處理 (Board Input) ────────────────────────────
// tap-tap-swap 模式、drag-swap 模式、螢幕座標 → 格子座標轉換
// 接收 NormalizedPointer 事件，產生 swap 指令推入 CommandQueue。

import type { CellPos } from '../types';
import type { ViewportInfo } from '../rendering/viewport';
import type { NormalizedPointer } from './input-system';
import type { CommandQueue } from '../game/runtime/game-loop';
import { CELL_SIZE, CELL_GAP } from '../rendering/design-tokens';

// ─── 28.4 棋盤座標轉換 ─────────────────────────────────────

/**
 * 將螢幕座標轉換為格子座標。
 *
 * 使用 viewport 的 scale 和 offset 將螢幕像素座標
 * 反向映射到棋盤格子座標。
 *
 * @param screenX 螢幕 X 座標（相對於 canvas）
 * @param screenY 螢幕 Y 座標（相對於 canvas）
 * @param viewport 當前 viewport 資訊（scale、offsetX、offsetY）
 * @param boardWidth 棋盤欄數
 * @param boardHeight 棋盤列數
 * @param cellSize 單格像素尺寸（預設 CELL_SIZE）
 * @returns 格子座標 [col, row]，若超出棋盤範圍則回傳 null
 */
export function screenToGrid(
  screenX: number,
  screenY: number,
  viewport: ViewportInfo,
  boardWidth: number,
  boardHeight: number,
  cellSize: number = CELL_SIZE,
): CellPos | null {
  // 反向 viewport 變換：螢幕座標 → 棋盤像素座標
  const boardPixelX = (screenX - viewport.offsetX) / viewport.scale;
  const boardPixelY = (screenY - viewport.offsetY) / viewport.scale;

  // 像素座標 → 格子座標
  const col = Math.floor(boardPixelX / cellSize);
  const row = Math.floor(boardPixelY / cellSize);

  // 邊界檢查
  if (col < 0 || col >= boardWidth || row < 0 || row >= boardHeight) {
    return null;
  }

  return [col, row];
}

// ─── 拖曳狀態 ──────────────────────────────────────────────

/** 拖曳追蹤狀態 */
interface DragState {
  /** 拖曳起始格子 */
  startCell: CellPos;
  /** 拖曳起始的指標 ID */
  pointerId: number;
  /** 拖曳起始螢幕座標 */
  startX: number;
  startY: number;
  /** 是否已觸發交換（防止重複觸發） */
  swapped: boolean;
}

// ─── BoardInput ────────────────────────────────────────────

/** BoardInput 建構選項 */
export interface BoardInputOptions {
  /** 指令佇列 */
  commandQueue: CommandQueue;
  /** 棋盤欄數 */
  boardWidth: number;
  /** 棋盤列數 */
  boardHeight: number;
  /** 單格像素尺寸 */
  cellSize?: number;
  /** 拖曳觸發閾值（像素，預設為 cellSize 的 30%） */
  dragThreshold?: number;
}

/**
 * 棋盤輸入處理器。
 *
 * 支援兩種交換模式：
 * 1. **tap-tap-swap**：點擊第一顆寶石選取，點擊相鄰寶石交換
 * 2. **drag-swap**：按住寶石拖曳到相鄰格子交換
 *
 * 兩種模式可同時運作，互不衝突。
 * 拖曳優先：若拖曳距離超過閾值，視為 drag-swap；
 * 否則在 pointerup 時視為 tap。
 */
export class BoardInput {
  private readonly commandQueue: CommandQueue;
  private readonly cellSize: number;
  private readonly dragThreshold: number;

  private boardWidth: number;
  private boardHeight: number;

  /** 當前 viewport（由外部更新） */
  private viewport: ViewportInfo = { scale: 1, offsetX: 0, offsetY: 0 };

  /** tap-tap 模式：已選取的格子 */
  private selectedCell: CellPos | null = null;

  /** drag 模式：拖曳狀態 */
  private dragState: DragState | null = null;

  /** 是否啟用輸入（resolving 期間可停用） */
  private _enabled = true;

  /** 選取變更回呼（供渲染層顯示選取環） */
  private _onSelectionChange: ((cell: CellPos | null) => void) | null = null;

  constructor(options: BoardInputOptions) {
    this.commandQueue = options.commandQueue;
    this.boardWidth = options.boardWidth;
    this.boardHeight = options.boardHeight;
    this.cellSize = options.cellSize ?? CELL_SIZE;
    this.dragThreshold = options.dragThreshold ?? this.cellSize * 0.3;
  }

  // ─── 公開 API ────────────────────────────────────────

  /** 更新 viewport（resize 或關卡切換時呼叫） */
  updateViewport(viewport: ViewportInfo): void {
    this.viewport = viewport;
  }

  /** 更新棋盤尺寸（關卡切換時呼叫） */
  updateBoardSize(width: number, height: number): void {
    this.boardWidth = width;
    this.boardHeight = height;
    this.clearSelection();
  }

  /** 啟用/停用輸入 */
  set enabled(value: boolean) {
    this._enabled = value;
    if (!value) {
      this.clearSelection();
      this.dragState = null;
    }
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /** 設定選取變更回呼 */
  set onSelectionChange(cb: ((cell: CellPos | null) => void) | null) {
    this._onSelectionChange = cb;
  }

  /** 取得目前選取的格子 */
  get selection(): CellPos | null {
    return this.selectedCell;
  }

  /** 清除選取 */
  clearSelection(): void {
    if (this.selectedCell) {
      this.selectedCell = null;
      this._onSelectionChange?.(null);
    }
  }

  /** 以程式方式設定選取（鍵盤導航用） */
  setSelection(cell: CellPos): void {
    this.selectedCell = cell;
    this._onSelectionChange?.(cell);
  }

  /** 以程式方式嘗試交換（鍵盤導航用） */
  trySwap(from: CellPos, to: CellPos): void {
    if (!this._enabled) return;
    this.commandQueue.enqueue({ kind: 'swap', from, to });
    this.clearSelection();
  }

  // ─── 指標事件處理 ────────────────────────────────────

  /**
   * 處理正規化指標事件。
   * 由 InputSystem 呼叫。
   */
  handlePointer(pointer: NormalizedPointer): void {
    if (!this._enabled) return;

    switch (pointer.type) {
      case 'down':
        this._onPointerDown(pointer);
        break;
      case 'move':
        this._onPointerMove(pointer);
        break;
      case 'up':
        this._onPointerUp(pointer);
        break;
      case 'cancel':
        this._onPointerCancel(pointer);
        break;
    }
  }

  // ─── 28.2 tap-tap-swap + 28.3 drag-swap ─────────────

  private _onPointerDown(pointer: NormalizedPointer): void {
    const cell = screenToGrid(
      pointer.x,
      pointer.y,
      this.viewport,
      this.boardWidth,
      this.boardHeight,
      this.cellSize,
    );

    if (!cell) {
      // 點擊棋盤外：清除選取
      this.clearSelection();
      this.dragState = null;
      return;
    }

    // 開始追蹤拖曳
    this.dragState = {
      startCell: cell,
      pointerId: pointer.pointerId,
      startX: pointer.x,
      startY: pointer.y,
      swapped: false,
    };
  }

  private _onPointerMove(pointer: NormalizedPointer): void {
    if (!this.dragState) return;
    if (this.dragState.pointerId !== pointer.pointerId) return;
    if (this.dragState.swapped) return;

    // 計算拖曳距離
    const dx = pointer.x - this.dragState.startX;
    const dy = pointer.y - this.dragState.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.dragThreshold) return;

    // 28.3 drag-swap：判斷拖曳方向（取主軸）
    const targetCell = this._getDragTarget(this.dragState.startCell, dx, dy);
    if (!targetCell) return;

    // 執行交換
    this.dragState.swapped = true;
    this.commandQueue.enqueue({
      kind: 'swap',
      from: this.dragState.startCell,
      to: targetCell,
    });
    this.clearSelection();
  }

  private _onPointerUp(pointer: NormalizedPointer): void {
    if (!this.dragState) return;
    if (this.dragState.pointerId !== pointer.pointerId) return;

    const wasDragged = this.dragState.swapped;
    const startCell = this.dragState.startCell;
    this.dragState = null;

    // 如果已經透過拖曳交換了，不再處理 tap
    if (wasDragged) return;

    // 28.2 tap-tap-swap
    const cell = screenToGrid(
      pointer.x,
      pointer.y,
      this.viewport,
      this.boardWidth,
      this.boardHeight,
      this.cellSize,
    );

    if (!cell) {
      this.clearSelection();
      return;
    }

    // 確認 up 位置與 down 位置在同一格（才算 tap）
    if (cell[0] !== startCell[0] || cell[1] !== startCell[1]) {
      // 拖曳距離不夠觸發 drag-swap，但 up 在不同格
      // 嘗試作為 drag-swap 處理
      if (this._isAdjacent(startCell, cell)) {
        this.commandQueue.enqueue({ kind: 'swap', from: startCell, to: cell });
        this.clearSelection();
      }
      return;
    }

    // 同一格的 tap
    if (!this.selectedCell) {
      // 第一次 tap：選取
      this.selectedCell = cell;
      this._onSelectionChange?.(cell);
    } else if (
      this.selectedCell[0] === cell[0] &&
      this.selectedCell[1] === cell[1]
    ) {
      // 再次 tap 同一格：取消選取
      this.clearSelection();
    } else if (this._isAdjacent(this.selectedCell, cell)) {
      // tap 相鄰格：交換
      this.commandQueue.enqueue({
        kind: 'swap',
        from: this.selectedCell,
        to: cell,
      });
      this.clearSelection();
    } else {
      // tap 非相鄰格：改選新格
      this.selectedCell = cell;
      this._onSelectionChange?.(cell);
    }
  }

  private _onPointerCancel(pointer: NormalizedPointer): void {
    if (this.dragState?.pointerId === pointer.pointerId) {
      this.dragState = null;
    }
  }

  // ─── 輔助方法 ────────────────────────────────────────

  /** 判斷拖曳方向，回傳目標格子 */
  private _getDragTarget(from: CellPos, dx: number, dy: number): CellPos | null {
    // 取主軸方向
    let targetCol = from[0];
    let targetRow = from[1];

    if (Math.abs(dx) >= Math.abs(dy)) {
      // 水平拖曳
      targetCol += dx > 0 ? 1 : -1;
    } else {
      // 垂直拖曳
      targetRow += dy > 0 ? 1 : -1;
    }

    const target: CellPos = [targetCol, targetRow];

    // 邊界檢查
    if (
      targetCol < 0 ||
      targetCol >= this.boardWidth ||
      targetRow < 0 ||
      targetRow >= this.boardHeight
    ) {
      return null;
    }

    return target;
  }

  /** 判斷兩格是否相鄰（上下左右） */
  private _isAdjacent(a: CellPos, b: CellPos): boolean {
    const dc = Math.abs(a[0] - b[0]);
    const dr = Math.abs(a[1] - b[1]);
    return (dc === 1 && dr === 0) || (dc === 0 && dr === 1);
  }
}
