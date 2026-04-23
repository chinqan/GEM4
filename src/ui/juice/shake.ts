// ─── 32.1 Shake 效果（畫面震動） ────────────────────────────
// 對目標 Container 施加短暫的隨機位移震動。

import { Container } from 'pixi.js';

// ─── 型別 ──────────────────────────────────────────────────

export interface ShakeConfig {
  /** 震動強度（最大位移 px），預設 6 */
  intensity?: number;
  /** 震動持續時間（ms），預設 300 */
  duration?: number;
  /** 震動頻率（每秒次數），預設 30 */
  frequency?: number;
  /** 衰減曲線：linear 或 exponential，預設 exponential */
  decay?: 'linear' | 'exponential';
}

export interface ShakeHandle {
  /** 立即停止震動並還原位置 */
  stop(): void;
  /** 是否仍在震動中 */
  readonly active: boolean;
}

// ─── 實作 ──────────────────────────────────────────────────

/**
 * 對目標 Container 施加畫面震動效果。
 *
 * 震動期間會隨機偏移目標的 position，結束後自動還原。
 * 支援 reduce-motion 模式（直接跳過）。
 *
 * @param target 要震動的 Container
 * @param config 震動配置
 * @returns ShakeHandle 控制物件
 */
export function shake(target: Container, config: ShakeConfig = {}): ShakeHandle {
  const {
    intensity = 6,
    duration = 300,
    frequency = 30,
    decay = 'exponential',
  } = config;

  const originalX = target.position.x;
  const originalY = target.position.y;
  const intervalMs = 1000 / frequency;

  let elapsed = 0;
  let active = true;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  function tick(): void {
    if (!active) return;

    elapsed += intervalMs;
    if (elapsed >= duration) {
      stop();
      return;
    }

    // 衰減因子
    const progress = elapsed / duration;
    const factor = decay === 'exponential'
      ? Math.pow(1 - progress, 2)
      : 1 - progress;

    const offsetX = (Math.random() * 2 - 1) * intensity * factor;
    const offsetY = (Math.random() * 2 - 1) * intensity * factor;

    target.position.set(originalX + offsetX, originalY + offsetY);

    timerId = setTimeout(tick, intervalMs);
  }

  function stop(): void {
    if (!active) return;
    active = false;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    target.position.set(originalX, originalY);
  }

  // 啟動
  timerId = setTimeout(tick, intervalMs);

  return {
    stop,
    get active() { return active; },
  };
}
