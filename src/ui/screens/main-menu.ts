// ─── 31.2 主選單 ────────────────────────────────────────────
// Play、Endless（條件顯示）、Settings、Credits 按鈕。

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { BG, TEXT_COLOURS, FONT_SIZES, SPACING } from '../theme';
import { createButton, type UIButton } from '../factory';

// ─── 型別 ──────────────────────────────────────────────────

export interface MainMenuScreen extends Container {
  playButton: UIButton;
  endlessButton: UIButton;
  testModeButton: UIButton;
  settingsButton: UIButton;
  creditsButton: UIButton;
  /** 設定 Endless 按鈕是否解鎖 */
  setEndlessUnlocked(unlocked: boolean): void;
}

export interface CreateMainMenuOptions {
  width: number;
  height: number;
  endlessUnlocked?: boolean;
  onPlay?: () => void;
  onEndless?: () => void;
  onTestMode?: () => void;
  onSettings?: () => void;
  onCredits?: () => void;
}

/**
 * 建立主選單畫面。
 *
 * 結構：
 * - 世界 1 風格背景
 * - GEM logo
 * - Play (primary lg)、Endless (secondary, locked 時灰階)、Settings、Credits
 * - 右下版本號
 */
export function createMainMenuScreen(options: CreateMainMenuOptions): MainMenuScreen {
  const {
    width,
    height,
    endlessUnlocked = false,
    onPlay,
    onEndless,
    onTestMode,
    onSettings,
    onCredits,
  } = options;

  const container = new Container() as MainMenuScreen;
  container.label = 'main-menu-screen';

  // ── 背景 ──────────────────────────────────────────────
  const bg = new Graphics();
  bg.rect(0, 0, width, height);
  bg.fill({ color: BG.deep });
  container.addChild(bg);

  // ── Logo ──────────────────────────────────────────────
  const logoStyle = new TextStyle({
    fontFamily: 'Cinzel, "Noto Serif CJK TC", serif',
    fontSize: FONT_SIZES.title,
    fill: 0xf6c453,
    align: 'center',
    letterSpacing: 8,
  });
  const logo = new Text({ text: 'G E M', style: logoStyle });
  logo.anchor.set(0.5, 0.5);
  logo.position.set(width / 2, height * 0.2);
  container.addChild(logo);

  // 分隔線
  const divider = new Graphics();
  const divW = 80;
  divider.moveTo(width / 2 - divW / 2, height * 0.2 + 30);
  divider.lineTo(width / 2 + divW / 2, height * 0.2 + 30);
  divider.stroke({ color: 0xf6c453, width: 2, alpha: 0.5 });
  container.addChild(divider);

  // ── 按鈕 ──────────────────────────────────────────────
  const btnWidth = 240;
  const btnGap = SPACING.base;
  const startY = height * 0.38;

  const playButton = createButton({
    text: 'PLAY',
    variant: 'primary',
    size: 'lg',
    width: btnWidth,
    onClick: onPlay,
  });
  playButton.position.set(width / 2 - btnWidth / 2, startY);
  container.addChild(playButton);

  const endlessButton = createButton({
    text: 'Endless Mode',
    variant: 'secondary',
    size: 'md',
    width: btnWidth,
    onClick: onEndless,
  });
  endlessButton.position.set(width / 2 - btnWidth / 2, startY + 56 + btnGap);
  container.addChild(endlessButton);

  const testModeButton = createButton({
    text: '🧪 測試模式',
    variant: 'secondary',
    size: 'md',
    width: btnWidth,
    onClick: onTestMode,
  });
  testModeButton.position.set(width / 2 - btnWidth / 2, startY + 56 + 44 + btnGap * 2);
  container.addChild(testModeButton);

  const settingsButton = createButton({
    text: 'Settings',
    variant: 'ghost',
    size: 'md',
    width: btnWidth,
    onClick: onSettings,
  });
  settingsButton.position.set(width / 2 - btnWidth / 2, startY + 56 + 44 * 2 + btnGap * 3);
  container.addChild(settingsButton);

  const creditsButton = createButton({
    text: 'Credits',
    variant: 'ghost',
    size: 'md',
    width: btnWidth,
    onClick: onCredits,
  });
  creditsButton.position.set(width / 2 - btnWidth / 2, startY + 56 + 44 * 3 + btnGap * 4);
  container.addChild(creditsButton);

  // ── 版本號 ────────────────────────────────────────────
  const versionStyle = new TextStyle({
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fill: TEXT_COLOURS.muted,
  });
  const versionText = new Text({ text: 'v1.0.0', style: versionStyle });
  versionText.anchor.set(1, 1);
  versionText.position.set(width - SPACING.base, height - SPACING.base);
  container.addChild(versionText);

  // ── 公開參照 ──────────────────────────────────────────
  container.playButton = playButton;
  container.endlessButton = endlessButton;
  container.testModeButton = testModeButton;
  container.settingsButton = settingsButton;
  container.creditsButton = creditsButton;

  // Endless 解鎖狀態
  endlessButton.setEnabled(endlessUnlocked);

  container.setEndlessUnlocked = (unlocked: boolean) => {
    endlessButton.setEnabled(unlocked);
  };

  return container;
}
