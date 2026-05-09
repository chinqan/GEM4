// ─── SFX 事件映射 (SFX Catalog) ────────────────────────────
// 將遊戲事件映射到音效，管理 Howl 實例與 voice cap。
// 支援每個事件多個變體（variants），播放時隨機選取。

import { Howl } from 'howler';
import type { AudioBuses } from './buses';

// ─── 型別 ──────────────────────────────────────────────────

/** SFX 事件名稱 — 對應外包規格書的完整事件清單 */
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
  // 特殊寶石 — 生成
  | 'special.spawn.bomb'
  | 'special.spawn.line'
  | 'special.spawn.colour'
  // 特殊寶石 — 啟動
  | 'special.activate.bomb'
  | 'special.activate.line.h'
  | 'special.activate.line.v'
  | 'special.activate.colour'
  // 組合
  | 'combo.bomb.bomb'
  | 'combo.line.line'
  | 'combo.bomb.line'
  | 'combo.bomb.colour'
  | 'combo.line.colour'
  | 'combo.colour.colour'
  // 狀態 / 進程
  | 'level.start'
  | 'level.complete'
  | 'level.fail'
  | 'stars.grant1'
  | 'stars.grant2'
  | 'stars.grant3'
  | 'world.complete'
  | 'new.level.unlock'
  | 'ui.reshuffle'
  // UI
  | 'ui.click.soft'
  | 'ui.click.strong'
  | 'ui.hover'
  | 'ui.modal.open'
  | 'ui.modal.close'
  | 'ui.toast.show'
  | 'ui.toast.hide'
  | 'ui.page.transition';

