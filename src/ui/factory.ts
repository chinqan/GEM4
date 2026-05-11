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
  /** 覆寫文字大小（預設使用 size 對應的 fontSize） */
  fontSize?: number;
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

  // 固定 hit area，避免子元素位移影響點擊區域
  container.hitArea = { contains: (x: number, y: number) => x >= 0 && x <= btnWidth && y >= -4 && y <= btnHeight + 4 };

  // 背景
  const bg = new Graphics();
  drawButtonBg(bg, btnWidth, btnHeight, colours.fill, colours.fillAlpha, colours.stroke, colours.strokeWidth, colours.strokeAlpha);
  container.addChild(bg);
  container.bg = bg;

  // 文字
  const style = makeTextStyle(options.fontSize ?? sizeSpec.fontSize, colours.text);
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
    bg.position.y = -2;
    label.position.y = btnHeight / 2 - 2;
  });

  container.on('pointerout', () => {
    if (!enabled) return;
    bg.alpha = 1;
    bg.position.y = 0;
    label.position.y = btnHeight / 2;
  });

  container.on('pointerdown', () => {
    if (!enabled) return;
    container.scale.set(0.94);
  });

  container.on('pointerup', () => {
    if (!enabled) return;
    container.scale.set(1);
    // Play click sound: strong for primary variant, soft for others
    import('../audio/sfx-player').then(({ playUiClick, playUiClickStrong }) => {
      if (variant === 'primary') {
        playUiClickStrong();
      } else {
        playUiClick();
      }
    });
    onClick?.();
  });

  container.on('pointerupoutside', () => {
    if (!enabled) return;
    container.scale.set(1);
    bg.alpha = 1;
    bg.position.y = 0;
    label.position.y = btnHeight / 2;
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

/** 目標類型資訊，用於決定 chip 的 icon 與描述格式 */
export interface ObjectiveDisplayInfo {
  type: 'score' | 'collect' | 'clear' | 'drop' | 'multi';
  /** 簡短描述（例如「達成分數」「收集紅色寶石」） */
  label: string;
  /** 對應的 icon */
  icon: string;
  /** 進度文字格式化函式 */
  formatProgress: (current: number, total: number) => string;
}

/** 寶石色 emoji 對應 */
const GEM_ICONS: Record<string, string> = {
  R: '🔴', G: '🟢', B: '🔵', Y: '🟡', P: '🟣', W: '⚪', O: '🟠',
};

/** Blocker icon 對應 */
const BLOCKER_ICONS: Record<string, string> = {
  jelly: '🟪', lock: '🔒', generator: '⚙️', unstable: '💥',
};

/** 寶石色中文名 */
const COLOUR_NAMES: Record<string, string> = {
  R: '紅色', G: '綠色', B: '藍色', Y: '黃色', P: '紫色', W: '白色', O: '橙色',
};

/** Blocker 中文名 */
const BLOCKER_NAMES: Record<string, string> = {
  jelly: '果凍', lock: '鎖鏈', generator: '生成器', unstable: '不穩定方塊',
};

/**
 * 從 Objective 型別產生 chip 顯示資訊。
 * 匯出供外部使用（例如測試）。
 */
export function objectiveToDisplayInfo(objective: {
  type: string;
  target?: unknown;
  objectives?: Array<{ type: string; target?: unknown }>;
}): ObjectiveDisplayInfo {
  switch (objective.type) {
    case 'score': {
      const target = objective.target as number;
      return {
        type: 'score',
        label: '達成分數',
        icon: '⭐',
        formatProgress: (cur, tot) =>
          `${cur.toLocaleString()} / ${tot.toLocaleString()} 分`,
      };
    }
    case 'collect': {
      const targets = objective.target as Array<{ colour: string; count: number }>;
      if (targets.length === 1) {
        const t = targets[0];
        return {
          type: 'collect',
          label: `收集${COLOUR_NAMES[t.colour] ?? ''}寶石`,
          icon: GEM_ICONS[t.colour] ?? '💎',
          formatProgress: (cur, tot) => `${cur} / ${tot} 個`,
        };
      }
      return {
        type: 'collect',
        label: '收集寶石',
        icon: '💎',
        formatProgress: (cur, tot) => `${cur} / ${tot} 個`,
      };
    }
    case 'clear': {
      const targets = objective.target as Array<{ blocker: string; count: number }>;
      if (targets.length === 1) {
        const t = targets[0];
        return {
          type: 'clear',
          label: `清除${BLOCKER_NAMES[t.blocker] ?? '障礙'}`,
          icon: BLOCKER_ICONS[t.blocker] ?? '🧱',
          formatProgress: (cur, tot) => `${cur} / ${tot} 個`,
        };
      }
      return {
        type: 'clear',
        label: '清除障礙',
        icon: '🧱',
        formatProgress: (cur, tot) => `${cur} / ${tot} 個`,
      };
    }
    case 'drop': {
      return {
        type: 'drop',
        label: '送達寶石',
        icon: '⬇️',
        formatProgress: (cur, tot) => `${cur} / ${tot} 個`,
      };
    }
    case 'multi': {
      return {
        type: 'multi',
        label: '完成目標',
        icon: '🎯',
        formatProgress: (cur, tot) => `${cur} / ${tot}`,
      };
    }
    default:
      return {
        type: 'score',
        label: '目標',
        icon: '🎯',
        formatProgress: (cur, tot) => `${cur}/${tot}`,
      };
  }
}

export interface CreateObjectiveChipOptions {
  /** 目標顯示資訊（優先使用） */
  displayInfo?: ObjectiveDisplayInfo;
  /** 備用 icon（displayInfo 未提供時使用） */
  icon?: string;
  label?: string;
  current?: number;
  total?: number;
  accent?: number;
}

/**
 * 建立目標 chip 元件（HUD 用）。
 *
 * 根據 displayInfo 顯示：
 * - 對應目標類型的 icon
 * - 描述標籤（例如「達成分數」「收集紅色寶石」）
 * - 格式化的進度文字（例如「5,740 / 10,020 分」「3 / 15 個」）
 */
export function createObjectiveChip(options: CreateObjectiveChipOptions = {}): UIObjectiveChip {
  const {
    displayInfo,
    icon = displayInfo?.icon ?? '🎯',
    current = 0,
    total = 1,
    accent = DEFAULT_ACCENT.accent,
  } = options;

  const formatProgress = displayInfo?.formatProgress ?? ((cur: number, tot: number) => `${cur}/${tot}`);
  const labelStr = displayInfo?.label ?? '';

  const container = new Container() as UIObjectiveChip;
  container.label = 'objective-chip';

  const chipHeight = labelStr ? 44 : 34;
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

  // 標籤文字（目標類型描述）
  const labelText = labelStr ? new Text({
    text: labelStr,
    style: makeTextStyle(FONT_SIZES.caption, TEXT_COLOURS.secondary),
  }) : null;
  if (labelText) {
    labelText.anchor.set(0, 1);
    container.addChild(labelText);
  }

  // 進度文字
  const countText = new Text({
    text: formatProgress(current, total),
    style: makeTextStyle(FONT_SIZES.body, TEXT_COLOURS.primary),
  });
  countText.anchor.set(0, 0.5);
  container.addChild(countText);

  function updateLayout(cur: number, tot: number): void {
    countText.text = formatProgress(cur, tot);
    const textX = iconText.x + iconText.width + SPACING.sm;

    if (labelText) {
      // 雙行佈局：上方標籤、下方進度
      labelText.position.set(textX, chipHeight / 2 - 1);
      countText.anchor.set(0, 0);
      countText.position.set(textX, chipHeight / 2 + 1);
    } else {
      // 單行佈局
      countText.anchor.set(0, 0.5);
      countText.position.set(textX, chipHeight / 2);
    }

    const contentWidth = Math.max(
      countText.width,
      labelText?.width ?? 0,
    );
    const chipWidth = textX + contentWidth + chipPadding;
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
