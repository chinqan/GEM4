import { Container, Graphics, ColorMatrixFilter } from 'pixi.js';
import type { CellPos } from '../types';
import type { GemSprite } from './gem-sprites';
import type { LayerRefs } from './app-layers';
import {
  CELL_SIZE,
  SWAP_DURATION_MS,
  INVALID_SHAKE_DURATION_MS,
  INVALID_SHAKE_AMPLITUDE,
  MATCH_CLEAR_DURATION_MS,
  CASCADE_DROP_MS_PER_ROW,
  SPECIAL_SPAWN_SHOCKWAVE_MS,
  SPECIAL_ACTIVATION_MS,
  CHAIN_SATURATION_PULSE_MS,
  CHAIN_SATURATION_THRESHOLD,
  CHAIN_SATURATION_BOOST,
} from './design-tokens';

// ─── 型別 ──────────────────────────────────────────────────

/** 動畫狀態 */
export interface Animation {
  /** 動畫已經過的時間（ms） */
  elapsed: number;
  /** 動畫總時長（ms） */
  duration: number;
  /** 每幀更新，回傳 true 表示動畫結束 */
  update(dtMs: number): boolean;
  /** 動畫結束時的清理 */
  complete(): void;
}

/** Swap 動畫配置 */
export interface SwapAnimConfig {
  spriteA: GemSprite;
  spriteB: GemSprite;
  posA: CellPos;
  posB: CellPos;
}

/** Cascade 掉落動畫配置 */
export interface CascadeDropConfig {
  sprite: GemSprite;
  fromRow: number;
  toRow: number;
  col: number;
  /** 延遲啟動（ms），用於排隊掉落效果 */
  delayMs?: number;
}

// ─── 緩動函式 ──────────────────────────────────────────────

/** 平滑緩入緩出（smoothstep） */
function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/** 線性插值 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ─── AnimationManager ──────────────────────────────────────

/**
 * 管理所有進行中的動畫。
 *
 * 每幀呼叫 update(dtMs) 推進所有動畫，
 * 完成的動畫自動移除並呼叫 complete()。
 */
export class AnimationManager {
  private readonly animations: Set<Animation> = new Set();

  /** 目前是否有動畫正在播放 */
  get isAnimating(): boolean {
    return this.animations.size > 0;
  }

  /** 目前動畫數量 */
  get count(): number {
    return this.animations.size;
  }

  /** 新增動畫 */
  add(anim: Animation): void {
    this.animations.add(anim);
  }

  /** 每幀更新所有動畫 */
  update(dtMs: number): void {
    for (const anim of this.animations) {
      const done = anim.update(dtMs);
      if (done) {
        anim.complete();
        this.animations.delete(anim);
      }
    }
  }

  /** 立即完成所有動畫 */
  finishAll(): void {
    for (const anim of this.animations) {
      anim.complete();
    }
    this.animations.clear();
  }

  /** 清除所有動畫（不呼叫 complete） */
  clear(): void {
    this.animations.clear();
  }
}

// ─── 22.1 Swap 動畫 ────────────────────────────────────────

/**
 * 建立 swap 動畫：兩顆寶石在 200ms 內平滑交換位置。
 *
 * 使用 smoothstep 緩動，讓交換感覺自然。
 */
export function createSwapAnimation(config: SwapAnimConfig): Animation {
  const { spriteA, spriteB, posA, posB } = config;

  // 起始像素位置
  const startAx = posA[0] * CELL_SIZE + CELL_SIZE / 2;
  const startAy = posA[1] * CELL_SIZE + CELL_SIZE / 2;
  const startBx = posB[0] * CELL_SIZE + CELL_SIZE / 2;
  const startBy = posB[1] * CELL_SIZE + CELL_SIZE / 2;

  // 目標像素位置（互換）
  const endAx = startBx;
  const endAy = startBy;
  const endBx = startAx;
  const endBy = startAy;

  return {
    elapsed: 0,
    duration: SWAP_DURATION_MS,

    update(dtMs: number): boolean {
      this.elapsed += dtMs;
      const t = smoothstep(Math.min(this.elapsed / this.duration, 1));

      spriteA.position.set(lerp(startAx, endAx, t), lerp(startAy, endAy, t));
      spriteB.position.set(lerp(startBx, endBx, t), lerp(startBy, endBy, t));

      return this.elapsed >= this.duration;
    },

    complete(): void {
      spriteA.position.set(endAx, endAy);
      spriteB.position.set(endBx, endBy);
    },
  };
}

