import { Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { GemColour, SpecialGemType } from '../types';
import {
  GEM_COLOURS,
  GEM_GLOW_COLOURS,
  COLOUR_GEM_HUE,
  GEM_RADIUS,
  CELL_SIZE,
  SHIMMER_CYCLE_MS,
  SHIMMER_ALPHA_MIN,
  SHIMMER_ALPHA_MAX,
} from './design-tokens';

// PNG paths (preloaded by LoadController core bundle). Using direct paths
// because LoadController currently fetches by URL and does not register
// PixiJS Assets aliases — Texture.from(url) hits the browser cache.
const GEM_TEX_PATHS: Record<GemColour, string> = {
  R: 'assets/gems/r-base.png',
  O: 'assets/gems/o-base.png',
  Y: 'assets/gems/y-base.png',
  G: 'assets/gems/g-base.png',
  B: 'assets/gems/b-base.png',
  P: 'assets/gems/p-base.png',
  W: 'assets/gems/w-base.png',
};
const COLOUR_GEM_TEX_PATH = 'assets/gems/rainbow.png';
const BOMB_TEX_PATH = 'assets/gems/bomb.png';
const LINE_H_TEX_PATH = 'assets/gems/h-line.png';
const LINE_V_TEX_PATH = 'assets/gems/v-line.png';

/** Preload all gem/special PNG textures so Texture.from() resolves synchronously. */
export async function preloadGemTextures(): Promise<void> {
  const paths = [
    ...Object.values(GEM_TEX_PATHS),
    COLOUR_GEM_TEX_PATH,
    BOMB_TEX_PATH,
    LINE_H_TEX_PATH,
    LINE_V_TEX_PATH,
    'assets/items/water-drop.png',
    'assets/items/wood-plank.png',
    'assets/blockers/jelly.png',
    'assets/blockers/lock.png',
    'assets/blockers/unstable.png',
    'assets/blockers/stone.png',
  ];
  await Promise.all(paths.map((p) => Assets.load(p).catch(() => null)));
}

function buildGemSprite(path: string): Sprite {
  const tex = Texture.from(path);
  const sprite = new Sprite(tex);
  sprite.anchor.set(0.5);
  const target = GEM_RADIUS * 2 * 1.15;
  const fit = (w: number, h: number) =>
    sprite.scale.set(target / Math.max(w, h));

  if (tex.width > 1) {
    fit(tex.width, tex.height);
  } else {
    // Texture not yet loaded; assume 256, rescale on the source's update event.
    fit(256, 256);
    const onUpdate = () => {
      if (tex.width > 1) {
        fit(tex.width, tex.height);
        tex.source.off('update', onUpdate);
      }
    };
    tex.source.on('update', onUpdate);
  }
  return sprite;
}

// ─── 型別 ──────────────────────────────────────────────────

/** 寶石 sprite 容器，附帶元資料供 BoardRenderer 使用 */
export interface GemSprite extends Container {
  /** 寶石主體（Sprite for textured gems, Graphics fallback otherwise） */
  gemBody: Container;
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
 * - 特殊寶石（lineH/lineV/area/colour）：深色圓底 + 金邊 + emoji 圖示
 */
export class GemSpriteFactory {
  /**
   * 建立一個寶石 sprite。
   *
   * @param colour  寶石顏色（null 表示獨立特殊道具）
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

    // Body: textured Sprite for normal gems and bomb/rainbow specials,
    // Graphics fallback for line specials (no PNG available).
    const body = this.createBody(colour, special);
    container.addChild(body);
    container.gemBody = body;

    // gem3 supplies dedicated textures for every special — no emoji needed.
    container.specialOverlay = null;

    // gem3 textures already have baked-in highlights — skip the shimmer overlay.
    container.shimmerHighlight = null;

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

  /**
   * 依寶石類型回傳合適的主體 Container。
   * - 普通寶石 → 對應顏色 PNG
   * - area special → bomb.png
   * - colour special → 3.png（七彩）
   * - line specials → Graphics 圓底（emoji 疊在上面）
   */
  private createBody(
    colour: GemColour | null,
    special: SpecialGemType | null,
  ): Container {
    if (special === 'area') return buildGemSprite(BOMB_TEX_PATH);
    if (special === 'colour') return buildGemSprite(COLOUR_GEM_TEX_PATH);
    if (special === 'lineH') return buildGemSprite(LINE_H_TEX_PATH);
    if (special === 'lineV') return buildGemSprite(LINE_V_TEX_PATH);
    if (colour) return buildGemSprite(GEM_TEX_PATHS[colour]);
    return this.drawBody(colour);
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

    return g;
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
