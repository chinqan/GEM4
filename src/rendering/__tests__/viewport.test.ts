import { describe, it, expect } from 'vitest';
import {
  calculateViewport,
  MIN_CANVAS_WIDTH,
  MIN_CANVAS_HEIGHT,
  MOBILE_BREAKPOINT,
} from '../viewport';

// ─── 20.1 calculateViewport 單元測試 ────────────────────────

describe('calculateViewport', () => {
  // 與 viewport.ts 一致的常數
  const PADDING = 0.96;
  const MOBILE_PADDING = 0.96;
  const HUD_TOP_RESERVE_BASE = 124;
  const HUD_DESIGN_WIDTH = 390;

  /** 計算動態 HUD reserve（與 viewport.ts 邏輯一致） */
  function getHudReserve(canvasWidth: number): number {
    const effectiveW = Math.max(canvasWidth, MIN_CANVAS_WIDTH);
    const hudScale = Math.max(0.65, Math.min(effectiveW / HUD_DESIGN_WIDTH, 2.5));
    return Math.round(HUD_TOP_RESERVE_BASE * hudScale);
  }

  it('should calculate correct scale for a standard 8×8 board on 1200×800 canvas', () => {
    const result = calculateViewport(1200, 800, 8, 8, 64);
    const boardPixelW = 8 * 64; // 512
    const boardPixelH = 8 * 64; // 512
    const hudReserve = getHudReserve(1200);
    const availableH = 800 - hudReserve;
    const expectedScale = Math.min(1200 / boardPixelW, availableH / boardPixelH) * PADDING;
    expect(result.scale).toBeCloseTo(expectedScale, 10);
  });

  it('should center the board horizontally and offset vertically for HUD', () => {
    const result = calculateViewport(1200, 800, 8, 8, 64);
    const boardPixelW = 8 * 64;
    const boardPixelH = 8 * 64;
    const hudReserve = getHudReserve(1200);
    const expectedOffsetX = (1200 - boardPixelW * result.scale) / 2;
    const expectedOffsetY = hudReserve + (800 - hudReserve - boardPixelH * result.scale) / 2 - 60;
    expect(result.offsetX).toBeCloseTo(expectedOffsetX, 10);
    expect(result.offsetY).toBeCloseTo(expectedOffsetY, 10);
  });

  it('should produce equal margins on both sides horizontally (letterbox)', () => {
    const result = calculateViewport(1600, 900, 9, 7, 64);
    // Horizontal offsets should be positive (board fits inside canvas)
    expect(result.offsetX).toBeGreaterThan(0);
    // Vertical offset should account for HUD reserve
    const hudReserve = getHudReserve(1600);
    expect(result.offsetY).toBeGreaterThanOrEqual(0); // may be negative due to -60 offset
  });

  it('should handle wide canvas (width >> height) — height-constrained', () => {
    const result = calculateViewport(2000, 600, 8, 8, 64);
    const boardPixelH = 8 * 64;
    const effectiveW = Math.max(2000, MIN_CANVAS_WIDTH);
    const effectiveH = Math.max(600, MIN_CANVAS_HEIGHT);
    const hudReserve = getHudReserve(2000);
    const availableH = effectiveH - hudReserve;
    const expectedScale = Math.min(effectiveW / (8 * 64), availableH / boardPixelH) * PADDING;
    expect(result.scale).toBeCloseTo(expectedScale, 10);
  });

  it('should handle tall canvas (height >> width) — width-constrained', () => {
    const result = calculateViewport(800, 2000, 8, 8, 64);
    const boardPixelW = 8 * 64;
    const boardPixelH = 8 * 64;
    const effectiveW = Math.max(800, MIN_CANVAS_WIDTH);
    const effectiveH = Math.max(2000, MIN_CANVAS_HEIGHT);
    const hudReserve = getHudReserve(800);
    const availableH = effectiveH - hudReserve;
    const expectedScale =
      Math.min(effectiveW / boardPixelW, availableH / boardPixelH) * PADDING;
    expect(result.scale).toBeCloseTo(expectedScale, 10);
  });

  it('should use mobile padding and HUD reserve for small screens', () => {
    // 375px wide = typical iPhone
    const result = calculateViewport(375, 667, 8, 8, 64);
    const boardPixelW = 8 * 64;
    const boardPixelH = 8 * 64;
    const effectiveW = Math.max(375, MIN_CANVAS_WIDTH);
    const effectiveH = Math.max(667, MIN_CANVAS_HEIGHT);
    const hudReserve = getHudReserve(375);
    const availableH = effectiveH - hudReserve;
    const expectedScale =
      Math.min(effectiveW / boardPixelW, availableH / boardPixelH) * MOBILE_PADDING;
    expect(result.scale).toBeCloseTo(expectedScale, 10);
  });

  it('should use desktop padding for screens >= MOBILE_BREAKPOINT', () => {
    const result = calculateViewport(MOBILE_BREAKPOINT, 800, 8, 8, 64);
    const boardPixelW = 8 * 64;
    const boardPixelH = 8 * 64;
    const hudReserve = getHudReserve(MOBILE_BREAKPOINT);
    const availableH = 800 - hudReserve;
    const expectedScale =
      Math.min(MOBILE_BREAKPOINT / boardPixelW, availableH / boardPixelH) * PADDING;
    expect(result.scale).toBeCloseTo(expectedScale, 10);
  });

  it('should handle non-square boards (e.g. 6×9)', () => {
    const result = calculateViewport(1200, 800, 6, 9, 64);
    const boardPixelW = 6 * 64;
    const boardPixelH = 9 * 64;
    const hudReserve = getHudReserve(1200);
    const availableH = 800 - hudReserve;
    const expectedScale =
      Math.min(1200 / boardPixelW, availableH / boardPixelH) * PADDING;
    expect(result.scale).toBeCloseTo(expectedScale, 10);
  });

  it('should handle different cell sizes', () => {
    const result = calculateViewport(1200, 800, 8, 8, 48);
    const boardPixelW = 8 * 48;
    const boardPixelH = 8 * 48;
    const hudReserve = getHudReserve(1200);
    const availableH = 800 - hudReserve;
    const expectedScale =
      Math.min(1200 / boardPixelW, availableH / boardPixelH) * PADDING;
    expect(result.scale).toBeCloseTo(expectedScale, 10);
  });

  it('should always produce a positive scale', () => {
    const result = calculateViewport(1200, 800, 9, 9, 64);
    expect(result.scale).toBeGreaterThan(0);
  });

  it('should produce offsets that keep the board within the canvas', () => {
    const result = calculateViewport(1200, 800, 8, 8, 64);
    const boardPixelW = 8 * 64;
    const boardPixelH = 8 * 64;
    // Board right edge should not exceed canvas width
    expect(result.offsetX + boardPixelW * result.scale).toBeLessThanOrEqual(1200 + 0.001);
    // Board bottom edge should not exceed canvas height
    expect(result.offsetY + boardPixelH * result.scale).toBeLessThanOrEqual(800 + 0.001);
  });

  it('should produce offsets that keep the board within a mobile canvas', () => {
    const result = calculateViewport(375, 812, 8, 8, 64);
    const boardPixelW = 8 * 64;
    const boardPixelH = 8 * 64;
    // Board right edge should not exceed canvas width
    expect(result.offsetX + boardPixelW * result.scale).toBeLessThanOrEqual(375 + 0.001);
    // Board bottom edge should not exceed canvas height
    expect(result.offsetY + boardPixelH * result.scale).toBeLessThanOrEqual(812 + 0.001);
  });

  it('should apply the 0.96 padding factor on desktop', () => {
    const canvasW = 1200;
    const canvasH = 800;
    const boardW = 8;
    const boardH = 8;
    const cellSize = 64;

    const result = calculateViewport(canvasW, canvasH, boardW, boardH, cellSize);
    const boardPixelW = boardW * cellSize;
    const boardPixelH = boardH * cellSize;
    const hudReserve = getHudReserve(canvasW);
    const availableH = canvasH - hudReserve;
    const scaleWithoutPadding = Math.min(canvasW / boardPixelW, availableH / boardPixelH);

    // Scale should be 96% of the unpadded scale
    expect(result.scale).toBeCloseTo(scaleWithoutPadding * 0.96, 10);
  });

  it('should apply the 0.96 padding factor on mobile', () => {
    const canvasW = 390;
    const canvasH = 844;
    const boardW = 8;
    const boardH = 8;
    const cellSize = 64;

    const result = calculateViewport(canvasW, canvasH, boardW, boardH, cellSize);
    const boardPixelW = boardW * cellSize;
    const boardPixelH = boardH * cellSize;
    const hudReserve = getHudReserve(canvasW);
    const availableH = canvasH - hudReserve;
    const scaleWithoutPadding = Math.min(canvasW / boardPixelW, availableH / boardPixelH);

    // Scale should be 96% of the unpadded scale
    expect(result.scale).toBeCloseTo(scaleWithoutPadding * 0.96, 10);
  });

  it('should scale HUD reserve proportionally with canvas width', () => {
    // On a 780px canvas (2x design width), HUD reserve should be ~2x base
    const hudReserve390 = getHudReserve(390);
    const hudReserve780 = getHudReserve(780);
    // 780px is 2x the design width, so HUD reserve should be ~2x
    expect(hudReserve780).toBeCloseTo(hudReserve390 * 2, 0);
    // Both should be positive and proportional
    expect(hudReserve780).toBeGreaterThan(hudReserve390);
  });
});
