// ─── 輸入系統 (Input System) ────────────────────────────────
// 統一指標抽象（mouse/touch/pen）+ 鍵盤事件分發
// 將原始瀏覽器事件正規化為 NormalizedPointer，
// 並將鍵盤事件轉發給 KeybindManager。

import type { ViewportInfo } from '../rendering/viewport';
import type { BoardInput } from './board-input';
import type { KeybindManager } from './keybinds';

// ─── 28.1 統一指標抽象 ─────────────────────────────────────

/** 正規化指標事件 */
export interface NormalizedPointer {
  /** 螢幕 X 座標（相對於 canvas） */
  x: number;
  /** 螢幕 Y 座標（相對於 canvas） */
  y: number;
  /** 指標 ID（用於多點觸控區分） */
  pointerId: number;
  /** 事件類型 */
  type: 'down' | 'up' | 'move' | 'cancel';
  /** 輸入來源 */
  source: 'mouse' | 'touch' | 'pen';
}

/** 指標來源映射：PointerEvent.pointerType → NormalizedPointer.source */
function mapPointerSource(pointerType: string): NormalizedPointer['source'] {
  switch (pointerType) {
    case 'touch':
      return 'touch';
    case 'pen':
      return 'pen';
    default:
      return 'mouse';
  }
}

/** 事件類型映射：PointerEvent.type → NormalizedPointer.type */
function mapPointerType(eventType: string): NormalizedPointer['type'] {
  switch (eventType) {
    case 'pointerdown':
      return 'down';
    case 'pointerup':
      return 'up';
    case 'pointermove':
      return 'move';
    case 'pointercancel':
      return 'cancel';
    default:
      return 'move';
  }
}

// ─── InputSystem ───────────────────────────────────────────

/** InputSystem 建構選項 */
export interface InputSystemOptions {
  /** 目標 canvas 元素 */
  canvas: HTMLCanvasElement;
  /** 棋盤輸入處理器 */
  boardInput: BoardInput;
  /** 快捷鍵管理器（可選，延遲綁定） */
  keybindManager?: KeybindManager;
}

/**
 * 統一輸入系統。
 *
 * 職責：
 * 1. 綁定 pointer 事件（pointerdown/move/up/cancel）到 canvas
 * 2. 將原始 PointerEvent 正規化為 NormalizedPointer
 * 3. 將正規化事件轉發給 BoardInput
 * 4. 將 keydown 事件轉發給 KeybindManager
 * 5. 管理事件監聽器的生命週期
 */
export class InputSystem {
  private readonly canvas: HTMLCanvasElement;
  private readonly boardInput: BoardInput;
  private keybindManager: KeybindManager | null;
  private bound = false;

  constructor(options: InputSystemOptions) {
    this.canvas = options.canvas;
    this.boardInput = options.boardInput;
    this.keybindManager = options.keybindManager ?? null;
  }

  /** 設定或更換 KeybindManager（延遲綁定） */
  setKeybindManager(manager: KeybindManager): void {
    this.keybindManager = manager;
  }

  /** 綁定所有事件監聽器 */
  bind(): void {
    if (this.bound) return;
    this.bound = true;

    // Pointer 事件
    this.canvas.addEventListener('pointerdown', this._onPointer);
    this.canvas.addEventListener('pointermove', this._onPointer);
    this.canvas.addEventListener('pointerup', this._onPointer);
    this.canvas.addEventListener('pointercancel', this._onPointer);

    // 防止觸控裝置的預設行為（捲動、縮放）
    this.canvas.addEventListener('touchstart', this._preventDefault, { passive: false });
    this.canvas.addEventListener('touchmove', this._preventDefault, { passive: false });

    // 防止右鍵選單
    this.canvas.addEventListener('contextmenu', this._preventDefault);

    // 鍵盤事件綁定在 document 上
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  /** 解除所有事件監聽器 */
  unbind(): void {
    if (!this.bound) return;
    this.bound = false;

    this.canvas.removeEventListener('pointerdown', this._onPointer);
    this.canvas.removeEventListener('pointermove', this._onPointer);
    this.canvas.removeEventListener('pointerup', this._onPointer);
    this.canvas.removeEventListener('pointercancel', this._onPointer);

    this.canvas.removeEventListener('touchstart', this._preventDefault);
    this.canvas.removeEventListener('touchmove', this._preventDefault);
    this.canvas.removeEventListener('contextmenu', this._preventDefault);

    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
  }

  /** 是否已綁定 */
  get isBound(): boolean {
    return this.bound;
  }

  /** 銷毀輸入系統 */
  dispose(): void {
    this.unbind();
    this.keybindManager = null;
  }

  // ─── 事件處理器 ──────────────────────────────────────

  /** 正規化 PointerEvent 並轉發給 BoardInput */
  private _onPointer = (e: PointerEvent): void => {
    const normalized: NormalizedPointer = {
      x: e.offsetX,
      y: e.offsetY,
      pointerId: e.pointerId,
      type: mapPointerType(e.type),
      source: mapPointerSource(e.pointerType),
    };
    this.boardInput.handlePointer(normalized);
  };

  /** 轉發 keydown 給 KeybindManager */
  private _onKeyDown = (e: KeyboardEvent): void => {
    // 忽略輸入框內的按鍵
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    this.keybindManager?.handleKeyDown(e);
  };

  /** 轉發 keyup 給 KeybindManager */
  private _onKeyUp = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    this.keybindManager?.handleKeyUp(e);
  };

  /** 阻止預設行為 */
  private _preventDefault = (e: Event): void => {
    e.preventDefault();
  };
}
