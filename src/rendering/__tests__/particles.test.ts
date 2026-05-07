import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock PixiJS ────────────────────────────────────────────

vi.mock('pixi.js', () => {
  class MockGraphics {
    visible = true;
    alpha = 1;
    label = '';
    position = { set: vi.fn(), x: 0, y: 0 };
    scale = { set: vi.fn(), x: 1, y: 1 };
    clear = vi.fn().mockReturnThis();
    circle = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    destroy = vi.fn();
  }

  class MockContainer {
    children: any[] = [];
    label = '';
    addChild(child: any) {
      this.children.push(child);
      return child;
    }
    removeChild(child: any) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
    }
    destroy = vi.fn();
  }

  return {
    Container: MockContainer,
    Graphics: MockGraphics,
    Sprite: vi.fn(),
    Texture: { from: vi.fn() },
    Rectangle: vi.fn(),
  };
});

import { Particle, ParticlePool } from '../particles';
import type { ParticleConfig } from '../particles';

// ─── Particle 單元測試 ──────────────────────────────────────

describe('Particle', () => {
  it('初始狀態為 dead', () => {
    const p = new Particle();
    expect(p.isDead).toBe(true);
    expect(p.graphics.visible).toBe(false);
  });

  it('init 後變為 alive', () => {
    const p = new Particle();
    const config: ParticleConfig = {
      x: 100,
      y: 200,
      vx: 50,
      vy: -30,
      lifetime: 500,
      radius: 4,
      colour: 0xff0000,
      alpha: 0.8,
    };
    p.init(config);

    expect(p.isDead).toBe(false);
    expect(p.x).toBe(100);
    expect(p.y).toBe(200);
    expect(p.vx).toBe(50);
    expect(p.vy).toBe(-30);
    expect(p.life).toBe(500);
    expect(p.totalLife).toBe(500);
    expect(p.radius).toBe(4);
    expect(p.colour).toBe(0xff0000);
    expect(p.baseAlpha).toBe(0.8);
    expect(p.graphics.visible).toBe(true);
  });

  it('update 移動粒子位置', () => {
    const p = new Particle();
    p.init({
      x: 0,
      y: 0,
      vx: 100, // 100 px/s
      vy: 0,
      lifetime: 1000,
      radius: 3,
      colour: 0xffffff,
      alpha: 1,
    });

    // 16ms 更新
    p.update(16);

    // x 應該增加約 1.6px（100 * 0.016，加上空氣阻力微調）
    expect(p.x).toBeGreaterThan(0);
    expect(p.life).toBe(1000 - 16);
  });

  it('update 套用重力', () => {
    const p = new Particle();
    p.init({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      lifetime: 1000,
      radius: 3,
      colour: 0xffffff,
      alpha: 1,
      gravity: 500, // 500 px/s²
    });

    p.update(100); // 100ms

    // vy 應該增加（gravity * dt）
    expect(p.vy).toBeGreaterThan(0);
    // y 應該向下移動
    expect(p.y).toBeGreaterThan(0);
  });

  it('生命耗盡後標記為 dead', () => {
    const p = new Particle();
    p.init({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      lifetime: 100,
      radius: 3,
      colour: 0xffffff,
      alpha: 1,
    });

    p.update(150); // 超過 lifetime

    expect(p.isDead).toBe(true);
    expect(p.graphics.visible).toBe(false);
  });

  it('alpha 在生命後 40% 淡出', () => {
    const p = new Particle();
    p.init({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      lifetime: 1000,
      radius: 3,
      colour: 0xffffff,
      alpha: 1,
    });

    // 消耗 70% 生命（剩 30%，在淡出區間）
    p.update(700);

    // lifeRatio = 300/1000 = 0.3 < 0.4 → 淡出
    // alpha = 1 * (0.3 / 0.4) = 0.75
    expect(p.graphics.alpha).toBeCloseTo(0.75, 1);
  });

  it('shrink 在生命後 50% 縮小', () => {
    const p = new Particle();
    p.init({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      lifetime: 1000,
      radius: 3,
      colour: 0xffffff,
      alpha: 1,
      shrink: true,
    });

    // 消耗 80% 生命（剩 20%，在縮小區間）
    p.update(800);

    // lifeRatio = 200/1000 = 0.2 < 0.5 → 縮小
    // scale = 0.2 / 0.5 = 0.4
    expect(p.graphics.scale.set).toHaveBeenCalledWith(
      expect.closeTo(0.4, 1),
      expect.closeTo(0.4, 1),
    );
  });

  it('reset 回到 dead 狀態', () => {
    const p = new Particle();
    p.init({
      x: 100,
      y: 200,
      vx: 50,
      vy: -30,
      lifetime: 500,
      radius: 4,
      colour: 0xff0000,
      alpha: 0.8,
    });

    p.reset();

    expect(p.isDead).toBe(true);
    expect(p.graphics.visible).toBe(false);
    expect(p.graphics.alpha).toBe(0);
  });

  it('dead 粒子 update 不做任何事', () => {
    const p = new Particle();
    // 不呼叫 init，保持 dead
    const initialX = p.x;
    p.update(100);
    expect(p.x).toBe(initialX);
  });
});

