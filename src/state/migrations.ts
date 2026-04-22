// ─── 18.3 版本遷移函式 ─────────────────────────────────────
// migrate()：驗證資料、版本遷移、未知版本 escrow

import { defaultSaveState, SAVE_KEY } from './save-state';
import type { SaveState } from './save-state';

/**
 * 檢查值是否為非 null 物件（非陣列）。
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 遷移存檔資料至當前版本。
 *
 * - 非物件或缺少 version → 回傳 defaultSaveState()
 * - version === 1 → 回傳原資料（as-is）
 * - 未知版本 → escrow 保存至 `gem.save.v1.escrow.{timestamp}`，回傳 defaultSaveState()
 *
 * @param data 從 localStorage 解析的原始資料
 * @returns 遷移後的 SaveState
 */
export function migrate(data: unknown): SaveState {
  // 非物件 → 預設
  if (!isObject(data)) {
    return defaultSaveState();
  }

  const version = data.version;

  // 缺少或非數字的 version → 預設
  if (typeof version !== 'number') {
    return defaultSaveState();
  }

  // 當前版本 → 直接回傳
  if (version === 1) {
    return data as SaveState;
  }

  // 未知版本 → escrow 保存，啟用新存檔
  console.warn(`未知存檔版本 ${version}；保留至 escrow，啟用新存檔。`);
  try {
    const escrowKey = `${SAVE_KEY}.escrow.${Date.now()}`;
    localStorage.setItem(escrowKey, JSON.stringify(data));
  } catch {
    // localStorage 滿或被封鎖 → 忽略，繼續
    console.warn('無法保存 escrow 存檔');
  }

  return defaultSaveState();
}
