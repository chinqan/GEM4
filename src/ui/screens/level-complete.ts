// ─── 31.7 關卡完成畫面 ──────────────────────────────────────
// 星星動畫、分數明細、下一關/重玩/返回。
// 風格：淺色卡片（Fredoka + Nunito），綠色調 accent。

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { BG, SPACING, RADIUS } from '../theme';
import { createStarDisplay, type UIStarDisplay } from '../factory';
import type { LevelResult } from '../../types';

// ─── 局部色彩 Token（結算畫面專用） ─────────────────────────

const LC = {
  surface: 0xfcfcfc,
  border: 0xd6e8d6,
  fg: 0x2a3a2a,
  muted: 0x6b7b6b,
  accent: 0x4caf50,
  accentDark: 0x388e3c,
  yellow: 0xffc107,
  bgOverlay: 0x2a3a2a,
  overlayAlpha: 0.7,
} as const;

const FONT_DISPLAY = 'Fredoka, Nunito, system-ui, sans-serif';
const FONT_BODY = 'Nunito, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';

// ─── 型別 ──────────────────────────────────────────────────

export interface UIButton extends Container {
  bg: Graphics;
  label: string;
  setEnabled(enabled: boolean): void;
}

export interface LevelCompleteScreen extends Container {
  mapButton: UIButton;
  replayButton: UIButton;
  nextButton: UIButton;
  starDisplay: UIStarDisplay;
  /** 設定關卡結果資料 */
  setResult(result: LevelResult, worldId: number): void;
}

export interface CreateLevelCompleteOptions {
  width: number;
  height: number;
  result?: LevelResult;
  worldId?: number;
  onMap?: () => void;
  onReplay?: () => void;
  onNext?: () => void;
}

// ─── 局部按鈕工廠（結算風格） ───────────────────────────────

type LCButtonVariant = 'outline' | 'white' | 'primary';

function createLCButton(options: {
  text: string;
  variant: LCButtonVariant;
  width: number;
  onClick?: () => void;
}): UIButton {
  const { text, variant, width, onClick } = options;
  const height = 48;

  const container = new Container() as UIButton;
  container.label = `btn-${text}`;
  container.hitArea = {
    contains: (x: number, y: number) => x >= 0 && x <= width && y >= -4 && y <= height + 4,
  };

  const bg = new Graphics();

  // 繪製按鈕背景
  function drawBg(): void {
    bg.clear();
    switch (variant) {
      case 'outline':
        bg.roundRect(0, 0, width, height, 28);
        bg.stroke({ color: LC.border, width: 2 });
        break;
      case 'white':
        bg.roundRect(0, 0, width, height, 28);
        bg.fill({ color: 0xf0f5f0 });
        bg.stroke({ color: LC.border, width: 2 });
        break;
      case 'primary':
        // 底部陰影
        bg.roundRect(0, 4, width, height, 28);
        bg.fill({ color: LC.accentDark });
        // 主體
        bg.roundRect(0, 0, width, height, 28);
        bg.fill({ color: LC.accent });
        break;
    }
  }
  drawBg();
  container.addChild(bg);
  container.bg = bg;

  // 文字色
  let textColour: number;
  switch (variant) {
    case 'outline': textColour = LC.muted; break;
    case 'white': textColour = LC.fg; break;
    case 'primary': textColour = 0xffffff; break;
  }

  const label = new Text({
    text,
    style: new TextStyle({
      fontFamily: FONT_BODY,
      fontSize: 15,
      fontWeight: '700',
      fill: textColour,
      align: 'center',
    }),
  });
  label.anchor.set(0.5, 0.5);
  label.position.set(width / 2, height / 2);
  container.addChild(label);

  // 互動
  let enabled = true;
  container.eventMode = 'static';
  container.cursor = 'pointer';

  container.on('pointerover', () => {
    if (!enabled) return;
    container.alpha = 0.9;
  });
  container.on('pointerout', () => {
    if (!enabled) return;
    container.alpha = 1;
  });
  container.on('pointerdown', () => {
    if (!enabled) return;
    container.scale.set(0.95);
  });
  container.on('pointerup', () => {
    if (!enabled) return;
    container.scale.set(1);
    import('../../audio/sfx-player').then(({ playUiClick, playUiClickStrong }) => {
      if (variant === 'primary') playUiClickStrong();
      else playUiClick();
    });
    onClick?.();
  });
  container.on('pointerupoutside', () => {
    if (!enabled) return;
    container.scale.set(1);
    container.alpha = 1;
  });

  container.setEnabled = (e: boolean) => {
    enabled = e;
    container.eventMode = e ? 'static' : 'none';
    container.cursor = e ? 'pointer' : 'default';
    container.alpha = e ? 1 : 0.5;
  };

  return container;
}

