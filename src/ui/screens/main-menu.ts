// ─── 31.2 主選單 ────────────────────────────────────────────
// Play、Endless（條件顯示）、Settings、Credits 按鈕。
// 明亮清新自然風格大廳。

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { SPACING } from '../theme';
import { type UIButton } from '../factory';
import { createTestModeSelect } from './test-mode-select';

// ─── 大廳色彩 Token ────────────────────────────────────────

/** 大廳專用色彩（明亮自然風） */
const LOBBY = {
  bgTop: 0xb8e6a0,       // 淺綠漸層頂部
  bgBottom: 0xeaf5e0,    // 淺綠漸層底部
  accent: 0x4caf50,      // 主按鈕綠
  accentDark: 0x357a38,  // 主按鈕陰影綠
  surface: 0xfcfdf9,     // 次要按鈕白底
  border: 0xc8dcc0,      // 次要按鈕邊框
  fg: 0x2e3a28,          // 深色文字
  muted: 0x6b7a63,       // 副標題灰綠
  cloud: 0xffffff,       // 雲朵白
  grass: 0x6abf4b,       // 底部草地
} as const;

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
  onTestMode?: (levelId: number) => void;
  onSettings?: () => void;
  onCredits?: () => void;
}

// ─── 大廳按鈕工廠（膠囊形） ────────────────────────────────

interface LobbyButtonOptions {
  text: string;
  width: number;
  height: number;
  variant: 'play' | 'secondary';
  onClick?: () => void;
}

