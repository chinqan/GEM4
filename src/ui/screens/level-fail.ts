// ─── 31.8 關卡失敗畫面 ──────────────────────────────────────
// 鼓勵訊息、重試/退出。

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { BG, TEXT_COLOURS, FONT_SIZES, SPACING, RADIUS } from '../theme';
import { createButton, type UIButton } from '../factory';

// ─── 型別 ──────────────────────────────────────────────────

export interface LevelFailScreen extends Container {
  mapButton: UIButton;
  retryButton: UIButton;
  /** 設定鼓勵訊息 */
  setMessage(message: string): void;
}

export interface CreateLevelFailOptions {
  width: number;
  height: number;
  message?: string;
  onMap?: () => void;
  onRetry?: () => void;
}

/** 鼓勵訊息池（隨機選取） */
const ENCOURAGEMENT_MESSAGES = [
  '明天的光同樣溫暖',
  '每次嘗試都是進步',
  '再試一次，你可以的',
  '失敗是成功之母',
  '休息一下再來吧',
];

/**
 * 建立關卡失敗畫面。
 *
 * 結構：
 * - 半透明背景遮罩（褪色效果）
 * - 鼓勵文案（隨機）
 * - Map / Retry 按鈕（Retry 為 primary，預設焦點）
 */
export function createLevelFailScreen(options: CreateLevelFailOptions): LevelFailScreen {
  const {
    width,
    height,
    message,
    onMap,
    onRetry,
  } = options;

  const container = new Container() as LevelFailScreen;
  container.label = 'level-fail-screen';

  // ── 背景遮罩 ─────────────────────────────────────────
  const overlay = new Graphics();
  overlay.rect(0, 0, width, height);
  overlay.fill({ color: 0x0b1026, alpha: 0.9 });
  overlay.eventMode = 'static';
  container.addChild(overlay);

  // ── 面板 ──────────────────────────────────────────────
  const panelW = 400;
  const panelH = 200;
  const panelX = (width - panelW) / 2;
  const panelY = (height - panelH) / 2;

  const panel = new Graphics();
  panel.roundRect(panelX, panelY, panelW, panelH, RADIUS.lg);
  panel.fill({ color: BG.panel });
  container.addChild(panel);

  // ── 鼓勵訊息 ─────────────────────────────────────────
  const defaultMsg = message ?? ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];

  const msgStyle = new TextStyle({
    fontFamily: 'Inter, "Noto Sans CJK TC", sans-serif',
    fontSize: FONT_SIZES.subtitle,
    fill: TEXT_COLOURS.secondary,
    align: 'center',
    wordWrap: true,
    wordWrapWidth: panelW - SPACING.xl * 2,
  });
  const msgText = new Text({ text: defaultMsg, style: msgStyle });
  msgText.anchor.set(0.5, 0);
  msgText.position.set(width / 2, panelY + SPACING.xl);
  container.addChild(msgText);

  // ── 按鈕 ──────────────────────────────────────────────
  const btnY = panelY + panelH - 56 - SPACING.lg;
  const btnWidth = 140;
  const btnGap = SPACING.lg;

  const mapButton = createButton({
    text: 'Map',
    variant: 'ghost',
    size: 'md',
    width: btnWidth,
    onClick: onMap,
  });
  mapButton.position.set(width / 2 - btnWidth - btnGap / 2, btnY);
  container.addChild(mapButton);

  const retryButton = createButton({
    text: 'Retry',
    variant: 'primary',
    size: 'md',
    width: btnWidth,
    onClick: onRetry,
  });
  retryButton.position.set(width / 2 + btnGap / 2, btnY);
  container.addChild(retryButton);

  // ── 公開參照 ──────────────────────────────────────────
  container.mapButton = mapButton;
  container.retryButton = retryButton;

  container.setMessage = (msg: string) => {
    msgText.text = msg;
  };

  return container;
}
