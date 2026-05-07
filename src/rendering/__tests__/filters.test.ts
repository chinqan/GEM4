import { describe, it, expect, vi } from 'vitest';

// ─── Mock PixiJS ────────────────────────────────────────────

vi.mock('pixi.js', () => {
  class MockBlurFilter {
    strength: number;
    quality: number;
    constructor(opts: any = {}) {
      this.strength = opts.strength ?? 4;
      this.quality = opts.quality ?? 2;
    }
  }

  class MockColorMatrixFilter {
    saturate = vi.fn();
    reset = vi.fn();
  }

  class MockContainer {
    children: any[] = [];
    filters: any[] | null = null;
    label = '';
    addChild(child: any) {
      this.children.push(child);
      return child;
    }
    removeChild(child: any) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
    }
  }

  class MockGraphics {
    visible = true;
    alpha = 1;
    position = { set: vi.fn() };
    scale = { set: vi.fn() };
    clear = vi.fn().mockReturnThis();
    circle = vi.fn().mockReturnThis();
    rect = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    stroke = vi.fn().mockReturnThis();
    destroy = vi.fn();
  }

  return {
    Container: MockContainer,
    Graphics: MockGraphics,
    BlurFilter: MockBlurFilter,
    ColorMatrixFilter: MockColorMatrixFilter,
  };
});

import { Container } from 'pixi.js';
import { applyGlowBlur, removeGlowBlur, applyBloom, removeBloom } from '../filters';

// ─── Filters 單元測試 ───────────────────────────────────────

describe('applyGlowBlur', () => {
  it('medium 預設啟用 glow blur', () => {
    const layer = new Container();
    const blur = applyGlowBlur(layer as any, 'medium');

    expect(blur).not.toBeNull();
    expect(layer.filters).not.toBeNull();
    expect(layer.filters!.length).toBe(1);
  });

  it('high 預設啟用 glow blur', () => {
    const layer = new Container();
    const blur = applyGlowBlur(layer as any, 'high');

    expect(blur).not.toBeNull();
  });

  it('low 預設不啟用 glow blur', () => {
    const layer = new Container();
    const blur = applyGlowBlur(layer as any, 'low');

    expect(blur).toBeNull();
    // filters 應該保持不變
  });

  it('不覆蓋已有的 filters', () => {
    const layer = new Container();
    const existingFilter = { type: 'existing' };
    layer.filters = [existingFilter as any];

    const blur = applyGlowBlur(layer as any, 'medium');

    expect(blur).not.toBeNull();
    expect(layer.filters!.length).toBe(2);
    expect(layer.filters![0]).toBe(existingFilter);
  });
});

describe('removeGlowBlur', () => {
  it('移除指定的 blur filter', () => {
    const layer = new Container();
    const blur = applyGlowBlur(layer as any, 'medium');

    expect(layer.filters!.length).toBe(1);

    removeGlowBlur(layer as any, blur!);

    // filters 應該為空或 null
    expect(layer.filters === null || layer.filters!.length === 0).toBe(true);
  });

  it('不影響其他 filters', () => {
    const layer = new Container();
    const existingFilter = { type: 'existing' };
    layer.filters = [existingFilter as any];

    const blur = applyGlowBlur(layer as any, 'medium');
    removeGlowBlur(layer as any, blur!);

    expect(layer.filters!.length).toBe(1);
    expect(layer.filters![0]).toBe(existingFilter);
  });

  it('layer 無 filters 時不拋錯', () => {
    const layer = new Container();
    layer.filters = null;

    expect(() => removeGlowBlur(layer as any, {} as any)).not.toThrow();
  });
});

describe('applyBloom', () => {
  it('high 預設啟用 bloom', () => {
    const layer = new Container();
    const bloom = applyBloom(layer as any, 'high');

    expect(bloom).not.toBeNull();
  });

  it('medium 預設不啟用 bloom', () => {
    const layer = new Container();
    const bloom = applyBloom(layer as any, 'medium');

    expect(bloom).toBeNull();
  });

  it('low 預設不啟用 bloom', () => {
    const layer = new Container();
    const bloom = applyBloom(layer as any, 'low');

    expect(bloom).toBeNull();
  });
});

describe('removeBloom', () => {
  it('移除 bloom filter', () => {
    const layer = new Container();
    const bloom = applyBloom(layer as any, 'high');

    if (bloom) {
      removeBloom(layer as any, bloom);
      expect(layer.filters === null || layer.filters!.length === 0).toBe(true);
    }
  });
});