// ─── 22.2 Invalid Shake 動畫 ───────────────────────────────

/**
 * 建立無效交換抖動動畫：240ms、4px 橫向振盪。
 *
 * 使用衰減正弦波模擬抖動效果。
 */
export function createInvalidShakeAnimation(sprite: Container): Animation {
  const originX = sprite.position.x;
  const shakeFrequency = 4; // 振盪次數

  return {
    elapsed: 0,
    duration: INVALID_SHAKE_DURATION_MS,

    update(dtMs: number): boolean {
      this.elapsed += dtMs;
      const progress = Math.min(this.elapsed / this.duration, 1);

      // 衰減正弦波：振幅隨時間遞減
      const decay = 1 - progress;
      const offset =
        Math.sin(progress * Math.PI * 2 * shakeFrequency) *
        INVALID_SHAKE_AMPLITUDE *
        decay;

      sprite.position.x = originX + offset;

      return this.elapsed >= this.duration;
    },

    complete(): void {
      sprite.position.x = originX;
    },
  };
}

// ─── 22.3 Match 消除動畫 ───────────────────────────────────

/**
 * 建立 match 消除動畫：200ms 內縮放至 0 並淡出。
 *
 * 寶石同時縮小和變透明，產生「消失」效果。
 */
export function createMatchClearAnimation(sprite: Container): Animation {
  const originalScaleX = sprite.scale.x;
  const originalScaleY = sprite.scale.y;
  const originalAlpha = sprite.alpha;

  return {
    elapsed: 0,
    duration: MATCH_CLEAR_DURATION_MS,

    update(dtMs: number): boolean {
      this.elapsed += dtMs;
      const progress = Math.min(this.elapsed / this.duration, 1);

      // Sprite may be destroyed mid-animation (e.g. boardRenderer.sync
      // rebuilt sprites after a board snapshot change). Bail out cleanly.
      if (!sprite.scale) return true;

      const t = smoothstep(progress);
      const scale = 1 - t;

      sprite.scale.set(originalScaleX * scale, originalScaleY * scale);
      sprite.alpha = originalAlpha * (1 - t);

      return this.elapsed >= this.duration;
    },

    complete(): void {
      if (!sprite.scale) return;
      sprite.scale.set(0, 0);
      sprite.alpha = 0;
      sprite.visible = false;
    },
  };
}

// ─── 22.4 Cascade 掉落動畫 ─────────────────────────────────

/**
 * 建立 cascade 掉落動畫：120ms/行的距離。
 *
 * 使用 ease-in 加速模擬重力，落地時有微小彈跳。
 * 同欄所有寶石在 game-integration 中已統一為相同掉落距離，
 * 因此以相同速度剛體平移，不會出現超越現象。
 */
