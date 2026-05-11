import { Container, Graphics, ColorMatrixFilter } from 'pixi.js';
import type { CellPos, GemColour } from '../types';
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
  MARK_GLOW_ALPHA_MIN,
  MARK_GLOW_ALPHA_MAX,
  MARK_PULSE_CYCLE_MS,
  BREW_SHAKE_AMPLITUDE,
  BREW_BRIGHTNESS_MAX,
  BLAST_PARTICLE_MULTIPLIER,
  MATCH_BURST_PARTICLE_COUNT,
  GEM_COLOURS,
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
      if (!spriteA.position || !spriteB.position) return true;
      const t = smoothstep(Math.min(this.elapsed / this.duration, 1));

      spriteA.position.set(lerp(startAx, endAx, t), lerp(startAy, endAy, t));
      spriteB.position.set(lerp(startBx, endBx, t), lerp(startBy, endBy, t));

      return this.elapsed >= this.duration;
    },

    complete(): void {
      if (!spriteA.position || !spriteB.position) return;
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
      if (!sprite.position) return true;

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
      if (!sprite.position) return;
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

// ─── Debug：特殊寶石影響區域遮片 ───────────────────────────

/**
 * 建立半透明遮片，標示特殊寶石啟動時的影響區域。
 * 遮片在指定期間顯示，之後自動移除。
 *
 * @param cells 受影響的格子座標
 * @param parentLayer 要掛載遮片的圖層（通常是 boardLayer）
 * @param duration 遮片持續時間（ms）
 * @param colour 遮片顏色（hex），預設 0xff0000（紅色）
 */
export function createBlastZoneOverlay(
  cells: Array<[number, number]>,
  parentLayer: Container,
  duration: number = SPECIAL_ACTIVATION_MS,
  colour: number = 0xff0000,
): Animation {
  const container = new Container();
  container.label = 'blastZoneOverlay';
  parentLayer.addChild(container);

  for (const [col, row] of cells) {
    const rect = new Graphics();
    rect.rect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    rect.fill({ color: colour, alpha: 0.35 });
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

// ─── 22.8 Mark Effect（標記發光脈衝） ──────────────────────

/** 標記效果配置 */
export interface MarkEffectConfig {
  /** 目標寶石 sprite */
  sprite: GemSprite;
  /** 標記持續時間（ms）— 從標記到爆破 */
  duration: number;
  /** 寶石顏色（hex 數值，用於發光色調） */
  colour: number;
  /** 是否使用減少動態模式（靜態高亮取代脈衝） */
  reducedMotion: boolean;
}

/**
 * 建立標記效果動畫：發光脈衝或靜態高亮。
 *
 * - 正常模式：alpha 在 MARK_GLOW_ALPHA_MIN ~ MARK_GLOW_ALPHA_MAX 之間
 *   以 MARK_PULSE_CYCLE_MS 週期循環的正弦脈衝。
 * - 減少動態模式：固定 alpha 的邊框高亮 + 色調變化。
 *
 * 動畫持續到外部呼叫 complete() 或 duration 到期。
 */
export function createMarkEffect(config: MarkEffectConfig): Animation {
  const { sprite, duration, colour, reducedMotion } = config;

  // Create a glow ring overlay attached to the sprite
  const glowRing = new Graphics();
  glowRing.label = 'markGlow';

  const radius = CELL_SIZE * 0.38; // matches GEM_RADIUS_RATIO
  glowRing.circle(0, 0, radius + 3);
  glowRing.stroke({ color: colour, width: 3, alpha: 1 });
  sprite.addChild(glowRing);

  if (reducedMotion) {
    // Static highlight: fixed alpha midpoint, no animation
    const staticAlpha = (MARK_GLOW_ALPHA_MIN + MARK_GLOW_ALPHA_MAX) / 2;
    glowRing.alpha = staticAlpha;
  } else {
    glowRing.alpha = MARK_GLOW_ALPHA_MIN;
  }

  return {
    elapsed: 0,
    duration,

    update(dtMs: number): boolean {
      this.elapsed += dtMs;

      // Bail out if sprite was destroyed mid-animation
      if (!sprite.scale) return true;

      if (!reducedMotion) {
        // Sinusoidal pulse: cycle alpha between MIN and MAX
        const phase = (this.elapsed % MARK_PULSE_CYCLE_MS) / MARK_PULSE_CYCLE_MS;
        const t = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
        glowRing.alpha =
          MARK_GLOW_ALPHA_MIN + t * (MARK_GLOW_ALPHA_MAX - MARK_GLOW_ALPHA_MIN);
      }

      return this.elapsed >= this.duration;
    },

    complete(): void {
      // Remove the glow overlay from the sprite
      if (glowRing.parent) {
        glowRing.parent.removeChild(glowRing);
      }
      glowRing.destroy();
    },
  };
}

// ─── 22.9 Brew Animation（蓄力震動 + 亮度遞增） ────────────

/** 蓄力動畫配置 */
export interface BrewAnimationConfig {
  /** 目標寶石 sprite */
  sprite: GemSprite;
  /** 蓄力持續時間（ms）— 通常為 BREW_PHASE_DURATION_MS */
  duration: number;
  /** 是否使用減少動態模式（僅亮度變化，不震動） */
  reducedMotion: boolean;
}

/**
 * 建立蓄力動畫：震動 + 亮度遞增。
 *
 * - 正常模式：sprite 的 x 位置以 BREW_SHAKE_AMPLITUDE 振幅的正弦波震動，
 *   同時亮度從 1.0 線性增至 BREW_BRIGHTNESS_MAX。
 * - 減少動態模式：僅亮度遞增，不震動。
 *
 * 動畫結束時恢復原始 x 位置並移除亮度濾鏡。
 */
export function createBrewAnimation(config: BrewAnimationConfig): Animation {
  const { sprite, duration, reducedMotion } = config;

  // Store original x position for shake restoration
  const originX = sprite.position.x;

  // Create a ColorMatrixFilter for brightness adjustment
  const brightnessFilter = new ColorMatrixFilter();
  const existingFilters = sprite.filters ? [...sprite.filters] : [];
  sprite.filters = [...existingFilters, brightnessFilter];

  // Shake frequency: multiple oscillations during the brew phase
  const shakeFrequency = 12; // oscillations over the full duration

  return {
    elapsed: 0,
    duration,

    update(dtMs: number): boolean {
      this.elapsed += dtMs;

      // Bail out if sprite was destroyed mid-animation
      if (!sprite.scale) return true;

      const progress = Math.min(this.elapsed / this.duration, 1);

      // Brightness: linear increase from 1.0 to BREW_BRIGHTNESS_MAX
      const brightness = lerp(1.0, BREW_BRIGHTNESS_MAX, progress);
      brightnessFilter.reset();
      brightnessFilter.brightness(brightness, false);

      // Shake: sine wave oscillation on x position (skip in reduced motion)
      if (!reducedMotion) {
        const shakeOffset =
          Math.sin(progress * Math.PI * 2 * shakeFrequency) *
          BREW_SHAKE_AMPLITUDE *
          progress; // amplitude ramps up with progress for increasing intensity
        sprite.position.x = originX + shakeOffset;
      }

      return this.elapsed >= this.duration;
    },

    complete(): void {
      // Restore original x position
      if (sprite.scale) {
        sprite.position.x = originX;
      }

      // Remove the brightness filter
      if (sprite.filters) {
        sprite.filters = sprite.filters.filter((f) => f !== brightnessFilter);
        if (sprite.filters.length === 0) {
          sprite.filters = null;
        }
      }
    },
  };
}

// ─── 22.10 Enhanced Blast Animation（增強爆破效果） ─────────

/** 增強爆破效果配置 */
export interface EnhancedBlastConfig {
  /** 目標寶石 sprite */
  sprite: GemSprite;
  /** 寶石顏色（用於粒子色調），null 時使用白色 */
  colour: GemColour | null;
  /** 粒子數量倍率（相對於基礎 MATCH_BURST_PARTICLE_COUNT） */
  particleMultiplier: number;
  /** 粒子效果圖層（用於掛載爆破粒子） */
  fxLayer?: Container;
}

/**
 * 建立增強爆破動畫：複用 createMatchClearAnimation 的縮放/淡出邏輯，
 * 並增加粒子爆破效果（數量 × particleMultiplier）。
 *
 * 粒子以 sprite 中心為原點向外噴射，帶有重力與淡出效果。
 * 若未提供 fxLayer，則僅執行縮放/淡出（不產生粒子）。
 */
export function createEnhancedBlastAnimation(config: EnhancedBlastConfig): Animation {
  const { sprite, colour, particleMultiplier, fxLayer } = config;

  // ── Shrink/fade logic (reused from createMatchClearAnimation) ──
  const originalScaleX = sprite.scale.x;
  const originalScaleY = sprite.scale.y;
  const originalAlpha = sprite.alpha;

  // ── Particle burst setup ──
  const particleCount = Math.round(MATCH_BURST_PARTICLE_COUNT * particleMultiplier);
  const burstColour = colour ? GEM_COLOURS[colour] : 0xffffff;
  const particles: Graphics[] = [];

  // Spawn burst particles on the fxLayer if available
  if (fxLayer) {
    const cx = sprite.position.x;
    const cy = sprite.position.y;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const radius = 2 + Math.random() * 3;

      const dot = new Graphics();
      dot.circle(0, 0, radius);
      dot.fill({ color: burstColour, alpha: 1 });
      dot.position.set(cx, cy);
      dot.blendMode = 'add';
      fxLayer.addChild(dot);

      // Store velocity data on the particle for update
      (dot as any)._vx = Math.cos(angle) * (120 + Math.random() * 200);
      (dot as any)._vy = Math.sin(angle) * (120 + Math.random() * 200);
      particles.push(dot);
    }
  }

  return {
    elapsed: 0,
    duration: MATCH_CLEAR_DURATION_MS,

    update(dtMs: number): boolean {
      this.elapsed += dtMs;
      const progress = Math.min(this.elapsed / this.duration, 1);

      // Sprite may be destroyed mid-animation
      if (!sprite.scale) return true;

      // ── Shrink + fade (same as createMatchClearAnimation) ──
      const t = smoothstep(progress);
      const scale = 1 - t;
      sprite.scale.set(originalScaleX * scale, originalScaleY * scale);
      sprite.alpha = originalAlpha * (1 - t);

      // ── Update burst particles ──
      const dtSec = dtMs / 1000;
      for (const dot of particles) {
        if (!dot.visible) continue;
        const vx: number = (dot as any)._vx;
        const vy: number = (dot as any)._vy;

        dot.position.x += vx * dtSec;
        dot.position.y += vy * dtSec;

        // Apply gravity
        (dot as any)._vy += 400 * dtSec;

        // Fade out in the second half
        if (progress > 0.5) {
          dot.alpha = 1 - (progress - 0.5) * 2;
        }

        // Shrink slightly
        const s = 1 - progress * 0.6;
        dot.scale.set(s, s);
      }

      return this.elapsed >= this.duration;
    },

    complete(): void {
      // Finalize sprite
      if (sprite.scale) {
        sprite.scale.set(0, 0);
        sprite.alpha = 0;
        sprite.visible = false;
      }

      // Clean up burst particles
      for (const dot of particles) {
        if (dot.parent) {
          dot.parent.removeChild(dot);
        }
        dot.destroy();
      }
      particles.length = 0;
    },
  };
}
