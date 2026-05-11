import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Board } from '../game/rules/board';
import type { CellPos } from '../types';
import type { LayerRefs } from './app-layers';
import type { BoardSnapshot, BlockerHit } from '../game/runtime/game-session';
import { GemSpriteFactory, computeShimmerAlpha } from './gem-sprites';
import type { GemSprite } from './gem-sprites';
import {
  CELL_SIZE,
  SELECTION_RING_RATIO,
  SELECTION_PULSE_MIN,
  SELECTION_PULSE_MAX,
  SELECTION_GLOW_ALPHA_MIN,
  SELECTION_GLOW_ALPHA_MAX,
} from './design-tokens';
import type { PresetLevel } from './design-tokens';

// ─── 型別 ──────────────────────────────────────────────────

/** 選取狀態 */
export interface SelectionState {
  /** 目前選取的格子（null = 無選取） */
  selected: CellPos | null;
}

// ─── BoardRenderer ─────────────────────────────────────────

/**
 * 同步 Board 資料模型到 PixiJS 顯示物件。
 *
 * 職責：
 * 1. 依 Board 狀態建立/移除/更新寶石 sprite
 * 2. 管理選取視覺（脈衝 + 發光環）
 * 3. 管理 idle shimmer 動畫（High preset）
 */
export class BoardRenderer {
  private readonly factory = new GemSpriteFactory();
  private readonly sprites: Map<string, GemSprite> = new Map();
  private readonly deliverySprites: Map<string, Container> = new Map();
  private readonly blockerSprites: Map<string, Container> = new Map();
  private readonly blockerLayerCache: Map<string, number> = new Map();
  private readonly selectionRingGfx: Graphics;
  private readonly selectionGlowGfx: Graphics;

  /** 目前選取的格子 */
  private selectedCell: CellPos | null = null;

  /** 選取動畫累計時間（ms） */
  private selectionAnimTime = 0;

  /** shimmer 累計時間（ms） */
  private shimmerTime = 0;

  /** 目前圖形預設 */
  private preset: PresetLevel = 'high';

  /** 棋盤尺寸快取 */
  private boardWidth = 0;
  private boardHeight = 0;

  constructor(private readonly layers: LayerRefs) {
    // 建立選取環 Graphics
    this.selectionRingGfx = new Graphics();
    this.selectionRingGfx.label = 'selectionRing';
    this.selectionRingGfx.visible = false;
    this.layers.selectionRing.addChild(this.selectionRingGfx);

    // 建立選取發光 Graphics
    this.selectionGlowGfx = new Graphics();
    this.selectionGlowGfx.label = 'selectionGlow';
    this.selectionGlowGfx.visible = false;
    this.layers.glowLayer.addChild(this.selectionGlowGfx);
  }

  // ─── 公開 API ────────────────────────────────────────────

  /**
   * 設定圖形預設等級。
   */
  setPreset(preset: PresetLevel): void {
    this.preset = preset;
  }

