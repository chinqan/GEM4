import { Container, Graphics, Sprite, Texture, Rectangle } from 'pixi.js';
import type { Renderer } from 'pixi.js';
import {
  GRAPHICS_PRESETS,
  CHAIN_GLOW_LIFETIME_MS,
  CHAIN_GLOW_RADIUS,
  CHAIN_GLOW_SPEED,
  SPECIAL_RING_PARTICLE_COUNT,
  SPECIAL_RING_LIFETIME_MS,
  SPECIAL_RING_EXPAND_RADIUS,
} from './design-tokens';
import type { PresetLevel } from './design-tokens';

// ─── 型別 ──────────────────────────────────────────────────

/** 粒子配置 */
export interface ParticleConfig {
  /** 起始 X（px） */
  x: number;
  /** 起始 Y（px） */
  y: number;
  /** X 方向速度（px/s） */
  vx: number;
  /** Y 方向速度（px/s） */
  vy: number;
  /** 生命週期（ms） */
  lifetime: number;
  /** 粒子半徑（px） */
  radius: number;
  /** 顏色（hex） */
  colour: number;
  /** 初始透明度 */
  alpha: number;
  /** 重力加速度（px/s²），預設 0 */
  gravity?: number;
  /** 是否隨時間縮小 */
  shrink?: boolean;
}

// ─── Particle ──────────────────────────────────────────────

/**
 * 單一粒子。使用 Graphics 繪製，支援物件池回收。
 */
export class Particle {
  /** 粒子的 Graphics 顯示物件 */
  readonly graphics: Graphics;

  /** X 位置 */
  x = 0;
  /** Y 位置 */
  y = 0;
  /** X 速度（px/s） */
  vx = 0;
  /** Y 速度（px/s） */
  vy = 0;
  /** 剩餘生命（ms） */
  life = 0;
  /** 總生命（ms） */
  totalLife = 0;
  /** 半徑 */
  radius = 0;
  /** 顏色 */
  colour = 0xffffff;
  /** 初始透明度 */
  baseAlpha = 1;
  /** 重力 */
  gravity = 0;
  /** 是否縮小 */
  shrink = false;
  /** 是否已死亡 */
  isDead = true;

  constructor() {
    this.graphics = new Graphics();
    this.graphics.visible = false;
    this.graphics.label = 'particle';
  }

  /** 初始化粒子（從池中取出時呼叫） */
  init(config: ParticleConfig): void {
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx;
    this.vy = config.vy;
    this.life = config.lifetime;
    this.totalLife = config.lifetime;
    this.radius = config.radius;
    this.colour = config.colour;
    this.baseAlpha = config.alpha;
    this.gravity = config.gravity ?? 0;
    this.shrink = config.shrink ?? false;
    this.isDead = false;

    this.redraw();
    this.graphics.visible = true;
    this.graphics.position.set(this.x, this.y);
    this.graphics.alpha = this.baseAlpha;
    this.graphics.scale.set(1, 1);
  }

  /** 每幀更新 */
  update(dtMs: number): void {
    if (this.isDead) return;

    const dtSec = dtMs / 1000;

    // 空氣阻力：水平速度逐漸衰減
    this.vx *= Math.pow(0.98, dtMs / 16);

    // 重力加速度
    this.vy += this.gravity * dtSec;

    // 位移
    this.x += this.vx * dtSec;
    this.y += this.vy * dtSec;

    // 生命遞減
    this.life -= dtMs;
    if (this.life <= 0) {
      this.isDead = true;
      this.graphics.visible = false;
      return;
    }

    // 生命比例 (1→0)
    const lifeRatio = this.life / this.totalLife;

    // 透明度：前 60% 保持不透明，後 40% 淡出
    if (lifeRatio > 0.4) {
      this.graphics.alpha = this.baseAlpha;
    } else {
      this.graphics.alpha = this.baseAlpha * (lifeRatio / 0.4);
    }

    // 縮小：前 50% 保持原大小，後 50% 才縮小
    if (this.shrink) {
      if (lifeRatio > 0.5) {
        this.graphics.scale.set(1, 1);
      } else {
        const s = lifeRatio / 0.5;
        this.graphics.scale.set(s, s);
      }
    }

    // 更新位置
    this.graphics.position.set(this.x, this.y);
  }

