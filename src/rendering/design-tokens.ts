import type { GemColour } from '../types';

// ─── 寶石色彩常數 ──────────────────────────────────────────

/** 7 色寶石的主色（hex 數值） */
export const GEM_COLOURS: Record<GemColour, number> = {
  R: 0xff3344, // 紅
  G: 0x33cc66, // 綠
  B: 0x3388ff, // 藍
  Y: 0xffcc00, // 黃
  P: 0xaa44ff, // 紫
  W: 0xeeeeff, // 白
  O: 0xff8833, // 橙
};

/** 寶石高光色（較亮，用於光暈/發光） */
export const GEM_GLOW_COLOURS: Record<GemColour, number> = {
  R: 0xff6677,
  G: 0x66ee99,
  B: 0x66aaff,
  Y: 0xffee66,
  P: 0xcc77ff,
  W: 0xffffff,
  O: 0xffaa66,
};

/** Colour Gem（彩虹寶石）的顏色 */
export const COLOUR_GEM_HUE = 0xffffff;

// ─── 格子尺寸與間距 ────────────────────────────────────────

/** 單格像素尺寸 */
export const CELL_SIZE = 64;

/** 格子間距（px） */
export const CELL_GAP = 2;

/** 寶石半徑（佔格子的比例） */
export const GEM_RADIUS_RATIO = 0.38;

/** 寶石繪製半徑（px） */
export const GEM_RADIUS = CELL_SIZE * GEM_RADIUS_RATIO;

/** 特殊寶石覆蓋層尺寸比例 */
export const SPECIAL_OVERLAY_RATIO = 0.45;

/** 選取環半徑比例 */
export const SELECTION_RING_RATIO = 0.48;

// ─── 透明度常數 ──────────────────────────────────────────────

/** 寶石基礎透明度 */
export const GEM_BASE_ALPHA = 1.0;

/** 格線透明度（debug 用） */
export const CELL_GRID_ALPHA = 0.15;

/** Blocker 覆蓋層透明度 */
export const BLOCKER_OVERLAY_ALPHA = 0.6;

// ─── 動畫時序 ──────────────────────────────────────────────

/** 選取脈衝週期（ms） */
export const SELECTION_PULSE_MS = 80;

/** 選取脈衝縮放範圍 */
export const SELECTION_PULSE_MIN = 1.0;
export const SELECTION_PULSE_MAX = 1.12;

/** 選取發光環透明度範圍 */
export const SELECTION_GLOW_ALPHA_MIN = 0.4;
export const SELECTION_GLOW_ALPHA_MAX = 0.9;

/** Idle shimmer 週期（ms） */
export const SHIMMER_CYCLE_MS = 2400;

/** Shimmer 透明度範圍 */
export const SHIMMER_ALPHA_MIN = 0.0;
export const SHIMMER_ALPHA_MAX = 0.35;

/** Swap 動畫時長（ms） */
export const SWAP_DURATION_MS = 200;

/** 無效交換抖動時長（ms） */
export const INVALID_SHAKE_DURATION_MS = 240;

/** 無效交換抖動振幅（px） */
export const INVALID_SHAKE_AMPLITUDE = 4;

/** Match 消除動畫時長（ms） */
export const MATCH_CLEAR_DURATION_MS = 200;

/** Cascade 掉落動畫每行時長（ms） */
export const CASCADE_DROP_MS_PER_ROW = 120;

/** 特殊寶石 spawn 震波時長（ms） */
export const SPECIAL_SPAWN_SHOCKWAVE_MS = 600;

/** 特殊寶石啟動效果時長（ms） */
export const SPECIAL_ACTIVATION_MS = 800;

/** Chain ≥3 飽和脈衝時長（ms） */
export const CHAIN_SATURATION_PULSE_MS = 300;

/** Chain 飽和脈衝觸發門檻 */
export const CHAIN_SATURATION_THRESHOLD = 3;

/** 飽和脈衝增強量（ColorMatrix saturation 值） */
export const CHAIN_SATURATION_BOOST = 2.0;

// ─── 粒子常數 ──────────────────────────────────────────────

/** Match 爆破粒子數量 */
export const MATCH_BURST_PARTICLE_COUNT = 8;

/** Match 爆破粒子生命週期（ms） */
export const MATCH_BURST_LIFETIME_MS = 400;

/** Match 爆破粒子速度（px/s） */
export const MATCH_BURST_SPEED = 120;

/** Match 爆破粒子半徑（px） */
export const MATCH_BURST_RADIUS = 3;

/** Chain 大型光效粒子生命週期（ms） */
export const CHAIN_GLOW_LIFETIME_MS = 600;

/** Chain 大型光效粒子半徑（px） */
export const CHAIN_GLOW_RADIUS = 8;

/** Chain 大型光效粒子速度（px/s） */
export const CHAIN_GLOW_SPEED = 60;

/** Special spawn 環形衝擊波粒子數量 */
export const SPECIAL_RING_PARTICLE_COUNT = 16;

/** Special spawn 環形衝擊波粒子生命週期（ms） */
export const SPECIAL_RING_LIFETIME_MS = 500;

/** Special spawn 環形衝擊波半徑（px） */
export const SPECIAL_RING_EXPAND_RADIUS = 48;

// ─── 濾鏡常數 ──────────────────────────────────────────────

/** Glow layer BlurFilter 強度 */
export const GLOW_BLUR_STRENGTH = 4;

/** Bloom 模糊強度 */
export const BLOOM_BLUR_STRENGTH = 6;

/** Bloom 亮度閾值 alpha */
export const BLOOM_ALPHA = 0.35;

/** Shockwave 最大半徑（px） */
export const SHOCKWAVE_MAX_RADIUS = 120;

/** Shockwave 線寬（px） */
export const SHOCKWAVE_LINE_WIDTH = 3;

// ─── 圖形預設 ──────────────────────────────────────────────

export interface GraphicsPreset {
  readonly glow: boolean;
  readonly bloom: boolean;
  readonly shimmer: boolean;
  readonly particleCap: number;
  readonly targetFps: number;
}

export const GRAPHICS_PRESETS: Record<'low' | 'medium' | 'high', GraphicsPreset> = {
  low: { glow: false, bloom: false, shimmer: false, particleCap: 100, targetFps: 30 },
  medium: { glow: true, bloom: false, shimmer: false, particleCap: 300, targetFps: 60 },
  high: { glow: true, bloom: true, shimmer: true, particleCap: 500, targetFps: 60 },
} as const;

export type PresetLevel = keyof typeof GRAPHICS_PRESETS;
