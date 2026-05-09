// ─── SFX 播放器 (SFX Player) ────────────────────────────────
// 統一的音效播放介面，直接使用外包交付的音效檔案。
// 提供便捷函式供 board-animator 等模組直接呼叫。

import { Howl } from 'howler';
import type { SfxEvent } from './sfx-catalog';
import { DEFAULT_SFX_CATALOG } from './sfx-catalog';
import type { SfxEntry } from './sfx-catalog';

// ─── 常數 ──────────────────────────────────────────────────

/** 全域音量（可由 AudioSystem 覆蓋） */
let _globalVolume = 1;

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

/** 播放組合音效 */
export function playCombo(): void {
  // 通用 combo — 使用 bomb.bomb 作為 fallback
  playEvent('combo.bomb.bomb');
}

/** 播放特殊寶石生成音效 */
export function playSpecialSpawn(): void {
  playEvent('special.spawn.bomb');
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
