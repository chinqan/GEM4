// ─── SFX 事件映射 (SFX Catalog) ────────────────────────────
// 將遊戲事件映射到音效，管理 Howl 實例與 voice cap。

import { Howl } from 'howler';
import type { AudioBuses } from './buses';

// ─── 型別 ──────────────────────────────────────────────────

/** SFX 事件名稱 — 對應 GDD 07§3 的完整 SFX 分類 */
export type SfxEvent =
  // 板面互動
  | 'gem.pick'
  | 'gem.hover'
  | 'swap.valid'
  | 'swap.invalid'
  // 消除
  | 'match.base'
  | 'match.special'
  | 'cascade.loop'
  // 連鎖階層
  | 'chain.tier1'
  | 'chain.tier2'
  | 'chain.tier3'
  | 'chain.wow'
  // 特殊寶石
  | 'special.spawn'
  | 'special.activate'
  // 組合
  | 'combo.blast'
  // 狀態
  | 'level.start'
  | 'level.complete'
  | 'level.fail'
  // UI
  | 'ui.click.soft'
  | 'ui.click.strong';

/** 單一 SFX 條目的定義 */
export interface SfxEntry {
  /** 音效檔案路徑（Howler 會自動偵測格式） */
  src: string[];
  /** 同時播放上限 */
  voiceCap: number;
  /** 基礎音量 (0..1)，預設 1 */
  baseVolume?: number;
  /** 是否循環 */
  loop?: boolean;
  /** 音高隨機偏移範圍 (±)，如 0.05 表示 ±5% */
  pitchVariance?: number;
}

/** SFX 目錄定義 — 事件名稱到音效條目的映射 */
export type SfxCatalogDef = Partial<Record<SfxEvent, SfxEntry>>;

// ─── 預設 SFX 目錄 ─────────────────────────────────────────

/**
 * 預設 SFX 目錄定義。
 *
 * 路徑指向 placeholder 音效（尚未建立實際資產時，
 * Howl 會靜默失敗，不影響遊戲運行）。
 */
export const DEFAULT_SFX_CATALOG: SfxCatalogDef = {
  'gem.pick': { src: ['audio/sfx/gem-pick.ogg', 'audio/sfx/gem-pick.mp3'], voiceCap: 4, pitchVariance: 0.05 },
  'gem.hover': { src: ['audio/sfx/gem-hover.ogg', 'audio/sfx/gem-hover.mp3'], voiceCap: 2, baseVolume: 0.3 },
  'swap.valid': { src: ['audio/sfx/swap-valid.ogg', 'audio/sfx/swap-valid.mp3'], voiceCap: 4 },
  'swap.invalid': { src: ['audio/sfx/swap-invalid.ogg', 'audio/sfx/swap-invalid.mp3'], voiceCap: 2 },
  'match.base': { src: ['audio/sfx/match-base.ogg', 'audio/sfx/match-base.mp3'], voiceCap: 6 },
  'match.special': { src: ['audio/sfx/match-special.ogg', 'audio/sfx/match-special.mp3'], voiceCap: 4 },
  'cascade.loop': { src: ['audio/sfx/cascade-loop.ogg', 'audio/sfx/cascade-loop.mp3'], voiceCap: 1, loop: true },
  'chain.tier1': { src: ['audio/sfx/chain-tier1.ogg', 'audio/sfx/chain-tier1.mp3'], voiceCap: 2 },
  'chain.tier2': { src: ['audio/sfx/chain-tier2.ogg', 'audio/sfx/chain-tier2.mp3'], voiceCap: 2 },
  'chain.tier3': { src: ['audio/sfx/chain-tier3.ogg', 'audio/sfx/chain-tier3.mp3'], voiceCap: 2 },
  'chain.wow': { src: ['audio/sfx/chain-wow.ogg', 'audio/sfx/chain-wow.mp3'], voiceCap: 1 },
  'special.spawn': { src: ['audio/sfx/special-spawn.ogg', 'audio/sfx/special-spawn.mp3'], voiceCap: 3 },
  'special.activate': { src: ['audio/sfx/special-activate.ogg', 'audio/sfx/special-activate.mp3'], voiceCap: 3 },
  'combo.blast': { src: ['audio/sfx/combo-blast.ogg', 'audio/sfx/combo-blast.mp3'], voiceCap: 2 },
  'level.start': { src: ['audio/sfx/level-start.ogg', 'audio/sfx/level-start.mp3'], voiceCap: 1 },
  'level.complete': { src: ['audio/sfx/level-complete.ogg', 'audio/sfx/level-complete.mp3'], voiceCap: 1 },
  'level.fail': { src: ['audio/sfx/level-fail.ogg', 'audio/sfx/level-fail.mp3'], voiceCap: 1 },
  'ui.click.soft': { src: ['audio/sfx/ui-click-soft.ogg', 'audio/sfx/ui-click-soft.mp3'], voiceCap: 2 },
  'ui.click.strong': { src: ['audio/sfx/ui-click-strong.ogg', 'audio/sfx/ui-click-strong.mp3'], voiceCap: 2 },
};