export function createCascadeDropAnimation(config: CascadeDropConfig): Animation {
  const { sprite, fromRow, toRow, col, delayMs = 0 } = config;
  const distance = Math.abs(toRow - fromRow);
  const fallDuration = distance * CASCADE_DROP_MS_PER_ROW;

  const startX = col * CELL_SIZE + CELL_SIZE / 2;
  const startY = fromRow * CELL_SIZE + CELL_SIZE / 2;
  const endY = toRow * CELL_SIZE + CELL_SIZE / 2;

  // 彈跳參數
  const bounceHeight = Math.min(distance * 2, 6);
  const bounceDuration = 80;
  const totalDuration = delayMs + fallDuration + bounceDuration;

  return {
    elapsed: 0,
    duration: totalDuration,

    update(dtMs: number): boolean {
      this.elapsed += dtMs;

      // 延遲階段：保持在起始位置不動
      if (this.elapsed <= delayMs) {
        sprite.position.set(startX, startY);
        return false;
      }

      const active = this.elapsed - delayMs;

      if (active <= fallDuration) {
        // 掉落階段：ease-in（加速，模擬重力）
        const fallProgress = Math.min(active / fallDuration, 1);
        const t = fallProgress * fallProgress; // quadratic ease-in
        sprite.position.set(startX, lerp(startY, endY, t));
      } else {
        // 彈跳階段：快速上彈再回落
        const bounceElapsed = active - fallDuration;
        const bounceProgress = Math.min(bounceElapsed / bounceDuration, 1);
        const bounceT = Math.sin(bounceProgress * Math.PI);
        sprite.position.set(startX, endY - bounceHeight * bounceT);
      }

      return this.elapsed >= totalDuration;
    },

    complete(): void {
      sprite.position.set(startX, endY);
    },
  };
}

// ─── 22.5 特殊寶石 Spawn 震波 ──────────────────────────────

/**
 * 建立特殊寶石 spawn 震波動畫：600ms 擴展環。
 *
 * 在寶石位置產生一個向外擴展的光環效果。
 */
export function createSpecialSpawnShockwave(
  x: number,
  y: number,
  fxLayer: Container,
): Animation {
  const ring = new Graphics();
  ring.label = 'spawnShockwave';
  ring.position.set(x, y);
  fxLayer.addChild(ring);

  const maxRadius = CELL_SIZE * 1.5;

  return {
    elapsed: 0,
    duration: SPECIAL_SPAWN_SHOCKWAVE_MS,

    update(dtMs: number): boolean {
      this.elapsed += dtMs;
      const progress = Math.min(this.elapsed / this.duration, 1);

      const radius = maxRadius * smoothstep(progress);
      const alpha = 1 - progress;

      ring.clear();
      ring.circle(0, 0, radius);
      ring.stroke({ color: 0xffffff, width: 3, alpha });

      return this.elapsed >= this.duration;
    },

    complete(): void {
      fxLayer.removeChild(ring);
      ring.destroy();
    },
  };
}

// ─── 22.6 特殊寶石啟動效果 ─────────────────────────────────

/**
 * 建立特殊寶石啟動效果：800ms 擴展爆發。
 *
 * 從寶石位置向外擴展的多層光環 + 閃光效果。
 */
export function createSpecialActivationEffect(
  x: number,
  y: number,
  colour: number,
  fxLayer: Container,
  duration: number = SPECIAL_ACTIVATION_MS,
): Animation {
  const container = new Container();
  container.label = 'activationEffect';
  container.position.set(x, y);
  fxLayer.addChild(container);

  // 外環
  const outerRing = new Graphics();
  container.addChild(outerRing);

  // 內環
  const innerRing = new Graphics();
  container.addChild(innerRing);

  // 中心閃光
  const flash = new Graphics();
  container.addChild(flash);

  const maxOuterRadius = CELL_SIZE * 2.5;
  const maxInnerRadius = CELL_SIZE * 1.8;
  const flashRadius = CELL_SIZE * 0.8;

  return {
    elapsed: 0,
    duration,

    update(dtMs: number): boolean {
      this.elapsed += dtMs;
      const progress = Math.min(this.elapsed / this.duration, 1);

      const t = smoothstep(progress);
      const fadeOut = 1 - progress;

      // 外環：快速擴展
      const outerR = maxOuterRadius * t;
      outerRing.clear();
      outerRing.circle(0, 0, outerR);
      outerRing.stroke({ color: colour, width: 2, alpha: fadeOut * 0.6 });

      // 內環：稍慢擴展
      const innerT = smoothstep(Math.min(progress * 1.3, 1));
      const innerR = maxInnerRadius * innerT;
      innerRing.clear();
      innerRing.circle(0, 0, innerR);
      innerRing.stroke({ color: 0xffffff, width: 4, alpha: fadeOut * 0.8 });

      // 中心閃光：快速出現後消失
      const flashAlpha = progress < 0.3
        ? smoothstep(progress / 0.3)
        : 1 - smoothstep((progress - 0.3) / 0.7);
      flash.clear();
      flash.circle(0, 0, flashRadius * (1 - t * 0.5));
      flash.fill({ color: 0xffffff, alpha: flashAlpha * 0.9 });

      return this.elapsed >= this.duration;
    },

    complete(): void {
      fxLayer.removeChild(container);
      container.destroy({ children: true });
    },
  };
}