/** 單一 SFX 條目的定義 */
export interface SfxEntry {
  /** 音效檔案路徑列表（多個 = 變體，播放時隨機選取） */
  src: string[][];
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

// ─── 常數 ──────────────────────────────────────────────────

/** 音效檔案的 base path（相對於 public/） */
const SFX_BASE = '/assets/audio/sfx/';

/** 建立單一變體的 src 陣列（wav） */
function sfxSrc(filename: string): string[] {
  return [SFX_BASE + filename];
}

// ─── 預設 SFX 目錄（外包交付音效）─────────────────────────────

/**
 * 預設 SFX 目錄定義。
 * 基於外包交付的 51 個 wav 檔案，每個事件可有多個變體。
 * 播放時隨機選取一個變體，避免重複疲勞。
 */
export const DEFAULT_SFX_CATALOG: SfxCatalogDef = {
  // ── 板面互動 ──
  'gem.pick': {
    src: [
      sfxSrc('gem_pick_01.wav'),
      sfxSrc('gem_pick_02.wav'),
      sfxSrc('gem_pick_03.wav'),
    ],
    voiceCap: 4,
    pitchVariance: 0.03,
  },
  'gem.hover': {
    src: [sfxSrc('gem_hover_01.wav')],
    voiceCap: 2,
    baseVolume: 0.3,
  },
  'swap.valid': {
    src: [
      sfxSrc('swap_valid_01.wav'),
      sfxSrc('swap_valid_02.wav'),
    ],
    voiceCap: 4,
  },
  'swap.invalid': {
    src: [sfxSrc('swap_invalid_01.wav')],
    voiceCap: 2,
  },

  // ── 消除 ──
  'match.base': {
    src: [
      sfxSrc('match_base_01.wav'),
      sfxSrc('match_base_02.wav'),
      sfxSrc('match_base_03.wav'),
      sfxSrc('match_base_04.wav'),
      sfxSrc('match_base_05.wav'),
      sfxSrc('match_base_06.wav'),
    ],
    voiceCap: 6,
    pitchVariance: 0.02,
  },
  'match.special': {
    src: [
      sfxSrc('match_special_01.wav'),
      sfxSrc('match_special_02.wav'),
    ],
    voiceCap: 4,
  },
  'cascade.loop': {
    src: [sfxSrc('cascade_loop_01.wav')],
    voiceCap: 1,
    loop: true,
  },

  // ── 連鎖階層 ──
  'chain.tier1': {
    src: [sfxSrc('chain_tier1_01.wav')],
    voiceCap: 2,
  },
  'chain.tier2': {
    src: [sfxSrc('chain_tier2_01.wav')],
    voiceCap: 2,
  },
  'chain.tier3': {
    src: [sfxSrc('chain_tier3_01.wav')],
    voiceCap: 2,
  },
  'chain.wow': {
    src: [sfxSrc('chain_wow_01.wav')],
    voiceCap: 1,
  },

  // ── 特殊寶石 — 生成 ──
  'special.spawn.bomb': {
    src: [sfxSrc('special_spawn_bomb_01.wav')],
    voiceCap: 3,
  },
  'special.spawn.line': {
    src: [sfxSrc('special_spawn_line_01.wav')],
    voiceCap: 3,
  },
  'special.spawn.colour': {
    src: [sfxSrc('special_spawn_colour_01.wav')],
    voiceCap: 2,
  },

  // ── 特殊寶石 — 啟動 ──
  'special.activate.bomb': {
    src: [
      sfxSrc('special_activate_bomb_01.wav'),
      sfxSrc('special_activate_bomb_02.wav'),
    ],
    voiceCap: 3,
  },
  'special.activate.line.h': {
    src: [sfxSrc('special_activate_line_h_01.wav')],
    voiceCap: 3,
  },
  'special.activate.line.v': {
    src: [sfxSrc('special_activate_line_v_01.wav')],
    voiceCap: 3,
  },
  'special.activate.colour': {
    src: [sfxSrc('special_activate_colour_01.wav')],
    voiceCap: 2,
  },

  // ── 組合 ──
  'combo.bomb.bomb': {
    src: [sfxSrc('combo_bomb_bomb_01.wav')],
    voiceCap: 2,
  },
  'combo.line.line': {
    src: [sfxSrc('combo_line_line_01.wav')],
    voiceCap: 2,
  },
  'combo.bomb.line': {
    src: [sfxSrc('combo_bomb_line_01.wav')],
    voiceCap: 2,
  },
  'combo.bomb.colour': {
    src: [sfxSrc('combo_bomb_colour_01.wav')],
    voiceCap: 2,
  },
  'combo.line.colour': {
    src: [sfxSrc('combo_line_colour_01.wav')],
    voiceCap: 2,
  },
  'combo.colour.colour': {
    src: [sfxSrc('combo_colour_colour_01.wav')],
    voiceCap: 1,
  },

  // ── 狀態 / 進程 ──
  'level.start': {
    src: [sfxSrc('level_start_01.wav')],
    voiceCap: 1,
  },
  'level.complete': {
    src: [sfxSrc('level_complete_01.wav')],
    voiceCap: 1,
  },
  'level.fail': {
    src: [sfxSrc('level_fail_01.wav')],
    voiceCap: 1,
  },
  'stars.grant1': {
    src: [sfxSrc('stars_grant1_01.wav')],
    voiceCap: 1,
  },
  'stars.grant2': {
    src: [sfxSrc('stars_grant2_01.wav')],
    voiceCap: 1,
  },
  'stars.grant3': {
    src: [sfxSrc('stars_grant3_01.wav')],
    voiceCap: 1,
  },
  'world.complete': {
    src: [sfxSrc('world_complete_01.wav')],
    voiceCap: 1,
  },
  'new.level.unlock': {
    src: [sfxSrc('new_level_unlock_01.wav')],
    voiceCap: 1,
  },
  'ui.reshuffle': {
    src: [sfxSrc('ui_reshuffle_01.wav')],
    voiceCap: 1,
  },

  // ── UI ──
  'ui.click.soft': {
    src: [sfxSrc('ui_click_soft_01.wav')],
    voiceCap: 2,
  },
  'ui.click.strong': {
    src: [sfxSrc('ui_click_strong_01.wav')],
    voiceCap: 2,
  },
  'ui.hover': {
    src: [sfxSrc('ui_hover_01.wav')],
    voiceCap: 2,
    baseVolume: 0.4,
  },
  'ui.modal.open': {
    src: [sfxSrc('ui_modal_open_01.wav')],
    voiceCap: 1,
  },
  'ui.modal.close': {
    src: [sfxSrc('ui_modal_close_01.wav')],
    voiceCap: 1,
  },
  'ui.toast.show': {
    src: [sfxSrc('ui_toast_show_01.wav')],
    voiceCap: 1,
  },
  'ui.toast.hide': {
    src: [sfxSrc('ui_toast_hide_01.wav')],
    voiceCap: 1,
  },
  'ui.page.transition': {
    src: [sfxSrc('ui_page_transition_01.wav')],
    voiceCap: 1,
  },
};

// ─── 內部追蹤 ──────────────────────────────────────────────

/** 追蹤單一 SFX 變體的活躍 voice 數量 */
interface VariantTracker {
  howl: Howl;
  activeCount: number;
}

/** 追蹤一個 SFX 事件的所有變體 */
interface EventTracker {
  variants: VariantTracker[];
  entry: SfxEntry;
  /** 上次播放的變體 index（避免連續重複） */
  lastVariant: number;
}

// ─── SfxCatalog ────────────────────────────────────────────

/**
 * SFX 目錄管理器。
 *
 * - 延遲建立 Howl 實例（首次播放時才建立）
 * - 管理 voice cap（超過上限時靜默忽略）
 * - 套用 bus 音量到每次播放
 * - 支援音高隨機偏移
 * - 支援多變體隨機選取（避免連續重複）
 */
export class SfxCatalog {
  private trackers = new Map<SfxEvent, EventTracker>();
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
   * - 多變體時隨機選取（避免連續重複同一變體）
   */
  play(event: SfxEvent): void {
    const entry = this.catalogDef[event];
    if (!entry) return;

    const effectiveVolume = this.buses.effectiveSfxVolume;
    if (effectiveVolume <= 0) return;

    const tracker = this._getOrCreateTracker(event, entry);
    if (!tracker) return;

    // 計算所有變體的總 active count
    const totalActive = tracker.variants.reduce((sum, v) => sum + v.activeCount, 0);
    if (totalActive >= entry.voiceCap) return;

    // 選取變體（隨機，避免連續重複）
    const variantIndex = this._pickVariant(tracker);
    const variant = tracker.variants[variantIndex];
    tracker.lastVariant = variantIndex;

    const baseVol = entry.baseVolume ?? 1;
    const volume = baseVol * effectiveVolume;

    // 音高隨機偏移
    let rate = 1;
    if (entry.pitchVariance) {
      rate = 1 + (Math.random() * 2 - 1) * entry.pitchVariance;
    }

    variant.activeCount++;
    const id = variant.howl.play();
    variant.howl.volume(volume, id);
    variant.howl.rate(rate, id);
  }

