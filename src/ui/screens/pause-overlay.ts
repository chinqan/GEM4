// ─── 31.6 暫停覆蓋層 ────────────────────────────────────────
// 繼續、重新開始、設定、退出。

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { BG, TEXT_COLOURS, FONT_SIZES, SPACING, RADIUS } from '../theme';
import { createButton, type UIButton } from '../factory';

// ─── 型別 ──────────────────────────────────────────────────

export interface PauseOverlay extends Container {
  resumeButton: UIButton;
  restartButton: UIButton;
  settingsButton: UIButton;
  quitButton: UIButton;
}

export interface CreatePauseOverlayOptions {
  width: number;
  height: number;
  onResume?: () => void;
  onRestart?: () => void;
  onSettings?: () => void;
  onQuit?: () => void;
}

/**
 * 建立暫停覆蓋層。
 *
 * 結構：
 * - 半透明黑色遮罩（模擬 blur 效果）
 * - "PAUSED" 標題
 * - Resume (primary)、Restart、Settings、Quit to Map (danger)
 */
export function createPauseOverlay(options: CreatePauseOverlayOptions): PauseOverlay {
  const {
    width,
    height,
    onResume,
    onRestart,
    onSettings,
    onQuit,
  } = options;

  const container = new Container() as PauseOverlay;
  container.label = 'pause-overlay';

  // ── 背景遮罩 ─────────────────────────────────────────
  const overlay = new Graphics();
  overlay.rect(0, 0, width, height);
  overlay.fill({ color: 0x000000, alpha: 0.4 });
  overlay.eventMode = 'static'; // 攔截點擊穿透
  container.addChild(overlay);

  // ── 面板 ──────────────────────────────────────────────
  const panelW = 280;
  const panelH = 300;
  const panelX = (width - panelW) / 2;
  const panelY = (height - panelH) / 2;

  const panel = new Graphics();
  panel.roundRect(panelX, panelY, panelW, panelH, RADIUS.lg);
  panel.fill({ color: BG.panel });
  container.addChild(panel);

  // ── 標題 ──────────────────────────────────────────────
  const titleStyle = new TextStyle({
    fontFamily: 'Cinzel, "Noto Serif CJK TC", serif',
    fontSize: FONT_SIZES.title,
    fill: TEXT_COLOURS.primary,
    align: 'center',
  });
  const title = new Text({ text: 'PAUSED', style: titleStyle });
  title.anchor.set(0.5, 0);
  title.position.set(width / 2, panelY + SPACING.lg);
  container.addChild(title);

  // ── 按鈕 ──────────────────────────────────────────────
  const btnWidth = 200;
  const btnX = (width - btnWidth) / 2;
  const btnStartY = panelY + 80;
  const btnGap = SPACING.md;

  const resumeButton = createButton({
    text: 'Resume',
    variant: 'primary',
    size: 'md',
    width: btnWidth,
    onClick: onResume,
  });
  resumeButton.position.set(btnX, btnStartY);
  container.addChild(resumeButton);

  const restartButton = createButton({
    text: 'Restart',
    variant: 'secondary',
    size: 'md',
    width: btnWidth,
    onClick: onRestart,
  });
  restartButton.position.set(btnX, btnStartY + 44 + btnGap);
  container.addChild(restartButton);

  const settingsButton = createButton({
    text: 'Settings',
    variant: 'secondary',
    size: 'md',
    width: btnWidth,
    onClick: onSettings,
  });
  settingsButton.position.set(btnX, btnStartY + (44 + btnGap) * 2);
  container.addChild(settingsButton);

  const quitButton = createButton({
    text: 'Quit to Map',
    variant: 'danger',
    size: 'md',
    width: btnWidth,
    onClick: onQuit,
  });
  quitButton.position.set(btnX, btnStartY + (44 + btnGap) * 3);
  container.addChild(quitButton);

  // ── 公開參照 ──────────────────────────────────────────
  container.resumeButton = resumeButton;
  container.restartButton = restartButton;
  container.settingsButton = settingsButton;
  container.quitButton = quitButton;

  return container;
}
