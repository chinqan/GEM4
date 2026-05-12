import { Assets, Cache, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
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

// Atlas frame aliases — when the spritesheet atlas is loaded, Texture.from(alias)
// resolves to the atlas sub-texture. When atlas is not loaded, PixiJS falls back
// to loading individual PNGs registered under these aliases by preloadGemTextures().
const GEM_TEX_ALIASES: Record<GemColour, string> = {
  R: 'gem-tex-R',
  O: 'gem-tex-O',
  Y: 'gem-tex-Y',
  G: 'gem-tex-G',
  B: 'gem-tex-B',
  P: 'gem-tex-P',
  W: 'gem-tex-W',
};
const COLOUR_GEM_TEX_ALIAS = 'gem-tex-colour';
const BOMB_TEX_ALIAS = 'gem-tex-area';
const LINE_H_TEX_ALIAS = 'gem-tex-lineH';
const LINE_V_TEX_ALIAS = 'gem-tex-lineV';

/**
 * Preload all gem/special PNG textures so Texture.from() resolves synchronously.
 * No-op when atlas is already loaded (aliases are registered by the spritesheet).
 */
export async function preloadGemTextures(): Promise<void> {
  // If the atlas has already registered the aliases, skip individual PNG loading.
  const firstAlias = GEM_TEX_ALIASES.R;
  if (Assets.get(firstAlias)) return;

  // Fallback: load individual PNGs and register them under the alias names
  // so that Texture.from(alias) works regardless of atlas availability.
  const aliasToPng: [string, string][] = [
    ['gem-tex-R', 'assets/gems/r-base.png'],
    ['gem-tex-O', 'assets/gems/o-base.png'],
    ['gem-tex-Y', 'assets/gems/y-base.png'],
    ['gem-tex-G', 'assets/gems/g-base.png'],
    ['gem-tex-B', 'assets/gems/b-base.png'],
    ['gem-tex-P', 'assets/gems/p-base.png'],
    ['gem-tex-W', 'assets/gems/w-base.png'],
    ['gem-tex-colour', 'assets/gems/rainbow.png'],
    ['gem-tex-area', 'assets/gems/bomb.png'],
    ['gem-tex-lineH', 'assets/gems/h-line.png'],
    ['gem-tex-lineV', 'assets/gems/v-line.png'],
    ['item-water-drop', 'assets/items/water-drop.png'],
    ['item-wood-plank', 'assets/items/wood-plank.png'],
    ['item-layer1', 'assets/items/layer1.png'],
    ['item-layer2', 'assets/items/layer2.png'],
    ['item-layer3', 'assets/items/layer3.png'],
    ['blocker-lock', 'assets/blockers/lock.png'],
    ['blocker-unstable', 'assets/blockers/unstable.png'],
    ['blocker-stone', 'assets/blockers/stone.png'],
  ];

  await Promise.all(
    aliasToPng.map(([alias, path]) =>
      Assets.load({ alias, src: path }).catch(() => null),
    ),
  );

  // Also register particle texture aliases if not already present (atlas not loaded).
  // These are simple white shapes that get tinted at runtime.
  if (!Assets.get('particle-circle')) {
    const size = 16;
    const mid = size / 2;

    // Generate circle texture
    const circleCanvas = document.createElement('canvas');
    circleCanvas.width = size;
    circleCanvas.height = size;
    const cCtx = circleCanvas.getContext('2d')!;
    cCtx.fillStyle = 'white';
    cCtx.beginPath();
    cCtx.arc(mid, mid, mid - 1, 0, Math.PI * 2);
    cCtx.fill();
    const circleTex = Texture.from(circleCanvas);
    Cache.set('particle-circle', circleTex);

    // Generate diamond texture
    const diamondCanvas = document.createElement('canvas');
    diamondCanvas.width = size;
    diamondCanvas.height = size;
    const dCtx = diamondCanvas.getContext('2d')!;
    dCtx.fillStyle = 'white';
    dCtx.beginPath();
    dCtx.moveTo(mid, 1);
    dCtx.lineTo(size - 1, mid);
    dCtx.lineTo(mid, size - 1);
    dCtx.lineTo(1, mid);
    dCtx.closePath();
    dCtx.fill();
    const diamondTex = Texture.from(diamondCanvas);
    Cache.set('particle-diamond', diamondTex);

    // Generate blob texture (soft circle with radial gradient)
    const blobCanvas = document.createElement('canvas');
    blobCanvas.width = size;
    blobCanvas.height = size;
    const bCtx = blobCanvas.getContext('2d')!;
    const grad = bCtx.createRadialGradient(mid, mid, 0, mid, mid, mid - 1);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    bCtx.fillStyle = grad;
    bCtx.fillRect(0, 0, size, size);
    const blobTex = Texture.from(blobCanvas);
    Cache.set('particle-blob', blobTex);
  }
}

function buildGemSprite(path: string): Sprite {
  const tex = Texture.from(path);
  const sprite = new Sprite(tex);
  sprite.anchor.set(0.5);
  // Use slightly smaller target to avoid upscaling low-res PNGs on HiDPI
  const target = GEM_RADIUS * 2;
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
    if (special === 'area') return buildGemSprite(BOMB_TEX_ALIAS);
    if (special === 'colour') return buildGemSprite(COLOUR_GEM_TEX_ALIAS);
    if (special === 'lineH') return buildGemSprite(LINE_H_TEX_ALIAS);
    if (special === 'lineV') return buildGemSprite(LINE_V_TEX_ALIAS);
    if (colour) return buildGemSprite(GEM_TEX_ALIASES[colour]);
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
