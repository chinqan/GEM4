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

  class MockSprite {
    position = { set: vi.fn(), x: 0, y: 0 };
    scale = { set: vi.fn(), x: 1, y: 1 };
    alpha = 1;
    visible = true;
    tint = 0xffffff;
    anchor = { set: vi.fn() };
    destroy = vi.fn();
  }

  return {
    Container: MockContainer,
    Graphics: MockGraphics,
    Sprite: MockSprite,
    Texture: { from: vi.fn() },
    Rectangle: vi.fn(),
    BlurFilter: vi.fn().mockImplementation(() => ({ strength: 0 })),
    ColorMatrixFilter: vi.fn().mockImplementation(() => ({
      saturate: vi.fn(),
      reset: vi.fn(),
    })),
  };
});

// ─── Mock synth-sfx ─────────────────────────────────────────

vi.mock('../../audio/synth-sfx', () => ({
  playMatchSfx: vi.fn(),
  playSwap: vi.fn(),
  playInvalid: vi.fn(),
  playCombo: vi.fn(),
  playLevelComplete: vi.fn(),
  playLevelFail: vi.fn(),
  playCascade: vi.fn(),
}));

// ─── Mock particles ─────────────────────────────────────────

vi.mock('../particles', () => ({
  MergeParticleSystem: vi.fn().mockImplementation(() => ({
    emit: vi.fn(),
    spawn: vi.fn(),
    update: vi.fn(),
    clear: vi.fn(),
  })),
}));

// ─── Mock animations ────────────────────────────────────────

vi.mock('../animations', () => ({
  createSwapAnimation: vi.fn(() => ({
    elapsed: 0,
    duration: 200,
    update: vi.fn(() => true),
    complete: vi.fn(),
  })),
  createMatchClearAnimation: vi.fn(() => ({
    elapsed: 0,
    duration: 200,
    update: vi.fn(() => true),
    complete: vi.fn(),
  })),
  createCascadeDropAnimation: vi.fn(() => ({
    elapsed: 0,
    duration: 120,
    update: vi.fn(() => true),
    complete: vi.fn(),
  })),
  createSpecialActivationEffect: vi.fn(() => ({
    elapsed: 0,
    duration: 800,
    update: vi.fn(() => true),
    complete: vi.fn(),
  })),
  createBlastZoneOverlay: vi.fn(() => ({
    elapsed: 0,
    duration: 300,
    update: vi.fn(() => true),
    complete: vi.fn(),
  })),
  createMarkEffect: vi.fn(() => ({
    elapsed: 0,
    duration: 300,
    update: vi.fn(() => true),
    complete: vi.fn(),
  })),
  createBrewAnimation: vi.fn(() => ({
    elapsed: 0,
    duration: 400,
    update: vi.fn(() => true),
    complete: vi.fn(),
  })),
  createEnhancedBlastAnimation: vi.fn(() => ({
    elapsed: 0,
    duration: 200,
    update: vi.fn(() => true),
    complete: vi.fn(),
  })),
}));

// ─── Mock score-popup ───────────────────────────────────────

vi.mock('../../ui/juice/score-popup', () => ({
  createScorePopup: vi.fn(() => ({
    container: { destroy: vi.fn() },
    update: vi.fn(),
  })),
}));

// ─── Mock staged-blast ──────────────────────────────────────

vi.mock('../staged-blast', () => ({
  computeStagedPhases: vi.fn(() => ({
    markSchedule: [],
    markEndTime: 0,
    brewStartTime: 0,
    brewEndTime: 400,
    blastStartTime: 400,
    passiveSchedule: [],
  })),
}));

// ─── Mock accessibility ─────────────────────────────────────

vi.mock('../accessibility', () => ({
  detectPrefersReducedMotion: vi.fn(() => false),
}));

import { playMatchSfx, playInvalid, playCombo } from '../../audio/synth-sfx';
import { BoardAnimator } from '../board-animator';
import type { BoardAnimatorConfig } from '../board-animator';

// ─── Stub browser globals ───────────────────────────────────

vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  // Immediately invoke to resolve animations synchronously in tests
  cb(16);
  return 1;
});
vi.stubGlobal('cancelAnimationFrame', vi.fn());

// ─── 測試工具 ───────────────────────────────────────────────

function createMockConfig(): BoardAnimatorConfig {
  const { Container } = require('pixi.js');
  return {
    boardRenderer: {
      sync: vi.fn(),
      syncFromSnapshot: vi.fn(),
      getSprite: vi.fn(() => ({
        position: { set: vi.fn(), x: 0, y: 0 },
        scale: { set: vi.fn(), x: 1, y: 1 },
        alpha: 1,
        visible: true,
        tint: 0xffffff,
      })),
      updateCell: vi.fn(),
      clear: vi.fn(),
    } as any,
    layers: {
      boardLayer: new Container(),
      glowLayer: new Container(),
      fxLayer: new Container(),
      uiLayer: new Container(),
      particleLayer: new Container(),
    } as any,
    renderer: {},
  };
}

// ─── BoardAnimator 單元測試 ─────────────────────────────────
// Note: BoardAnimator is tightly coupled to PixiJS rendering.
// We test the SFX triggering logic and construction.
// Full animation flow is covered by animation-flow.test.ts
// which tests the data contracts between GameSession and the animator.

describe('BoardAnimator', () => {
  let animator: BoardAnimator;
  let config: BoardAnimatorConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    config = createMockConfig();
    animator = new BoardAnimator(config);
  });

  describe('construction', () => {
    it('建構不拋錯', () => {
      expect(animator).toBeDefined();
    });
  });

  describe('animateSwap — invalid swap', () => {
    it('無效交換播放 invalid SFX', async () => {
      const invalidResult = {
        valid: false,
        type: 'invalid' as const,
        movesConsumed: false,
        cascadeSteps: [],
        totalScore: 0,
      };

      await animator.animateSwap(invalidResult as any, [0, 0], [1, 0], {} as any);

      expect(playInvalid).toHaveBeenCalled();
    });
  });

  describe('SFX integration contracts', () => {
    it('playMatchSfx 被 mock 正確匯入', () => {
      expect(playMatchSfx).toBeDefined();
      expect(vi.isMockFunction(playMatchSfx)).toBe(true);
    });

    it('playCombo 被 mock 正確匯入', () => {
      expect(playCombo).toBeDefined();
      expect(vi.isMockFunction(playCombo)).toBe(true);
    });

    it('playInvalid 被 mock 正確匯入', () => {
      expect(playInvalid).toBeDefined();
      expect(vi.isMockFunction(playInvalid)).toBe(true);
    });
  });
});
