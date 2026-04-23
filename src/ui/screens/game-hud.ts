// ─── 31.5 遊戲 HUD ─────────────────────────────────────────
// 分數、手數/時間、目標進度、暫停按鈕。

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { BG, TEXT_COLOURS, FONT_SIZES, SPACING, RADIUS } from '../theme';
import {
  createButton,
  createStarDisplay,
  createObjectiveChip,
  type UIButton,
  type UIStarDisplay,
  type UIObjectiveChip,
} from '../factory';

// ─── 型別 ──────────────────────────────────────────────────

export interface GameHUD extends Container {
  pauseButton: UIButton;
  settingsButton: UIButton;
  starDisplay: UIStarDisplay;
  objectiveChip: UIObjectiveChip;
  /** 更新分數顯示 */
  setScore(score: number): void;
  /** 更新手數 */
  setMoves(remaining: number): void;
  /** 更新時間（秒） */
  setTime(remainingSeconds: number): void;
  /** 更新目標進度 */
  setObjective(current: number, total: number): void;
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
  onPause?: () => void;
  onSettings?: () => void;
}

/**
 * 建立遊戲 HUD。
 *
 * 佈局：
 * - 左上：暫停按鈕
 * - 中上：分數計數器
 * - 右上：設定齒輪 + 星星
 * - 左中：目標 chip
 * - 右中：手數/時間 chip
 */
export function createGameHUD(options: CreateGameHUDOptions): GameHUD {
  const {
    width,
    height,
    mode = 'moves',
    onPause,
    onSettings,
  } = options;

  const container = new Container() as GameHUD;
  container.label = 'game-hud';

  const margin = SPACING.base;
  const topY = margin;

  // ── 暫停按鈕（左上） ─────────────────────────────────
  const pauseButton = createButton({
    text: '⏸',
    variant: 'ghost',
    size: 'sm',
    width: 40,
    onClick: onPause,
  });
  pauseButton.position.set(margin, topY);
  container.addChild(pauseButton);

  // ── 分數（中上） ──────────────────────────────────────
  const scoreStyle = new TextStyle({
    fontFamily: 'JetBrains Mono, "Noto Sans CJK TC", monospace',
    fontSize: FONT_SIZES.hudScore,
    fill: TEXT_COLOURS.primary,
    align: 'center',
  });
  const scoreLabel = new Text({ text: 'SCORE', style: new TextStyle({
    fontFamily: 'Inter, sans-serif',
    fontSize: FONT_SIZES.caption,
    fill: TEXT_COLOURS.muted,
    align: 'center',
  }) });
  scoreLabel.anchor.set(0.5, 0);
  scoreLabel.position.set(width / 2, topY);
  container.addChild(scoreLabel);

  const scoreText = new Text({ text: '0', style: scoreStyle });
  scoreText.anchor.set(0.5, 0);
  scoreText.position.set(width / 2, topY + 16);
  container.addChild(scoreText);

  // ── 設定齒輪（右上） ─────────────────────────────────
  const settingsButton = createButton({
    text: '⚙',
    variant: 'ghost',
    size: 'sm',
    width: 40,
    onClick: onSettings,
  });
  settingsButton.position.set(width - 40 - margin, topY);
  container.addChild(settingsButton);

  // ── 星星（右上偏左） ─────────────────────────────────
  const starDisplay = createStarDisplay({ starSize: 14, gap: 4, initialStars: 0 });
  starDisplay.position.set(width - 40 - margin - 60, topY + 6);
  container.addChild(starDisplay);

  // ── 目標 chip（左中） ─────────────────────────────────
  const chipY = topY + 56;
  const objectiveChip = createObjectiveChip({
    icon: '🎯',
    current: 0,
    total: 1,
  });
  objectiveChip.position.set(margin, chipY);
  container.addChild(objectiveChip);

  // ── 手數/時間 chip（右中） ────────────────────────────
  const budgetBg = new Graphics();
  const budgetChipW = 80;
  const budgetChipH = 32;
  budgetBg.roundRect(0, 0, budgetChipW, budgetChipH, RADIUS.xs);
  budgetBg.fill({ color: BG.panel, alpha: 0.8 });
  budgetBg.position.set(width - budgetChipW - margin, chipY);
  container.addChild(budgetBg);

  const budgetStyle = new TextStyle({
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: FONT_SIZES.hudStat,
    fill: TEXT_COLOURS.primary,
    align: 'center',
  });
  const budgetText = new Text({ text: mode === 'moves' ? '0' : '0:00', style: budgetStyle });
  budgetText.anchor.set(0.5, 0.5);
  budgetText.position.set(
    width - budgetChipW - margin + budgetChipW / 2,
    chipY + budgetChipH / 2,
  );
  container.addChild(budgetText);

  // ── 連鎖計數（中央浮動） ─────────────────────────────
  const chainStyle = new TextStyle({
    fontFamily: 'Inter, sans-serif',
    fontSize: FONT_SIZES.subtitle,
    fill: 0xf6c453,
    align: 'center',
  });
  const chainText = new Text({ text: '', style: chainStyle });
  chainText.anchor.set(0.5, 0.5);
  chainText.position.set(width / 2, chipY + 20);
  chainText.visible = false;
  container.addChild(chainText);

  // ── 公開參照 ──────────────────────────────────────────
  container.pauseButton = pauseButton;
  container.settingsButton = settingsButton;
  container.starDisplay = starDisplay;
  container.objectiveChip = objectiveChip;

  container.setScore = (score: number) => {
    scoreText.text = score.toLocaleString();
  };

  container.setMoves = (remaining: number) => {
    budgetText.text = `${remaining}`;
  };

  container.setTime = (remainingSeconds: number) => {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = Math.floor(remainingSeconds % 60);
    budgetText.text = `${mins}:${String(secs).padStart(2, '0')}`;
  };

  container.setObjective = (current: number, total: number) => {
    objectiveChip.setProgress(current, total);
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