function createLobbyButton(options: LobbyButtonOptions): UIButton {
  const { text, width: btnW, height: btnH, variant, onClick } = options;

  const container = new Container() as UIButton;
  container.label = `btn-${text}`;
  container.hitArea = { contains: (x: number, y: number) => x >= 0 && x <= btnW && y >= -4 && y <= btnH + 4 };

  const radius = variant === 'play' ? 40 : 28;
  const bg = new Graphics();

  if (variant === 'play') {
    // 底部陰影
    bg.roundRect(0, 6, btnW, btnH, radius);
    bg.fill({ color: LOBBY.accentDark, alpha: 1 });
    // 主體
    bg.roundRect(0, 0, btnW, btnH, radius);
    bg.fill({ color: LOBBY.accent, alpha: 1 });
  } else {
    bg.roundRect(0, 0, btnW, btnH, radius);
    bg.fill({ color: LOBBY.surface, alpha: 1 });
    bg.stroke({ color: LOBBY.border, width: 2.5 });
  }
  container.addChild(bg);
  container.bg = bg;

  const textColour = variant === 'play' ? 0xffffff : LOBBY.fg;
  const fontSize = variant === 'play' ? 26 : 16;
  const fontFamily = variant === 'play'
    ? 'Fredoka, Nunito, system-ui, sans-serif'
    : 'Nunito, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';

  const style = new TextStyle({
    fontFamily,
    fontSize,
    fontWeight: '700',
    fill: textColour,
    align: 'center',
    letterSpacing: variant === 'play' ? 1.5 : 0,
  });
  const label = new Text({ text, style });
  label.anchor.set(0.5, 0.5);
  label.position.set(btnW / 2, btnH / 2);
  container.addChild(label);

  // 互動
  let enabled = true;
  container.eventMode = 'static';
  container.cursor = 'pointer';

  container.on('pointerover', () => {
    if (!enabled) return;
    container.alpha = 0.9;
    bg.position.y = -2;
    label.position.y = btnH / 2 - 2;
  });

  container.on('pointerout', () => {
    if (!enabled) return;
    container.alpha = 1;
    bg.position.y = 0;
    label.position.y = btnH / 2;
  });

  container.on('pointerdown', () => {
    if (!enabled) return;
    container.scale.set(0.94);
  });

  container.on('pointerup', () => {
    if (!enabled) return;
    container.scale.set(1);
    import('../../audio/sfx-player').then(({ playUiClick, playUiClickStrong }) => {
      if (variant === 'play') {
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
    container.alpha = 1;
    bg.position.y = 0;
    label.position.y = btnH / 2;
  });

  container.setEnabled = (e: boolean) => {
    enabled = e;
    container.eventMode = e ? 'static' : 'none';
    container.cursor = e ? 'pointer' : 'default';
    container.alpha = e ? 1 : 0.5;
  };

  return container;
}

/**
 * 建立主選單畫面。
 *
 * 結構：
 * - 淺綠漸層背景
 * - 雲朵裝飾（頂部）
 * - GEM logo（Fredoka 深綠）
 * - Match · Crush · Collect 副標題
 * - PLAY 膠囊按鈕（綠色帶陰影）
 * - Endless / 測試模式 / Settings / Credits（白底圓角）
 * - 底部草地弧形
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

  // ── 漸層背景 ──────────────────────────────────────────
  const bg = new Graphics();
  // 模擬漸層：上半淺綠，下半近白
  const gradientSteps = 16;
  const stepH = height / gradientSteps;
  for (let i = 0; i < gradientSteps; i++) {
    const t = i / (gradientSteps - 1);
    const r = lerp((LOBBY.bgTop >> 16) & 0xff, (LOBBY.bgBottom >> 16) & 0xff, t);
    const g = lerp((LOBBY.bgTop >> 8) & 0xff, (LOBBY.bgBottom >> 8) & 0xff, t);
    const b = lerp(LOBBY.bgTop & 0xff, LOBBY.bgBottom & 0xff, t);
    const colour = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
    bg.rect(0, i * stepH, width, stepH + 1);
    bg.fill({ color: colour });
  }
  container.addChild(bg);

  // ── 雲朵裝飾 ──────────────────────────────────────────
  const clouds = new Graphics();
  clouds.ellipse(width * 0.1, height * 0.06, 60, 20);
  clouds.fill({ color: LOBBY.cloud, alpha: 0.6 });
  clouds.ellipse(width * 0.75, height * 0.09, 40, 15);
  clouds.fill({ color: LOBBY.cloud, alpha: 0.6 });
  clouds.ellipse(width * 0.85, height * 0.04, 50, 18);
  clouds.fill({ color: LOBBY.cloud, alpha: 0.4 });
  container.addChild(clouds);

  // ── Logo ──────────────────────────────────────────────
  const logoStyle = new TextStyle({
    fontFamily: 'Fredoka, Nunito, system-ui, sans-serif',
    fontSize: 72,
    fontWeight: '700',
    fill: LOBBY.accentDark,
    align: 'center',
    letterSpacing: -1,
    dropShadow: {
      color: LOBBY.accentDark,
      alpha: 0.3,
      angle: Math.PI / 2,
      blur: 0,
      distance: 4,
    },
  });
  const logo = new Text({ text: 'GEM', style: logoStyle });
  logo.anchor.set(0.5, 0.5);
  logo.position.set(width / 2, height * 0.2);
  container.addChild(logo);

  // ── 副標題 ────────────────────────────────────────────
  const subtitleStyle = new TextStyle({
    fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    fontSize: 15,
    fontWeight: '600',
    fill: LOBBY.muted,
    align: 'center',
    letterSpacing: 0.3,
  });
  const subtitle = new Text({ text: 'Match · Crush · Collect', style: subtitleStyle });
  subtitle.anchor.set(0.5, 0.5);
  subtitle.position.set(width / 2, height * 0.2 + 50);
  container.addChild(subtitle);

  // ── 按鈕 ──────────────────────────────────────────────
  const playBtnW = 260;
  const playBtnH = 64;
  const secBtnW = 220;
  const secBtnH = 48;
  const btnGap = SPACING.base;
  const startY = height * 0.38;

  const playButton = createLobbyButton({
    text: 'PLAY',
    width: playBtnW,
    height: playBtnH,
    variant: 'play',
    onClick: onPlay,
  });
  playButton.position.set(width / 2 - playBtnW / 2, startY);
  container.addChild(playButton);

  const endlessButton = createLobbyButton({
    text: 'Endless Mode',
    width: secBtnW,
    height: secBtnH,
    variant: 'secondary',
    onClick: onEndless,
  });
  endlessButton.position.set(width / 2 - secBtnW / 2, startY + playBtnH + btnGap + 6);
  container.addChild(endlessButton);

  const testModeButton = createLobbyButton({
    text: '測試模式',
    width: secBtnW,
    height: secBtnH,
    variant: 'secondary',
    onClick: () => {
      const overlay = createTestModeSelect({
        width,
        height,
        onConfirm: (levelId) => {
          container.removeChild(overlay);
          onTestMode?.(levelId);
        },
        onCancel: () => {
          container.removeChild(overlay);
        },
      });
      container.addChild(overlay);
    },
  });
  testModeButton.position.set(width / 2 - secBtnW / 2, startY + playBtnH + secBtnH + btnGap * 2 + 6);
  container.addChild(testModeButton);

  const settingsButton = createLobbyButton({
    text: 'Settings',
    width: secBtnW,
    height: secBtnH,
    variant: 'secondary',
    onClick: onSettings,
  });
  settingsButton.position.set(width / 2 - secBtnW / 2, startY + playBtnH + secBtnH * 2 + btnGap * 3 + 6);
  container.addChild(settingsButton);

  const creditsButton = createLobbyButton({
    text: 'Credits',
    width: secBtnW,
    height: secBtnH,
    variant: 'secondary',
    onClick: onCredits,
  });
  creditsButton.position.set(width / 2 - secBtnW / 2, startY + playBtnH + secBtnH * 3 + btnGap * 4 + 6);
  container.addChild(creditsButton);

  // ── 底部草地 ──────────────────────────────────────────
  const grass = new Graphics();
  grass.ellipse(width / 2, height + 20, width * 0.7, 60);
  grass.fill({ color: LOBBY.grass });
  container.addChild(grass);

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

// ─── 工具函式 ──────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
