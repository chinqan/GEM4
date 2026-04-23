// ─── 快捷鍵系統 (Keybinds) ─────────────────────────────────
// 鍵盤導航、方向鍵游標移動、Space/Enter 選取與交換、
// ESC 暫停、M 靜音、P 暫停/繼續、Tab/Shift+Tab UI 焦點循環、
// 可配置快捷鍵與 press-to-bind UI。

import type { CellPos } from '../types';
import type { CommandQueue } from '../game/runtime/game-loop';
import type { BoardInput } from './board-input';

// ─── 快捷鍵動作定義 ────────────────────────────────────────

/** 所有可綁定的快捷鍵動作 */
export type KeyAction =
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
  | 'select'        // Space/Enter：選取或交換
  | 'pause'         // ESC / P：暫停/繼續
  | 'mute'          // M：靜音切換
  | 'focusNext'     // Tab：下一個 UI 焦點
  | 'focusPrev';    // Shift+Tab：上一個 UI 焦點

/** 快捷鍵綁定映射：動作 → 按鍵碼陣列 */
export type KeybindMap = Record<KeyAction, string[]>;

/** 所有 KeyAction 值的陣列 */
export const ALL_KEY_ACTIONS: readonly KeyAction[] = [
  'moveUp',
  'moveDown',
  'moveLeft',
  'moveRight',
  'select',
  'pause',
  'mute',
  'focusNext',
  'focusPrev',
] as const;

// ─── 預設快捷鍵 ────────────────────────────────────────────

/** 預設快捷鍵綁定 */
export function defaultKeybinds(): KeybindMap {
  return {
    moveUp: ['ArrowUp', 'KeyW'],
    moveDown: ['ArrowDown', 'KeyS'],
    moveLeft: ['ArrowLeft', 'KeyA'],
    moveRight: ['ArrowRight', 'KeyD'],
    select: ['Space', 'Enter'],
    pause: ['Escape', 'KeyP'],
    mute: ['KeyM'],
    focusNext: ['Tab'],
    focusPrev: ['ShiftTab'],
  };
}

/**
 * 將 KeyboardEvent 轉換為內部按鍵碼。
 * 使用 event.code 作為基礎，Shift+Tab 特殊處理為 'ShiftTab'。
 */
export function eventToKeyCode(e: KeyboardEvent): string {
  if (e.code === 'Tab' && e.shiftKey) return 'ShiftTab';
  return e.code;
}

// ─── 回呼介面 ──────────────────────────────────────────────

/** KeybindManager 的外部回呼 */
export interface KeybindCallbacks {
  /** 暫停/繼續切換 */
  onPause?: () => void;
  /** 靜音切換 */
  onMute?: () => void;
  /** UI 焦點循環（direction: 1 = next, -1 = prev） */
  onFocusCycle?: (direction: 1 | -1) => void;
}

// ─── 29.5 Press-to-bind 狀態 ──────────────────────────────

/** Press-to-bind 回呼：使用者按下按鍵時呼叫 */
export type BindCallback = (keyCode: string) => void;

// ─── KeybindManager ────────────────────────────────────────

/** KeybindManager 建構選項 */
export interface KeybindManagerOptions {
  /** 棋盤輸入處理器 */
  boardInput: BoardInput;
  /** 指令佇列 */
  commandQueue: CommandQueue;
  /** 棋盤欄數 */
  boardWidth: number;
  /** 棋盤列數 */
  boardHeight: number;
  /** 初始快捷鍵綁定（從存檔還原） */
  keybinds?: KeybindMap;
  /** 外部回呼 */
  callbacks?: KeybindCallbacks;
}

/**
 * 快捷鍵管理器。
 *
 * 職責：
 * 1. 方向鍵棋盤游標移動（29.1）
 * 2. Space/Enter 選取與交換（29.2）
 * 3. ESC 暫停、M 靜音、P 暫停/繼續（29.3）
 * 4. Tab/Shift+Tab UI 焦點循環（29.4）
 * 5. 可配置快捷鍵與 press-to-bind UI（29.5）
 *
 * 由 InputSystem 轉發 keydown/keyup 事件。
 */
export class KeybindManager {
  private readonly boardInput: BoardInput;
  private readonly commandQueue: CommandQueue;
  private boardWidth: number;
  private boardHeight: number;

