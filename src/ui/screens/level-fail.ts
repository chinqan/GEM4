// ─── 31.8 關卡失敗畫面 ──────────────────────────────────────
// 鼓勵訊息、重試/退出。
// 風格：淺色卡片（Fredoka + Nunito），綠色調 accent。

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { SPACING } from '../theme';
import { type UIButton } from '../factory';
import { t } from '../../i18n/translator';

// ─── 局部色彩 Token（結算畫面專用） ─────────────────────────

const LC = {
  surface: 0xfcfcfc,
  border: 0xd6e8d6,
  fg: 0x2a3a2a,
  muted: 0x6b7b6b,
  accent: 0x4caf50,
  accentDark: 0x388e3c,
  bgOverlay: 0x2a3a2a,
  overlayAlpha: 0.7,
} as const;

const FONT_DISPLAY = 'Fredoka, Nunito, system-ui, sans-serif';
const FONT_BODY = 'Nunito, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';

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

/** 鼓勵訊息池（GDD 08§10.2 定案文案，隨機選取；不嘲諷、不用廉價鼓勵） */
const ENCOURAGEMENT_KEYS = [1, 2, 3, 4, 5, 6].map((i) => `fail.flavour.${i}`);

function pickEncouragement(): string {
  const key = ENCOURAGEMENT_KEYS[Math.floor(Math.random() * ENCOURAGEMENT_KEYS.length)];
  return t(key);
}

// ─── 局部按鈕工廠 ───────────────────────────────────────────

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
        bg.roundRect(0, 4, width, height, 28);
        bg.fill({ color: LC.accentDark });
        bg.roundRect(0, 0, width, height, 28);
        bg.fill({ color: LC.accent });
        break;
    }
  }
  drawBg();
  container.addChild(bg);
  container.bg = bg;

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

  let enabled = true;
  container.eventMode = 'static';
  container.cursor = 'pointer';

  container.on('pointerover', () => { if (enabled) container.alpha = 0.9; });
  container.on('pointerout', () => { if (enabled) container.alpha = 1; });
  container.on('pointerdown', () => { if (enabled) container.scale.set(0.95); });
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
 * 建立關卡失敗畫面。
 *
 * 結構：
 * - 半透明背景遮罩
 * - 淺色圓角卡片
 * - 鼓勵文案（隨機）
 * - Map / Retry 按鈕
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
  overlay.fill({ color: LC.bgOverlay, alpha: LC.overlayAlpha });
  overlay.eventMode = 'static';
  container.addChild(overlay);

  // ── 卡片面板 ──────────────────────────────────────────
  const panelW = Math.min(340, width - 48);
  const panelH = 220;
  const panelX = (width - panelW) / 2;
  const panelY = (height - panelH) / 2;

  const panel = new Graphics();
  panel.roundRect(panelX, panelY, panelW, panelH, 24);
  panel.fill({ color: LC.surface });
  container.addChild(panel);

  // ── 鼓勵訊息 ─────────────────────────────────────────
  const defaultMsg = message ?? pickEncouragement();

  const msgStyle = new TextStyle({
    fontFamily: FONT_DISPLAY,
    fontSize: 22,
    fontWeight: '600',
    fill: LC.fg,
    align: 'center',
    wordWrap: true,
    wordWrapWidth: panelW - 56,
  });
  const msgText = new Text({ text: defaultMsg, style: msgStyle });
  msgText.anchor.set(0.5, 0);
  msgText.position.set(width / 2, panelY + SPACING.xl + 8);
  container.addChild(msgText);

  // ── 按鈕 ──────────────────────────────────────────────
  const btnY = panelY + panelH - 48 - 28;
  const btnWidth = 130;
  const btnGap = 10;
  const totalBtnW = btnWidth * 2 + btnGap;
  const btnStartX = (width - totalBtnW) / 2;

  const mapButton = createLCButton({
    text: 'Map',
    variant: 'outline',
    width: btnWidth,
    onClick: onMap,
  });
  mapButton.position.set(btnStartX, btnY);
  container.addChild(mapButton);

  const retryButton = createLCButton({
    text: 'Retry',
    variant: 'primary',
    width: btnWidth,
    onClick: onRetry,
  });
  retryButton.position.set(btnStartX + btnWidth + btnGap, btnY);
  container.addChild(retryButton);

  // ── 公開參照 ──────────────────────────────────────────
  container.mapButton = mapButton;
  container.retryButton = retryButton;

  container.setMessage = (msg: string) => {
    msgText.text = msg;
  };

  return container;
}
