import type { Container } from 'pixi.js';

// ─── 型別 ──────────────────────────────────────────────────

/** Viewport 計算結果 */
export interface ViewportInfo {
  /** 統一縮放比例 */
  readonly scale: number;
  /** 水平偏移（置中用） */
  readonly offsetX: number;
  /** 垂直偏移（置中用） */
  readonly offsetY: number;
}

// ─── 常數 ──────────────────────────────────────────────────

/** 最低支援解析度 */
export const MIN_CANVAS_WIDTH = 1200;
export const MIN_CANVAS_HEIGHT = 800;

/** 留白係數，為 HUD 等元素保留空間 */
const PADDING_FACTOR = 0.85;

// ─── calculateViewport ────────────────────────────────────

/**
 * 計算 letterbox 縮放，確保棋盤在畫布中完整可見並置中。
 *
 * 使用 0.85 係數留白，為 HUD 元素保留空間。
 * 棋盤以等比例縮放，水平與垂直方向皆置中。
 *
 * @param canvasWidth  畫布寬度（px）
 * @param canvasHeight 畫布高度（px）
 * @param boardWidth   棋盤欄數
 * @param boardHeight  棋盤列數
 * @param cellSize     單格像素尺寸
 * @returns 縮放比例與偏移量
 */
export function calculateViewport(
  canvasWidth: number,
  canvasHeight: number,
  boardWidth: number,
  boardHeight: number,
  cellSize: number,
): ViewportInfo {
  // 使用最低解析度下限，確保小視窗也能正常顯示
  const effectiveCanvasW = Math.max(canvasWidth, MIN_CANVAS_WIDTH);
  const effectiveCanvasH = Math.max(canvasHeight, MIN_CANVAS_HEIGHT);

  const boardPixelW = boardWidth * cellSize;
  const boardPixelH = boardHeight * cellSize;

  const scale =
    Math.min(effectiveCanvasW / boardPixelW, effectiveCanvasH / boardPixelH) * PADDING_FACTOR;

  // 偏移量基於實際畫布尺寸（非 effective），確保視覺置中
  const offsetX = (canvasWidth - boardPixelW * scale) / 2;
  const offsetY = (canvasHeight - boardPixelH * scale) / 2;

  return { scale, offsetX, offsetY };
}

// ─── ViewportManager ──────────────────────────────────────

/**
 * 管理 viewport 的生命週期：監聽 resize 事件並自動重新計算
 * viewport，將 transform 套用到棋盤圖層。
 */
export class ViewportManager {
  private _viewport: ViewportInfo = { scale: 1, offsetX: 0, offsetY: 0 };
  private boardWidth = 8;
  private boardHeight = 8;
  private cellSize = 64;
  private resizeObserver: ResizeObserver | null = null;
  private boundHandleResize: (() => void) | null = null;

  /**
   * @param boardLayer  棋盤容器（將套用 scale + position）
   * @param canvas      PixiJS 的 canvas 元素，用於取得尺寸
   */
  constructor(
    private readonly boardLayer: Container,
    private readonly canvas: HTMLCanvasElement,
  ) {}

  /** 目前的 viewport 資訊（唯讀） */
  get viewport(): ViewportInfo {
    return this._viewport;
  }

  /**
   * 初始化 viewport 並開始監聽 resize 事件。
   *
   * @param boardWidth  棋盤欄數
   * @param boardHeight 棋盤列數
   * @param cellSize    單格像素尺寸
   */
  start(boardWidth: number, boardHeight: number, cellSize: number): void {
    this.boardWidth = boardWidth;
    this.boardHeight = boardHeight;
    this.cellSize = cellSize;

    // 初次計算
    this.recalculate();

    // 監聽 resize
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.recalculate();
      });
      // 觀察 canvas 的父元素（容器），因為 canvas 本身的尺寸由 PixiJS 管理
      const parent = this.canvas.parentElement;
      if (parent) {
        this.resizeObserver.observe(parent);
      }
    } else {
      // 回退至 window resize
      this.boundHandleResize = () => this.recalculate();
      window.addEventListener('resize', this.boundHandleResize);
    }
  }

  /**
   * 更新棋盤參數並重新計算 viewport。
   * 用於關卡切換時棋盤尺寸改變的情況。
   */
  updateBoard(boardWidth: number, boardHeight: number, cellSize: number): void {
    this.boardWidth = boardWidth;
    this.boardHeight = boardHeight;
    this.cellSize = cellSize;
    this.recalculate();
  }

  /** 手動觸發重新計算（例如全螢幕切換後） */
  recalculate(): void {
    const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);

    this._viewport = calculateViewport(
      canvasWidth,
      canvasHeight,
      this.boardWidth,
      this.boardHeight,
      this.cellSize,
    );

    this.applyTransform();
  }

  /** 停止監聽 resize 事件並清理資源 */
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.boundHandleResize) {
      window.removeEventListener('resize', this.boundHandleResize);
      this.boundHandleResize = null;
    }
  }

  // ─── 內部方法 ────────────────────────────────────────────

  /** 將 viewport transform 套用到棋盤圖層 */
  private applyTransform(): void {
    const { scale, offsetX, offsetY } = this._viewport;
    this.boardLayer.scale.set(scale, scale);
    this.boardLayer.position.set(offsetX, offsetY);
  }
}