  /** 當前快捷鍵綁定 */
  private keybinds: KeybindMap;

  /** 反向映射：按鍵碼 → 動作（快取，keybinds 變更時重建） */
  private reverseMap: Map<string, KeyAction> = new Map();

  /** 外部回呼 */
  private callbacks: KeybindCallbacks;

  /** 鍵盤游標位置 */
  private cursorPos: CellPos = [0, 0];

  /** 是否啟用鍵盤輸入 */
  private _enabled = true;

  /** 29.5 press-to-bind 模式 */
  private _bindingAction: KeyAction | null = null;
  private _bindCallback: BindCallback | null = null;

  constructor(options: KeybindManagerOptions) {
    this.boardInput = options.boardInput;
    this.commandQueue = options.commandQueue;
    this.boardWidth = options.boardWidth;
    this.boardHeight = options.boardHeight;
    this.keybinds = options.keybinds ?? defaultKeybinds();
    this.callbacks = options.callbacks ?? {};
    this._buildReverseMap();
  }

  // ─── 公開 API ────────────────────────────────────────

  /** 更新棋盤尺寸 */
  updateBoardSize(width: number, height: number): void {
    this.boardWidth = width;
    this.boardHeight = height;
    // 確保游標在範圍內
    this.cursorPos = [
      Math.min(this.cursorPos[0], width - 1),
      Math.min(this.cursorPos[1], height - 1),
    ];
  }

  /** 設定回呼 */
  setCallbacks(callbacks: KeybindCallbacks): void {
    this.callbacks = callbacks;
  }

