// ─── 32.2 Toast 通知 ────────────────────────────────────────
// 頂部/底部中央的短暫通知訊息。

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { BG, TEXT_COLOURS, FONT_SIZES, SPACING, RADIUS, STATE_COLOURS } from '../theme';

// ─── 型別 ──────────────────────────────────────────────────

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';
export type ToastPosition = 'top' | 'bottom';

export interface ToastConfig {
  /** 訊息文字 */
  message: string;
  /** 變體，預設 info */
  variant?: ToastVariant;
  /** 位置，預設 top */
  position?: ToastPosition;
  /** 自動消失時間（ms），預設 3000。0 = 不自動消失 */
  duration?: number;
  /** 視窗寬度（用於置中） */
  viewportWidth: number;
  /** 視窗高度（用於定位） */
  viewportHeight: number;
}

export interface ToastHandle {
  /** Toast 容器 */
  container: Container;
  /** 手動關閉 */
  dismiss(): void;
  /** 是否仍顯示中 */
  readonly visible: boolean;
}

// ─── 常數 ──────────────────────────────────────────────────

const TOAST_HEIGHT = 48;
const TOAST_MAX_WIDTH = 480;
const TOAST_PADDING = SPACING.base;
const FADE_DURATION = 200;

const VARIANT_COLOURS: Record<ToastVariant, number> = {
  info: STATE_COLOURS.info,
  success: STATE_COLOURS.success,
  warning: STATE_COLOURS.warning,
  danger: STATE_COLOURS.danger,
};

// ─── 實作 ──────────────────────────────────────────────────

/**
 * 建立一個 Toast 通知。
 *
 * Toast 會自動淡入，在 duration 後淡出並自我銷毀。
 * 可手動呼叫 dismiss() 提前關閉。
 */
export function createToast(config: ToastConfig): ToastHandle {
  const {
    message,
    variant = 'info',
    position = 'top',
    duration = 3000,
    viewportWidth,
    viewportHeight,
  } = config;

  const container = new Container();
  container.label = 'toast';

  // 計算寬度
  const textStyle = new TextStyle({
    fontFamily: 'Inter, "Noto Sans CJK TC", sans-serif',
    fontSize: FONT_SIZES.body,
    fill: TEXT_COLOURS.primary,
    align: 'center',
  });
  const textObj = new Text({ text: message, style: textStyle });
  const toastWidth = Math.min(TOAST_MAX_WIDTH, textObj.width + TOAST_PADDING * 2 + 16);

  // 背景
  const bg = new Graphics();
  bg.roundRect(0, 0, toastWidth, TOAST_HEIGHT, RADIUS.xs);
  bg.fill({ color: BG.panel, alpha: 0.95 });
  // 左側色條
  bg.roundRect(0, 0, 4, TOAST_HEIGHT, 2);
  bg.fill({ color: VARIANT_COLOURS[variant] });
  container.addChild(bg);

  // 文字
  textObj.anchor.set(0, 0.5);
  textObj.position.set(TOAST_PADDING, TOAST_HEIGHT / 2);
  container.addChild(textObj);

  // 定位
  const x = (viewportWidth - toastWidth) / 2;
  const y = position === 'top' ? SPACING.lg : viewportHeight - TOAST_HEIGHT - SPACING.lg;
  container.position.set(x, y);

  // 淡入
  container.alpha = 0;
  let visible = true;
  let fadeTimer: ReturnType<typeof setTimeout> | null = null;
  let dismissTimer: ReturnType<typeof setTimeout> | null = null;

  // 簡易淡入動畫
  const fadeInSteps = 10;
  let fadeStep = 0;
  const fadeInInterval = setInterval(() => {
    fadeStep++;
    container.alpha = Math.min(1, fadeStep / fadeInSteps);
    if (fadeStep >= fadeInSteps) {
      clearInterval(fadeInInterval);
    }
  }, FADE_DURATION / fadeInSteps);

  // 自動消失
  if (duration > 0) {
    dismissTimer = setTimeout(() => {
      dismiss();
    }, duration);
  }

  function dismiss(): void {
    if (!visible) return;
    visible = false;

    if (dismissTimer !== null) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }

    // 簡易淡出
    let outStep = 0;
    const fadeOutInterval = setInterval(() => {
      outStep++;
      container.alpha = Math.max(0, 1 - outStep / fadeInSteps);
      if (outStep >= fadeInSteps) {
        clearInterval(fadeOutInterval);
        container.destroy({ children: true });
      }
    }, FADE_DURATION / fadeInSteps);
  }

  return {
    container,
    dismiss,
    get visible() { return visible; },
  };
}
