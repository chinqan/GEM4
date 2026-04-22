import { Container, Graphics, BlurFilter, ColorMatrixFilter } from 'pixi.js';
import type { LayerRefs } from './app-layers';
import type { PresetLevel } from './design-tokens';
import {
  GRAPHICS_PRESETS,
  GLOW_BLUR_STRENGTH,
  BLOOM_BLUR_STRENGTH,
  BLOOM_ALPHA,
  SHOCKWAVE_MAX_RADIUS,
  SHOCKWAVE_LINE_WIDTH,
  CELL_SIZE,
  CHAIN_SATURATION_PULSE_MS,
  CHAIN_SATURATION_THRESHOLD,
  CHAIN_SATURATION_BOOST,
} from './design-tokens';
import type { Animation } from './animations';

// ─── 型別 ──────────────────────────────────────────────────

/** 特效管理器的狀態 */
export interface FilterState {
  /** 目前圖形預設 */
  preset: PresetLevel;
  /** Glow BlurFilter 是否啟用 */
  glowEnabled: boolean;
  /** Bloom 是否啟用 */
  bloomEnabled: boolean;
}

// ─── 24.1 BlurFilter 套用於 Glow Layer ────────────────────

/**
 * 為 Glow Layer 建立並套用 BlurFilter。
 *
 * 僅在 medium+ 預設下啟用，為光暈效果提供柔和模糊。
 *
 * @param glowLayer 光暈圖層
 * @param preset    目前圖形預設
 * @returns 建立的 BlurFilter（可用於後續移除），若未啟用則回傳 null
 */
export function applyGlowBlur(
  glowLayer: Container,
  preset: PresetLevel,
): BlurFilter | null {
  const config = GRAPHICS_PRESETS[preset];
  if (!config.glow) return null;

  const blur = new BlurFilter({
    strength: GLOW_BLUR_STRENGTH,
    quality: 2,
  });

  const existing = glowLayer.filters ? [...glowLayer.filters] : [];
  glowLayer.filters = [...existing, blur];

  return blur;
}

/**
 * 從 Glow Layer 移除 BlurFilter。
 */
export function removeGlowBlur(
  glowLayer: Container,
  blur: BlurFilter,
): void {
  if (!glowLayer.filters) return;
  glowLayer.filters = glowLayer.filters.filter((f) => f !== blur);
  if (glowLayer.filters.length === 0) {
    glowLayer.filters = null;
  }
}

// ─── 24.2 Bloom 效果 ──────────────────────────────────────

/**
 * 為指定圖層建立 Bloom 效果。
 *
 * 使用 BlurFilter 模擬 bloom：對圖層套用模糊並降低透明度，
 * 讓明亮區域產生光暈擴散效果。
 *
 * 僅在 high 預設下啟用（medium 不含 bloom）。
 *
 * @param targetLayer 目標圖層
 * @param preset      目前圖形預設
 * @returns Bloom 的 BlurFilter，若未啟用則回傳 null
 */
export function applyBloom(
  targetLayer: Container,
  preset: PresetLevel,
): BlurFilter | null {
  const config = GRAPHICS_PRESETS[preset];
  if (!config.bloom) return null;

  const bloomBlur = new BlurFilter({
    strength: BLOOM_BLUR_STRENGTH,
    quality: 3,
  });

  // 降低圖層整體 alpha 來模擬 bloom 混合
  // 實際 bloom 需要多 pass，這裡用單 pass 近似
  const existing = targetLayer.filters ? [...targetLayer.filters] : [];
  targetLayer.filters = [...existing, bloomBlur];

  return bloomBlur;
}

/**
 * 從圖層移除 Bloom 效果。
 */
export function removeBloom(
  targetLayer: Container,
  bloomBlur: BlurFilter,
): void {
  if (!targetLayer.filters) return;
  targetLayer.filters = targetLayer.filters.filter((f) => f !== bloomBlur);
  if (targetLayer.filters.length === 0) {
    targetLayer.filters = null;
  }
}

// ─── 24.3 Shockwave 效果 ──────────────────────────────────

/**
 * 建立 Shockwave 效果動畫（special 啟動時）。
 *
 * 在指定位置產生一個向外擴展的衝擊波環，
 * 使用 Graphics 繪製擴展圓環。
 *
 * @param x       中心 X（px）
 * @param y       中心 Y（px）
 * @param colour  衝擊波顏色
 * @param fxLayer 特效圖層
 * @param duration 動畫時長（ms），預設使用 SPECIAL_ACTIVATION_MS
 * @returns Animation 物件
 */
