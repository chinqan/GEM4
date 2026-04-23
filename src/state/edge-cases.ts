// ─── 37. 邊界情況處理 ───────────────────────────────────────
// 37.1 tab 切出/切入處理（visibilitychange → 自動暫停 + 繼續覆蓋層）
// 37.2 beforeunload 確認（遊玩中關閉頁籤）
// 37.3 localStorage 滿/封鎖降級（toast 警告）
// 37.4 瀏覽器重新整理後的狀態恢復
// 37.5 多頁籤 localStorage 競態處理（timestamp 解決）

import type { SaveState } from './save-state';
import { SAVE_KEY, SaveManager } from './save-state';

// ─── 37.1 Tab 可見性處理 ──────────────────────────────────

/** Tab 可見性變化回呼 */
export interface VisibilityCallbacks {
  /** tab 隱藏時呼叫（自動暫停） */
  onHidden?: () => void;
  /** tab 恢復可見時呼叫（顯示繼續覆蓋層） */
  onVisible?: (awayMs: number) => void;
}

/**
 * 監聽 tab 可見性變化。
 *
 * 當 tab 隱藏時自動暫停遊戲；
 * 當 tab 恢復可見時顯示「繼續？」覆蓋層。
 *
 * @param callbacks 回呼函式
 * @returns 取消監聽函式
 */
export function setupVisibilityHandler(callbacks: VisibilityCallbacks): () => void {
  let hiddenAt = 0;

  const handler = () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      callbacks.onHidden?.();
    } else {
      const awayMs = hiddenAt > 0 ? Date.now() - hiddenAt : 0;
      hiddenAt = 0;
      callbacks.onVisible?.(awayMs);
    }
  };

  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}

// ─── 37.2 beforeunload 確認 ────────────────────────────────

/**
 * 設定 beforeunload 確認。
 *
 * 當遊戲進行中（isPlaying 回傳 true）且使用者嘗試關閉頁籤時，
 * 顯示瀏覽器原生確認對話框。
 *
 * @param isPlaying 判斷是否正在遊玩的函式
 * @returns 取消監聽函式
 */
export function setupBeforeUnloadHandler(isPlaying: () => boolean): () => void {
  const handler = (e: BeforeUnloadEvent) => {
    if (isPlaying()) {
      e.preventDefault();
      // 現代瀏覽器忽略自訂訊息，但仍需設定 returnValue
      // eslint-disable-next-line no-param-reassign
      e.returnValue = '';
    }
  };

  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}

// ─── 37.3 localStorage 滿/封鎖降級 ────────────────────────

/** localStorage 狀態 */
export type StorageStatus = 'available' | 'full' | 'blocked';

/**
 * 檢測 localStorage 是否可用。
 *
 * 嘗試寫入一個測試值來確認 localStorage 是否可用。
 * 區分「可用」、「已滿」和「被封鎖」三種狀態。
 *
 * @returns localStorage 狀態
 */
