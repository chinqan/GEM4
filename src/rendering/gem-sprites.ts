import { Container, Graphics, Text } from 'pixi.js';
import type { GemColour, SpecialGemType } from '../types';
import {
  GEM_COLOURS,
  GEM_GLOW_COLOURS,
  COLOUR_GEM_HUE,
  GEM_RADIUS,
  CELL_SIZE,
  SPECIAL_OVERLAY_RATIO,
  SHIMMER_CYCLE_MS,
  SHIMMER_ALPHA_MIN,
  SHIMMER_ALPHA_MAX,
} from './design-tokens';

// ─── 型別 ──────────────────────────────────────────────────

/** 寶石 sprite 容器，附帶元資料供 BoardRenderer 使用 */
export interface GemSprite extends Container {
  /** 寶石主體 Graphics */
  gemBody: Graphics;
  /** 特殊寶石覆蓋層（null = 普通寶石） */
  specialOverlay: Graphics | null;
  /** shimmer 高光 Graphics（High preset 用） */
  shimmerHighlight: Graphics | null;
  /** 棋盤欄 */
  col: number;
  /** 棋盤列 */
  row: number;
}

// ─── GemSpriteFactory ──────────────────────────────────────

/**
 * 依顏色與特殊類型建立寶石 sprite。
 *
 * 使用 PixiJS 8 Graphics 繪製 placeholder 圖形：
 * - 普通寶石：彩色圓形
 * - lineH：圓形 + 水平箭頭
 * - lineV：圓形 + 垂直箭頭
 * - area：圓形 + 星形/十字
 * - colour：白色圓形 + 彩虹光暈
 */
export class GemSpriteFactory {
  /**
   * 建立一個寶石 sprite。
   *
   * @param colour  寶石顏色（null 表示 Colour Gem）
   * @param special 特殊類型（null 表示普通寶石）
   * @param col     棋盤欄
   * @param row     棋盤列
   * @returns GemSprite 容器
   */
  create(
    colour: GemColour | null,
    special: SpecialGemType | null,
    col: number,
    row: number,
  ): GemSprite {
    const container = new Container() as GemSprite;
    container.label = `gem-${col}-${row}`;

    // 獨立特殊道具(無顏色,僅特殊類型):繪製 emoji 道具
    const isStandaloneSpecial = special !== null && colour === null;

    // 繪製主體
    //  - 一般顏色寶石:彩色圓形
    //  - colour gem(原 colour bomb):彩虹環(有 colour=null && special='colour' 也走這條,但
    //    新規則下其他 special 也是 colour=null,因此交由 isStandaloneSpecial 分流)
    const body = isStandaloneSpecial
      ? this.drawSpecialItemBody()
      : this.drawBody(colour);
    container.addChild(body);
    container.gemBody = body;

    // 覆蓋層:獨立道具用 emoji;一般寶石才會走原本的線條/星形覆蓋
    let overlay: Graphics | null = null;
    if (isStandaloneSpecial) {
      const emoji = this.makeSpecialEmoji(special!);
      container.addChild(emoji);
    } else if (special) {
      overlay = this.drawSpecialOverlay(special, colour);
      container.addChild(overlay);
    }
    container.specialOverlay = overlay;

    // shimmer 高光（預設隱藏，由 BoardRenderer 控制）
    const shimmer = this.drawShimmerHighlight(colour);
    shimmer.alpha = 0;
    container.addChild(shimmer);
    container.shimmerHighlight = shimmer;

    // 定位到格子中心
    container.col = col;
    container.row = row;
    container.position.set(
      col * CELL_SIZE + CELL_SIZE / 2,
      row * CELL_SIZE + CELL_SIZE / 2,
    );

    // 設定 pivot 為中心以便縮放動畫
    container.pivot.set(0, 0);

    return container;
  }

  /** 獨立特殊道具的底盤(深色圓 + 金邊) */
  private drawSpecialItemBody(): Graphics {
    const g = new Graphics();
    g.circle(0, 0, GEM_RADIUS);
    g.fill({ color: 0x1a1f3a, alpha: 0.95 });
    g.circle(0, 0, GEM_RADIUS);
    g.stroke({ color: 0xf6c453, width: 3, alpha: 0.95 });
    // 內圈高光
    g.circle(-GEM_RADIUS * 0.18, -GEM_RADIUS * 0.18, GEM_RADIUS * 0.5);
    g.fill({ color: 0xffffff, alpha: 0.12 });
    return g;
  }

  /** 取得 special type 對應 emoji */
  private specialEmoji(special: SpecialGemType): string {
    switch (special) {
      case 'lineH': return '↔️';
      case 'lineV': return '↕️';
      case 'area':  return '💣';
      case 'colour': return '🌈';
    }
  }

  /** 製作 emoji Text */
  private makeSpecialEmoji(special: SpecialGemType): Text {
    const t = new Text({
      text: this.specialEmoji(special),
      style: {
        fontSize: GEM_RADIUS * 1.4,
        fill: 0xffffff,
        align: 'center',
      },
    });
    t.anchor.set(0.5);
    t.position.set(0, 0);
    return t;
  }

