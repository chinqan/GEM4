// ─── 音訊系統 (Audio System) ────────────────────────────────
// Howler.js 包裝，整合 SFX 目錄、自適應音樂、音量控制。
// 處理 autoplay unlock、暫停/恢復、tab 可見性變更。

import { Howler } from 'howler';
import type { EventBus } from '../state/events';
import { SfxCatalog } from './sfx-catalog';
import type { SfxEvent } from './sfx-catalog';
import { AdaptiveMusic } from './adaptive-music';
import type { MusicTrackDef } from './adaptive-music';
import { AudioBuses } from './buses';
import type { BusSnapshot } from './buses';

// ─── 型別 ──────────────────────────────────────────────────

/** AudioSystem 建構選項 */
export interface AudioSystemOptions {
  /** 預設匯流排設定（從存檔還原） */
  busSnapshot?: Partial<BusSnapshot>;
  /** 自訂 SFX 目錄定義 */
  sfxCatalogDef?: ConstructorParameters<typeof SfxCatalog>[1];
}

// ─── AudioSystem ───────────────────────────────────────────

/**
 * 音訊系統主控制器。
 *
 * 職責：
 * 1. Howler.js autoplay unlock（透過使用者手勢）
 * 2. 監聽 EventBus 事件，觸發對應 SFX
 * 3. 管理自適應音樂的 intensity 更新
 * 4. 音量控制（master/music/sfx）與靜音切換
 * 5. 暫停/恢復音訊（遊戲暫停、tab 隱藏）
 */
export class AudioSystem {
  /** 音訊匯流排管理器 */
  readonly buses: AudioBuses;
  /** SFX 目錄 */
  readonly sfx: SfxCatalog;
  /** 自適應音樂 */
  readonly music: AdaptiveMusic;

  private unlocked = false;
  private suspended = false;
  private intensity = 0;
  private eventBus: EventBus | null = null;
  private unsubscribers: Array<() => void> = [];

  // autoplay unlock 的事件處理器參照（用於移除）
  private _unlockHandler: (() => void) | null = null;
  // visibility change 處理器參照
  private _visibilityHandler: (() => void) | null = null;

  constructor(options: AudioSystemOptions = {}) {
    this.buses = new AudioBuses(options.busSnapshot);
    this.sfx = new SfxCatalog(this.buses, options.sfxCatalogDef);
    this.music = new AdaptiveMusic(this.buses);

    this._setupAutoplayUnlock();
    this._setupVisibilityHandler();
  }

  // ─── 26.1 Autoplay Unlock ─────────────────────────────

  /**
   * 設定 autoplay unlock。
   * 在使用者首次互動（click/touchstart/keydown）時
   * 恢復 Howler 的 AudioContext。
   */
  private _setupAutoplayUnlock(): void {
    this._unlockHandler = () => {
      if (this.unlocked) return;
      // Howler.ctx 是 Howler 內部的 AudioContext
      const ctx = Howler.ctx;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
      this.unlocked = true;
      // 移除所有 unlock 監聽器
      this._removeUnlockListeners();
    };

    document.addEventListener('click', this._unlockHandler);
    document.addEventListener('touchstart', this._unlockHandler);
    document.addEventListener('keydown', this._unlockHandler);
  }

  private _removeUnlockListeners(): void {
    if (!this._unlockHandler) return;
    document.removeEventListener('click', this._unlockHandler);
    document.removeEventListener('touchstart', this._unlockHandler);
    document.removeEventListener('keydown', this._unlockHandler);
  }

  /** 是否已解鎖 autoplay */
  get isUnlocked(): boolean {
    return this.unlocked;
  }

  // ─── EventBus 整合 ────────────────────────────────────

  /**
   * 連接 EventBus，開始監聯遊戲事件並觸發對應 SFX。
   * 可在 AudioSystem 建構後再呼叫（延遲綁定）。
   */
  connectEventBus(eventBus: EventBus): void {
    // 先斷開舊的
    this.disconnectEventBus();
    this.eventBus = eventBus;
    this._setupEventListeners();
  }

  /** 斷開 EventBus 監聽 */
  disconnectEventBus(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.eventBus = null;
  }