  /** 啟用/停用鍵盤輸入 */
  set enabled(value: boolean) {
    this._enabled = value;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /** 取得目前游標位置 */
  get cursor(): CellPos {
    return this.cursorPos;
  }

  /** 設定游標位置 */
  setCursor(pos: CellPos): void {
    this.cursorPos = [
      Math.max(0, Math.min(pos[0], this.boardWidth - 1)),
      Math.max(0, Math.min(pos[1], this.boardHeight - 1)),
    ];
  }

  /** 取得目前快捷鍵綁定（唯讀副本） */
  getKeybinds(): Readonly<KeybindMap> {
    return { ...this.keybinds };
  }

  // ─── 29.5 可配置快捷鍵 ──────────────────────────────

  /**
   * 設定指定動作的快捷鍵。
   * @param action 要設定的動作
   * @param keys 新的按鍵碼陣列
   */
  setKeybind(action: KeyAction, keys: string[]): void {
    this.keybinds[action] = [...keys];
    this._buildReverseMap();
  }

  /**
   * 從完整映射還原快捷鍵（從存檔載入）。
   */
  loadKeybinds(keybinds: KeybindMap): void {
    this.keybinds = { ...keybinds };
    // 確保每個動作的 keys 是新陣列
    for (const action of ALL_KEY_ACTIONS) {
      this.keybinds[action] = [...(keybinds[action] ?? [])];
    }
    this._buildReverseMap();
  }

  /** 重置為預設快捷鍵 */
  resetKeybinds(): void {
    this.keybinds = defaultKeybinds();
    this._buildReverseMap();
  }

  /**
   * 進入 press-to-bind 模式。
   * 下一次按鍵將綁定到指定動作。
   *
   * @param action 要綁定的動作
   * @param callback 綁定完成後的回呼（傳入新按鍵碼）
   */
  startBinding(action: KeyAction, callback?: BindCallback): void {
    this._bindingAction = action;
    this._bindCallback = callback ?? null;
  }

  /** 取消 press-to-bind 模式 */
  cancelBinding(): void {
    this._bindingAction = null;
    this._bindCallback = null;
  }

  /** 是否處於 press-to-bind 模式 */
  get isBinding(): boolean {
    return this._bindingAction !== null;
  }

  /** 目前正在綁定的動作 */
  get bindingAction(): KeyAction | null {
    return this._bindingAction;
  }

  // ─── 事件處理 ────────────────────────────────────────

  /**
   * 處理 keydown 事件。
   * 由 InputSystem 呼叫。
   */
  handleKeyDown(e: KeyboardEvent): void {
    // 29.5 press-to-bind 模式
    if (this._bindingAction) {
      e.preventDefault();
      const keyCode = eventToKeyCode(e);
      // Escape 取消綁定
      if (keyCode === 'Escape') {
        this.cancelBinding();
        return;
      }
      // 綁定新按鍵
      const action = this._bindingAction;
      // 先移除其他動作中的相同按鍵（避免衝突）
      for (const a of ALL_KEY_ACTIONS) {
        this.keybinds[a] = this.keybinds[a].filter((k) => k !== keyCode);
      }
      // 加入新綁定
      this.keybinds[action].push(keyCode);
      this._buildReverseMap();
      const cb = this._bindCallback;
      this._bindingAction = null;
      this._bindCallback = null;
      cb?.(keyCode);
      return;
    }

    if (!this._enabled) return;

    const keyCode = eventToKeyCode(e);
    const action = this.reverseMap.get(keyCode);
    if (!action) return;

    // 阻止預設行為（方向鍵捲動、Tab 焦點切換、Space 捲動）
    if (
      action === 'moveUp' ||
      action === 'moveDown' ||
      action === 'moveLeft' ||
      action === 'moveRight' ||
      action === 'select' ||
      action === 'focusNext' ||
      action === 'focusPrev'
    ) {
      e.preventDefault();
    }

    this._executeAction(action);
  }

  /**
   * 處理 keyup 事件。
   * 目前無需處理，保留擴充空間。
   */
  handleKeyUp(_e: KeyboardEvent): void {
    // 目前無需處理 keyup
  }

  // ─── 動作執行 ────────────────────────────────────────

  private _executeAction(action: KeyAction): void {
    switch (action) {
      case 'moveUp':
        this._moveCursor(0, -1);
        break;
      case 'moveDown':
        this._moveCursor(0, 1);
        break;
      case 'moveLeft':
        this._moveCursor(-1, 0);
        break;
      case 'moveRight':
        this._moveCursor(1, 0);
        break;
      case 'select':
        this._handleSelect();
        break;
      case 'pause':
        this.callbacks.onPause?.();
        break;
      case 'mute':
        this.callbacks.onMute?.();
        break;
      case 'focusNext':
        this.callbacks.onFocusCycle?.(1);
        break;
      case 'focusPrev':
        this.callbacks.onFocusCycle?.(-1);
        break;
    }
  }

  // ─── 29.1 方向鍵棋盤游標移動 ────────────────────────

  private _moveCursor(dc: number, dr: number): void {
    const newCol = this.cursorPos[0] + dc;
    const newRow = this.cursorPos[1] + dr;

    // 邊界夾持（不環繞）
    const clampedCol = Math.max(0, Math.min(newCol, this.boardWidth - 1));
    const clampedRow = Math.max(0, Math.min(newRow, this.boardHeight - 1));

    this.cursorPos = [clampedCol, clampedRow];

    // 同步更新 BoardInput 的選取視覺（如果有選取中的格子）
    // 游標移動不自動選取，只移動游標位置
  }

  // ─── 29.2 Space/Enter 選取與交換 ────────────────────

  private _handleSelect(): void {
    const currentSelection = this.boardInput.selection;

    if (!currentSelection) {
      // 無選取：選取游標位置
      this.boardInput.setSelection(this.cursorPos);
    } else if (
      currentSelection[0] === this.cursorPos[0] &&
      currentSelection[1] === this.cursorPos[1]
    ) {
      // 再次選取同一格：取消選取
      this.boardInput.clearSelection();
    } else if (this._isAdjacent(currentSelection, this.cursorPos)) {
      // 選取相鄰格：交換
      this.boardInput.trySwap(currentSelection, this.cursorPos);
    } else {
      // 選取非相鄰格：改選游標位置
      this.boardInput.setSelection(this.cursorPos);
    }
  }

  // ─── 輔助方法 ────────────────────────────────────────

  /** 建立反向映射（按鍵碼 → 動作） */
  private _buildReverseMap(): void {
    this.reverseMap.clear();
    for (const action of ALL_KEY_ACTIONS) {
      for (const key of this.keybinds[action]) {
        // 後綁定的動作優先（覆蓋）
        this.reverseMap.set(key, action);
      }
    }
  }

  /** 判斷兩格是否相鄰 */
  private _isAdjacent(a: CellPos, b: CellPos): boolean {
    const dc = Math.abs(a[0] - b[0]);
    const dr = Math.abs(a[1] - b[1]);
    return (dc === 1 && dr === 0) || (dc === 0 && dr === 1);
  }
}
