// ─── 30.1 UI Theme 設定 ─────────────────────────────────────
// Design tokens for canvas-based UI (PixiJS @pixi/ui + Graphics).
// All colours, spacing, typography sizes, and motion tokens live here.

// ─── 色彩系統 ──────────────────────────────────────────────

/** 背景色 */
export const BG = {
  deep: 0x0b1026,
  panel: 0x1a2040,
  board: 0x14183a,
  overlayAlpha: 0.85,
} as const;

/** 世界強調色 */
export interface WorldAccent {
  accent: number;
  secondary: number;
}

export const WORLD_ACCENTS: Record<number, WorldAccent> = {
  1: { accent: 0xf6c453, secondary: 0x8c6a2f },
  2: { accent: 0x64b5f6, secondary: 0x1e5a96 },
  3: { accent: 0xe1bee7, secondary: 0x7b3fa0 },
  4: { accent: 0xffd54f, secondary: 0xa87d00 },
};

/** 預設強調色（主選單用 W1） */
export const DEFAULT_ACCENT = WORLD_ACCENTS[1];

/** 狀態色 */
export const STATE_COLOURS = {
  success: 0x66bb6a,
  warning: 0xffa726,
  danger: 0xef5350,
  info: 0x42a5f5,
} as const;

/** 文字色 */
export const TEXT_COLOURS = {
  primary: 0xffffff,
  secondary: 0xd5d9e8,
  muted: 0x8c93ad,
  inverse: 0x0b1026,
} as const;

// ─── 字型尺寸 ──────────────────────────────────────────────

export const FONT_SIZES = {
  display: 64,
  title: 40,
  subtitle: 24,
  body: 16,
  caption: 13,
  hudScore: 32,
  hudStat: 20,
  buttonPrimary: 18,
  buttonSecondary: 16,
} as const;

// ─── 間距系統 ──────────────────────────────────────────────

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  huge: 96,
} as const;

// ─── 圓角 ──────────────────────────────────────────────────

export const RADIUS = {
  pill: 999,
  lg: 20,
  md: 16,
  sm: 12,
  xs: 8,
} as const;

// ─── 按鈕尺寸 ──────────────────────────────────────────────

export interface ButtonSize {
  height: number;
  paddingH: number;
  fontSize: number;
}

export const BUTTON_SIZES: Record<'sm' | 'md' | 'lg', ButtonSize> = {
  sm: { height: 32, paddingH: 16, fontSize: 14 },
  md: { height: 44, paddingH: 24, fontSize: 16 },
  lg: { height: 56, paddingH: 32, fontSize: 18 },
};

// ─── 動態 Token ────────────────────────────────────────────

export const MOTION = {
  quick: 120,
  base: 240,
  slow: 400,
  celebrate: 800,
  transition: 600,
} as const;

// ─── 按鈕變體色彩 ──────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonColours {
  fill: number;
  fillAlpha: number;
  text: number;
  stroke: number;
  strokeWidth: number;
  strokeAlpha: number;
}

/**
 * 取得按鈕變體的色彩配置。
 * primary 使用世界強調色，其他變體使用固定色。
 */
export function getButtonColours(
  variant: ButtonVariant,
  accent: number = DEFAULT_ACCENT.accent,
): ButtonColours {
  switch (variant) {
    case 'primary':
      return {
        fill: accent,
        fillAlpha: 1,
        text: TEXT_COLOURS.inverse,
        stroke: accent,
        strokeWidth: 0,
        strokeAlpha: 0,
      };
    case 'secondary':
      return {
        fill: 0x000000,
        fillAlpha: 0,
        text: TEXT_COLOURS.primary,
        stroke: TEXT_COLOURS.primary,
        strokeWidth: 2,
        strokeAlpha: 1,
      };
    case 'danger':
      return {
        fill: STATE_COLOURS.danger,
        fillAlpha: 1,
        text: 0xffffff,
        stroke: STATE_COLOURS.danger,
        strokeWidth: 0,
        strokeAlpha: 0,
      };
    case 'ghost':
      return {
        fill: 0x000000,
        fillAlpha: 0,
        text: TEXT_COLOURS.secondary,
        stroke: 0x000000,
        strokeWidth: 0,
        strokeAlpha: 0,
      };
  }
}

// ─── 星星色彩 ──────────────────────────────────────────────

export const STAR_COLOURS = {
  filled: 0xffd54f,
  empty: 0x3a3f5c,
} as const;

// ─── 進度條色彩 ────────────────────────────────────────────

export type ProgressBarVariant = 'score' | 'objective' | 'time' | 'loading';

export function getProgressBarColour(
  variant: ProgressBarVariant,
  progress: number = 1,
  accent: number = DEFAULT_ACCENT.accent,
): number {
  switch (variant) {
    case 'score':
      return accent;
    case 'objective':
      return accent;
    case 'time':
      if (progress <= 0.1) return STATE_COLOURS.danger;
      if (progress <= 0.3) return STATE_COLOURS.warning;
      return STATE_COLOURS.success;
    case 'loading':
      return STATE_COLOURS.info;
  }
}