  /**
   * 停止指定 SFX 事件的所有播放中音效。
   */
  stop(event: SfxEvent): void {
    const tracker = this.trackers.get(event);
    if (tracker) {
      for (const variant of tracker.variants) {
        variant.howl.stop();
        variant.activeCount = 0;
      }
    }
  }

  /** 停止所有 SFX */
  stopAll(): void {
    for (const tracker of this.trackers.values()) {
      for (const variant of tracker.variants) {
        variant.howl.stop();
        variant.activeCount = 0;
      }
    }
  }

  /** 銷毀所有 Howl 實例，釋放資源 */
  dispose(): void {
    for (const tracker of this.trackers.values()) {
      for (const variant of tracker.variants) {
        variant.howl.unload();
      }
    }
    this.trackers.clear();
  }

  // ─── 內部 ─────────────────────────────────────────────

  /** 選取變體 index（避免連續重複） */
  private _pickVariant(tracker: EventTracker): number {
    const count = tracker.variants.length;
    if (count === 1) return 0;

    // 隨機選取，但避免與上次相同
    let idx: number;
    do {
      idx = Math.floor(Math.random() * count);
    } while (idx === tracker.lastVariant && count > 1);
    return idx;
  }

  private _getOrCreateTracker(event: SfxEvent, entry: SfxEntry): EventTracker | null {
    let tracker = this.trackers.get(event);
    if (tracker) return tracker;

    // 延遲建立所有變體的 Howl 實例
    const variants: VariantTracker[] = entry.src.map((srcPaths) => {
      const howl = new Howl({
        src: srcPaths,
        loop: entry.loop ?? false,
        preload: true,
      });

      // 追蹤 voice 結束
      howl.on('end', () => {
        const t = this.trackers.get(event);
        if (t) {
          const v = t.variants.find(vt => vt.howl === howl);
          if (v && v.activeCount > 0) v.activeCount--;
        }
      });
      howl.on('stop', () => {
        const t = this.trackers.get(event);
        if (t) {
          const v = t.variants.find(vt => vt.howl === howl);
          if (v) v.activeCount = 0;
        }
      });

      return { howl, activeCount: 0 };
    });

    tracker = { variants, entry, lastVariant: -1 };
    this.trackers.set(event, tracker);
    return tracker;
  }
}
