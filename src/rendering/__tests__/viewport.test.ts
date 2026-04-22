import { describe, it, expect } from 'vitest';
import {
  calculateViewport,
  MIN_CANVAS_WIDTH,
  MIN_CANVAS_HEIGHT,
} from '../viewport';

// ─── 20.1 calculateViewport 單元測試 ────────────────────────

describe('calculateViewport', () => {
  const PADDING = 0.85;

  it('should calculate correct scale for a standard 8×8 board on 1200×800 canvas', () => {
    const result = calculateViewport(1200, 800, 8, 8, 64);
    const boardPixelW = 8 * 64; // 512
    const boardPixelH = 8 * 64; // 512
    const expectedScale = Math.min(1200 / boardPixelW, 800 / boardPixelH) * PADDING;
    expect(result.scale).toBeCloseTo(expectedScale, 10);
  });

  it('should center the board horizontally and vertically', () => {
    const result = calculateViewport(1200, 800, 8, 8, 64);
    const boardPixelW = 8 * 64;
    const boardPixelH = 8 * 64;
    const expectedOffsetX = (1200 - boardPixelW * result.scale) / 2;
    const expectedOffsetY = (800 - boardPixelH * result.scale) / 2;
    expect(result.offsetX).toBeCloseTo(expectedOffsetX, 10);
    expect(result.offsetY).toBeCloseTo(expectedOffsetY, 10);
  });

  it('should produce equal margins on both sides (letterbox)', () => {
    const result = calculateViewport(1600, 900, 9, 7, 64);
    // Offsets should be positive (board fits inside canvas)
    expect(result.offsetX).toBeGreaterThan(0);
    expect(result.offsetY).toBeGreaterThan(0);
  });

  it('should handle wide canvas (width >> height) — height-constrained', () => {
    const result = calculateViewport(2000, 600, 8, 8, 64);
    const boardPixelW = 8 * 64;
    const boardPixelH = 8 * 64;
    // Height is the constraining dimension
    const expectedScale = (Math.max(600, MIN_CANVAS_HEIGHT) / boardPixelH) * PADDING;
    expect(result.scale).toBeCloseTo(expectedScale, 10);
  });

  it('should handle tall canvas (height >> width) — width-constrained', () => {
    const result = calculateViewport(800, 2000, 8, 8, 64);
    const boardPixelW = 8 * 64;
    // Width is below minimum, so effective width = MIN_CANVAS_WIDTH
    const boardPixelH = 8 * 64;
    const effectiveW = Math.max(800, MIN_CANVAS_WIDTH);
    const effectiveH = Math.max(2000, MIN_CANVAS_HEIGHT);
    const expectedScale =
      Math.min(effectiveW / boardPixelW, effectiveH / boardPixelH) * PADDING;
    expect(result.scale).toBeCloseTo(expectedScale, 10);
  });

  it('should use minimum resolution when canvas is smaller than 1200×800', () => {
    const result = calculateViewport(640, 480, 8, 8, 64);
    const boardPixelW = 8 * 64;
    const boardPixelH = 8 * 64;
    // Effective dimensions should be clamped to minimums
    const expectedScale =
      Math.min(MIN_CANVAS_WIDTH / boardPixelW, MIN_CANVAS_HEIGHT / boardPixelH) * PADDING;
    expect(result.scale).toBeCloseTo(expectedScale, 10);
  });

  it('should handle non-square boards (e.g. 6×9)', () => {
    const result = calculateViewport(1200, 800, 6, 9, 64);
    const boardPixelW = 6 * 64;
    const boardPixelH = 9 * 64;
    const expectedScale =
      Math.min(1200 / boardPixelW, 800 / boardPixelH) * PADDING;
    expect(result.scale).toBeCloseTo(expectedScale, 10);
  });

  it('should handle different cell sizes', () => {
    const result = calculateViewport(1200, 800, 8, 8, 48);
    const boardPixelW = 8 * 48;
    const boardPixelH = 8 * 48;
    const expectedScale =
      Math.min(1200 / boardPixelW, 800 / boardPixelH) * PADDING;
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

  it('should apply the 0.85 padding factor', () => {
    const canvasW = 1200;
    const canvasH = 800;
    const boardW = 8;
    const boardH = 8;
    const cellSize = 64;

    const result = calculateViewport(canvasW, canvasH, boardW, boardH, cellSize);
    const boardPixelW = boardW * cellSize;
    const boardPixelH = boardH * cellSize;
    const scaleWithoutPadding = Math.min(canvasW / boardPixelW, canvasH / boardPixelH);

    // Scale should be 85% of the unpadded scale
    expect(result.scale).toBeCloseTo(scaleWithoutPadding * 0.85, 10);
  });
});