// ─── ParticlePool 單元測試 ──────────────────────────────────

describe('ParticlePool', () => {
  let pool: ParticlePool;
  let parentContainer: any;

  beforeEach(async () => {
    const { Container } = await import('pixi.js');
    parentContainer = new Container();
    pool = new ParticlePool(parentContainer, 'low'); // cap=100
  });

  it('初始狀態：無活躍粒子', () => {
    expect(pool.activeCount).toBe(0);
  });

  it('spawn 回傳粒子並增加活躍數', () => {
    const config: ParticleConfig = {
      x: 50,
      y: 50,
      vx: 10,
      vy: -10,
      lifetime: 300,
      radius: 3,
      colour: 0x00ff00,
      alpha: 1,
    };

    const p = pool.spawn(config);
    expect(p).not.toBeNull();
    expect(pool.activeCount).toBe(1);
  });

  it('update 推進所有活躍粒子', () => {
    pool.spawn({
      x: 0, y: 0, vx: 100, vy: 0,
      lifetime: 500, radius: 3, colour: 0xffffff, alpha: 1,
    });

    pool.update(16);
    // 粒子仍活躍
    expect(pool.activeCount).toBe(1);
  });

  it('粒子死亡後自動回收', () => {
    pool.spawn({
      x: 0, y: 0, vx: 0, vy: 0,
      lifetime: 50, radius: 3, colour: 0xffffff, alpha: 1,
    });

    expect(pool.activeCount).toBe(1);

    // 超過 lifetime
    pool.update(100);

    expect(pool.activeCount).toBe(0);
  });

  it('池滿時 spawn 回傳 null', () => {
    // low preset cap = 100
    for (let i = 0; i < 100; i++) {
      pool.spawn({
        x: 0, y: 0, vx: 0, vy: 0,
        lifetime: 10000, radius: 3, colour: 0xffffff, alpha: 1,
      });
    }

    expect(pool.activeCount).toBe(100);

    const overflow = pool.spawn({
      x: 0, y: 0, vx: 0, vy: 0,
      lifetime: 10000, radius: 3, colour: 0xffffff, alpha: 1,
    });

    expect(overflow).toBeNull();
  });

  it('回收後的粒子可重新使用', () => {
    // 生成一個短命粒子
    pool.spawn({
      x: 0, y: 0, vx: 0, vy: 0,
      lifetime: 10, radius: 3, colour: 0xffffff, alpha: 1,
    });

    // 讓它死亡
    pool.update(50);
    expect(pool.activeCount).toBe(0);

    // 再次生成
    const p = pool.spawn({
      x: 100, y: 100, vx: 0, vy: 0,
      lifetime: 1000, radius: 5, colour: 0xff0000, alpha: 0.5,
    });

    expect(p).not.toBeNull();
    expect(pool.activeCount).toBe(1);
  });

  it('clear 清除所有活躍粒子', () => {
    for (let i = 0; i < 10; i++) {
      pool.spawn({
        x: 0, y: 0, vx: 0, vy: 0,
        lifetime: 10000, radius: 3, colour: 0xffffff, alpha: 1,
      });
    }

    expect(pool.activeCount).toBe(10);
    pool.clear();
    expect(pool.activeCount).toBe(0);
  });
});