  /** 重置粒子（回收到池中時呼叫） */
  reset(): void {
    this.isDead = true;
    this.graphics.visible = false;
    this.graphics.alpha = 0;
  }

  /** 重繪粒子圖形 */
  private redraw(): void {
    this.graphics.clear();
    this.graphics.circle(0, 0, this.radius);
    this.graphics.fill({ color: this.colour, alpha: 1 });
  }

  /** 銷毀 */
  destroy(): void {
    this.graphics.destroy();
  }
}

// ─── 23.1 ParticlePool ─────────────────────────────────────

/**
 * 粒子物件池。
 *
 * 預先建立粒子物件，避免 hot path 上的 GC 壓力。
 * 上限依圖形預設決定（low=100、medium=300、high=500）。
 */
export class ParticlePool {
  private readonly pool: Particle[] = [];
  private readonly active: Particle[] = [];
  private readonly cap: number;
  private readonly container: Container;

  constructor(parentLayer: Container, preset: PresetLevel = 'medium') {
    this.cap = GRAPHICS_PRESETS[preset].particleCap;
    this.container = new Container();
    this.container.label = 'particlePool';
    parentLayer.addChild(this.container);

    // 預先建立所有粒子
    for (let i = 0; i < this.cap; i++) {
      const p = new Particle();
      this.container.addChild(p.graphics);
      this.pool.push(p);
    }
  }

  /** 目前活躍粒子數 */
  get activeCount(): number {
    return this.active.length;
  }

  /** 池中可用粒子數 */
  get availableCount(): number {
    return this.pool.length;
  }

  /** 上限 */
  get capacity(): number {
    return this.cap;
  }

  /**
   * 從池中取出一個粒子並初始化。
   * 若池已空（達到上限），回傳 null。
   */
  spawn(config: ParticleConfig): Particle | null {
    if (this.pool.length === 0) return null;

    const p = this.pool.pop()!;
    p.init(config);
    this.active.push(p);
    return p;
  }

  /**
   * 每幀更新所有活躍粒子。
   * 死亡的粒子自動回收到池中。
   */
  update(dtMs: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.update(dtMs);
      if (p.isDead) {
        // Swap-remove: O(1) instead of splice's O(N). Particles are unordered visuals.
        const last = this.active.length - 1;
        if (i !== last) this.active[i] = this.active[last];
        this.active.pop();
        p.reset();
        this.pool.push(p);
      }
    }
  }

  /** 清除所有活躍粒子（回收到池中） */
  clear(): void {
    for (const p of this.active) {
      p.reset();
      this.pool.push(p);
    }
    this.active.length = 0;
  }

  /** 銷毀池與所有粒子 */
  destroy(): void {
    this.clear();
    for (const p of this.pool) {
      p.destroy();
    }
    this.pool.length = 0;
    this.container.destroy({ children: true });
  }
}

// ─── 合成粒子特效（Ring + Shards + Dots）─────────────────

/** 特效粒子基礎介面 */
interface FxParticle {
  display: Graphics | Sprite;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  rotSpeed?: number;
  initScale?: number;
  type: 'ring' | 'shard' | 'dot';
  // ring 專用
  radius?: number;
  baseRadius?: number;
  maxRadius?: number;
  lineWidth?: number;
  colour?: number;
}

// ─── Ring Texture 快取 ─────────────────────────────────────

const _ringTextureCache = new Map<string, Texture>();

/**
 * 用 renderer.generateTexture 預渲染圓環紋理（參考版做法）。
 */