export function createShockwaveEffect(
  x: number,
  y: number,
  colour: number,
  fxLayer: Container,
  duration = 800,
): Animation {
  const ring = new Graphics();
  ring.label = 'shockwave';
  ring.position.set(x, y);
  fxLayer.addChild(ring);

  return {
    elapsed: 0,
    duration,

    update(dtMs: number): boolean {
      this.elapsed += dtMs;
      const progress = Math.min(this.elapsed / this.duration, 1);

      // 快速擴展、緩慢消失
      const expandT = easeOutCubic(progress);
      const radius = SHOCKWAVE_MAX_RADIUS * expandT;
      const alpha = 1 - progress;
      const lineWidth = SHOCKWAVE_LINE_WIDTH * (1 - progress * 0.5);

      ring.clear();
      ring.circle(0, 0, radius);
      ring.stroke({ color: colour, width: lineWidth, alpha });

      // 內環（較小、較亮）
      if (progress < 0.6) {
        const innerRadius = radius * 0.6;
        const innerAlpha = (1 - progress / 0.6) * 0.5;
        ring.circle(0, 0, innerRadius);
        ring.stroke({ color: 0xffffff, width: lineWidth * 0.5, alpha: innerAlpha });
      }

      return this.elapsed >= this.duration;
    },

    complete(): void {
      fxLayer.removeChild(ring);
      ring.destroy();
    },
  };
}

// ─── 24.4 ColorMatrix 飽和脈衝 ────────────────────────────

/**
 * 建立 chain ≥3 的 ColorMatrix 飽和脈衝效果。
 *
 * 對目標圖層套用短暫的飽和度增強，
 * 產生視覺衝擊感。
 *
 * @param chainCount  目前連鎖數
 * @param targetLayer 目標圖層（通常是 boardLayer）
 * @returns Animation 物件，若 chain < 3 則回傳 null
 */
export function createSaturationPulse(
  chainCount: number,
  targetLayer: Container,
): Animation | null {
  if (chainCount < CHAIN_SATURATION_THRESHOLD) return null;

  const filter = new ColorMatrixFilter();
  const existing = targetLayer.filters ? [...targetLayer.filters] : [];
  targetLayer.filters = [...existing, filter];

  // 飽和度隨連鎖數微增（上限 3.0）
  const maxSaturation = Math.min(
    CHAIN_SATURATION_BOOST + (chainCount - CHAIN_SATURATION_THRESHOLD) * 0.2,
    3.0,
  );

  return {
    elapsed: 0,
    duration: CHAIN_SATURATION_PULSE_MS,

    update(dtMs: number): boolean {
      this.elapsed += dtMs;
      const progress = Math.min(this.elapsed / this.duration, 1);

      // 快速升高、緩慢回落的脈衝曲線
      const pulse = progress < 0.3
        ? smoothstep(progress / 0.3)
        : 1 - smoothstep((progress - 0.3) / 0.7);

      const saturation = lerpValue(1, maxSaturation, pulse);

      // 重置 matrix 並套用飽和度
      filter.reset();
      filter.saturate(saturation - 1, false);

      return this.elapsed >= this.duration;
    },

    complete(): void {
      if (targetLayer.filters) {
        targetLayer.filters = targetLayer.filters.filter((f) => f !== filter);
        if (targetLayer.filters.length === 0) {
          targetLayer.filters = null;
        }
      }
    },
  };
}

// ─── FilterManager ────────────────────────────────────────

/**
 * 管理所有渲染濾鏡的生命週期。
 *
 * 根據圖形預設自動啟用/停用濾鏡，
 * 並提供便利方法觸發動態效果。
 */
export class FilterManager {
  private glowBlur: BlurFilter | null = null;
  private bloomBlur: BlurFilter | null = null;
  private preset: PresetLevel = 'medium';

  constructor(private readonly layers: LayerRefs) {}

  /**
   * 依預設初始化所有靜態濾鏡。
   */
  init(preset: PresetLevel): void {
    this.preset = preset;
    this.cleanup();

    // 24.1 Glow blur
    this.glowBlur = applyGlowBlur(this.layers.glowLayer, preset);

    // 24.2 Bloom（套用於 gemLayer 以產生寶石光暈）
    this.bloomBlur = applyBloom(this.layers.gemLayer, preset);
  }

  /**
   * 切換圖形預設，重新初始化濾鏡。
   */
  setPreset(preset: PresetLevel): void {
    this.init(preset);
  }

  /**
   * 建立 shockwave 效果動畫。
   */
  createShockwave(x: number, y: number, colour: number): Animation {
    return createShockwaveEffect(x, y, colour, this.layers.fxLayer);
  }

  /**
   * 建立飽和脈衝效果動畫。
   */
  createSaturationPulse(chainCount: number): Animation | null {
    return createSaturationPulse(chainCount, this.layers.boardLayer);
  }

  /**
   * 清理所有濾鏡。
   */
  cleanup(): void {
    if (this.glowBlur) {
      removeGlowBlur(this.layers.glowLayer, this.glowBlur);
      this.glowBlur = null;
    }
    if (this.bloomBlur) {
      removeBloom(this.layers.gemLayer, this.bloomBlur);
      this.bloomBlur = null;
    }
  }

  /**
   * 銷毀 FilterManager。
   */
  destroy(): void {
    this.cleanup();
  }
}

// ─── 工具函式 ──────────────────────────────────────────────

/** Ease-out cubic */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Smoothstep */
function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/** 線性插值 */
function lerpValue(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
