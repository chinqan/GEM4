// ─── 30.2 & 30.3 UI 元件工廠 ────────────────────────────────
// Button factory (hover/press states), ProgressBar, StarDisplay, ObjectiveChip.
// All rendered with PixiJS 8 Graphics as placeholder visuals.

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import {
  type ButtonVariant,
  type ButtonSize,
  BUTTON_SIZES,
  getButtonColours,
  RADIUS,
  TEXT_COLOURS,
  FONT_SIZES,
  SPACING,
  STAR_COLOURS,
  BG,
  getProgressBarColour,
  type ProgressBarVariant,
  DEFAULT_ACCENT,
  MOTION,
} from './theme';

// ─── 共用文字樣式 ──────────────────────────────────────────

function makeTextStyle(fontSize: number, colour: number = TEXT_COLOURS.primary): TextStyle {
  return new TextStyle({
    fontFamily: 'Inter, "Noto Sans CJK TC", sans-serif',
    fontSize,
    fill: colour,
    align: 'center',
  });
}

// ─── 30.2 按鈕工廠 ─────────────────────────────────────────

export interface UIButton extends Container {
  /** 按鈕背景 Graphics */
  bg: Graphics;
  /** 按鈕文字 */
  label: string;
  /** 設定啟用/停用 */
  setEnabled(enabled: boolean): void;
}

export interface CreateButtonOptions {
  text: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  width?: number;
  accent?: number;
  onClick?: () => void;
}

/**
 * 建立一個帶 hover/press 狀態的按鈕。
 *
 * 使用 PixiJS 8 Graphics 繪製圓角矩形，
 * 並透過 eventMode + pointer events 實作互動狀態。
 */
export function createButton(options: CreateButtonOptions): UIButton {
  const {
    text,
    variant = 'primary',
    size = 'md',
    accent,
    onClick,
  } = options;

  const sizeSpec: ButtonSize = BUTTON_SIZES[size];
  const colours = getButtonColours(variant, accent);
  const btnWidth = options.width ?? Math.max(200, text.length * sizeSpec.fontSize * 0.7 + sizeSpec.paddingH * 2);
  const btnHeight = sizeSpec.height;

  const container = new Container() as UIButton;
  container.label = `btn-${text}`;

  // 背景
  const bg = new Graphics();
  drawButtonBg(bg, btnWidth, btnHeight, colours.fill, colours.fillAlpha, colours.stroke, colours.strokeWidth, colours.strokeAlpha);
  container.addChild(bg);
  container.bg = bg;

  // 文字
  const style = makeTextStyle(sizeSpec.fontSize, colours.text);
  const label = new Text({ text, style });
  label.anchor.set(0.5, 0.5);
  label.position.set(btnWidth / 2, btnHeight / 2);
  container.addChild(label);

  // 互動
  let enabled = true;
  container.eventMode = 'static';
  container.cursor = 'pointer';

  container.on('pointerover', () => {
    if (!enabled) return;
    bg.alpha = 0.85;
    container.position.y -= 2;
  });

  container.on('pointerout', () => {
    if (!enabled) return;
    bg.alpha = 1;
    container.position.y += 2;
  });

  container.on('pointerdown', () => {
    if (!enabled) return;
    container.scale.set(0.94);
  });

  container.on('pointerup', () => {
    if (!enabled) return;
    container.scale.set(1);
    onClick?.();
  });

  container.on('pointerupoutside', () => {
    if (!enabled) return;
    container.scale.set(1);
    bg.alpha = 1;
  });

  container.setEnabled = (e: boolean) => {
    enabled = e;
    container.eventMode = e ? 'static' : 'none';
    container.cursor = e ? 'pointer' : 'default';
    container.alpha = e ? 1 : 0.5;
  };

  return container;
}

function drawButtonBg(
  g: Graphics,
  w: number,
  h: number,
  fill: number,
  fillAlpha: number,
  stroke: number,
  strokeWidth: number,
  strokeAlpha: number,
): void {
  g.roundRect(0, 0, w, h, RADIUS.sm);
  if (fillAlpha > 0) {
    g.fill({ color: fill, alpha: fillAlpha });
  }
  if (strokeWidth > 0 && strokeAlpha > 0) {
    g.stroke({ color: stroke, width: strokeWidth, alpha: strokeAlpha });
  }
}

// ─── 30.3 進度條 ───────────────────────────────────────────

export interface UIProgressBar extends Container {
  /** 設定進度 (0..1) */
  setProgress(value: number): void;
}

export interface CreateProgressBarOptions {
  width?: number;
  height?: number;
  variant?: ProgressBarVariant;
  accent?: number;
  initialProgress?: number;
}

/**
 * 建立進度條元件。
 */
