// ─── 31.5 遊戲 HUD ─────────────────────────────────────────
// 目標進度、手數/時間、暫停按鈕。
// 明亮清新自然風格。自適應佈局。

import { Container, Graphics, Sprite, Text, Texture, TextStyle } from 'pixi.js';
import { SPACING, WORLD_ACCENTS } from '../theme';
import {
  createObjectiveChip,
  objectiveToDisplayInfo,
  type UIButton,
  type UIStarDisplay,
  type UIObjectiveChip,
} from '../factory';

// ─── HUD 色彩 Token ────────────────────────────────────────

const HUD = {
  surface: 0xfcfdf9,     // 按鈕白底
  fg: 0x2e3a28,          // 深色文字
  muted: 0x6b7a63,       // 灰綠文字
  accentDark: 0x357a38,  // 手數數字色
  yellow: 0xd4a017,      // 星星黃 / 進度條
  starEmpty: 0xc0c8bc,   // 空星灰
  objBg: 0x1a2e3a,       // 目標 chip 背景（半透明深色）
  objBgAlpha: 0.45,
  objTrackBg: 0xffffff,  // 進度條軌道
  objTrackAlpha: 0.25,
  purple: 0x9c27b0,      // 收集進度條紫
} as const;

// ─── 型別 ──────────────────────────────────────────────────

/** 單一目標的進度 */
export interface ObjectiveProgress {
  current: number;
  total: number;
}

export interface GameHUD extends Container {
  pauseButton: UIButton;
  resetButton: UIButton;
  settingsButton: UIButton;
  starDisplay: UIStarDisplay;
  objectiveChip: UIObjectiveChip;
  /** 更新分數顯示（保留接口，不再視覺顯示） */
  setScore(score: number): void;
  /** 更新手數 */
  setMoves(remaining: number): void;
  /** 更新時間（秒） */
  setTime(remainingSeconds: number): void;
  /**
   * 更新目標進度。
   * - 單一目標：傳入 current, total
   * - 多重目標：傳入 ObjectiveProgress[] 陣列
   */
  setObjective(current: number | ObjectiveProgress[], total?: number): void;
  /** 更新星數 */
  setStars(count: 0 | 1 | 2 | 3): void;
  /** 顯示連鎖計數 */
  showChain(chain: number): void;
  /** 隱藏連鎖計數 */
  hideChain(): void;
}

export interface CreateGameHUDOptions {
  width: number;
  height: number;
  mode?: 'moves' | 'time';
  objective?: { type: string; target?: unknown; objectives?: Array<{ type: string; target?: unknown }> };
  worldId?: number;
  levelId?: number;
  levelName?: string;
  onPause?: () => void;
  onSettings?: () => void;
  onReset?: () => void;
}

// ─── 圓形圖示按鈕 ──────────────────────────────────────────

function createHudCircleButton(icon: string, size: number, onClick?: () => void): UIButton {
  const container = new Container() as UIButton;
  container.label = `hud-btn-${icon}`;
  container.hitArea = { contains: (x: number, y: number) => x >= 0 && x <= size && y >= 0 && y <= size };

  const bg = new Graphics();
  bg.circle(size / 2, size / 2, size / 2);
  bg.fill({ color: HUD.surface });
  container.addChild(bg);
  container.bg = bg;

  const style = new TextStyle({
    fontSize: icon === '⚙' ? Math.round(size * 0.55) : Math.round(size * 0.5),
    fill: HUD.fg,
    align: 'center',
  });
  const label = new Text({ text: icon, style });
  label.anchor.set(0.5, 0.5);
  label.position.set(size / 2, size / 2);
  container.addChild(label);

  let enabled = true;
  container.eventMode = 'static';
  container.cursor = 'pointer';

  container.on('pointerdown', () => { if (enabled) container.scale.set(0.9); });
  container.on('pointerup', () => {
    if (!enabled) return;
    container.scale.set(1);
    onClick?.();
  });
  container.on('pointerupoutside', () => { if (enabled) container.scale.set(1); });

  container.setEnabled = (e: boolean) => {
    enabled = e;
    container.eventMode = e ? 'static' : 'none';
    container.alpha = e ? 1 : 0.4;
  };

  return container;
}

