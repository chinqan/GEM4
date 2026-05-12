// ─── 31.1 Splash 畫面 ───────────────────────────────────────
// 載入進度條、使用者手勢提示（Tap to Begin 脈動文字）。

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { BG, TEXT_COLOURS, FONT_SIZES, SPACING } from '../theme';
import { createProgressBar, type UIProgressBar } from '../factory';

// ─── 型別 ──────────────────────────────────────────────────

export interface SplashScreen extends Container {
  /** 載入進度條 */
  progressBar: UIProgressBar;
  /** 更新載入進度 (0..1) */
  setLoadProgress(value: number): void;
  /** 顯示/隱藏 "Tap to Begin" 提示 */
  showTapPrompt(visible: boolean): void;
}

// ─── 建立 ──────────────────────────────────────────────────

export interface CreateSplashOptions {
  width: number;
  height: number;
}

/**
 * 建立 Splash 畫面。
 *
 * 結構：
 * - 深紫漸層背景 + 星點
 * - GEM logo（大字）
 * - 載入進度條
 * - "Tap to Begin" 脈動文字
 * - 版本號
 */
export function createSplashScreen(options: CreateSplashOptions): SplashScreen {
  const { width, height } = options;
  const container = new Container() as SplashScreen;
  container.label = 'splash-screen';

  // ── 背景 ──────────────────────────────────────────────
  const bg = new Graphics();
  bg.rect(0, 0, width, height);
  bg.fill({ color: BG.deep });
  container.addChild(bg);

  // 星點裝飾
  const starField = new Graphics();
  for (let i = 0; i < 40; i++) {
    const sx = Math.random() * width;
    const sy = Math.random() * height;
    const sr = 1 + Math.random() * 2;
    starField.circle(sx, sy, sr);
    starField.fill({ color: 0xffffff, alpha: 0.2 + Math.random() * 0.4 });
  }
  container.addChild(starField);

  // ── Logo ──────────────────────────────────────────────
  const logoStyle = new TextStyle({
    fontFamily: 'Cinzel, "Noto Serif CJK TC", serif',
    fontSize: FONT_SIZES.display,
    fill: 0xf6c453,
    align: 'center',
    letterSpacing: 12,
  });
  const logo = new Text({ text: 'G E M', style: logoStyle });
  logo.anchor.set(0.5, 0.5);
  logo.position.set(width / 2, height * 0.38);
  container.addChild(logo);

  // 金色分隔線
  const divider = new Graphics();
  const divW = 120;
  divider.moveTo(width / 2 - divW / 2, height * 0.38 + 40);
  divider.lineTo(width / 2 + divW / 2, height * 0.38 + 40);
  divider.stroke({ color: 0xf6c453, width: 2, alpha: 0.6 });
  container.addChild(divider);

  // ── 進度條 ────────────────────────────────────────────
  const progressBar = createProgressBar({
    width: 280,
    height: 8,
    variant: 'loading',
    initialProgress: 0,
  });
  progressBar.position.set(width / 2 - 140, height * 0.55);
  container.addChild(progressBar);
  container.progressBar = progressBar;

  // ── Tap to Begin ──────────────────────────────────────
  const tapStyle = new TextStyle({
    fontFamily: 'Inter, "Noto Sans CJK TC", sans-serif',
    fontSize: FONT_SIZES.caption,
    fill: TEXT_COLOURS.secondary,
    align: 'center',
  });
  const tapText = new Text({ text: 'Tap to Begin', style: tapStyle });
  tapText.anchor.set(0.5, 0.5);
  tapText.position.set(width / 2, height * 0.65);
  tapText.visible = false;
  container.addChild(tapText);

  // ── 版本號 ────────────────────────────────────────────
  const versionStyle = new TextStyle({
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fill: TEXT_COLOURS.muted,
    align: 'center',
  });
  const versionText = new Text({ text: 'v1.0.0', style: versionStyle });
  versionText.anchor.set(0.5, 1);
  versionText.position.set(width / 2, height - SPACING.base);
  container.addChild(versionText);

  // ── 公開方法 ──────────────────────────────────────────
  container.setLoadProgress = (value: number) => {
    progressBar.setProgress(value);
  };

  container.showTapPrompt = (visible: boolean) => {
    tapText.visible = visible;
  };

  return container;
}
