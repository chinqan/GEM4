// ─── SFX 播放器 (SFX Player) ────────────────────────────────
// 統一的音效播放介面，直接使用外包交付的音效檔案。
// 提供便捷函式供 board-animator 等模組直接呼叫。

import { Howl } from 'howler';
import type { SfxEvent } from './sfx-catalog';
import { DEFAULT_SFX_CATALOG } from './sfx-catalog';
import type { SfxEntry } from './sfx-catalog';

// ─── 常數 ──────────────────────────────────────────────────

/**
 * Effective SFX volume (master × sfx, zero when either is muted).
 * Updated by AudioSystem on every AudioBuses change — see
 * AudioSystem constructor's `buses.onChange(...)` subscription.
 */
let _globalVolume = 1;

/** Set by AudioSystem when AudioBuses state changes. */
export function setGlobalSfxVolume(volume: number): void {
  _globalVolume = Math.max(0, Math.min(1, volume));
}

// ─── 內部狀態 ──────────────────────────────────────────────

/** 快取的 Howl 實例（每個變體一個） */
const _howlCache = new Map<string, Howl>();

/** 上次播放的變體 index（避免連續重複） */
const _lastVariant = new Map<SfxEvent, number>();

function getOrCreateHowl(src: string[]): Howl {
  const key = src.join('|');
  let howl = _howlCache.get(key);
  if (!howl) {
    howl = new Howl({ src, preload: true });
    _howlCache.set(key, howl);
  }
  return howl;
}

// ─── 核心播放 ──────────────────────────────────────────────

/**
 * 播放指定事件 ID 的音效。
 * 多變體時隨機選取（避免連續重複）。
 */
export function playEvent(eventId: string, volumeOverride?: number, rateOverride?: number): void {
  // Honour AudioBuses mute / volume — effective volume of 0 means
  // master-mute, sfx-mute, or both volumes at 0. Skip the play() entirely.
  if (_globalVolume <= 0) return;

  const entry = DEFAULT_SFX_CATALOG[eventId as SfxEvent];
  if (!entry) return;

  // 選取變體
  const variants = entry.src;
  let idx = 0;
  if (variants.length > 1) {
    const last = _lastVariant.get(eventId as SfxEvent) ?? -1;
    do {
      idx = Math.floor(Math.random() * variants.length);
    } while (idx === last && variants.length > 1);
  }
  _lastVariant.set(eventId as SfxEvent, idx);

  const howl = getOrCreateHowl(variants[idx]);
  const baseVol = entry.baseVolume ?? 1;
  const volume = (volumeOverride ?? baseVol) * _globalVolume;

  let rate = rateOverride ?? 1;
  if (!rateOverride && entry.pitchVariance) {
    rate = 1 + (Math.random() * 2 - 1) * entry.pitchVariance;
  }

  const id = howl.play();
  howl.volume(volume, id);
  howl.rate(rate, id);
}

/** 重新載入設定（相容介面，現在是 no-op） */
export function reloadConfig(): void {
  // No-op — 外包音效不需要動態重載
}

// ─── 預載 ──────────────────────────────────────────────────

/** 預載所有音效 */
export async function preloadAllMapped(): Promise<void> {
  for (const entry of Object.values(DEFAULT_SFX_CATALOG)) {
    if (!entry) continue;
    for (const src of entry.src) {
      getOrCreateHowl(src);
    }
  }
}

// ─── 公開 API（相容 board-animator 的介面）──────────────────

/** 播放消除音效 — 依 chain 選擇對應事件 */
export function playMatchSfx(count: number, chain: number): void {
  playEvent('match.base');

  // 連鎖階層 stinger
  if (chain >= 8) {
    playEvent('chain.wow');
  } else if (chain >= 5) {
    playEvent('chain.tier3');
  } else if (chain >= 3) {
    playEvent('chain.tier2');
  } else if (chain >= 2) {
    playEvent('chain.tier1');
  }
}

/** 播放合法交換音效 */
export function playSwap(): void {
  playEvent('swap.valid');
}

/** 播放非法交換音效 */
export function playInvalid(): void {
  playEvent('swap.invalid');
}

/** 播放連鎖音效 */
export function playCascade(): void {
  playEvent('cascade.loop');
}