// ─── 星星顯示（簡易版） ────────────────────────────────────

function createHudStarDisplay(starSize: number): UIStarDisplay {
  const container = new Container() as UIStarDisplay;
  container.label = 'hud-stars';

  const stars: Text[] = [];
  const gap = 2;

  for (let i = 0; i < 3; i++) {
    const star = new Text({
      text: '☆',
      style: new TextStyle({ fontSize: starSize, fill: HUD.starEmpty }),
    });
    star.anchor.set(0.5, 0.5);
    star.position.set(i * (starSize + gap), 0);
    container.addChild(star);
    stars.push(star);
  }

  container.setStars = (count: 0 | 1 | 2 | 3) => {
    for (let i = 0; i < 3; i++) {
      stars[i].text = i < count ? '★' : '☆';
      (stars[i].style as TextStyle).fill = i < count ? HUD.yellow : HUD.starEmpty;
    }
  };

  return container;
}

/**
 * 建立遊戲 HUD。
 *
 * 佈局：
 * - Row 1：⏸ 暫停 | 關卡資訊 | ☆☆☆ 星星 | ↺ 重置 | ⚙ 設定
 * - Row 2：目標 chip（帶進度條）| MOVES 手數膠囊
 * - 頂部半透明漸層遮罩
 * - 底部草地裝飾（由盤面外處理）
 */