  /**
   * 設定 EventBus 事件監聽器。
   * 將遊戲事件映射到 SFX 播放。
   */
  private _setupEventListeners(): void {
    if (!this.eventBus) return;

    const bus = this.eventBus;

    // 消除事件 → 依 chain 數選擇音效
    this.unsubscribers.push(
      bus.on('match.landed', (e) => {
        this.sfx.play('match.base');
        // 連鎖階層 stinger
        if (e.chain >= 8) {
          this.sfx.play('chain.wow');
        } else if (e.chain >= 5) {
          this.sfx.play('chain.tier3');
        } else if (e.chain >= 3) {
          this.sfx.play('chain.tier2');
        } else if (e.chain >= 2) {
          this.sfx.play('chain.tier1');
        }
      }),
    );

    // 特殊寶石生成 — 依類型播放對應音效
    this.unsubscribers.push(
      bus.on('special.spawned', (e) => {
        switch (e.type) {
          case 'area':
            this.sfx.play('special.spawn.bomb');
            break;
          case 'lineH':
          case 'lineV':
            this.sfx.play('special.spawn.line');
            break;
          case 'colour':
            this.sfx.play('special.spawn.colour');
            break;
          default:
            this.sfx.play('special.spawn.bomb');
            break;
        }
      }),
    );

    // 特殊寶石啟動 — 依類型播放對應音效
    this.unsubscribers.push(
      bus.on('special.activated', (e) => {
        switch (e.type) {
          case 'area':
            this.sfx.play('special.activate.bomb');
            break;
          case 'lineH':
            this.sfx.play('special.activate.line.h');
            break;
          case 'lineV':
            this.sfx.play('special.activate.line.v');
            break;
          case 'colour':
            this.sfx.play('special.activate.colour');
            break;
          default:
            this.sfx.play('special.activate.bomb');
            break;
        }
      }),
    );

    // 組合觸發 — 依組合類型播放對應音效
    this.unsubscribers.push(
      bus.on('combo.triggered', (e) => {
        switch (e.type) {
          case 'bomb.bomb':
            this.sfx.play('combo.bomb.bomb');
            break;
          case 'line.line':
            this.sfx.play('combo.line.line');
            break;
          case 'bomb.line':
            this.sfx.play('combo.bomb.line');
            break;
          case 'colour.bomb':
            this.sfx.play('combo.bomb.colour');
            break;
          case 'colour.line':
            this.sfx.play('combo.line.colour');
            break;
          case 'colour.colour':
            this.sfx.play('combo.colour.colour');
            break;
          default:
            this.sfx.play('combo.bomb.bomb');
            break;
        }
      }),
    );

    // 無效交換
    this.unsubscribers.push(
      bus.on('swap.invalid', () => {
        this.sfx.play('swap.invalid');
      }),
    );

    // 重洗觸發
    this.unsubscribers.push(
      bus.on('reshuffle.triggered', () => {
        this.sfx.play('ui.reshuffle');
      }),
    );

    // Intensity 更新 → 驅動自適應音樂
    this.unsubscribers.push(
      bus.on('intensity.updated', (e) => {
        this.intensity = e.value;
      }),
    );
  }

  // ─── 26.2 直接 SFX 播放 ──────────────────────────────

  /** 直接播放指定 SFX 事件（不經 EventBus） */
  playSfx(event: SfxEvent): void {
    this.sfx.play(event);
  }

  // ─── 26.3 音量控制 ────────────────────────────────────

  /** 設定 master 音量 (0..1) */
  setMasterVolume(v: number): void {
    this.buses.setMasterVolume(v);
  }

  /** 設定 music 音量 (0..1) */
  setMusicVolume(v: number): void {
    this.buses.setMusicVolume(v);
  }

  /** 設定 sfx 音量 (0..1) */
  setSfxVolume(v: number): void {
    this.buses.setSfxVolume(v);
  }

  /** 切換全域靜音（M 鍵） */
  toggleMute(): boolean {
    return this.buses.toggleMasterMute();
  }

  /** 設定全域靜音狀態 */
  setMute(muted: boolean): void {
    this.buses.setMasterMute(muted);
  }

  /** 是否全域靜音 */
  get isMuted(): boolean {
    return this.buses.isGlobalMuted;
  }

  // ─── 音樂控制 ─────────────────────────────────────────

  /** 載入並播放音樂曲目 */
  playMusic(track: MusicTrackDef): void {
    this.music.loadAndPlay(track);
  }

  /** 停止音樂 */
  stopMusic(): void {
    this.music.stop();
  }

  // ─── 26.4 暫停/恢復 ──────────────────────────────────

  /**
   * 暫停所有音訊。
   * 暫停 Howler AudioContext 並暫停自適應音樂。
   */
  suspend(): void {
    if (this.suspended) return;
    this.suspended = true;

    this.music.pause();

    // 暫停 Howler AudioContext
    const ctx = Howler.ctx;
    if (ctx && ctx.state === 'running') {
      ctx.suspend();
    }
  }

  /**
   * 恢復所有音訊。
   * 恢復 Howler AudioContext 並恢復自適應音樂。
   */
  resume(): void {
    if (!this.suspended) return;
    this.suspended = false;

    // 恢復 Howler AudioContext
    if (this.unlocked) {
      const ctx = Howler.ctx;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    }

    this.music.resume();
  }

  /** 是否處於暫停狀態 */
  get isSuspended(): boolean {
    return this.suspended;
  }

  // ─── Visibility Change 處理 ───────────────────────────

  /**
   * 監聽 tab 可見性變更。
   * tab 隱藏時自動暫停音訊，tab 顯示時恢復。
   */
  private _setupVisibilityHandler(): void {
    this._visibilityHandler = () => {
      if (document.hidden) {
        this.suspend();
      } else {
        this.resume();
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);
  }

  // ─── 每幀更新 ─────────────────────────────────────────

  /**
   * 每幀呼叫。
   * 更新自適應音樂的 intensity 並執行 lerp 過渡。
   */
  update(): void {
    this.music.setIntensity(this.intensity);
    this.music.update();
  }

  // ─── 生命週期 ─────────────────────────────────────────

  /** 銷毀音訊系統，釋放所有資源 */
  dispose(): void {
    this.disconnectEventBus();
    this._removeUnlockListeners();

    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }

    this.sfx.dispose();
    this.music.dispose();
  }
}