function getRingTex(renderer: Renderer, colour: number): Texture {
  const key = colour.toString(16);
  if (_ringTextureCache.has(key)) return _ringTextureCache.get(key)!;

  const R = 5;
  const g = new Graphics();
  g.circle(R + 4, R + 4, R).stroke({ color: colour, width: 4, alpha: 0.7 });
  const pad = R + 6;
  const tex = renderer.generateTexture({
    target: g,
    frame: new Rectangle(0, 0, pad * 2, pad * 2),
  });
  g.destroy();
  _ringTextureCache.set(key, tex);
  return tex;
}

/**
 * 合成粒子特效管理器。
 *
 * 三層效果：
 * - Ring：從中心向外擴散的光環
 * - Shards：帶旋轉的碎片向外飛散後墜落
 * - Dots：小光點噴射後墜落
 *
 * @param level 強度等級（0=基礎, 1=中等, 2=強, 3=超強）
 */
export class MergeParticleSystem {
  private particles: FxParticle[] = [];
  private container: Container;
  private active = false;
  private renderer: Renderer;

  // Display object pools — combos spawn dozens of sprites/graphics per call.
  // Reusing them avoids per-particle GC + Pixi display-list reflow on
  // removeChild/addChild. Pooled objects stay parented; we toggle `visible`.
  private static readonly POOL_CAP = 128;
  private ringPool: Sprite[] = [];
  private shardPool: Graphics[] = [];
  private dotPool: Graphics[] = [];

  constructor(parentLayer: Container, renderer: Renderer) {
    this.renderer = renderer;
    this.container = new Container();
    this.container.label = 'merge-fx';
    parentLayer.addChild(this.container);
  }

  private acquireRing(colour: number): Sprite {
    let s = this.ringPool.pop();
    if (!s) {
      s = new Sprite(getRingTex(this.renderer, colour));
      s.anchor.set(0.5);
      s.blendMode = 'add';
      this.container.addChild(s);
    } else {
      s.texture = getRingTex(this.renderer, colour);
    }
    s.visible = true;
    s.scale.set(1, 1);
    return s;
  }

  private releaseRing(s: Sprite): void {
    s.visible = false;
    if (this.ringPool.length < MergeParticleSystem.POOL_CAP) {
      this.ringPool.push(s);
    } else {
      this.container.removeChild(s);
      s.destroy();
    }
  }

  private acquireShard(): Graphics {
    let g = this.shardPool.pop();
    if (!g) {
      g = new Graphics();
      g.blendMode = 'add';
      this.container.addChild(g);
    }
    g.clear();
    g.visible = true;
    return g;
  }

  private releaseShard(g: Graphics): void {
    g.visible = false;
    if (this.shardPool.length < MergeParticleSystem.POOL_CAP) {
      this.shardPool.push(g);
    } else {
      this.container.removeChild(g);
      g.destroy();
    }
  }

  private acquireDot(): Graphics {
    let g = this.dotPool.pop();
    if (!g) {
      g = new Graphics();
      g.blendMode = 'add';
      this.container.addChild(g);
    }
    g.clear();
    g.visible = true;
    return g;
  }

  private releaseDot(g: Graphics): void {
    g.visible = false;
    if (this.dotPool.length < MergeParticleSystem.POOL_CAP) {
      this.dotPool.push(g);
    } else {
      this.container.removeChild(g);
      g.destroy();
    }
  }