  /**
   * 完整同步 Board 狀態到顯示層。
   *
   * 比對現有 sprite 與 Board 資料：
   * - 新增：Board 有寶石但無對應 sprite → 建立
   * - 移除：sprite 存在但 Board 無寶石 → 銷毀
   * - 更新：sprite 存在且 Board 有寶石 → 更新位置/外觀
   */
  sync(board: Board): void {
    this.boardWidth = board.width;
    this.boardHeight = board.height;

    const activeKeys = new Set<string>();

    for (let col = 0; col < board.width; col++) {
      for (let row = 0; row < board.height; row++) {
        const cell = board.cells[col][row];
        const key = cellKey(col, row);

        if (cell.isEmpty || !cell.gem) {
          // 無寶石 → 確保移除 sprite
          this.removeSprite(key);
          continue;
        }

        activeKeys.add(key);
        const gem = cell.gem;

        // 移除舊 sprite 並重建，確保顏色/特殊類型正確
        this.removeSprite(key);
        const sprite = this.factory.create(
          gem.colour,
          gem.special,
          col,
          row,
        );
        this.sprites.set(key, sprite);
        this.layers.gemLayer.addChild(sprite);
      }
    }

    // 移除不再存在的 sprite
    for (const [key, sprite] of this.sprites) {
      if (!activeKeys.has(key)) {
        this.layers.gemLayer.removeChild(sprite);
        sprite.destroy({ children: true });
        this.sprites.delete(key);
      }
    }

    // ─── 同步傳送道具 overlay ───────────────────────────────
    const activeDeliveryKeys = new Set<string>();

    for (let col = 0; col < board.width; col++) {
      for (let row = 0; row < board.height; row++) {
        const cell = board.cells[col][row];
        const key = cellKey(col, row);

        if (!cell.deliveryItem) {
          // 無傳送道具 → 移除 overlay
          this.removeDeliverySprite(key);
          continue;
        }

        activeDeliveryKeys.add(key);

        // 建立或更新 delivery overlay
        let overlay = this.deliverySprites.get(key);
        if (!overlay) {
          overlay = this.createDeliveryOverlay();
          this.deliverySprites.set(key, overlay);
          this.layers.gemLayer.addChild(overlay);
        }

        // 更新位置
        overlay.position.set(
          col * CELL_SIZE + CELL_SIZE / 2,
          row * CELL_SIZE + CELL_SIZE / 2,
        );
        overlay.visible = true;
      }
    }

    // 移除不再存在的 delivery overlay
    for (const [key, overlay] of this.deliverySprites) {
      if (!activeDeliveryKeys.has(key)) {
        this.layers.gemLayer.removeChild(overlay);
        overlay.destroy({ children: true });
        this.deliverySprites.delete(key);
      }
    }

    // ─── 同步 blocker overlay ─────────────────────────────
    const activeBlockerKeys = new Set<string>();
    for (let col = 0; col < board.width; col++) {
      for (let row = 0; row < board.height; row++) {
        const cell = board.cells[col][row];
        const key = cellKey(col, row);
        if (!cell.blocker) {
          this.removeBlockerSprite(key);
          continue;
        }
        activeBlockerKeys.add(key);
        let overlay = this.blockerSprites.get(key);

        // For jelly, recreate the sprite when the layer count changes (each layer has its own PNG)
        if (overlay && cell.blocker.kind === 'jelly') {
          if (this.blockerLayerCache.get(key) !== cell.blocker.layers) {
            this.layers.glowLayer.removeChild(overlay);
            overlay.destroy({ children: true });
            overlay = undefined;
            this.blockerSprites.delete(key);
            this.blockerLayerCache.delete(key);
          }
        }

        if (!overlay) {
          const layers = cell.blocker.kind === 'jelly' ? cell.blocker.layers : undefined;
          overlay = this.createBlockerOverlay(cell.blocker.kind, layers);
          this.blockerSprites.set(key, overlay);
          this.layers.glowLayer.addChild(overlay);
          if (cell.blocker.kind === 'jelly') {
            this.blockerLayerCache.set(key, cell.blocker.layers);
          }
        }

        overlay.alpha = 0.85;
        overlay.position.set(
          col * CELL_SIZE + CELL_SIZE / 2,
          row * CELL_SIZE + CELL_SIZE / 2,
        );
      }
    }
    for (const [key, overlay] of this.blockerSprites) {
      if (!activeBlockerKeys.has(key)) {
        this.layers.glowLayer.removeChild(overlay);
        overlay.destroy({ children: true });
        this.blockerSprites.delete(key);
      }
    }
  }

  /**
   * Sync from a lightweight board snapshot (used during cascade animation
   * to render the correct intermediate state rather than the final board state).
   */
  syncFromSnapshot(snapshot: BoardSnapshot): void {
    this.boardWidth = snapshot.width;
    this.boardHeight = snapshot.height;

    const activeKeys = new Set<string>();

    for (let col = 0; col < snapshot.width; col++) {
      for (let row = 0; row < snapshot.height; row++) {
        const cell = snapshot.cells[col][row];
        const key = cellKey(col, row);

        if (cell.isEmpty || !cell.gem) {
          this.removeSprite(key);
          continue;
        }

        activeKeys.add(key);

        // Remove old sprite and rebuild
        this.removeSprite(key);
        const sprite = this.factory.create(
          cell.gem.colour,
          cell.gem.special,
          col,
          row,
        );
        this.sprites.set(key, sprite);
        this.layers.gemLayer.addChild(sprite);
      }
    }

    // Remove sprites that no longer exist
    for (const [key, sprite] of this.sprites) {
      if (!activeKeys.has(key)) {
        this.layers.gemLayer.removeChild(sprite);
        sprite.destroy({ children: true });
        this.sprites.delete(key);
      }
    }

    // Sync delivery overlays
    const activeDeliveryKeys = new Set<string>();

    for (let col = 0; col < snapshot.width; col++) {
      for (let row = 0; row < snapshot.height; row++) {
        const cell = snapshot.cells[col][row];
        const key = cellKey(col, row);

        if (!cell.deliveryItem) {
          this.removeDeliverySprite(key);
          continue;
        }

        activeDeliveryKeys.add(key);

        let overlay = this.deliverySprites.get(key);
        if (!overlay) {
          overlay = this.createDeliveryOverlay();
          this.deliverySprites.set(key, overlay);
          this.layers.gemLayer.addChild(overlay);
        }

        overlay.position.set(
          col * CELL_SIZE + CELL_SIZE / 2,
          row * CELL_SIZE + CELL_SIZE / 2,
        );
        overlay.visible = true;
      }
    }

    for (const [key, overlay] of this.deliverySprites) {
      if (!activeDeliveryKeys.has(key)) {
        this.layers.gemLayer.removeChild(overlay);
        overlay.destroy({ children: true });
        this.deliverySprites.delete(key);
      }
    }
  }

