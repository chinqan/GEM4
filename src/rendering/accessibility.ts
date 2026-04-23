// ─── 34. 無障礙功能 ─────────────────────────────────────────
// 34.1 色盲模式（deuteranopia/protanopia/tritanopia 色彩調整）
// 34.2 reduce motion（停用非必要動畫）
// 34.3 高對比模式
// 34.4 首次啟動 prefers-reduced-motion 自動偵測

import type { GemColour } from '../types';
import type { AccessibilitySettings } from '../state/save-state';

// ─── 34.1 色盲模式色彩調整 ─────────────────────────────────

/** 色盲模式類型 */
export type ColorBlindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';

/**
 * 色盲模式的替代色彩映射。
 *
 * 每種模式為 7 色寶石提供替代色，確保在該色覺缺陷下仍可區分。
 * 原始色：R=紅 G=綠 B=藍 Y=黃 P=紫 W=白 O=橙
 */
export const COLOR_BLIND_PALETTES: Record<ColorBlindMode, Record<GemColour, number>> = {
  none: {
    R: 0xff3344,
    G: 0x33cc66,
    B: 0x3388ff,
    Y: 0xffcc00,
    P: 0xaa44ff,
    W: 0xeeeeff,
    O: 0xff8833,
  },
  // 綠色盲（deuteranopia）：紅/綠難以區分 → 用藍/橙替代
  deuteranopia: {
    R: 0xd55e00, // 深橙紅
    G: 0x0072b2, // 深藍
    B: 0x56b4e9, // 淺藍
    Y: 0xf0e442, // 黃
    P: 0xcc79a7, // 粉紫
    W: 0xeeeeff, // 白
    O: 0xe69f00, // 橙
  },
  // 紅色盲（protanopia）：紅色感知弱 → 類似 deuteranopia 調整
  protanopia: {
    R: 0xd55e00, // 深橙
    G: 0x009e73, // 青綠
    B: 0x56b4e9, // 淺藍
    Y: 0xf0e442, // 黃
    P: 0xcc79a7, // 粉紫
    W: 0xeeeeff, // 白
    O: 0xe69f00, // 橙
  },
  // 藍色盲（tritanopia）：藍/黃難以區分 → 用紅/綠替代
  tritanopia: {
    R: 0xff4444, // 紅
    G: 0x33cc66, // 綠
    B: 0x648fff, // 調整藍
    Y: 0xffb000, // 深黃/琥珀
    P: 0xdc267f, // 洋紅
    W: 0xeeeeff, // 白
    O: 0xfe6100, // 深橙
  },
};

/**
 * 取得指定色盲模式下的寶石色彩。
 */
export function getGemColour(colour: GemColour, mode: ColorBlindMode): number {
  return COLOR_BLIND_PALETTES[mode][colour];
}

/**
 * 取得指定色盲模式下的完整色彩映射。
 */
export function getColourPalette(mode: ColorBlindMode): Record<GemColour, number> {
  return { ...COLOR_BLIND_PALETTES[mode] };
}

// ─── 34.2 Reduce Motion ────────────────────────────────────

/**
 * Reduce motion 設定管理。
 *
 * 當啟用時，停用非必要動畫：
 * - 粒子效果
 * - 震波/泛光
 * - Idle shimmer
 * - 飽和脈衝
 * - 畫面震動
 *
 * 保留必要動畫：
 * - 交換動畫（縮短至 100ms）
 * - 消除動畫（縮短至 100ms）
 * - Cascade 掉落（保留但加速）
 */
export interface ReduceMotionConfig {
  /** 是否啟用 reduce motion */
  enabled: boolean;
  /** 交換動畫時長（ms），reduce motion 時縮短 */
  swapDurationMs: number;
  /** 消除動畫時長（ms） */
  clearDurationMs: number;
  /** cascade 掉落每行時長（ms） */
  cascadeDropMsPerRow: number;
  /** 是否顯示粒子 */
  particles: boolean;
  /** 是否顯示震波 */
  shockwave: boolean;
  /** 是否顯示泛光 */
  bloom: boolean;
  /** 是否顯示 shimmer */
  shimmer: boolean;
  /** 是否顯示飽和脈衝 */
  saturationPulse: boolean;
  /** 是否顯示畫面震動 */
  screenShake: boolean;
}

