// ─── 17.2 & 17.3 狀態機 ────────────────────────────────────
// transition(from, to) 函式與合法轉換表
// 不變式檢查：pause.previous、settings.returnTo、自我轉換

import type {
  AppState,
  AppStateKind,
  PauseState,
  SettingsState,
} from './app-state';

// ─── 合法轉換表 ─────────────────────────────────────────────

/**
 * 合法轉換表。
 *
 * settings 的目標為空陣列，因為 settings 的轉換是動態的
 * （由 returnTo 決定）。
 */
export const LEGAL_TRANSITIONS: Readonly<Record<AppStateKind, readonly AppStateKind[]>> = {
  splash:        ['menu'],
  menu:          ['worldMap', 'settings', 'credits', 'endless'],
  worldMap:      ['levelSelect', 'menu', 'settings', 'worldMap'],
  levelSelect:   ['game', 'worldMap'],
  game:          ['pause', 'levelComplete', 'levelFail', 'settings'],
  pause:         ['game', 'menu', 'levelSelect', 'settings'],
  levelComplete: ['levelSelect', 'worldMap', 'game'],
  levelFail:     ['game', 'levelSelect', 'worldMap'],
  endless:       ['pause', 'endlessEnd'],
  endlessEnd:    ['menu'],
  settings:      [], // 動態：由 returnTo 決定
  credits:       ['menu'],
} as const;

// ─── 不變式錯誤 ─────────────────────────────────────────────

export class IllegalTransitionError extends Error {
  constructor(
    public readonly from: AppStateKind,
    public readonly to: AppStateKind,
    message?: string,
  ) {
    super(message ?? `Illegal transition: ${from} → ${to}`);
    this.name = 'IllegalTransitionError';
  }
}

// ─── transition 函式 ────────────────────────────────────────

/**
 * 狀態機轉換函式。
 *
 * 這是改變應用程式狀態的**唯一**合法方式。
 * 所有轉換必須通過此函式，禁止直接賦值。
 *
 * 特殊處理：
 * 1. **settings**：進入 settings 時記錄 returnTo；離開 settings 時回到 returnTo。
 * 2. **pause**：進入 pause 時記錄 previous（僅能是 game 或 endless）。
 * 3. **自我轉換**：除 worldMap→worldMap（世界切換）外，禁止自我轉換。
 *
 * @param from 當前狀態
 * @param to 目標狀態
 * @returns 新的 AppState
 * @throws {IllegalTransitionError} 若轉換不合法
 */
export function transition(from: AppState, to: AppState): AppState {
  // ── 自我轉換檢查 ──────────────────────────────────────
  // worldMap→worldMap 是唯一允許的自我轉換（世界切換）
  if (from.kind === to.kind) {
    if (from.kind === 'worldMap' && to.kind === 'worldMap') {
      return to;
    }
    throw new IllegalTransitionError(
      from.kind,
      to.kind,
      `Self-transition not allowed: ${from.kind} → ${to.kind} (except worldMap)`,
    );
  }

  // ── settings 進入：記錄 returnTo ──────────────────────
  if (to.kind === 'settings') {
    // settings.returnTo 不能是 settings
    if (from.kind === 'settings') {
      throw new IllegalTransitionError(
        from.kind,
        to.kind,
        'settings.returnTo cannot be settings',
      );
    }
    // 驗證 from 可以轉換到 settings
    const allowed = LEGAL_TRANSITIONS[from.kind];
    if (!allowed.includes('settings')) {
      throw new IllegalTransitionError(from.kind, to.kind);
    }
    return { kind: 'settings', returnTo: from } as SettingsState;
  }

  // ── settings 離開：回到 returnTo ──────────────────────
  if (from.kind === 'settings') {
    const settingsState = from as SettingsState;
    // 離開 settings 時，目標必須與 returnTo 的 kind 一致
    if (to.kind !== settingsState.returnTo.kind) {
      throw new IllegalTransitionError(
        from.kind,
        to.kind,
        `settings can only return to ${settingsState.returnTo.kind}, not ${to.kind}`,
      );
    }
    return settingsState.returnTo;
  }

  // ── 一般轉換：查表 ───────────────────────────────────
  const allowed = LEGAL_TRANSITIONS[from.kind];
  if (!allowed.includes(to.kind)) {
    throw new IllegalTransitionError(from.kind, to.kind);
  }

  // ── pause 不變式：previous 僅能是 game 或 endless ────
  if (to.kind === 'pause') {
    if (from.kind !== 'game' && from.kind !== 'endless') {
      throw new IllegalTransitionError(
        from.kind,
        to.kind,
        `pause.previous can only be game or endless, got ${from.kind}`,
      );
    }
    return { kind: 'pause', previous: from } as PauseState;
  }

  return to;
}

// ─── 輔助函式 ───────────────────────────────────────────────

/**
 * 檢查從 from 到 to 的轉換是否合法（不拋錯）。
 */
export function canTransition(from: AppState, to: AppState): boolean {
  try {
    transition(from, to);
    return true;
  } catch {
    return false;
  }
}

/**
 * 取得從指定狀態可以轉換到的所有 kind。
 * settings 狀態回傳其 returnTo 的 kind。
 */
export function getValidTargets(from: AppState): readonly AppStateKind[] {
  if (from.kind === 'settings') {
    return [(from as SettingsState).returnTo.kind];
  }
  return LEGAL_TRANSITIONS[from.kind];
}