  /**
   * Update a single cell's sprite from a board snapshot.
   * Used to show newly spawned special gems before the clear animation.
   */
  updateCell(col: number, row: number, snapshot: BoardSnapshot): void {
    const key = cellKey(col, row);
    const cell = snapshot.cells[col]?.[row];
    if (!cell) return;

    // Remove existing sprite at this position
    this.removeSprite(key);

    if (cell.gem) {
      const sprite = this.factory.create(cell.gem.colour, cell.gem.special, col, row);
      this.sprites.set(key, sprite);
      this.layers.gemLayer.addChild(sprite);
    }
  }

  /**
   * 設定選取的格子。
   *
   * @param pos 格子座標，null 表示取消選取
   */
  setSelection(pos: CellPos | null): void {
    this.selectedCell = pos;
    this.selectionAnimTime = 0;

    if (!pos) {
      this.selectionRingGfx.visible = false;
      this.selectionGlowGfx.visible = false;
      return;
    }

    // 重繪選取環
    this.redrawSelectionRing(pos);
    this.selectionRingGfx.visible = true;
    this.selectionGlowGfx.visible = true;
  }

  /**
   * 每幀更新動畫。
   *
   * @param dtMs 距上一幀的時間差（ms）
   */
  update(dtMs: number): void {
    // 選取脈衝動畫
    if (this.selectedCell) {
      this.selectionAnimTime += dtMs;
      this.updateSelectionAnimation();
    }

    // Idle shimmer（僅 High preset）
    if (this.preset === 'high') {
      this.shimmerTime += dtMs;
      this.updateShimmer();
    }
  }

  /**
   * 取得指定格子的 GemSprite（供動畫系統使用）。
   */
  getSprite(col: number, row: number): GemSprite | undefined {
    return this.sprites.get(cellKey(col, row));
  }

  /**
   * Swap the sprite-map keys for two cells. The swap-slide animation moves
   * sprites visually; this keeps the lookup table in sync so subsequent
   * getSprite(c,r) returns the sprite that's actually at that cell.
   */
  swapSpriteKeys(a: CellPos, b: CellPos): void {
    const ka = cellKey(a[0], a[1]);
    const kb = cellKey(b[0], b[1]);
    const sa = this.sprites.get(ka);
    const sb = this.sprites.get(kb);
    if (sa) this.sprites.set(kb, sa); else this.sprites.delete(kb);
    if (sb) this.sprites.set(ka, sb); else this.sprites.delete(ka);
  }

  /**
   * 取得指定格子的 delivery overlay（供動畫系統使用）。
   */
  getDeliverySprite(col: number, row: number): Container | undefined {
    return this.deliverySprites.get(cellKey(col, row));
  }

  /**
   * 即時更新 jelly blocker overlay（不重建寶石 sprite）。
   *
   * 比對 blockerLayerCache 與當前 board 狀態，
   * 重建層數已變化的 overlay，並回傳受影響位置供特效播放。
   */
  syncBlockers(board: Board): { reduced: Array<{ pos: CellPos; fromLayer: number }>; cleared: CellPos[] } {
    const reduced: Array<{ pos: CellPos; fromLayer: number }> = [];
    const cleared: CellPos[] = [];

    for (const [key, cachedLayers] of this.blockerLayerCache) {
      const [colStr, rowStr] = key.split(',');
      const col = parseInt(colStr);
      const row = parseInt(rowStr);
      const cell = board.cells[col]?.[row];
      if (!cell) continue;

      const blocker = cell.blocker;
      if (!blocker || blocker.kind !== 'jelly') {
        // Jelly fully cleared
        cleared.push([col, row]);
        this.removeBlockerSprite(key);
        this.blockerLayerCache.delete(key);
      } else if (blocker.layers !== cachedLayers) {
        // Layer reduced — record fromLayer (layer count before hit), swap overlay
        reduced.push({ pos: [col, row], fromLayer: cachedLayers });
        this.removeBlockerSprite(key);
        const overlay = this.createBlockerOverlay('jelly', blocker.layers);
        this.blockerSprites.set(key, overlay);
        this.layers.glowLayer.addChild(overlay);
        overlay.alpha = 0.85;
        overlay.position.set(col * CELL_SIZE + CELL_SIZE / 2, row * CELL_SIZE + CELL_SIZE / 2);
        this.blockerLayerCache.set(key, blocker.layers);
      }
    }

    return { reduced, cleared };
  }

