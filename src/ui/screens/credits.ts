// ─── 31.9 Credits 畫面 ──────────────────────────────────────
// 捲動內容。

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { BG, TEXT_COLOURS, FONT_SIZES, SPACING, RADIUS } from '../theme';
import { createButton, type UIButton } from '../factory';

// ─── 型別 ──────────────────────────────────────────────────

export interface CreditsScreen extends Container {
  closeButton: UIButton;
  /** 捲動內容容器 */
  scrollContent: Container;
}

export interface CreateCreditsOptions {
  width: number;
  height: number;
  onClose?: () => void;
}

/** Credits 內容區塊 */
interface CreditSection {
  title: string;
  lines: string[];
}

const CREDITS_DATA: CreditSection[] = [
  { title: 'Design & Code', lines: ['Gem Team'] },
  { title: 'Art', lines: ['Placeholder Art'] },
  { title: 'Music', lines: ['Placeholder Music'] },
  { title: 'Sound Design', lines: ['Placeholder SFX'] },
  {
    title: 'Fonts',
    lines: [
      'Cinzel (OFL)',
      'Inter (OFL)',
      'Source Han Sans (OFL)',
      'Source Han Serif (OFL)',
      'JetBrains Mono (OFL)',
    ],
  },
  { title: 'Special Thanks', lines: ['You, the player!'] },
];

/**
 * 建立 Credits 畫面。
 *
 * 結構：
 * - 半透明背景遮罩
 * - 面板：標題 + 可捲動內容
 * - 關閉按鈕
 */
export function createCreditsScreen(options: CreateCreditsOptions): CreditsScreen {
  const {
    width,
    height,
    onClose,
  } = options;

  const container = new Container() as CreditsScreen;
  container.label = 'credits-screen';

  // ── 背景遮罩 ─────────────────────────────────────────
  const overlay = new Graphics();
  overlay.rect(0, 0, width, height);
  overlay.fill({ color: 0x0b1026, alpha: BG.overlayAlpha });
  overlay.eventMode = 'static';
  container.addChild(overlay);

  // ── 面板 ──────────────────────────────────────────────
  const panelW = 500;
  const panelH = height * 0.8;
  const panelX = (width - panelW) / 2;
  const panelY = (height - panelH) / 2;

  const panel = new Graphics();
  panel.roundRect(panelX, panelY, panelW, panelH, RADIUS.lg);
  panel.fill({ color: BG.panel });
  container.addChild(panel);

  // ── 標題列 ────────────────────────────────────────────
  const headerStyle = new TextStyle({
    fontFamily: 'Inter, "Noto Sans CJK TC", sans-serif',
    fontSize: FONT_SIZES.subtitle,
    fill: TEXT_COLOURS.primary,
    align: 'center',
  });
  const headerText = new Text({ text: 'Credits', style: headerStyle });
  headerText.anchor.set(0.5, 0);
  headerText.position.set(width / 2, panelY + SPACING.lg);
  container.addChild(headerText);

  // 關閉按鈕
  const closeButton = createButton({
    text: '✕',
    variant: 'ghost',
    size: 'sm',
    width: 36,
    onClick: onClose,
  });
  closeButton.position.set(panelX + panelW - 36 - SPACING.sm, panelY + SPACING.sm);
  container.addChild(closeButton);

  // ── 捲動內容 ──────────────────────────────────────────
  const scrollContent = new Container();
  scrollContent.label = 'credits-scroll';
  scrollContent.position.set(panelX + SPACING.xl, panelY + 60);
  container.addChild(scrollContent);

  // Logo
  const logoStyle = new TextStyle({
    fontFamily: 'Cinzel, "Noto Serif CJK TC", serif',
    fontSize: FONT_SIZES.title,
    fill: 0xf6c453,
    align: 'center',
    letterSpacing: 8,
  });
  const logo = new Text({ text: 'G E M', style: logoStyle });
  logo.anchor.set(0.5, 0);
  logo.position.set((panelW - SPACING.xl * 2) / 2, 0);
  scrollContent.addChild(logo);

  // 分隔線
  const divider = new Graphics();
  const divW = 80;
  const contentCenterX = (panelW - SPACING.xl * 2) / 2;
  divider.moveTo(contentCenterX - divW / 2, 50);
  divider.lineTo(contentCenterX + divW / 2, 50);
  divider.stroke({ color: 0xf6c453, width: 1, alpha: 0.4 });
  scrollContent.addChild(divider);

  // 內容區塊
  let yOffset = 80;
  const sectionTitleStyle = new TextStyle({
    fontFamily: 'Inter, "Noto Sans CJK TC", sans-serif',
    fontSize: FONT_SIZES.body,
    fill: TEXT_COLOURS.primary,
    align: 'center',
  });
  const sectionLineStyle = new TextStyle({
    fontFamily: 'Inter, "Noto Sans CJK TC", sans-serif',
    fontSize: FONT_SIZES.caption,
    fill: TEXT_COLOURS.muted,
    align: 'center',
  });

  for (const section of CREDITS_DATA) {
    const titleText = new Text({ text: section.title, style: sectionTitleStyle });
    titleText.anchor.set(0.5, 0);
    titleText.position.set(contentCenterX, yOffset);
    scrollContent.addChild(titleText);
    yOffset += 24;

    for (const line of section.lines) {
      const lineText = new Text({ text: line, style: sectionLineStyle });
      lineText.anchor.set(0.5, 0);
      lineText.position.set(contentCenterX, yOffset);
      scrollContent.addChild(lineText);
      yOffset += 20;
    }

    yOffset += 16;
  }

  // 版權
  const copyrightStyle = new TextStyle({
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fill: TEXT_COLOURS.muted,
    align: 'center',
  });
  const copyright = new Text({
    text: '© 2026  Licensed MIT (code)\nAssets All Rights Reserved',
    style: copyrightStyle,
  });
  copyright.anchor.set(0.5, 0);
  copyright.position.set(contentCenterX, yOffset + 16);
  scrollContent.addChild(copyright);

  // ── 公開參照 ──────────────────────────────────────────
  container.closeButton = closeButton;
  container.scrollContent = scrollContent;

  return container;
}
