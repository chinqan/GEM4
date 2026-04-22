import { Container } from 'pixi.js';

// ─── 圖層參照介面 ──────────────────────────────────────────

/** 所有渲染圖層的參照，供其他子系統使用 */
export interface LayerRefs {
  /** 世界背景 */
  readonly background: Container;
  /** 棋盤容器（包含 cellLayer、gemLayer、glowLayer、specialOverlay、selectionRing） */
  readonly boardLayer: Container;
  /** 格線（debug 用） */
  readonly cellLayer: Container;
  /** 寶石批次渲染 */
  readonly gemLayer: Container;
  /** BlurFilter 光暈 */
  readonly glowLayer: Container;
  /** 特殊寶石動畫 */
  readonly specialOverlay: Container;
  /** 選取環 */
  readonly selectionRing: Container;
  /** 粒子效果 */
  readonly particleLayer: Container;
  /** 震波/色差 */
  readonly fxLayer: Container;
  /** HUD（分數、手數、目標進度） */
  readonly hudLayer: Container;
  /** 浮動 UI */
  readonly uiLayer: Container;
  /** dev 模式除錯圖層 */
  readonly debugLayer: Container;
}

// ─── 圖層階層建立 ──────────────────────────────────────────

/**
 * 建立完整的渲染圖層階層並掛載到 stage。
 *
 * 階層順序（由後到前）：
 *   background → boardLayer → particleLayer → fxLayer → hudLayer → uiLayer → debugLayer
 *
 * boardLayer 內部子階層：
 *   cellLayer → gemLayer → glowLayer → specialOverlay → selectionRing
 */
export function createLayerHierarchy(stage: Container): LayerRefs {
  const background = new Container();
  const boardLayer = new Container();
  const cellLayer = new Container();
  const gemLayer = new Container();
  const glowLayer = new Container();
  const specialOverlay = new Container();
  const selectionRing = new Container();
  const particleLayer = new Container();
  const fxLayer = new Container();
  const hudLayer = new Container();
  const uiLayer = new Container();
  const debugLayer = new Container();

  // 為每個圖層設定 label 以便除錯
  background.label = 'background';
  boardLayer.label = 'boardLayer';
  cellLayer.label = 'cellLayer';
  gemLayer.label = 'gemLayer';
  glowLayer.label = 'glowLayer';
  specialOverlay.label = 'specialOverlay';
  selectionRing.label = 'selectionRing';
  particleLayer.label = 'particleLayer';
  fxLayer.label = 'fxLayer';
  hudLayer.label = 'hudLayer';
  uiLayer.label = 'uiLayer';
  debugLayer.label = 'debugLayer';

  // 棋盤內部子階層
  boardLayer.addChild(cellLayer, gemLayer, glowLayer, specialOverlay, selectionRing);

  // 主舞台階層
  stage.addChild(background, boardLayer, particleLayer, fxLayer, hudLayer, uiLayer, debugLayer);

  return {
    background,
    boardLayer,
    cellLayer,
    gemLayer,
    glowLayer,
    specialOverlay,
    selectionRing,
    particleLayer,
    fxLayer,
    hudLayer,
    uiLayer,
    debugLayer,
  };
}