export function createGameHUD(options: CreateGameHUDOptions): GameHUD {
  const {
    width,
    height: _height,
    mode = 'moves',
    objective,
    worldId,
    levelId,
    levelName,
    onPause,
    onSettings,
    onReset,
  } = options;

  const container = new Container() as GameHUD;
  container.label = 'game-hud';

  // ── 自適應參數 ────────────────────────────────────────
  // HTML 原型以 390px 寬度設計，所有 HUD px 值基於此參考寬度。
  // 依實際 canvas 寬度等比縮放，確保 HUD 在任何解析度下保持正確視覺比例。
  const DESIGN_WIDTH = 390;
  const scaleFactor = Math.max(0.65, Math.min(width / DESIGN_WIDTH, 2.5));

  const margin = Math.round(16 * scaleFactor);
  const btnSize = Math.round(40 * scaleFactor);
  const topPad = Math.round(52 * scaleFactor); // safe area top

  // ── Row 1 高度 ────────────────────────────────────────
  const row1H = topPad + btnSize + 10;
  const row1CY = topPad + btnSize / 2;

  // ── 頂部漸層遮罩（Canvas 2D 產生平滑漸層貼圖） ────────
  const gradientH = Math.round(130 * scaleFactor);
  const canvas2d = document.createElement('canvas');
  canvas2d.width = 1;
  canvas2d.height = gradientH;
  const ctx = canvas2d.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, gradientH);
  grad.addColorStop(0, 'rgba(26, 48, 64, 0.4)');
  grad.addColorStop(1, 'rgba(26, 48, 64, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1, gradientH);
  const gradientTex = Texture.from(canvas2d);
  const gradientSprite = new Sprite(gradientTex);
  gradientSprite.label = 'hud-gradient';
  gradientSprite.width = width;
  gradientSprite.height = gradientH;
  container.addChild(gradientSprite);

  // ── 暫停按鈕（左） ───────────────────────────────────
  const pauseButton = createHudCircleButton('⏸', btnSize, onPause);
  pauseButton.position.set(margin, row1CY - btnSize / 2);
  container.addChild(pauseButton);

  // ── 關卡資訊（暫停按鈕右側） ─────────────────────────
  const levelInfoX = margin + btnSize + 10;

  const worldNames: Record<number, string> = {
    1: 'Crystal Cavern',
    2: 'Ocean Depths',
    3: 'Mystic Garden',
    4: 'Solar Temple',
  };

  const worldStr = worldNames[worldId ?? 1] ?? `World ${worldId}`;
  const levelStr = levelId ? `關卡 ${String(levelId).padStart(2, '0')}` : '';

  const worldStyle = new TextStyle({
    fontFamily: 'Nunito, system-ui, sans-serif',
    fontSize: Math.round(11 * scaleFactor),
    fontWeight: '600',
    fill: 0xffffff,
    letterSpacing: 0.3,
  });
  const worldText = new Text({ text: worldStr, style: worldStyle });
  worldText.anchor.set(0, 0);
  worldText.position.set(levelInfoX, row1CY - btnSize / 2);
  worldText.alpha = 0.75;
  container.addChild(worldText);

  const levelNumStyle = new TextStyle({
    fontFamily: 'Nunito, system-ui, sans-serif',
    fontSize: Math.round(12 * scaleFactor),
    fontWeight: '700',
    fill: 0xffffff,
  });
  const levelNumText = new Text({ text: levelStr, style: levelNumStyle });
  levelNumText.anchor.set(0, 0);
  levelNumText.position.set(levelInfoX, row1CY - btnSize / 2 + Math.round(13 * scaleFactor));
  container.addChild(levelNumText);

  if (levelName) {
    const nameStyle = new TextStyle({
      fontFamily: 'Nunito, system-ui, sans-serif',
      fontSize: Math.round(14 * scaleFactor),
      fontWeight: '700',
      fill: 0xffffff,
    });
    const nameText = new Text({ text: levelName, style: nameStyle });
    nameText.anchor.set(0, 0);
    nameText.position.set(levelInfoX, row1CY - btnSize / 2 + Math.round(27 * scaleFactor));
    container.addChild(nameText);
  }

  // ── 右側按鈕群（Row 1） ──────────────────────────────
  const settingsButton = createHudCircleButton('⚙', btnSize, onSettings);
  settingsButton.position.set(width - btnSize - margin, row1CY - btnSize / 2);
  container.addChild(settingsButton);

  const resetButton = createHudCircleButton('↺', btnSize, onReset);
  resetButton.position.set(width - btnSize * 2 - margin - 8, row1CY - btnSize / 2);
  container.addChild(resetButton);

  // ── 星星（重置按鈕左側） ─────────────────────────────
  const starSize = Math.round(16 * scaleFactor);
  const starDisplay = createHudStarDisplay(starSize);
  const starsTotalW = starSize * 3 + 2 * 2;
  starDisplay.position.set(
    width - btnSize * 2 - margin - 8 - starsTotalW - 8,
    row1CY,
  );
  container.addChild(starDisplay);

  // ── Row 2：目標 + 手數 ────────────────────────────────
  const row2Y = row1H;
  const row2H = Math.round(50 * scaleFactor);
  const row2CY = row2Y + row2H / 2;

  // ── 目標 chips（Row 2 左側） ─────────────────────────
  const subObjectives: Array<{ type: string; target?: unknown }> =
    objective?.type === 'multi' && objective.objectives
      ? objective.objectives
      : objective
        ? [objective]
        : [{ type: 'score' }];

  const objectiveChips: UIObjectiveChip[] = [];
  let chipX = margin;
  for (const subObj of subObjectives) {
    const info = objectiveToDisplayInfo(subObj);
    const chip = createObjectiveChip({ displayInfo: info, current: 0, total: 1 });
    chip.scale.set(scaleFactor);
    const chipVisualH = (info.label ? 44 : 34) * scaleFactor;
    chip.position.set(chipX, row2CY - chipVisualH / 2);
    container.addChild(chip);
    objectiveChips.push(chip);
    chipX += Math.round(160 * scaleFactor) + SPACING.xs;
  }
  const objectiveChip = objectiveChips[0];

  // ── 手數/時間膠囊（Row 2 右側） ─────────────────────
  const movesChipW = Math.round(60 * scaleFactor);
  const movesChipH = Math.round(44 * scaleFactor);
  const movesChipX = width - movesChipW - margin;
  const movesChipY = row2CY - movesChipH / 2;

  const movesBg = new Graphics();
  movesBg.roundRect(movesChipX, movesChipY, movesChipW, movesChipH, 14);
  movesBg.fill({ color: HUD.surface });
  container.addChild(movesBg);

  const movesLabelStyle = new TextStyle({
    fontFamily: 'Nunito, system-ui, sans-serif',
    fontSize: Math.round(10 * scaleFactor),
    fontWeight: '700',
    fill: HUD.muted,
    align: 'center',
    letterSpacing: 0.8,
  });
  const movesLabel = new Text({ text: mode === 'moves' ? 'MOVES' : 'TIME', style: movesLabelStyle });
  movesLabel.anchor.set(0.5, 0);
  movesLabel.position.set(movesChipX + movesChipW / 2, movesChipY + 5);
  container.addChild(movesLabel);

  const movesNumStyle = new TextStyle({
    fontFamily: 'Fredoka, Nunito, system-ui, sans-serif',
    fontSize: Math.round(20 * scaleFactor),
    fontWeight: '700',
    fill: HUD.accentDark,
    align: 'center',
  });
  const movesNumText = new Text({ text: '0', style: movesNumStyle });
  movesNumText.anchor.set(0.5, 1);
  movesNumText.position.set(movesChipX + movesChipW / 2, movesChipY + movesChipH - 4);
  container.addChild(movesNumText);

  // ── 連鎖計數（浮動） ─────────────────────────────────
  const chainStyle = new TextStyle({
    fontFamily: 'Fredoka, Nunito, system-ui, sans-serif',
    fontSize: Math.round(24 * scaleFactor),
    fontWeight: '700',
    fill: HUD.yellow,
    align: 'center',
    dropShadow: { alpha: 0.6, angle: Math.PI / 2, blur: 4, color: 0x000000, distance: 2 },
  });
  const chainText = new Text({ text: '', style: chainStyle });
  chainText.anchor.set(0.5, 0.5);
  chainText.position.set(width / 2, row2Y + row2H + 28);
  chainText.visible = false;
  container.addChild(chainText);

  // ── 公開參照 ──────────────────────────────────────────
  container.pauseButton = pauseButton;
  container.resetButton = resetButton;
  container.settingsButton = settingsButton;
  container.starDisplay = starDisplay;
  container.objectiveChip = objectiveChip;

  container.setScore = (_score: number) => {
    // Score 不再視覺顯示，保留接口供 game-integration 呼叫
  };

  container.setMoves = (remaining: number) => {
    movesNumText.text = `${remaining}`;
  };

  container.setTime = (remainingSeconds: number) => {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = Math.floor(remainingSeconds % 60);
    movesNumText.text = `${mins}:${String(secs).padStart(2, '0')}`;
  };

  container.setObjective = (currentOrArray: number | ObjectiveProgress[], total?: number) => {
    if (Array.isArray(currentOrArray)) {
      for (let i = 0; i < objectiveChips.length; i++) {
        const progress = currentOrArray[i];
        if (progress) {
          objectiveChips[i].setProgress(progress.current, progress.total);
        }
      }
    } else {
      objectiveChip.setProgress(currentOrArray, total ?? 0);
    }
  };

  container.setStars = (count: 0 | 1 | 2 | 3) => {
    starDisplay.setStars(count);
  };

  container.showChain = (chain: number) => {
    chainText.text = `Chain ${chain}!`;
    chainText.visible = true;
  };

  container.hideChain = () => {
    chainText.visible = false;
  };

  return container;
}
