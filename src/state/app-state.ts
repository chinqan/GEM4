// ─── 17.1 AppState 聯集型別 ─────────────────────────────────
// 應用程式狀態的 discriminated union，以 `kind` 欄位區分。
// 部分狀態攜帶額外資料（pause.previous、settings.returnTo 等）。

import type { LevelResult, EndlessResult } from '../types';

// ─── AppStateKind ───────────────────────────────────────────

/** 所有應用程式狀態的 kind 字面值聯集 */
export type AppStateKind =
  | 'splash'
  | 'menu'
  | 'worldMap'
  | 'levelSelect'
  | 'game'
  | 'pause'
  | 'levelComplete'
  | 'levelFail'
  | 'endless'
  | 'endlessEnd'
  | 'settings'
  | 'credits';

// ─── 個別狀態型別 ───────────────────────────────────────────

export interface SplashState {
  kind: 'splash';
}

export interface MenuState {
  kind: 'menu';
}

export interface WorldMapState {
  kind: 'worldMap';
  worldId: number;
}

export interface LevelSelectState {
  kind: 'levelSelect';
  worldId: number;
  levelId: number;
}

export interface GameState {
  kind: 'game';
  levelId: number;
  seed?: bigint;
}

/** pause 狀態必須記錄暫停前的狀態（僅能是 game 或 endless） */
export interface PauseState {
  kind: 'pause';
  previous: GameState | EndlessState;
}

export interface LevelCompleteState {
  kind: 'levelComplete';
  result?: LevelResult;
}

export interface LevelFailState {
  kind: 'levelFail';
  result?: LevelResult;
}

export interface EndlessState {
  kind: 'endless';
  seed?: bigint;
}

export interface EndlessEndState {
  kind: 'endlessEnd';
  result?: EndlessResult;
}

/** settings 狀態必須記錄返回目標（不能是 settings 自身） */
export interface SettingsState {
  kind: 'settings';
  returnTo: Exclude<AppState, SettingsState>;
}

export interface CreditsState {
  kind: 'credits';
}

// ─── AppState 聯集型別 ─────────────────────────────────────

/** 應用程式狀態 discriminated union */
export type AppState =
  | SplashState
  | MenuState
  | WorldMapState
  | LevelSelectState
  | GameState
  | PauseState
  | LevelCompleteState
  | LevelFailState
  | EndlessState
  | EndlessEndState
  | SettingsState
  | CreditsState;

// ─── 工具函式 ───────────────────────────────────────────────

/** 所有 AppStateKind 值的陣列（用於測試與驗證） */
export const ALL_STATE_KINDS: readonly AppStateKind[] = [
  'splash',
  'menu',
  'worldMap',
  'levelSelect',
  'game',
  'pause',
  'levelComplete',
  'levelFail',
  'endless',
  'endlessEnd',
  'settings',
  'credits',
] as const;