// ─── 內部追蹤 ──────────────────────────────────────────────

/** 追蹤單一 SFX 的活躍 voice 數量 */
interface VoiceTracker {
  howl: Howl;
  entry: SfxEntry;
  activeCount: number;
}

// ─── SfxCatalog ────────────────────────────────────────────

/**
 * SFX 目錄管理器。
 *
 * - 延遲建立 Howl 實例（首次播放時才建立）
 * - 管理 voice cap（超過上限時靜默忽略）
 * - 套用 bus 音量到每次播放
 * - 支援音高隨機偏移
 */
export class SfxCatalog {
  private trackers = new Map<SfxEvent, VoiceTracker>();
  private catalogDef: SfxCatalogDef;
  private buses: AudioBuses;

  constructor(buses: AudioBuses, catalogDef?: SfxCatalogDef) {
    this.buses = buses;
    this.catalogDef = catalogDef ?? DEFAULT_SFX_CATALOG;
  }

  /**
   * 播放指定 SFX 事件的音效。
   *
   * - 若事件未定義於目錄中，靜默忽略
   * - 若超過 voice cap，靜默忽略
   * - 自動套用 sfx bus 有效音量
   */
  play(event: SfxEvent): void {
    const entry = this.catalogDef[event];
    if (!entry) return;

    const effectiveVolume = this.buses.effectiveSfxVolume;
    if (effectiveVolume <= 0) return;

    const tracker = this._getOrCreateTracker(event, entry);
    if (!tracker) return;

    // Voice cap 檢查
    if (tracker.activeCount >= entry.voiceCap) return;

    const baseVol = entry.baseVolume ?? 1;
    const volume = baseVol * effectiveVolume;

    // 音高隨機偏移
    let rate = 1;
    if (entry.pitchVariance) {
      rate = 1 + (Math.random() * 2 - 1) * entry.pitchVariance;
    }

    tracker.activeCount++;
    const id = tracker.howl.play();
    tracker.howl.volume(volume, id);
    tracker.howl.rate(rate, id);
  }

  /**
   * 停止指定 SFX 事件的所有播放中音效。
   */
  stop(event: SfxEvent): void {
    const tracker = this.trackers.get(event);
    if (tracker) {
      tracker.howl.stop();
      tracker.activeCount = 0;
    }
  }

  /** 停止所有 SFX */
  stopAll(): void {
    for (const tracker of this.trackers.values()) {
      tracker.howl.stop();
      tracker.activeCount = 0;
    }
  }

  /** 銷毀所有 Howl 實例，釋放資源 */
  dispose(): void {
    for (const tracker of this.trackers.values()) {
      tracker.howl.unload();
    }
    this.trackers.clear();
  }

  // ─── 內部 ─────────────────────────────────────────────

  private _getOrCreateTracker(event: SfxEvent, entry: SfxEntry): VoiceTracker | null {
    let tracker = this.trackers.get(event);
    if (tracker) return tracker;

    // 延遲建立 Howl 實例
    const howl = new Howl({
      src: entry.src,
      loop: entry.loop ?? false,
      preload: true,
      // 不設定 volume — 每次 play 時動態設定
    });

    // 追蹤 voice 結束
    howl.on('end', () => {
      const t = this.trackers.get(event);
      if (t && t.activeCount > 0) t.activeCount--;
    });
    howl.on('stop', () => {
      const t = this.trackers.get(event);
      if (t) t.activeCount = 0;
    });

    tracker = { howl, entry, activeCount: 0 };
    this.trackers.set(event, tracker);
    return tracker;
  }
}