// ─── 22.7 Chain ≥3 飽和脈衝 ────────────────────────────────

/**
 * 建立 chain ≥3 飽和脈衝動畫：300ms ColorMatrix 飽和度增強。
 *
 * 當連鎖達到 3 或以上時，對整個棋盤圖層套用短暫的飽和度提升，
 * 產生視覺衝擊感。
 *
 * @param chainCount 目前連鎖數
 * @param boardLayer 棋盤容器（套用 ColorMatrixFilter）
 */
export function createChainSaturationPulse(
  chainCount: number,
  boardLayer: Container,
): Animation | null {
  if (chainCount < CHAIN_SATURATION_THRESHOLD) return null;

  const filter = new ColorMatrixFilter();
  const existingFilters = boardLayer.filters ? [...boardLayer.filters] : [];
  boardLayer.filters = [...existingFilters, filter];

  // 飽和度隨連鎖數微增（上限 3.0）
  const maxSaturation = Math.min(
    CHAIN_SATURATION_BOOST + (chainCount - CHAIN_SATURATION_THRESHOLD) * 0.2,
    3.0,
  );

  return {
    elapsed: 0,
    duration: CHAIN_SATURATION_PULSE_MS,

    update(dtMs: number): boolean {
      this.elapsed += dtMs;
      const progress = Math.min(this.elapsed / this.duration, 1);

      // 快速升高、緩慢回落的脈衝曲線
      const pulse = progress < 0.3
        ? smoothstep(progress / 0.3)
        : 1 - smoothstep((progress - 0.3) / 0.7);

      const saturation = lerp(1, maxSaturation, pulse);

      // 重置 matrix 並套用飽和度
      filter.reset();
      filter.saturate(saturation - 1, false);

      return this.elapsed >= this.duration;
    },

    complete(): void {
      // 移除 filter
      if (boardLayer.filters) {
        boardLayer.filters = boardLayer.filters.filter((f) => f !== filter);
        if (boardLayer.filters.length === 0) {
          boardLayer.filters = null;
        }
      }
    },
  };
}

// ─── Debug：特殊寶石影響區域遮片 ───────────────────────────

/**
 * 建立紅色半透明遮片，標示特殊寶石啟動時的影響區域。
 * 遮片在 SPECIAL_ACTIVATION_MS 期間顯示，之後自動移除。
 *
 * @param cells 受影響的格子座標
 * @param parentLayer 要掛載遮片的圖層（通常是 boardLayer）
 */
export function createBlastZoneOverlay(
  cells: Array<[number, number]>,
  parentLayer: Container,
  duration: number = SPECIAL_ACTIVATION_MS,
): Animation {
  const container = new Container();
  container.label = 'blastZoneOverlay';
  parentLayer.addChild(container);

  for (const [col, row] of cells) {
    const rect = new Graphics();
    rect.rect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    rect.fill({ color: 0xff0000, alpha: 0.35 });
    container.addChild(rect);
  }

  return {
    elapsed: 0,
    duration,

    update(dtMs: number): boolean {
      this.elapsed += dtMs;
      // 淡出效果：後半段逐漸降低透明度
      const progress = Math.min(this.elapsed / this.duration, 1);
      if (progress > 0.5) {
        container.alpha = 1 - (progress - 0.5) * 2;
      }
      return this.elapsed >= this.duration;
    },

    complete(): void {
      parentLayer.removeChild(container);
      container.destroy({ children: true });
    },
  };
}
