// ─── 31.6 暫停覆蓋層 ────────────────────────────────────────
// 繼續、重新開始、設定、退出。
// 風格：淺色卡片（Fredoka + Nunito），綠色調 accent。

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { type UIButton } from '../factory';

// ─── 局部色彩 Token（暫停畫面專用） ─────────────────────────

const LC = {
  surface: 0xfcfcfc,
  bg: 0xf0f5f0,
  border: 0xd6e8d6,
  fg: 0x2a3a2a,
  muted: 0x6b7b6b,
  accent: 0x4caf50,
  accentDark: 0x388e3c,
  danger: 0xe53935,
  dangerDark: 0xb71c1c,
  bgOverlay: 0x2a3a2a,
  overlayAlpha: 0.7,
} as const;

const FONT_DISPLAY = 'Fredoka, Nunito, system-ui, sans-serif';
const FONT_BODY = 'Nunito, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';

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

// ─── 局部按鈕工廠 ───────────────────────────────────────────

type PauseButtonVariant = 'resume' | 'secondary' | 'quit';

function createPauseButton(options: {
  text: string;
  variant: PauseButtonVariant;
  width: number;
  onClick?: () => void;
}): UIButton {
  const { text, variant, width, onClick } = options;
  const height = 50;

  const container = new Container() as UIButton;
  container.label = `btn-${text}`;
  container.hitArea = {
    contains: (x: number, y: number) => x >= 0 && x <= width && y >= -4 && y <= height + 8,
  };

  const bg = new Graphics();

  function drawBg(): void {
    bg.clear();
    switch (variant) {
      case 'resume':
        // 底部陰影
        bg.roundRect(0, 4, width, height, 28);
        bg.fill({ color: LC.accentDark });
        // 主體
        bg.roundRect(0, 0, width, height, 28);
        bg.fill({ color: LC.accent });
        break;
      case 'secondary':
        bg.roundRect(0, 0, width, height, 28);
        bg.fill({ color: LC.bg });
        bg.stroke({ color: LC.border, width: 2 });
        break;
      case 'quit':
        // 底部陰影
        bg.roundRect(0, 4, width, height, 28);
        bg.fill({ color: LC.dangerDark });
        // 主體
        bg.roundRect(0, 0, width, height, 28);
        bg.fill({ color: LC.danger });
        break;
    }
  }
  drawBg();
  container.addChild(bg);
  container.bg = bg;

  // 文字色與字型
  let textColour: number;
  let fontFamily: string;
  let fontSize: number;
  switch (variant) {
    case 'resume':
      textColour = 0xffffff;
      fontFamily = FONT_DISPLAY;
      fontSize = 18;
      break;
    case 'secondary':
      textColour = LC.muted;
      fontFamily = FONT_BODY;
      fontSize = 16;
      break;
    case 'quit':
      textColour = 0xffffff;
      fontFamily = FONT_BODY;
      fontSize = 16;
      break;
  }

  const label = new Text({
    text,
    style: new TextStyle({
      fontFamily,
      fontSize,
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

  container.on('pointerover', () => { if (enabled) container.alpha = 0.9; });
  container.on('pointerout', () => { if (enabled) container.alpha = 1; });
  container.on('pointerdown', () => { if (enabled) container.scale.set(0.96); });
  container.on('pointerup', () => {
    if (!enabled) return;
    container.scale.set(1);
    import('../../audio/sfx-player').then(({ playUiClick, playUiClickStrong }) => {
      if (variant === 'resume') playUiClickStrong();
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
 * 建立暫停覆蓋層。
 *
 * 結構：
 * - 半透明背景遮罩
 * - 淺色圓角卡片
 * - "Paused" 標題（Fredoka）
 * - Resume (accent) / Restart / Settings / Quit to Map (danger)
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
  overlay.fill({ color: LC.bgOverlay, alpha: LC.overlayAlpha });
  overlay.eventMode = 'static';
  container.addChild(overlay);

  // ── 卡片面板 ──────────────────────────────────────────
  // HTML ref: padding 36px 28px 32px, gap 16px between title/buttons, buttons gap 12px
  const panelW = Math.min(310, width - 80);
  const padTop = 36;
  const padSide = 28;
  const padBottom = 32;
  const titleH = 40;
  const titleGap = 24; // gap(16) + margin-top(8) from mockup
  const btnH = 50;
  const btnGap = 12;
  const btnCount = 4;
  const panelH = padTop + titleH + titleGap + btnH * btnCount + btnGap * (btnCount - 1) + padBottom;
  const panelX = (width - panelW) / 2;
  const panelY = (height - panelH) / 2;

  const panel = new Graphics();
  panel.roundRect(panelX, panelY, panelW, panelH, 28);
  panel.fill({ color: LC.surface });
  container.addChild(panel);

  // ── 標題 ──────────────────────────────────────────────
  const title = new Text({
    text: 'Paused',
    style: new TextStyle({
      fontFamily: FONT_DISPLAY,
      fontSize: 32,
      fontWeight: '700',
      fill: LC.fg,
      align: 'center',
    }),
  });
  title.anchor.set(0.5, 0);
  title.position.set(width / 2, panelY + padTop);
  container.addChild(title);

  // ── 按鈕 ──────────────────────────────────────────────
  const btnWidth = panelW - padSide * 2;
  const btnX = panelX + padSide;
  let btnY = panelY + padTop + titleH + titleGap;

  const resumeButton = createPauseButton({
    text: 'Resume',
    variant: 'resume',
    width: btnWidth,
    onClick: onResume,
  });
  resumeButton.position.set(btnX, btnY);
  container.addChild(resumeButton);

  btnY += btnH + btnGap;
  const restartButton = createPauseButton({
    text: 'Restart',
    variant: 'secondary',
    width: btnWidth,
    onClick: onRestart,
  });
  restartButton.position.set(btnX, btnY);
  container.addChild(restartButton);

  btnY += btnH + btnGap;
  const settingsButton = createPauseButton({
    text: 'Settings',
    variant: 'secondary',
    width: btnWidth,
    onClick: onSettings,
  });
  settingsButton.position.set(btnX, btnY);
  container.addChild(settingsButton);

  btnY += btnH + btnGap;
  const quitButton = createPauseButton({
    text: 'Quit to Map',
    variant: 'quit',
    width: btnWidth,
    onClick: onQuit,
  });
  quitButton.position.set(btnX, btnY);
  container.addChild(quitButton);

  // ── 公開參照 ──────────────────────────────────────────
  container.resumeButton = resumeButton;
  container.restartButton = restartButton;
  container.settingsButton = settingsButton;
  container.quitButton = quitButton;

  return container;
}
