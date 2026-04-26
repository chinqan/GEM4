// ─── 31.4 關卡選擇卡片 ──────────────────────────────────────
// 目標、預算、最佳紀錄。Modal overlay on world map.

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { BG, TEXT_COLOURS, FONT_SIZES, SPACING, RADIUS } from '../theme';
import { createButton, createStarDisplay, type UIButton, type UIStarDisplay } from '../factory';

// ─── 型別 ──────────────────────────────────────────────────

export interface LevelSelectCard extends Container {
  playButton: UIButton;
  cancelButton: UIButton;
  starDisplay: UIStarDisplay;
  /** 更新卡片資料 */
  setLevelData(data: LevelSelectData): void;
}

export interface LevelSelectData {
  worldId: number;
  levelId: number;
  levelName?: string;
  objectiveText: string;
  moveBudget?: number;
  timeBudget?: number;
  bestStars: 0 | 1 | 2 | 3;
  bestScore: number;
  attempts: number;
}

export interface CreateLevelSelectOptions {
  width: number;
  height: number;
  data?: LevelSelectData;
  onPlay?: () => void;
  onCancel?: () => void;
}

/**
 * 建立關卡選擇卡片（modal overlay）。
 *
 * 結構：
 * - 半透明背景遮罩
 * - 卡片面板：世界/關卡標題、目標、手數/時間、最佳紀錄、嘗試次數
 * - Cancel / Play 按鈕
 */
export function createLevelSelectCard(options: CreateLevelSelectOptions): LevelSelectCard {
  const {
    width,
    height,
    data,
    onPlay,
    onCancel,
  } = options;

  const container = new Container() as LevelSelectCard;
  container.label = 'level-select-card';

  // ── 背景遮罩 ─────────────────────────────────────────
  const overlay = new Graphics();
  overlay.rect(0, 0, width, height);
  overlay.fill({ color: 0x0b1026, alpha: BG.overlayAlpha });
  overlay.eventMode = 'static'; // 攔截點擊
  overlay.on('pointerup', () => { onCancel?.(); });
  container.addChild(overlay);

  // ── 卡片面板 ─────────────────────────────────────────
  const cardW = 400;
  const cardH = 320;
  const cardX = (width - cardW) / 2;
  const cardY = (height - cardH) / 2;

  const card = new Graphics();
  card.roundRect(cardX, cardY, cardW, cardH, RADIUS.lg);
  card.fill({ color: BG.panel });
  card.eventMode = 'static'; // 阻止卡片區域的點擊穿透到 overlay
  container.addChild(card);

  // ── 標題 ──────────────────────────────────────────────
  const titleStyle = new TextStyle({
    fontFamily: 'Inter, "Noto Sans CJK TC", sans-serif',
    fontSize: FONT_SIZES.subtitle,
    fill: TEXT_COLOURS.primary,
    align: 'center',
  });
  const titleText = new Text({ text: '', style: titleStyle });
  titleText.anchor.set(0.5, 0);
  titleText.position.set(width / 2, cardY + SPACING.lg);
  container.addChild(titleText);

  // ── 目標 ──────────────────────────────────────────────
  const bodyStyle = new TextStyle({
    fontFamily: 'Inter, "Noto Sans CJK TC", sans-serif',
    fontSize: FONT_SIZES.body,
    fill: TEXT_COLOURS.secondary,
    align: 'center',
    wordWrap: true,
    wordWrapWidth: cardW - SPACING.xl * 2,
  });
  const objectiveText = new Text({ text: '', style: bodyStyle });
  objectiveText.anchor.set(0.5, 0);
  objectiveText.position.set(width / 2, cardY + 60);
  container.addChild(objectiveText);

  // ── 統計資訊 ──────────────────────────────────────────
  const statStyle = new TextStyle({
    fontFamily: 'Inter, sans-serif',
    fontSize: FONT_SIZES.body,
    fill: TEXT_COLOURS.muted,
    align: 'left',
  });
  const budgetText = new Text({ text: '', style: statStyle });
  budgetText.position.set(cardX + SPACING.lg, cardY + 110);
  container.addChild(budgetText);

  const bestText = new Text({ text: '', style: statStyle });
  bestText.position.set(cardX + SPACING.lg, cardY + 140);
  container.addChild(bestText);

  const attemptsText = new Text({ text: '', style: statStyle });
  attemptsText.position.set(cardX + SPACING.lg, cardY + 170);
  container.addChild(attemptsText);

  // ── 星星 ──────────────────────────────────────────────
  const starDisplay = createStarDisplay({ starSize: 18, gap: 6, initialStars: 0 });
  starDisplay.position.set(cardX + cardW - SPACING.lg - 72, cardY + 140);
  container.addChild(starDisplay);

  // ── 按鈕 ──────────────────────────────────────────────
  const btnY = cardY + cardH - 56 - SPACING.lg;

  const cancelButton = createButton({
    text: 'Cancel',
    variant: 'secondary',
    size: 'md',
    width: 120,
    onClick: onCancel,
  });
  cancelButton.position.set(cardX + cardW / 2 - 130, btnY);
  container.addChild(cancelButton);

  const playButton = createButton({
    text: 'PLAY',
    variant: 'primary',
    size: 'md',
    width: 120,
    onClick: onPlay,
  });
  playButton.position.set(cardX + cardW / 2 + 10, btnY);
  container.addChild(playButton);

  // ── 公開參照 ──────────────────────────────────────────
  container.playButton = playButton;
  container.cancelButton = cancelButton;
  container.starDisplay = starDisplay;

  // ── 更新方法 ──────────────────────────────────────────
  container.setLevelData = (d: LevelSelectData) => {
    titleText.text = `W${d.worldId} · Level ${String(d.levelId).padStart(2, '0')}`;
    objectiveText.text = `目標: ${d.objectiveText}`;

    if (d.moveBudget != null) {
      budgetText.text = `手數: ${d.moveBudget}`;
    } else if (d.timeBudget != null) {
      budgetText.text = `時間: ${d.timeBudget}s`;
    } else {
      budgetText.text = '';
    }

    if (d.attempts === 0) {
      bestText.text = '過往最佳: 尚未挑戰';
    } else if (d.bestScore === 0) {
      bestText.text = '過往最佳: 0 分';
    } else {
      bestText.text = `過往最佳: ${d.bestScore.toLocaleString()} 分`;
    }

    attemptsText.text = `嘗試次數: ${d.attempts}`;
    starDisplay.setStars(d.bestStars);
  };

  // 初始資料
  if (data) {
    container.setLevelData(data);
  }

  return container;
}
