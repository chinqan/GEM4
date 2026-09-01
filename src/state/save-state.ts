// ─── 18.1 SaveState 型別與 defaultSaveState ────────────────
// ─── 18.2 SaveManager（load、save、debounce、flush）────────
// ─── 18.4 export/import JSON 功能 ──────────────────────────
// ─── 18.5 reset 功能 ───────────────────────────────────────

// ─── 常數 ───────────────────────────────────────────────────

/** localStorage 存檔鍵名 */
export const SAVE_KEY = 'gem.save.v1';

/** 防抖寫入延遲（毫秒） */
export const DEBOUNCE_MS = 500;

/** 當前存檔版本 */
export const CURRENT_VERSION = 1;

// ─── SaveState 型別定義 ────────────────────────────────────

/** 單一關卡紀錄 */
export interface LevelRecord {
  stars: 0 | 1 | 2 | 3;
  highScore: number;
  attempts: number;
}

/** 音訊設定 */
export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  /** 環境音音量（GDD 08§4）；舊存檔可能缺少，讀取端以 ?? 補預設 0.4 */
  ambienceVolume?: number;
  muted: boolean;
}

/** 圖形預設 */
export type GraphicsPreset = 'low' | 'medium' | 'high';

/** 無障礙設定 */
export interface AccessibilitySettings {
  colorBlindMode: 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';
  highContrast: boolean;
  longPressConfirm: boolean;
}

/** 遊玩設定 */
export interface GameplaySettings {
  hintDelayMs: number;
  autoActivateSpecial: boolean;
  showDebugPanel: boolean;
}

/** 設定 */
export interface Settings {
  audio: AudioSettings;
  graphicsPreset: GraphicsPreset;
  accessibility: AccessibilitySettings;
  gameplay: GameplaySettings;
  language: string;
}

/** Endless 最佳紀錄（各類前 10） */
export interface EndlessBestRecords {
  highScores: number[];
  longestChains: number[];
  mostSpecials: number[];
}

/** 進度 */
export interface Progress {
  currentWorld: number;
  unlockedLevels: number[];
  totalStars: number;
}

/** 完整存檔狀態 */
export interface SaveState {
  version: number;
  levels: Record<number, LevelRecord>;
  settings: Settings;
  tutorialMilestones: string[];
  endlessBest: EndlessBestRecords;
  progress: Progress;
}

// ─── defaultSaveState ──────────────────────────────────────

/** 建立預設存檔狀態 */
export function defaultSaveState(): SaveState {
  return {
    version: CURRENT_VERSION,
    levels: {},
    settings: {
      audio: {
        masterVolume: 1.0,
        musicVolume: 0.8,
        sfxVolume: 1.0,
        ambienceVolume: 0.4,
        muted: false,
      },
      graphicsPreset: 'high',
      accessibility: {
        colorBlindMode: 'none',
        highContrast: false,
        longPressConfirm: false,
      },
      gameplay: {
        hintDelayMs: 5000,
        autoActivateSpecial: false,
        showDebugPanel: false,
      },
      language: 'zh-TW',
    },
    tutorialMilestones: [],
    endlessBest: {
      highScores: [],
      longestChains: [],
      mostSpecials: [],
    },
    progress: {
      currentWorld: 1,
      unlockedLevels: [1],
      totalStars: 0,
    },
  };
}

// ─── SaveManager ───────────────────────────────────────────

import { migrate } from './migrations';

/**
 * 存檔管理器。
 * - load()：從 localStorage 讀取並遷移
 * - save()：防抖寫入（500ms），可選立即寫入
 * - flush()：立即寫入 localStorage，處理配額錯誤
 */
export class SaveManager {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingState: SaveState | null = null;

  /** 從 localStorage 載入存檔，失敗時回傳預設值 */
  load(): SaveState {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSaveState();
      const parsed: unknown = JSON.parse(raw);
      return migrate(parsed);
    } catch {
      return defaultSaveState();
    }
  }

  /**
   * 儲存存檔狀態。
   * @param state 要儲存的狀態
   * @param immediate 是否立即寫入（關鍵事件如關卡完成、設定變更）
   */
  save(state: SaveState, immediate = false): void {
    this.pendingState = state;
    if (immediate) {
      this.cancelDebounce();
      this.flush();
      return;
    }
    // 已有排程中的 debounce，不重複排程
    if (this.debounceTimer !== null) return;
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.flush();
    }, DEBOUNCE_MS);
  }

  /** 立即寫入 localStorage */
  flush(): void {
    if (this.pendingState === null) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.pendingState));
      this.pendingState = null;
    } catch {
      // localStorage 滿或被封鎖 → 警告，遊戲繼續
      console.warn('無法儲存進度：localStorage 可能已滿或被封鎖');
    }
  }

  /** 取消排程中的防抖計時器 */
  private cancelDebounce(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /** 銷毀管理器，清除計時器 */
  dispose(): void {
    this.cancelDebounce();
    this.pendingState = null;
  }
}

// ─── export/import JSON ────────────────────────────────────

/**
 * 匯出存檔為 JSON 字串。
 * @param state 要匯出的存檔狀態
 * @returns JSON 字串
 */
export function exportSave(state: SaveState): string {
  return JSON.stringify(state);
}

/**
 * 匯入 JSON 字串為存檔狀態。
 * 解析、驗證、遷移後回傳 SaveState。
 * @param json JSON 字串
 * @returns 遷移後的 SaveState
 * @throws 無效 JSON 或資料時拋出描述性錯誤
 */
export function importSave(json: string): SaveState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('匯入失敗：無效的 JSON 格式');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('匯入失敗：資料必須是物件');
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.version !== 'number') {
    throw new Error('匯入失敗：缺少有效的 version 欄位');
  }

  return migrate(parsed);
}

// ─── reset ─────────────────────────────────────────────────

/**
 * 重置存檔：清除 localStorage 並回傳預設存檔狀態。
 * 二次確認為 UI 層責任，此處僅處理資料層。
 * @returns 預設存檔狀態
 */
export function resetSave(): SaveState {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    console.warn('無法清除 localStorage 存檔');
  }
  return defaultSaveState();
}
