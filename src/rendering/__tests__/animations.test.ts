import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock PixiJS ────────────────────────────────────────────

vi.mock('pixi.js', () => {
  class MockGraphics {
    visible = true;
    alpha = 1;
    position = { set: vi.fn(), x: 0, y: 0 };
    scale = { set: vi.fn(), x: 1, y: 1 };
    clear = vi.fn().mockReturnThis();
    circle = vi.fn().mockReturnThis();
    rect = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    stroke = vi.fn().mockReturnThis();
    destroy = vi.fn();
    filters: any = null;
  }

  class MockContainer {
    children: any[] = [];
    label = '';
    filters: any = null;
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

  class MockColorMatrixFilter {
    saturate = vi.fn();
    reset = vi.fn();
  }

  return {
    Container: MockContainer,
    Graphics: MockGraphics,
    ColorMatrixFilter: MockColorMatrixFilter,
    BlurFilter: vi.fn().mockImplementation(() => ({ strength: 0 })),
  };
});

import { AnimationManager } from '../animations';
import type { Animation } from '../animations';

// ─── AnimationManager 單元測試 ──────────────────────────────

describe('AnimationManager', () => {
  let manager: AnimationManager;

  beforeEach(() => {
    manager = new AnimationManager();
  });

  it('初始狀態：無動畫', () => {
    expect(manager.isAnimating).toBe(false);
    expect(manager.count).toBe(0);
  });

  it('add 後 isAnimating 為 true', () => {
    const anim: Animation = {
      elapsed: 0,
      duration: 200,
      update(dtMs: number) {
        this.elapsed += dtMs;
        return this.elapsed >= this.duration;
      },
      complete: vi.fn(),
    };

    manager.add(anim);
    expect(manager.isAnimating).toBe(true);
    expect(manager.count).toBe(1);
  });

  it('update 推進動畫', () => {
    const anim: Animation = {
      elapsed: 0,
      duration: 200,
      update(dtMs: number) {
        this.elapsed += dtMs;
        return this.elapsed >= this.duration;
      },
      complete: vi.fn(),
    };

    manager.add(anim);
    manager.update(100);

    expect(anim.elapsed).toBe(100);
    expect(manager.isAnimating).toBe(true); // 尚未完成
  });

  it('動畫完成後自動移除並呼叫 complete', () => {
    const completeFn = vi.fn();
    const anim: Animation = {
      elapsed: 0,
      duration: 200,
      update(dtMs: number) {
        this.elapsed += dtMs;
        return this.elapsed >= this.duration;
      },
      complete: completeFn,
    };

    manager.add(anim);
    manager.update(250); // 超過 duration

    expect(completeFn).toHaveBeenCalledTimes(1);
    expect(manager.isAnimating).toBe(false);
    expect(manager.count).toBe(0);
  });

  it('多個動畫獨立管理', () => {
    const complete1 = vi.fn();
    const complete2 = vi.fn();

    const anim1: Animation = {
      elapsed: 0,
      duration: 100,
      update(dtMs) {
        this.elapsed += dtMs;
        return this.elapsed >= this.duration;
      },
      complete: complete1,
    };

    const anim2: Animation = {
      elapsed: 0,
      duration: 300,
      update(dtMs) {
        this.elapsed += dtMs;
        return this.elapsed >= this.duration;
      },
      complete: complete2,
    };

    manager.add(anim1);
    manager.add(anim2);
    expect(manager.count).toBe(2);

    manager.update(150);

    // anim1 完成，anim2 仍在
    expect(complete1).toHaveBeenCalledTimes(1);
    expect(complete2).not.toHaveBeenCalled();
    expect(manager.count).toBe(1);

    manager.update(200);

    // anim2 也完成
    expect(complete2).toHaveBeenCalledTimes(1);
    expect(manager.count).toBe(0);
  });

  it('clear 清除所有動畫（不呼叫 complete）', () => {
    const completeFn = vi.fn();
    const anim: Animation = {
      elapsed: 0,
      duration: 1000,
      update(dtMs) {
        this.elapsed += dtMs;
        return this.elapsed >= this.duration;
      },
      complete: completeFn,
    };

    manager.add(anim);
    manager.clear();

    expect(manager.isAnimating).toBe(false);
    expect(completeFn).not.toHaveBeenCalled();
  });

  it('空 manager update 不拋錯', () => {
    expect(() => manager.update(16)).not.toThrow();
  });
});