export function createProgressBar(options: CreateProgressBarOptions = {}): UIProgressBar {
  const {
    width = 200,
    height = 12,
    variant = 'loading',
    accent,
    initialProgress = 0,
  } = options;

  const container = new Container() as UIProgressBar;
  container.label = 'progress-bar';

  // 背景軌道
  const track = new Graphics();
  track.roundRect(0, 0, width, height, height / 2);
  track.fill({ color: BG.panel, alpha: 0.8 });
  container.addChild(track);

  // 填充條
  const fill = new Graphics();
  container.addChild(fill);

  function drawFill(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress));
    fill.clear();
    if (clamped <= 0) return;
    const fillWidth = Math.max(height, width * clamped);
    fill.roundRect(0, 0, fillWidth, height, height / 2);
    fill.fill({ color: getProgressBarColour(variant, clamped, accent ?? DEFAULT_ACCENT.accent) });
  }

  drawFill(initialProgress);

  container.setProgress = (value: number) => {
    drawFill(value);
  };

  return container;
}

// ─── 30.3 星星評價 ─────────────────────────────────────────

export interface UIStarDisplay extends Container {
  /** 設定星數 (0..3) */
  setStars(count: 0 | 1 | 2 | 3): void;
}

export interface CreateStarDisplayOptions {
  starSize?: number;
  gap?: number;
  initialStars?: 0 | 1 | 2 | 3;
}

/**
 * 建立星星評價元件（3 顆星橫向排列）。
 */
export function createStarDisplay(options: CreateStarDisplayOptions = {}): UIStarDisplay {
  const {
    starSize = 24,
    gap = 8,
    initialStars = 0,
  } = options;

  const container = new Container() as UIStarDisplay;
  container.label = 'star-display';

  const stars: Graphics[] = [];

  for (let i = 0; i < 3; i++) {
    const star = new Graphics();
    star.position.set(i * (starSize + gap), 0);
    container.addChild(star);
    stars.push(star);
  }

  function drawStars(count: 0 | 1 | 2 | 3): void {
    for (let i = 0; i < 3; i++) {
      const g = stars[i];
      g.clear();
      const filled = i < count;
      const colour = filled ? STAR_COLOURS.filled : STAR_COLOURS.empty;
      drawStarShape(g, starSize / 2, colour);
    }
  }

  drawStars(initialStars);

  container.setStars = (count: 0 | 1 | 2 | 3) => {
    drawStars(count);
  };

  return container;
}

/**
 * 繪製五角星形狀。
 */
function drawStarShape(g: Graphics, radius: number, colour: number): void {
  const points = 5;
  const outerR = radius;
  const innerR = radius * 0.4;

  g.moveTo(0, -outerR);
  for (let i = 0; i < points; i++) {
    const outerAngle = (i * Math.PI * 2) / points - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / points;
    const nextOuterAngle = ((i + 1) * Math.PI * 2) / points - Math.PI / 2;

    g.lineTo(Math.cos(innerAngle) * innerR, Math.sin(innerAngle) * innerR);
    g.lineTo(Math.cos(nextOuterAngle) * outerR, Math.sin(nextOuterAngle) * outerR);
  }
  g.fill({ color: colour });
}

// ─── 30.3 目標 Chip ────────────────────────────────────────

export interface UIObjectiveChip extends Container {
  /** 更新進度 */
  setProgress(current: number, total: number): void;
}

export interface CreateObjectiveChipOptions {
  icon?: string;
  label?: string;
  current?: number;
  total?: number;
  accent?: number;
}

/**
 * 建立目標 chip 元件（HUD 用，顯示 icon + 計數）。
 */
export function createObjectiveChip(options: CreateObjectiveChipOptions = {}): UIObjectiveChip {
  const {
    icon = '🎯',
    label,
    current = 0,
    total = 1,
    accent = DEFAULT_ACCENT.accent,
  } = options;

  const container = new Container() as UIObjectiveChip;
  container.label = 'objective-chip';

  const chipHeight = 32;
  const chipPadding = SPACING.md;

  // 背景
  const bg = new Graphics();
  container.addChild(bg);

  // Icon 文字
  const iconText = new Text({
    text: icon,
    style: makeTextStyle(FONT_SIZES.body, TEXT_COLOURS.primary),
  });
  iconText.position.set(chipPadding, chipHeight / 2);
  iconText.anchor.set(0, 0.5);
  container.addChild(iconText);

  // 計數文字
  const countText = new Text({
    text: `${current}/${total}`,
    style: makeTextStyle(FONT_SIZES.body, TEXT_COLOURS.primary),
  });
  countText.anchor.set(0, 0.5);
  container.addChild(countText);

  function updateLayout(cur: number, tot: number): void {
    countText.text = `${cur}/${tot}`;
    const textX = iconText.x + iconText.width + SPACING.sm;
    countText.position.set(textX, chipHeight / 2);

    const chipWidth = textX + countText.width + chipPadding;
    bg.clear();
    bg.roundRect(0, 0, chipWidth, chipHeight, RADIUS.xs);

    const progress = tot > 0 ? cur / tot : 0;
    if (progress >= 1) {
      bg.fill({ color: accent, alpha: 0.3 });
    } else {
      bg.fill({ color: BG.panel, alpha: 0.8 });
    }
  }

  updateLayout(current, total);

  container.setProgress = (cur: number, tot: number) => {
    updateLayout(cur, tot);
  };

  return container;
}