// ─── 主函式 ─────────────────────────────────────────────────

/**
 * 建立關卡完成畫面。
 *
 * 結構：
 * - 半透明背景遮罩
 * - 淺色圓角卡片
 * - 世界/關卡標題
 * - 星星
 * - 分數明細：Score、剩餘手數獎勵、Total
 * - 統計：Best chain、Specials spawned
 * - Map / Replay / Next 按鈕
 */
export function createLevelCompleteScreen(options: CreateLevelCompleteOptions): LevelCompleteScreen {
  const {
    width,
    height,
    result,
    worldId = 1,
    onMap,
    onReplay,
    onNext,
  } = options;

  const container = new Container() as LevelCompleteScreen;
  container.label = 'level-complete-screen';

  // ── 背景遮罩 ─────────────────────────────────────────
  const overlay = new Graphics();
  overlay.rect(0, 0, width, height);
  overlay.fill({ color: LC.bgOverlay, alpha: LC.overlayAlpha });
  overlay.eventMode = 'static';
  container.addChild(overlay);

  // ── 卡片面板 ──────────────────────────────────────────
  const panelW = Math.min(340, width - 48);
  const panelH = 460;
  const panelX = (width - panelW) / 2;
  const panelY = (height - panelH) / 2;

  const panel = new Graphics();
  panel.roundRect(panelX, panelY, panelW, panelH, 24);
  panel.fill({ color: LC.surface });
  container.addChild(panel);

  // ── 標題區 ────────────────────────────────────────────
  const worldText = new Text({
    text: '',
    style: new TextStyle({
      fontFamily: FONT_BODY,
      fontSize: 13,
      fontWeight: '600',
      fill: LC.muted,
      align: 'center',
      letterSpacing: 0.8,
    }),
  });
  worldText.anchor.set(0.5, 0);
  worldText.position.set(width / 2, panelY + 28);
  container.addChild(worldText);

  const levelText = new Text({
    text: '',
    style: new TextStyle({
      fontFamily: FONT_DISPLAY,
      fontSize: 28,
      fontWeight: '700',
      fill: LC.fg,
      align: 'center',
    }),
  });
  levelText.anchor.set(0.5, 0);
  levelText.position.set(width / 2, panelY + 46);
  container.addChild(levelText);

  // ── 星星 ──────────────────────────────────────────────
  const starDisplay = createStarDisplay({ starSize: 28, gap: 16, initialStars: 0 });
  const starDisplayWidth = 28 * 3 + 16 * 2;
  starDisplay.position.set(width / 2 - starDisplayWidth / 2, panelY + 90);
  container.addChild(starDisplay);

  // ── 分數明細 ──────────────────────────────────────────
  const contentX = panelX + 28;
  const contentRight = panelX + panelW - 28;
  let rowY = panelY + 140;

  const detailStyle = new TextStyle({
    fontFamily: FONT_BODY,
    fontSize: 16,
    fontWeight: '600',
    fill: LC.muted,
  });
  const valueStyle = new TextStyle({
    fontFamily: FONT_DISPLAY,
    fontSize: 20,
    fontWeight: '700',
    fill: LC.fg,
  });

  const scoreLabel = new Text({ text: 'Score', style: detailStyle });
  scoreLabel.position.set(contentX, rowY);
  container.addChild(scoreLabel);

  const scoreValue = new Text({ text: '0', style: valueStyle });
  scoreValue.anchor.set(1, 0);
  scoreValue.position.set(contentRight, rowY);
  container.addChild(scoreValue);

  rowY += 34;
  const bonusStyle = new TextStyle({
    fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: '600',
    fill: LC.muted,
  });
  const bonusValueStyle = new TextStyle({
    fontFamily: FONT_DISPLAY,
    fontSize: 18,
    fontWeight: '700',
    fill: LC.muted,
  });

  const bonusLabel = new Text({ text: '', style: bonusStyle });
  bonusLabel.position.set(contentX, rowY);
  container.addChild(bonusLabel);

  const bonusValue = new Text({ text: '', style: bonusValueStyle });
  bonusValue.anchor.set(1, 0);
  bonusValue.position.set(contentRight, rowY);
  container.addChild(bonusValue);

  // 分隔線
  rowY += 30;
  const divider = new Graphics();
  divider.moveTo(contentX, rowY);
  divider.lineTo(contentRight, rowY);
  divider.stroke({ color: LC.border, width: 1 });
  container.addChild(divider);

  // Total
  rowY += 10;
  const totalLabel = new Text({
    text: 'Total',
    style: new TextStyle({
      fontFamily: FONT_BODY,
      fontSize: 16,
      fontWeight: '700',
      fill: LC.fg,
    }),
  });
  totalLabel.position.set(contentX, rowY);
  container.addChild(totalLabel);

  const totalValue = new Text({
    text: '0',
    style: new TextStyle({
      fontFamily: FONT_DISPLAY,
      fontSize: 24,
      fontWeight: '700',
      fill: LC.accent,
    }),
  });
  totalValue.anchor.set(1, 0);
  totalValue.position.set(contentRight, rowY);
  container.addChild(totalValue);

  // ── 統計 ──────────────────────────────────────────────
  rowY += 44;
  const statLabelStyle = new TextStyle({
    fontFamily: FONT_BODY,
    fontSize: 14,
    fill: LC.muted,
  });
  const statValueStyle = new TextStyle({
    fontFamily: FONT_DISPLAY,
    fontSize: 14,
    fontWeight: '700',
    fill: LC.fg,
  });

  const chainLabel = new Text({ text: 'Best chain', style: statLabelStyle });
  chainLabel.position.set(contentX, rowY);
  container.addChild(chainLabel);

  const chainValue = new Text({ text: '0', style: statValueStyle });
  chainValue.anchor.set(1, 0);
  chainValue.position.set(contentRight, rowY);
  container.addChild(chainValue);

  rowY += 24;
  const specialLabel = new Text({ text: 'Specials spawned', style: statLabelStyle });
  specialLabel.position.set(contentX, rowY);
  container.addChild(specialLabel);

  const specialValue = new Text({ text: '0', style: statValueStyle });
  specialValue.anchor.set(1, 0);
  specialValue.position.set(contentRight, rowY);
  container.addChild(specialValue);

  // ── 按鈕 ──────────────────────────────────────────────
  const btnY = panelY + panelH - 48 - 28;
  const btnGap = 10;
  const btnWidth = Math.floor((panelW - 28 * 2 - btnGap * 2) / 3);
  const btnStartX = contentX;

  const mapButton = createLCButton({
    text: 'Map',
    variant: 'outline',
    width: btnWidth,
    onClick: onMap,
  });
  mapButton.position.set(btnStartX, btnY);
  container.addChild(mapButton);

  const replayButton = createLCButton({
    text: 'Replay',
    variant: 'white',
    width: btnWidth,
    onClick: onReplay,
  });
  replayButton.position.set(btnStartX + btnWidth + btnGap, btnY);
  container.addChild(replayButton);

  const nextButton = createLCButton({
    text: 'Next',
    variant: 'primary',
    width: btnWidth,
    onClick: onNext,
  });
  nextButton.position.set(btnStartX + (btnWidth + btnGap) * 2, btnY);
  container.addChild(nextButton);

  // ── 公開參照 ──────────────────────────────────────────
  container.mapButton = mapButton;
  container.replayButton = replayButton;
  container.nextButton = nextButton;
  container.starDisplay = starDisplay;

  container.setResult = (r: LevelResult, wId: number) => {
    worldText.text = `WORLD ${wId}`;
    levelText.text = `Level ${String(r.levelId).padStart(2, '0')}`;
    starDisplay.setStars(r.stars);

    // Play star grant sounds with staggered timing
    if (r.stars >= 1) {
      import('../../audio/sfx-player').then(({ playStarGrant }) => {
        setTimeout(() => playStarGrant(1), 300);
        if (r.stars >= 2) setTimeout(() => playStarGrant(2), 800);
        if (r.stars >= 3) setTimeout(() => playStarGrant(3), 1300);
      });
    }

    const baseScore = r.score - r.movesRemaining * 1000;
    scoreValue.text = Math.max(0, baseScore).toLocaleString();

    if (r.movesRemaining > 0) {
      bonusLabel.text = `+ ${r.movesRemaining} remaining moves × 1000`;
      bonusValue.text = `+${(r.movesRemaining * 1000).toLocaleString()}`;
    } else {
      bonusLabel.text = '';
      bonusValue.text = '';
    }

    totalValue.text = r.score.toLocaleString();
    chainValue.text = `${r.chainMax}`;
    specialValue.text = `${r.specialSpawnedCount}`;
  };

  // 初始資料
  if (result) {
    container.setResult(result, worldId);
  }

  return container;
}