  /** 在指定位置產生合成粒子效果 */
  spawn(x: number, y: number, level: number, colour: number): void {
    // ── Ring：擴散光環（Sprite + scale，參考版做法）──
    const ringBaseR = 5;
    const ring = this.acquireRing(colour);
    ring.x = x;
    ring.y = y;

    this.particles.push({
      type: 'ring',
      display: ring,
      vx: 0, vy: 0,
      life: 1,
      decay: 0.04,
      radius: ringBaseR,
      baseRadius: ringBaseR,
      maxRadius: (12 + level * 4) * 3.5,
      lineWidth: 4,
      colour,
    });

    // ── Shards：碎片飛散（菱形，參數複製參考版）──
    const shardCount = 8 + level * 2;
    for (let i = 0; i < shardCount; i++) {
      const angle = (Math.PI * 2 * i) / shardCount + (Math.random() - 0.5) * 0.4;
      const speed = 3 + Math.random() * 6;
      const sc = 0.32 + Math.random() * 0.26;
      const size = 3 + Math.random() * 3;

      const shard = this.acquireShard();
      shard.moveTo(0, -size);
      shard.lineTo(size * 0.5, 0);
      shard.lineTo(0, size * 0.6);
      shard.lineTo(-size * 0.5, 0);
      shard.closePath();
      shard.fill({ color: colour, alpha: 1 });
      shard.position.set(x, y);
      shard.scale.set(sc);
      shard.rotation = Math.random() * Math.PI * 2;
      shard.alpha = 1;

      this.particles.push({
        type: 'shard',
        display: shard,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        decay: 0.012 + Math.random() * 0.015,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        initScale: sc,
      });
    }

    // ── Dots：小光點噴射（參數複製參考版）──
    const dotCount = 16 + level * 3;
    for (let i = 0; i < dotCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 7;
      const sz = 2 + Math.random() * 5;

      const dot = this.acquireDot();
      dot.circle(0, 0, sz);
      dot.fill({ color: colour, alpha: 1 });
      dot.position.set(x, y);
      dot.alpha = 1;
      dot.scale.set(1, 1);

      this.particles.push({
        type: 'dot',
        display: dot,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        decay: 0.015 + Math.random() * 0.02,
      });
    }

    this.active = true;
  }

  /** 每幀更新（參考版做法） */
  update(dtMs: number): void {
    if (!this.active) return;

    const dtFactor = dtMs / 16;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * dtFactor;

      if (p.life <= 0) {
        // Return display to its pool (kept parented, just hidden) and
        // swap-remove from the active list — O(1) instead of splice's O(N).
        if (p.type === 'ring') this.releaseRing(p.display as Sprite);
        else if (p.type === 'shard') this.releaseShard(p.display as Graphics);
        else this.releaseDot(p.display as Graphics);
        const last = this.particles.length - 1;
        if (i !== last) this.particles[i] = this.particles[last];
        this.particles.pop();
        continue;
      }

      if (p.type === 'ring') {
        // 參考版：easing 擴散，靠 scale 放大
        p.radius! += (p.maxRadius! - p.radius!) * 0.15;
        const sc = p.radius! / p.baseRadius!;
        p.display.scale.set(sc);
        p.display.alpha = p.life * 0.7;
      } else if (p.type === 'shard') {
        p.vx *= 0.98;
        p.vy += 0.08 * dtFactor;
        p.display.x += p.vx * dtFactor;
        p.display.y += p.vy * dtFactor;
        p.display.rotation += (p.rotSpeed ?? 0) * dtFactor;
        p.display.scale.set(p.initScale! * p.life);
        p.display.alpha = p.life;
      } else {
        p.vx *= 0.98;
        p.vy += 0.08 * dtFactor;
        p.display.x += p.vx * dtFactor;
        p.display.y += p.vy * dtFactor;
        p.display.alpha = p.life;
      }
    }

    if (this.particles.length === 0) {
      this.active = false;
    }
  }

  /** 是否有活躍粒子 */
  get isActive(): boolean {
    return this.active;
  }

  /** 清除所有粒子 */
  clear(): void {
    for (const p of this.particles) {
      this.container.removeChild(p.display);
      p.display.destroy();
    }
    this.particles.length = 0;
    this.active = false;
  }

  /** 銷毀 */
  destroy(): void {
    this.clear();
    this.container.destroy();
  }
}

// ─── 23.3 Chain 大型光效粒子 ───────────────────────────────

/**
 * 在指定位置產生 chain 大型光效粒子。
 *
 * 較大、較慢、較亮的粒子，用於強調連鎖效果。
 * 粒子數量隨連鎖數增加。
 */