  /**
   * 直接套用預先記錄的 jelly blocker 變化（不與 board 比對）。
   * 由 afterClear 呼叫，確保 overlay 在正確的 cascade step 更新。
   */
  applyBlockerHits(hits: BlockerHit[]): void {
    for (const { pos, fromLayer, cleared } of hits) {
      const [col, row] = pos;
      const key = cellKey(col, row);
      if (!this.blockerLayerCache.has(key)) continue;
      if (cleared) {
        this.removeBlockerSprite(key);
        this.blockerLayerCache.delete(key);
      } else {
        const newLayer = (fromLayer - 1) as 1 | 2 | 3;
        this.removeBlockerSprite(key);
        const overlay = this.createBlockerOverlay('jelly', newLayer);
        this.blockerSprites.set(key, overlay);
        this.layers.glowLayer.addChild(overlay);
        overlay.alpha = 0.85;
        overlay.position.set(col * CELL_SIZE + CELL_SIZE / 2, row * CELL_SIZE + CELL_SIZE / 2);
        this.blockerLayerCache.set(key, newLayer);
      }
    }
  }

  /**
   * 取得所有 sprite 的迭代器。
   */
  getAllSprites(): IterableIterator<GemSprite> {
    return this.sprites.values();
  }

  /**
   * 清除所有 sprite 與選取狀態。
   */
  clear(): void {
    for (const sprite of this.sprites.values()) {
      this.layers.gemLayer.removeChild(sprite);
      sprite.destroy({ children: true });
    }
    this.sprites.clear();
    for (const overlay of this.deliverySprites.values()) {
      this.layers.gemLayer.removeChild(overlay);
      overlay.destroy({ children: true });
    }
    this.deliverySprites.clear();
    for (const overlay of this.blockerSprites.values()) {
      this.layers.glowLayer.removeChild(overlay);
      overlay.destroy({ children: true });
    }
    this.blockerSprites.clear();
    this.blockerLayerCache.clear();
    this.setSelection(null);
    this.shimmerTime = 0;
  }

  /**
   * 銷毀 BoardRenderer，清理所有資源。
   */
  destroy(): void {
    this.clear();
    this.selectionRingGfx.destroy();
    this.selectionGlowGfx.destroy();
  }

  // ─── 內部方法 ────────────────────────────────────────────

  /** 移除單一 sprite */
  private removeSprite(key: string): void {
    const sprite = this.sprites.get(key);
    if (sprite) {
      this.layers.gemLayer.removeChild(sprite);
      sprite.destroy({ children: true });
      this.sprites.delete(key);
    }
  }

  /** 移除單一 delivery overlay */
  private removeDeliverySprite(key: string): void {
    const overlay = this.deliverySprites.get(key);
    if (overlay) {
      this.layers.gemLayer.removeChild(overlay);
      overlay.destroy({ children: true });
      this.deliverySprites.delete(key);
    }
  }

  private removeBlockerSprite(key: string): void {
    const overlay = this.blockerSprites.get(key);
    if (overlay) {
      this.layers.glowLayer.removeChild(overlay);
      overlay.destroy({ children: true });
      this.blockerSprites.delete(key);
    }
  }

  /** 建立 blocker overlay（依 kind 選 PNG；jelly 依層數選 layer1~3.png） */
  private createBlockerOverlay(kind: 'jelly' | 'lock' | 'generator' | 'unstable', layers?: number): Container {
    let path: string;
    if (kind === 'jelly') {
      const l = Math.max(1, Math.min(3, layers ?? 1));
      path = `assets/items/layer${l}.png`;
    } else if (kind === 'lock') {
      path = 'assets/blockers/lock.png';
    } else if (kind === 'unstable') {
      path = 'assets/blockers/unstable.png';
    } else {
      path = 'assets/blockers/stone.png';
    }
    const sprite = new Sprite(Texture.from(path));
    sprite.label = `blocker-${kind}`;
    sprite.anchor.set(0.5);
    const target = CELL_SIZE * 0.9;
    const fit = (w: number, h: number) =>
      sprite.scale.set(target / Math.max(w, h));
    if (sprite.texture.width > 1) {
      fit(sprite.texture.width, sprite.texture.height);
    } else {
      fit(256, 256);
      const onUpdate = () => {
        if (sprite.texture.width > 1) {
          fit(sprite.texture.width, sprite.texture.height);
          sprite.texture.source.off('update', onUpdate);
        }
      };
      sprite.texture.source.on('update', onUpdate);
    }
    return sprite;
  }