/** 正常動畫設定 */
export const NORMAL_MOTION: ReduceMotionConfig = {
  enabled: false,
  swapDurationMs: 200,
  clearDurationMs: 200,
  cascadeDropMsPerRow: 120,
  particles: true,
  shockwave: true,
  bloom: true,
  shimmer: true,
  saturationPulse: true,
  screenShake: true,
};

/** Reduce motion 動畫設定 */
export const REDUCED_MOTION: ReduceMotionConfig = {
  enabled: true,
  swapDurationMs: 100,
  clearDurationMs: 100,
  cascadeDropMsPerRow: 60,
  particles: false,
  shockwave: false,
  bloom: false,
  shimmer: false,
  saturationPulse: false,
  screenShake: false,
};

/**
 * 取得動畫設定。
 */
export function getMotionConfig(reduceMotion: boolean): ReduceMotionConfig {
  return reduceMotion ? { ...REDUCED_MOTION } : { ...NORMAL_MOTION };
}

// ─── 34.3 高對比模式 ──────────────────────────────────────

/**
 * 高對比模式設定。
 *
 * 啟用時：
 * - 寶石邊框加粗（2px → 3px）
 * - 背景對比度提高
 * - 文字使用純白
 * - 格線更明顯
 */
export interface HighContrastConfig {
  enabled: boolean;
  /** 寶石邊框寬度 */
  gemBorderWidth: number;
  /** 寶石邊框色 */
  gemBorderColour: number;
  /** 格線透明度 */
  gridAlpha: number;
  /** 背景色 */
  boardBg: number;
  /** 文字色 */
  textColour: number;
}

export const NORMAL_CONTRAST: HighContrastConfig = {
  enabled: false,
  gemBorderWidth: 0,
  gemBorderColour: 0xffffff,
  gridAlpha: 0.15,
  boardBg: 0x14183a,
  textColour: 0xffffff,
};

export const HIGH_CONTRAST: HighContrastConfig = {
  enabled: true,
  gemBorderWidth: 3,
  gemBorderColour: 0xffffff,
  gridAlpha: 0.4,
  boardBg: 0x000000,
  textColour: 0xffffff,
};

/**
 * 取得對比度設定。
 */
export function getContrastConfig(highContrast: boolean): HighContrastConfig {
  return highContrast ? { ...HIGH_CONTRAST } : { ...NORMAL_CONTRAST };
}

// ─── 34.4 prefers-reduced-motion 自動偵測 ──────────────────

/**
 * 偵測瀏覽器的 prefers-reduced-motion 設定。
 *
 * 首次啟動時呼叫，若使用者系統偏好 reduce motion，
 * 自動啟用 reduce motion 設定。
 *
 * @returns true 若系統偏好 reduce motion
 */
export function detectPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 監聽 prefers-reduced-motion 變化。
 *
 * @param callback 當偏好變化時呼叫
 * @returns 取消監聽函式
 */
export function onPrefersReducedMotionChange(
  callback: (prefersReduced: boolean) => void,
): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}

// ─── 整合輔助函式 ──────────────────────────────────────────

/**
 * 從 AccessibilitySettings 建立完整的無障礙設定。
 */
export function createAccessibilityConfig(settings: AccessibilitySettings): {
  colourPalette: Record<GemColour, number>;
  motionConfig: ReduceMotionConfig;
  contrastConfig: HighContrastConfig;
} {
  return {
    colourPalette: getColourPalette(settings.colorBlindMode),
    // reduce motion 由外部管理（因為它不在 AccessibilitySettings 中）
    motionConfig: NORMAL_MOTION,
    contrastConfig: getContrastConfig(settings.highContrast),
  };
}