  /**
   * 繪製寶石主體（彩色圓形）。
   */
  private drawBody(colour: GemColour | null): Graphics {
    const g = new Graphics();
    const fillColour = colour ? GEM_COLOURS[colour] : COLOUR_GEM_HUE;

    g.circle(0, 0, GEM_RADIUS);
    g.fill({ color: fillColour, alpha: 1 });

    // 內圈高光
    const highlightRadius = GEM_RADIUS * 0.55;
    const highlightColour = colour ? GEM_GLOW_COLOURS[colour] : 0xffffff;
    g.circle(-GEM_RADIUS * 0.15, -GEM_RADIUS * 0.15, highlightRadius);
    g.fill({ color: highlightColour, alpha: 0.3 });

    // Colour Gem 額外彩虹邊框
    if (!colour) {
      g.circle(0, 0, GEM_RADIUS + 2);
      g.stroke({ color: 0xffffff, width: 3, alpha: 0.7 });
    }

    return g;
  }

  /**
   * 繪製特殊寶石覆蓋層。
   */
  private drawSpecialOverlay(
    special: SpecialGemType,
    colour: GemColour | null,
  ): Graphics {
    const g = new Graphics();
    const overlaySize = CELL_SIZE * SPECIAL_OVERLAY_RATIO;
    const lineColour = 0xffffff;
    const lineAlpha = 0.9;

    switch (special) {
      case 'lineH':
        this.drawArrowH(g, overlaySize, lineColour, lineAlpha);
        break;
      case 'lineV':
        this.drawArrowV(g, overlaySize, lineColour, lineAlpha);
        break;
      case 'area':
        this.drawStar(g, overlaySize, lineColour, lineAlpha);
        break;
      case 'colour':
        this.drawRainbowRing(g, colour);
        break;
    }

    return g;
  }

  /** 水平箭頭（lineH） */
  private drawArrowH(
    g: Graphics,
    size: number,
    colour: number,
    alpha: number,
  ): void {
    const halfW = size * 0.5;
    const arrowH = size * 0.2;

    // 水平線
    g.moveTo(-halfW, 0);
    g.lineTo(halfW, 0);
    g.stroke({ color: colour, width: 2.5, alpha });

    // 右箭頭
    g.moveTo(halfW - arrowH, -arrowH);
    g.lineTo(halfW, 0);
    g.lineTo(halfW - arrowH, arrowH);
    g.stroke({ color: colour, width: 2.5, alpha });

    // 左箭頭
    g.moveTo(-halfW + arrowH, -arrowH);
    g.lineTo(-halfW, 0);
    g.lineTo(-halfW + arrowH, arrowH);
    g.stroke({ color: colour, width: 2.5, alpha });
  }

  /** 垂直箭頭（lineV） */
  private drawArrowV(
    g: Graphics,
    size: number,
    colour: number,
    alpha: number,
  ): void {
    const halfH = size * 0.5;
    const arrowW = size * 0.2;

    // 垂直線
    g.moveTo(0, -halfH);
    g.lineTo(0, halfH);
    g.stroke({ color: colour, width: 2.5, alpha });

    // 上箭頭
    g.moveTo(-arrowW, -halfH + arrowW);
    g.lineTo(0, -halfH);
    g.lineTo(arrowW, -halfH + arrowW);
    g.stroke({ color: colour, width: 2.5, alpha });

    // 下箭頭
    g.moveTo(-arrowW, halfH - arrowW);
    g.lineTo(0, halfH);
    g.lineTo(arrowW, halfH - arrowW);
    g.stroke({ color: colour, width: 2.5, alpha });
  }

  /** 星形/十字（area） */
  private drawStar(
    g: Graphics,
    size: number,
    colour: number,
    alpha: number,
  ): void {
    const r = size * 0.45;
    const points = 4;
    const innerR = r * 0.4;

    // 繪製 4 角星
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

  /** 彩虹環（colour gem） */
  private drawRainbowRing(g: Graphics, _colour: GemColour | null): void {
    const ringRadius = GEM_RADIUS + 4;
    // 多色環段
    const segmentColours = [0xff3344, 0xff8833, 0xffcc00, 0x33cc66, 0x3388ff, 0xaa44ff];
    const segmentAngle = (Math.PI * 2) / segmentColours.length;

    for (let i = 0; i < segmentColours.length; i++) {
      const startAngle = i * segmentAngle;
      const endAngle = startAngle + segmentAngle;
      g.arc(0, 0, ringRadius, startAngle, endAngle);
      g.stroke({ color: segmentColours[i], width: 3, alpha: 0.8 });
    }
  }

  /** shimmer 高光（小圓形亮點） */
  private drawShimmerHighlight(colour: GemColour | null): Graphics {
    const g = new Graphics();
    const highlightColour = colour ? GEM_GLOW_COLOURS[colour] : 0xffffff;
    const shimmerR = GEM_RADIUS * 0.3;

    g.circle(-GEM_RADIUS * 0.2, -GEM_RADIUS * 0.25, shimmerR);
    g.fill({ color: highlightColour, alpha: 0.6 });

    // 小星點
    g.circle(GEM_RADIUS * 0.15, -GEM_RADIUS * 0.1, shimmerR * 0.4);
    g.fill({ color: 0xffffff, alpha: 0.5 });

    return g;
  }
}

// ─── Shimmer 動畫工具 ──────────────────────────────────────

/**
 * 計算 idle shimmer 的 alpha 值。
 *
 * @param elapsedMs 經過時間（ms）
 * @param offset    每顆寶石的相位偏移（0..1）
 * @returns alpha 值
 */
export function computeShimmerAlpha(elapsedMs: number, offset: number): number {
  const phase = ((elapsedMs / SHIMMER_CYCLE_MS) + offset) % 1;
  // 使用 sin 波產生平滑脈動
  const t = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
  return SHIMMER_ALPHA_MIN + t * (SHIMMER_ALPHA_MAX - SHIMMER_ALPHA_MIN);
}