export function checkStorageStatus(): StorageStatus {
  const testKey = '__gem_storage_test__';
  try {
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return 'available';
  } catch (e) {
    // DOMException: QuotaExceededError → 已滿
    if (e instanceof DOMException && (
      e.code === 22 ||
      e.code === 1014 ||
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      return 'full';
    }
    // SecurityError 或其他 → 被封鎖
    return 'blocked';
  }
}

/**
 * 安全寫入 localStorage。
 *
 * 寫入失敗時回傳錯誤狀態而非拋出例外。
 *
 * @param key localStorage 鍵
 * @param value 要寫入的值
 * @returns 寫入結果
 */
export function safeSetItem(
  key: string,
  value: string,
): { success: boolean; status: StorageStatus } {
  try {
    localStorage.setItem(key, value);
    return { success: true, status: 'available' };
  } catch (e) {
    if (e instanceof DOMException && (
      e.code === 22 ||
      e.code === 1014 ||
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      return { success: false, status: 'full' };
    }
    return { success: false, status: 'blocked' };
  }
}

/**
 * 安全讀取 localStorage。
 *
 * @param key localStorage 鍵
 * @returns 值，或 null（不存在或被封鎖）
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// ─── 37.4 瀏覽器重新整理後的狀態恢復 ──────────────────────

/** 恢復狀態的 session key */
const SESSION_STATE_KEY = 'gem.session.state';

/** 可恢復的 session 狀態 */
export interface SessionRecoveryData {
  /** 上次活躍的 app state kind */
  lastStateKind: string;
  /** 上次活躍的關卡 ID（若在遊玩中） */
  lastLevelId?: number;
  /** 是否在 Endless 模式中 */
  wasInEndless?: boolean;
  /** 時間戳 */
  timestamp: number;
}

/**
 * 儲存 session 恢復資料。
 *
 * 使用 sessionStorage（頁籤關閉時自動清除）。
 */
export function saveSessionState(data: SessionRecoveryData): void {
  try {
    sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage 不可用 → 忽略
  }
}

/**
 * 載入 session 恢復資料。
 *
 * @returns 恢復資料，或 null（無資料或已過期）
 */
export function loadSessionState(): SessionRecoveryData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STATE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as SessionRecoveryData;

    // 超過 30 分鐘的 session 資料視為過期
    const MAX_AGE_MS = 30 * 60 * 1000;
    if (Date.now() - data.timestamp > MAX_AGE_MS) {
      sessionStorage.removeItem(SESSION_STATE_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * 清除 session 恢復資料。
 */
export function clearSessionState(): void {
  try {
    sessionStorage.removeItem(SESSION_STATE_KEY);
  } catch {
    // 忽略
  }
}

// ─── 37.5 多頁籤 localStorage 競態處理 ────────────────────

/** 多頁籤同步回呼 */
export interface StorageSyncCallbacks {
  /** 其他頁籤更新了存檔時呼叫 */
  onExternalSaveUpdate?: (newState: SaveState) => void;
  /** 偵測到競態衝突時呼叫 */
  onConflict?: (localTimestamp: number, remoteTimestamp: number) => void;
}

/** 存檔時間戳 key */
const SAVE_TIMESTAMP_KEY = `${SAVE_KEY}.ts`;

/**
 * 設定多頁籤 localStorage 同步。
 *
 * 監聽 `storage` 事件（僅在其他頁籤修改 localStorage 時觸發）。
 * 使用時間戳解決競態：較新的寫入勝出。
 *
 * @param callbacks 回呼函式
 * @returns 取消監聽函式
 */
export function setupStorageSync(callbacks: StorageSyncCallbacks): () => void {
  const handler = (e: StorageEvent) => {
    // 只關心存檔 key 的變更
    if (e.key !== SAVE_KEY) return;

    if (e.newValue === null) {
      // 存檔被刪除（重置）
      return;
    }

    try {
      const newState = JSON.parse(e.newValue) as SaveState;
      callbacks.onExternalSaveUpdate?.(newState);
    } catch {
      // 無效 JSON → 忽略
    }
  };

  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

/**
 * 帶時間戳的存檔寫入。
 *
 * 寫入前檢查時間戳，若遠端較新則不覆蓋。
 *
 * @param state 要儲存的狀態
 * @returns 是否成功寫入
 */
export function saveWithTimestamp(state: SaveState): boolean {
  const now = Date.now();

  // 檢查遠端時間戳
  const remoteTs = safeGetItem(SAVE_TIMESTAMP_KEY);
  if (remoteTs) {
    const remoteTimestamp = parseInt(remoteTs, 10);
    if (!isNaN(remoteTimestamp) && remoteTimestamp > now) {
      // 遠端較新 → 不覆蓋
      return false;
    }
  }

  // 寫入存檔
  const result = safeSetItem(SAVE_KEY, JSON.stringify(state));
  if (!result.success) return false;

  // 寫入時間戳
  safeSetItem(SAVE_TIMESTAMP_KEY, String(now));
  return true;
}

/**
 * 取得存檔時間戳。
 */
export function getSaveTimestamp(): number | null {
  const ts = safeGetItem(SAVE_TIMESTAMP_KEY);
  if (!ts) return null;
  const parsed = parseInt(ts, 10);
  return isNaN(parsed) ? null : parsed;
}

// ─── 整合：EdgeCaseManager ────────────────────────────────

/** EdgeCaseManager 建構選項 */
export interface EdgeCaseManagerOptions {
  /** 判斷是否正在遊玩 */
  isPlaying: () => boolean;
  /** tab 隱藏時的回呼 */
  onPause?: () => void;
  /** tab 恢復時的回呼 */
  onResume?: (awayMs: number) => void;
  /** localStorage 問題時的 toast 回呼 */
  onStorageWarning?: (status: StorageStatus) => void;
  /** 其他頁籤更新存檔時的回呼 */
  onExternalSaveUpdate?: (newState: SaveState) => void;
}

/**
 * 邊界情況管理器。
 *
 * 統一管理所有邊界情況的監聽器，提供 dispose() 一次清除。
 */
export class EdgeCaseManager {
  private cleanups: Array<() => void> = [];
  private _storageStatus: StorageStatus;

  constructor(options: EdgeCaseManagerOptions) {
    // 37.1 Tab 可見性
    this.cleanups.push(
      setupVisibilityHandler({
        onHidden: options.onPause,
        onVisible: options.onResume,
      }),
    );

    // 37.2 beforeunload
    this.cleanups.push(
      setupBeforeUnloadHandler(options.isPlaying),
    );

    // 37.3 localStorage 狀態檢測
    this._storageStatus = checkStorageStatus();
    if (this._storageStatus !== 'available') {
      options.onStorageWarning?.(this._storageStatus);
    }

    // 37.5 多頁籤同步
    this.cleanups.push(
      setupStorageSync({
        onExternalSaveUpdate: options.onExternalSaveUpdate,
      }),
    );
  }

  /** 目前 localStorage 狀態 */
  get storageStatus(): StorageStatus {
    return this._storageStatus;
  }

  /** 重新檢測 localStorage 狀態 */
  recheckStorage(): StorageStatus {
    this._storageStatus = checkStorageStatus();
    return this._storageStatus;
  }

  /** 銷毀所有監聽器 */
  dispose(): void {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups = [];
  }
}
