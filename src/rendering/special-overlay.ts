import { Graphics } from 'pixi.js';
import type { SpecialGemType, GemColour } from '../types';
import { GEM_COLOURS, GEM_RADIUS, CELL_SIZE, SPECIAL_OVERLAY_RATIO } from './design-tokens';

// ─── 特殊寶石覆蓋層工具 ────────────────────────────────────

/**
 * 為已存在的寶石 sprite 建立特殊覆蓋層 Graphics。
 * 用於寶石升級為特殊寶石時（如 cascade 中生成）。
 */
export function createSpecialOverlayGraphics(
  special: SpecialGemType,
  colour: GemColour | null,
): Graphics {
  const g = new Graphics();
  const overlaySize = CELL_SIZE * SPECIAL_OVERLAY_RATIO;

  switch (special) {
    case 'lineH':
      drawLineHOverlay(g, overlaySize);
      break;
    case 'lineV':
      drawLineVOverlay(g, overlaySize);
      break;
    case 'area':
      drawAreaOverlay(g, overlaySize);
      break;
    case 'colour':
      drawColourOverlay(g, colour);
      break;
  }

  return g;
}

// ─── 繪製函式 ──────────────────────────────────────────────

function drawLineHOverlay(g: Graphics, size: number): void {
  const halfW = size * 0.5;
  const arrowH = size * 0.2;
  const colour = 0xffffff;
  const alpha = 0.9;

  g.moveTo(-halfW, 0);
  g.lineTo(halfW, 0);
  g.stroke({ color: colour, width: 2.5, alpha });

  g.moveTo(halfW - arrowH, -arrowH);
  g.lineTo(halfW, 0);
  g.lineTo(halfW - arrowH, arrowH);
  g.stroke({ color: colour, width: 2.5, alpha });

  g.moveTo(-halfW + arrowH, -arrowH);
  g.lineTo(-halfW, 0);
  g.lineTo(-halfW + arrowH, arrowH);
  g.stroke({ color: colour, width: 2.5, alpha });
}

function drawLineVOverlay(g: Graphics, size: number): void {
  const halfH = size * 0.5;
  const arrowW = size * 0.2;
  const colour = 0xffffff;
  const alpha = 0.9;

  g.moveTo(0, -halfH);
  g.lineTo(0, halfH);
  g.stroke({ color: colour, width: 2.5, alpha });

  g.moveTo(-arrowW, -halfH + arrowW);
  g.lineTo(0, -halfH);
  g.lineTo(arrowW, -halfH + arrowW);
  g.stroke({ color: colour, width: 2.5, alpha });

  g.moveTo(-arrowW, halfH - arrowW);
  g.lineTo(0, halfH);
  g.lineTo(arrowW, halfH - arrowW);
  g.stroke({ color: colour, width: 2.5, alpha });
}

function drawAreaOverlay(g: Graphics, size: number): void {
  const r = size * 0.45;
  const innerR = r * 0.4;
  const points = 4;
  const colour = 0xffffff;
  const alpha = 0.9;

  g.moveTo(0, -r);
  for (let i = 0; i < points; i++) {
    const outerAngle = (i * Math.PI * 2) / points - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / points;
    const nextOuterAngle = ((i + 1) * Math.PI * 2) / points - Math.PI / 2;

    g.lineTo(
      Math.cos(innerAngle) * innerR,
      Math.sin(innerAngle) * innerR,
    );
    g.lineTo(
      Math.cos(nextOuterAngle) * r,
      Math.sin(nextOuterAngle) * r,
    );
  }
  g.fill({ color: colour, alpha: alpha * 0.8 });
  g.stroke({ color: colour, width: 1.5, alpha });
}

function drawColourOverlay(g: Graphics, _colour: GemColour | null): void {
  const ringRadius = GEM_RADIUS + 4;
  const segmentColours = [0xff3344, 0xff8833, 0xffcc00, 0x33cc66, 0x3388ff, 0xaa44ff];
  const segmentAngle = (Math.PI * 2) / segmentColours.length;

  for (let i = 0; i < segmentColours.length; i++) {
    const startAngle = i * segmentAngle;
    const endAngle = startAngle + segmentAngle;
    g.arc(0, 0, ringRadius, startAngle, endAngle);
    g.stroke({ color: segmentColours[i], width: 3, alpha: 0.8 });
  }
}

/**
 * 取得特殊寶石的指示色（用於 glow 等效果）。
 */
export function getSpecialIndicatorColour(
  special: SpecialGemType,
  gemColour: GemColour | null,
): number {
  if (special === 'colour') return 0xffffff;
  return gemColour ? GEM_COLOURS[gemColour] : 0xffffff;
}
