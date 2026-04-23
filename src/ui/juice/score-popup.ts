// ─── 32.3 Score-Popup 飛字效果 ──────────────────────────────
// 分數飛字：從指定位置向上飄動並淡出。

import { Container, Text, TextStyle } from 'pixi.js';
import { TEXT_COLOURS, FONT_SIZES } from '../theme';

// ─── 型別 ──────────────────────────────────────────────────

export interface ScorePopupConfig {
  /** 顯示的分數文字 */
  text: string;
  /** 起始 X 座標 */
  x: number;
  /** 起始 Y 座標 */
  y: number;
  /** 文字顏色，預設金色 */
  colour?: number;
  /** 字型大小，預設 hudScore */
  fontSize?: number;
  /** 飄動距離（px），預設 60 */
  floatDistance?: number;
  /** 動畫時長（ms），預設 800 */
  duration?: number;
}

export interface ScorePopupHandle {
  /** Popup 容器 */
  container: Container;
  /** 是否仍在動畫中 */
  readonly active: boolean;
  /** 立即停止並銷毀 */
  stop(): void;
}

// ─── 實作 ──────────────────────────────────────────────────

/**
 * 建立分數飛字效果。
 *
 * 文字從指定位置向上飄動，同時放大後縮小，最後淡出並自我銷毀。
 * 適用於消除得分、連鎖獎勵等即時回饋。
 */
export function createScorePopup(config: ScorePopupConfig): ScorePopupHandle {
  const {
    text,
    x,
    y,
    colour = 0xf6c453,
    fontSize = FONT_SIZES.hudScore,
    floatDistance = 60,
    duration = 800,
  } = config;

  const container = new Container();
  container.label = 'score-popup';
  container.position.set(x, y);

  const style = new TextStyle({
    fontFamily: 'JetBrains Mono, "Noto Sans CJK TC", monospace',
    fontSize,
    fill: colour,
    align: 'center',
    fontWeight: 'bold',
    dropShadow: {
      alpha: 0.5,
      angle: Math.PI / 4,
      blur: 4,
      color: 0x000000,
      distance: 2,
    },
  });

  const textObj = new Text({ text, style });
  textObj.anchor.set(0.5, 0.5);
  container.addChild(textObj);

  let active = true;
  const startTime = performance.now();
  let rafId: number | null = null;

  function animate(): void {
    if (!active) return;

    const elapsed = performance.now() - startTime;
    const progress = Math.min(1, elapsed / duration);

    // 向上飄動（ease-out）
    const eased = 1 - Math.pow(1 - progress, 3);
    container.position.y = y - floatDistance * eased;

    // 縮放：先放大再縮小
    if (progress < 0.2) {
      const scaleUp = 1 + 0.3 * (progress / 0.2);
      container.scale.set(scaleUp);
    } else {
      const scaleDown = 1.3 - 0.3 * ((progress - 0.2) / 0.8);
      container.scale.set(Math.max(1, scaleDown));
    }

    // 淡出（後半段）
    if (progress > 0.5) {
      container.alpha = 1 - (progress - 0.5) / 0.5;
    }

    if (progress >= 1) {
      stop();
      return;
    }

    rafId = requestAnimationFrame(animate);
  }

  function stop(): void {
    if (!active) return;
    active = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    container.destroy({ children: true });
  }

  // 啟動動畫
  rafId = requestAnimationFrame(animate);

  return {
    container,
    get active() { return active; },
    stop,
  };
}
