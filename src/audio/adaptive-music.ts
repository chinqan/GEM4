// ─── 自適應音樂 (Adaptive Music) ────────────────────────────
// 垂直層疊系統：3-4 層同步音軌，依 intensity 驅動音量。
// 層間使用 lerp 平滑過渡。

import { Howl } from 'howler';
import type { AudioBuses } from './buses';

// ─── 型別 ──────────────────────────────────────────────────

/** 單一音樂層定義 */
export interface MusicLayerDef {
  /** 音效檔案路徑 */
  src: string[];
  /** intensity 門檻：超過此值時淡入，低於時淡出 */
  threshold: number;
}

/** 音樂曲目定義（包含所有層） */
export interface MusicTrackDef {
  /** 曲目 ID */
  id: string;
  /** 各層定義（index 0 = 基底層，永遠播放） */
  layers: MusicLayerDef[];
  /** 是否循環，預設 true */
  loop?: boolean;
}

// ─── 常數 ──────────────────────────────────────────────────

/** 預設層門檻值 — 對應 design.md §8.2 */
const DEFAULT_THRESHOLDS = [0, 0.3, 0.6, 0.85];

/** lerp 平滑係數 — 每次 update 的插值比例 (0..1)
 *  值越大過渡越快。0.08 ≈ 150ms 到達 90% 目標值 (60fps) */
const LERP_FACTOR = 0.08;

/** 音量差異低於此值時視為已到達目標，停止 lerp */
const VOLUME_EPSILON = 0.005;

// ─── 內部狀態 ──────────────────────────────────────────────

interface LayerState {
  howl: Howl;
  /** 當前實際音量 (0..1) */
  currentVolume: number;
  /** 目標音量 (0..1) */
  targetVolume: number;
  /** intensity 門檻 */
  threshold: number;
}

// ─── AdaptiveMusic ─────────────────────────────────────────

/**
 * 垂直層疊自適應音樂系統。
 *
 * 每首曲目有 3-4 個同步播放的音軌層：
 * - Layer 0（基底）：永遠播放
 * - Layer 1：intensity > 0.3 時淡入
 * - Layer 2：intensity > 0.6 時淡入
 * - Layer 3：intensity > 0.85 時淡入
 *
 * 所有層同步播放（同 BPM、調性），透過音量控制實現層疊效果。
 * 使用 lerp 平滑過渡避免突兀的音量跳變。
 */
export class AdaptiveMusic {
  private layers: LayerState[] = [];
  private intensity = 0;
  private buses: AudioBuses;
  private playing = false;
  private currentTrackId: string | null = null;

  constructor(buses: AudioBuses) {
    this.buses = buses;
  }

  // ─── 曲目控制 ─────────────────────────────────────────

  /**
   * 載入並播放一首曲目。
   * 若已有曲目播放中，先停止再載入新曲目。
   */
  loadAndPlay(track: MusicTrackDef): void {
    // 停止當前曲目
    if (this.playing) {
      this.stop();
    }

    this.currentTrackId = track.id;
    const shouldLoop = track.loop !== false;

    this.layers = track.layers.map((layerDef, i) => {
      const howl = new Howl({
        src: layerDef.src,
        loop: shouldLoop,
        volume: 0, // 初始靜音，由 update 控制淡入
        preload: true,
      });

      return {
        howl,
        currentVolume: 0,
        targetVolume: i === 0 ? 1 : 0, // 基底層立即播放
        threshold: layerDef.threshold,
      };
    });

    // 同步啟動所有層
    for (const layer of this.layers) {
      layer.howl.play();
    }

    this.playing = true;
  }

  /** 停止所有層並釋放資源 */
  stop(): void {
    for (const layer of this.layers) {
      layer.howl.stop();
      layer.howl.unload();
    }
    this.layers = [];
    this.playing = false;
    this.currentTrackId = null;
    this.intensity = 0;
  }

  /** 暫停所有層 */
  pause(): void {
    for (const layer of this.layers) {
      layer.howl.pause();
    }
  }

  /** 恢復所有層 */
  resume(): void {
    for (const layer of this.layers) {
      layer.howl.play();
    }
  }

  // ─── Intensity 控制 ───────────────────────────────────

  /**
   * 設定當前 intensity 值 (0..1)。
   * 由 AudioSystem 在每幀 update 時呼叫。
   * 實際音量變化在 update() 中以 lerp 平滑過渡。
   */
  setIntensity(value: number): void {
    this.intensity = Math.max(0, Math.min(1, value));
    this._updateTargetVolumes();
  }

  /** 取得當前 intensity */
  getIntensity(): number {
    return this.intensity;
  }

  /** 取得當前曲目 ID */
  getTrackId(): string | null {
    return this.currentTrackId;
  }

  /** 是否正在播放 */
  isPlaying(): boolean {
    return this.playing;
  }

  // ─── 每幀更新 ─────────────────────────────────────────

  /**
   * 每幀呼叫，以 lerp 平滑過渡各層音量。
   * 應由 AudioSystem.update() 呼叫。
   */
  update(): void {
    if (!this.playing || this.layers.length === 0) return;

    const musicVolume = this.buses.effectiveMusicVolume;

    for (const layer of this.layers) {
      // Lerp 朝目標音量過渡
      const diff = layer.targetVolume - layer.currentVolume;
      if (Math.abs(diff) < VOLUME_EPSILON) {
        layer.currentVolume = layer.targetVolume;
      } else {
        layer.currentVolume += diff * LERP_FACTOR;
      }

      // 套用 music bus 有效音量
      const effectiveVolume = layer.currentVolume * musicVolume;
      layer.howl.volume(effectiveVolume);
    }
  }

  // ─── 內部 ─────────────────────────────────────────────

  /**
   * 根據當前 intensity 更新各層的目標音量。
   * Layer 0 永遠為 1（基底層）。
   * 其他層在 intensity >= threshold 時目標為 1，否則為 0。
   */
  private _updateTargetVolumes(): void {
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (i === 0) {
        // 基底層永遠播放
        layer.targetVolume = 1;
      } else {
        layer.targetVolume = this.intensity >= layer.threshold ? 1 : 0;
      }
    }
  }

  /** 銷毀並釋放所有資源 */
  dispose(): void {
    this.stop();
  }
}

// ─── 工具函式 ──────────────────────────────────────────────

/**
 * 建立預設的音樂曲目定義。
 * 使用 design.md §8.2 的預設門檻值 [0, 0.3, 0.6, 0.85]。
 *
 * @param id 曲目 ID
 * @param basePaths 各層音效檔案路徑（不含副檔名），依序為 L0..L3
 * @param formats 支援的格式副檔名，預設 ['ogg', 'mp3']
 */
export function createTrackDef(
  id: string,
  basePaths: string[],
  formats: string[] = ['ogg', 'mp3'],
): MusicTrackDef {
  const layers: MusicLayerDef[] = basePaths.map((basePath, i) => ({
    src: formats.map((fmt) => `${basePath}.${fmt}`),
    threshold: DEFAULT_THRESHOLDS[i] ?? 1,
  }));

  return { id, layers, loop: true };
}