export function emitChainGlow(
  pool: ParticlePool,
  x: number,
  y: number,
  chainCount: number,
): void {
  const count = Math.min(4 + chainCount * 2, 16);

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const speed = CHAIN_GLOW_SPEED * (0.6 + Math.random() * 0.8);

    pool.spawn({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20, // 輕微上飄
      lifetime: CHAIN_GLOW_LIFETIME_MS,
      radius: CHAIN_GLOW_RADIUS,
      colour: 0xffffff,
      alpha: 0.8,
      gravity: -10, // 輕微上浮
      shrink: true,
    });
  }
}

// ─── 23.4 Special Spawn 環形衝擊波 ────────────────────────

/**
 * 在指定位置產生 special spawn 環形衝擊波粒子。
 *
 * 粒子從中心向外均勻擴散形成環形，
 * 模擬特殊寶石生成時的衝擊波效果。
 */
export function emitSpecialSpawnRing(
  pool: ParticlePool,
  x: number,
  y: number,
  colour: number = 0xffffff,
): void {
  for (let i = 0; i < SPECIAL_RING_PARTICLE_COUNT; i++) {
    const angle = (i / SPECIAL_RING_PARTICLE_COUNT) * Math.PI * 2;
    const speed = SPECIAL_RING_EXPAND_RADIUS / (SPECIAL_RING_LIFETIME_MS / 1000);

    pool.spawn({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      lifetime: SPECIAL_RING_LIFETIME_MS,
      radius: 4,
      colour,
      alpha: 0.9,
      gravity: 0,
      shrink: true,
    });
  }
}

// ─── Jelly 障礙粒子特效 ─────────────────────────────────────

/** 單一 jelly 粒子狀態 */
interface JellyBlob {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

/**
 * Jelly blocker 命中 / 消除時的果凍噴射效果。
 *
 * - hit（層數減少）：6 顆小綠色果凍球，輕快噴出
 * - cleared（完全消除）：12 顆較大的果凍球，更強烈噴發
 */
export class JellyParticleSystem {
  private readonly blobs: JellyBlob[] = [];
  private readonly container: Container;

  constructor(parentLayer: Container) {
    this.container = new Container();
    this.container.label = 'jelly-fx';
    parentLayer.addChild(this.container);
  }

  spawn(x: number, y: number, cleared: boolean): void {
    const count = cleared ? 12 : 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
      const speed = cleared
        ? 90 + Math.random() * 85
        : 55 + Math.random() * 55;
      const r = cleared ? 3.5 + Math.random() * 3.5 : 2 + Math.random() * 2.5;
      const life = cleared ? 380 + Math.random() * 120 : 250 + Math.random() * 100;
      const col = Math.random() < 0.6 ? 0x44ffaa : 0xaaffdd;

      const g = new Graphics();
      // blob body
      g.circle(0, 0, r).fill({ color: col, alpha: 0.88 });
      // inner gloss highlight
      g.circle(-r * 0.28, -r * 0.28, r * 0.38).fill({ color: 0xffffff, alpha: 0.45 });
      this.container.addChild(g);
      g.position.set(x, y);

      this.blobs.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (cleared ? 25 : 8),
        life,
        maxLife: life,
      });
    }
  }

  update(dtMs: number): void {
    const drag = Math.pow(0.96, dtMs / 16);
    const dtSec = dtMs / 1000;
    for (let i = this.blobs.length - 1; i >= 0; i--) {
      const b = this.blobs[i];
      b.vx *= drag;
      b.vy += 220 * dtSec;
      b.g.x += b.vx * dtSec;
      b.g.y += b.vy * dtSec;
      b.life -= dtMs;
      const t = b.life / b.maxLife;
      b.g.alpha = t < 0.35 ? t / 0.35 : 1;
      if (b.life <= 0) {
        this.container.removeChild(b.g);
        b.g.destroy();
        this.blobs.splice(i, 1);
      }
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
