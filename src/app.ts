import { Application } from 'pixi.js';
import { createLayerHierarchy, type LayerRefs } from './rendering/app-layers';

// ─── 型別 ──────────────────────────────────────────────────

/** Application bootstrap 設定 */
export interface AppConfig {
  /** 掛載目標容器，預設為 document.body */
  container?: HTMLElement;
  /** 背景色（hex），預設 0x0a0a1a */
  backgroundColor?: number;
  /** 是否啟用抗鋸齒，預設 true */
  antialias?: boolean;
  /** 裝置像素比，預設 Math.min(window.devicePixelRatio, 2) */
  resolution?: number;
}

/** bootstrap 回傳的應用程式參照 */
export interface AppRefs {
  /** PixiJS Application 實例 */
  app: Application;
  /** 所有渲染圖層參照 */
  layers: LayerRefs;
  /** 偵測到的渲染後端 */
  backend: 'webgpu' | 'webgl';
  /** 銷毀應用程式並清理事件監聽 */
  destroy: () => void;
}

// ─── 常數 ──────────────────────────────────────────────────

const DEFAULT_BG_COLOR = 0x0a0a1a;
const MAX_RESOLUTION = 2;

// ─── Application Bootstrap ─────────────────────────────────

/**
 * 初始化 PixiJS 8 Application。
 *
 * 1. 偵測 WebGPU 後端，若不支援則回退至 WebGL 2/1
 * 2. 建立 canvas 並掛載到指定容器
 * 3. 監聽 resize 事件，自動調整 canvas 尺寸
 * 4. 建立完整圖層階層
 */
export async function bootstrapApp(config: AppConfig = {}): Promise<AppRefs> {
  const {
    container = document.body,
    backgroundColor = DEFAULT_BG_COLOR,
    antialias = true,
    resolution = Math.min(window.devicePixelRatio, MAX_RESOLUTION),
  } = config;

  const app = new Application();

  // 優先嘗試 WebGPU，回退至 WebGL
  await app.init({
    preference: 'webgpu',
    backgroundColor,
    antialias,
    resolution,
    roundPixels: true,
    autoDensity: true,
    resizeTo: container,
  });

  // 偵測實際使用的渲染後端
  const backend = detectBackend(app);

  // 將 canvas 掛載到容器
  container.appendChild(app.canvas as HTMLCanvasElement);

  // 建立圖層階層
  const layers = createLayerHierarchy(app.stage);

  // 設定 resize 處理
  const cleanupResize = setupResizeHandler(app, container);

  // 銷毀函式
  const destroy = (): void => {
    cleanupResize();
    app.destroy(true, { children: true, texture: true });
  };

  return { app, layers, backend, destroy };
}

// ─── 後端偵測 ──────────────────────────────────────────────

/**
 * 偵測 PixiJS Application 實際使用的渲染後端。
 * PixiJS 8 的 renderer 有 type 屬性可判斷。
 */
function detectBackend(app: Application): 'webgpu' | 'webgl' {
  const renderer = app.renderer;

  // PixiJS 8: renderer constructor name 可判斷後端類型
  const ctorName = (renderer.constructor as { name?: string }).name ?? '';
  if (ctorName.toLowerCase().includes('gpu')) {
    return 'webgpu';
  }

  return 'webgl';
}

// ─── Resize 處理 ───────────────────────────────────────────

/**
 * 設定 canvas resize 處理。
 *
 * PixiJS 8 的 `resizeTo` 選項已處理基本 resize，
 * 此處額外使用 ResizeObserver 確保容器尺寸變化時也能正確更新。
 *
 * @returns 清理函式，移除所有事件監聽
 */
function setupResizeHandler(app: Application, container: HTMLElement): () => void {
  let resizeObserver: ResizeObserver | null = null;

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      app.resize();
    });
    resizeObserver.observe(container);
  } else {
    // ResizeObserver 不可用時回退至 window resize 事件
    window.addEventListener('resize', handleWindowResize);
  }

  function handleWindowResize(): void {
    app.resize();
  }

  return () => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    } else {
      window.removeEventListener('resize', handleWindowResize);
    }
  };
}