/** 播放過關音效 */
export function playLevelComplete(): void {
  playEvent('level.complete');
}

/** 播放失敗音效 */
export function playLevelFail(): void {
  playEvent('level.fail');
}

/** 播放組合音效（依 combo 類型選擇對應音效） */
export function playCombo(comboType?: string): void {
  switch (comboType) {
    case 'bomb.bomb':
      playEvent('combo.bomb.bomb');
      break;
    case 'line.line':
      playEvent('combo.line.line');
      break;
    case 'bomb.line':
      playEvent('combo.bomb.line');
      break;
    case 'bomb.colour':
      playEvent('combo.bomb.colour');
      break;
    case 'line.colour':
    case 'colour.line':
      playEvent('combo.line.colour');
      break;
    case 'colour.colour':
      playEvent('combo.colour.colour');
      break;
    case 'colour.bomb':
      playEvent('combo.bomb.colour');
      break;
    default:
      playEvent('combo.bomb.bomb');
      break;
  }
}

/** 播放特殊寶石生成音效（依類型） */
export function playSpecialSpawn(kind?: string): void {
  switch (kind) {
    case 'lineH':
    case 'lineV':
      playEvent('special.spawn.line');
      break;
    case 'colour':
      playEvent('special.spawn.colour');
      break;
    case 'area':
    default:
      playEvent('special.spawn.bomb');
      break;
  }
}

/** 播放特殊寶石啟動音效 */
export function playSpecialActivate(): void {
  playEvent('special.activate.bomb');
}

/**
 * 依特殊寶石類型播放對應的啟動音效。
 * @param kind 'lineH' | 'lineV' | 'area' | 'colour' | 'combo'
 */
export function playSpecialByKind(kind: string): void {
  switch (kind) {
    case 'area':
      playEvent('special.activate.bomb');
      break;
    case 'lineH':
      playEvent('special.activate.line.h');
      break;
    case 'lineV':
      playEvent('special.activate.line.v');
      break;
    case 'colour':
      playEvent('special.activate.colour');
      break;
    case 'combo':
      playEvent('combo.bomb.bomb');
      break;
    default:
      playEvent('special.activate.bomb');
      break;
  }
}

/** 播放 UI 點擊音效 */
export function playUiClick(): void {
  playEvent('ui.click.soft');
}

/** 播放關卡開始音效 */
export function playLevelStart(): void {
  playEvent('level.start');
}

/** 預載音效（相容 synth-sfx 的 preloadStoneSfx） */
export function preloadStoneSfx(): Promise<void> {
  return preloadAllMapped();
}

/** 播放石頭碎裂音效（相容介面，改為播放 match.base） */
export function playStone(_level: number): void {
  playEvent('match.base');
}

// ─── 新增：未實作事件的便捷函式 ─────────────────────────────

/** 播放 match.special（特殊寶石消除強調音） */
export function playMatchSpecial(): void {
  playEvent('match.special');
}

/** 播放星星授予音效 */
export function playStarGrant(star: 1 | 2 | 3): void {
  playEvent(`stars.grant${star}`);
}

/** 播放世界完成音效 */
export function playWorldComplete(): void {
  playEvent('world.complete');
}

/** 播放新關卡解鎖音效 */
export function playNewLevelUnlock(): void {
  playEvent('new.level.unlock');
}

/** 播放重洗音效 */
export function playReshuffle(): void {
  playEvent('ui.reshuffle');
}

/** 播放 UI 點擊音效（強） */
export function playUiClickStrong(): void {
  playEvent('ui.click.strong');
}

/** 播放 UI hover 音效 */
export function playUiHover(): void {
  playEvent('ui.hover');
}

/** 播放 Modal 開啟音效 */
export function playModalOpen(): void {
  playEvent('ui.modal.open');
}

/** 播放 Modal 關閉音效 */
export function playModalClose(): void {
  playEvent('ui.modal.close');
}

/** 播放 Toast 顯示音效 */
export function playToastShow(): void {
  playEvent('ui.toast.show');
}

/** 播放 Toast 隱藏音效 */
export function playToastHide(): void {
  playEvent('ui.toast.hide');
}

/** 播放頁面切換音效 */
export function playPageTransition(): void {
  playEvent('ui.page.transition');
}