  /** 建立傳送道具 overlay（水滴貼圖） */
  private createDeliveryOverlay(): Container {
    const sprite = new Sprite(Texture.from('assets/items/water-drop.png'));
    sprite.label = 'deliveryItem';
    sprite.anchor.set(0.5);
    const target = CELL_SIZE * 0.7;
    const fit = (w: number, h: number) =>
      sprite.scale.set(target / Math.max(w, h));
    if (sprite.texture.width > 1) {
      fit(sprite.texture.width, sprite.texture.height);
    } else {
      fit(256, 256);
      const onUpdate = () => {
        if (sprite.texture.width > 1) {
          fit(sprite.texture.width, sprite.texture.height);
          sprite.texture.source.off('update', onUpdate);
        }
      };
      sprite.texture.source.on('update', onUpdate);
    }
    return sprite;
  }

  /** 更新 sprite 位置 */
  private updateSpritePosition(sprite: GemSprite, col: number, row: number): void {
    sprite.col = col;
    sprite.row = row;
    sprite.position.set(
      col * CELL_SIZE + CELL_SIZE / 2,
      row * CELL_SIZE + CELL_SIZE / 2,
    );
  }

  /** 重繪選取環與發光 */
  private redrawSelectionRing(pos: CellPos): void {
    const [col, row] = pos;
    const cx = col * CELL_SIZE + CELL_SIZE / 2;
    const cy = row * CELL_SIZE + CELL_SIZE / 2;
    const ringRadius = CELL_SIZE * SELECTION_RING_RATIO;

    // 取得選取寶石的顏色
    const sprite = this.sprites.get(cellKey(col, row));
    const glowColour = sprite
      ? this.getGemGlowColour(sprite)
      : 0xffffff;

    // 選取環
    this.selectionRingGfx.clear();
    this.selectionRingGfx.circle(cx, cy, ringRadius);
    this.selectionRingGfx.stroke({ color: glowColour, width: 3, alpha: 0.8 });

    // 發光
    this.selectionGlowGfx.clear();
    this.selectionGlowGfx.circle(cx, cy, ringRadius + 4);
    this.selectionGlowGfx.fill({ color: glowColour, alpha: 0.3 });
  }

  /** 更新選取脈衝動畫 */
  private updateSelectionAnimation(): void {
    if (!this.selectedCell) return;

    const [col, row] = this.selectedCell;
    const sprite = this.sprites.get(cellKey(col, row));

    // 脈衝頻率：使用 sin 波，週期約 800ms
    const pulsePeriod = 800;
    const t = Math.sin((this.selectionAnimTime / pulsePeriod) * Math.PI * 2) * 0.5 + 0.5;

    // 寶石縮放脈衝
    if (sprite) {
      const scale = SELECTION_PULSE_MIN + t * (SELECTION_PULSE_MAX - SELECTION_PULSE_MIN);
      sprite.scale.set(scale, scale);
    }

    // 發光環透明度脈動
    const glowAlpha =
      SELECTION_GLOW_ALPHA_MIN +
      t * (SELECTION_GLOW_ALPHA_MAX - SELECTION_GLOW_ALPHA_MIN);
    this.selectionGlowGfx.alpha = glowAlpha;

    // 選取環也微微脈動
    this.selectionRingGfx.alpha = 0.6 + t * 0.4;
  }

  /** 更新 idle shimmer */
  private updateShimmer(): void {
    for (const sprite of this.sprites.values()) {
      if (!sprite.shimmerHighlight) continue;

      // 每顆寶石依位置產生不同相位偏移
      const offset = (sprite.col * 0.13 + sprite.row * 0.17) % 1;
      const alpha = computeShimmerAlpha(this.shimmerTime, offset);
      sprite.shimmerHighlight.alpha = alpha;
    }
  }

  /** 取得寶石的 glow 顏色 */
  private getGemGlowColour(sprite: GemSprite): number {
    // 嘗試從 sprite 的 col/row 找到對應的 Board 資料
    // 這裡使用簡單的 fallback：白色
    // 實際上可以從 GEM_GLOW_COLOURS 查找
    return 0xffffff;
  }
}

// ─── 工具函式 ──────────────────────────────────────────────

/** 產生格子的唯一 key */
function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}
