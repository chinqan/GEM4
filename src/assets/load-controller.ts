// ─── LoadController ─────────────────────────────────────────
// Bundle loading system with splash preload, lazy world loading,
// retry strategy, and cache-busting support.

import { Assets } from 'pixi.js';
import type { AssetManifest, AssetBundle, BundleName } from './manifest';

// ─── Types ──────────────────────────────────────────────────

/** Loading progress callback */
export type ProgressCallback = (loaded: number, total: number, bundleName: string) => void;

/** Load result for a single bundle */
export interface BundleLoadResult {
  bundleName: string;
  assetCount: number;
  durationMs: number;
  fromCache: boolean;
}

/** Retry configuration */
export interface RetryConfig {
  /** Maximum number of retries (default: 2) */
  maxRetries: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelayMs: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier: number;
}

/** LoadController configuration */
export interface LoadControllerConfig {
  /** Path to manifest.json (default: 'assets/manifest.json') */
  manifestPath?: string;
  /** Retry configuration */
  retry?: Partial<RetryConfig>;
  /** Enable cache-busting via content hash filenames (default: true in production) */
  cacheBusting?: boolean;
  /** Build version string for cache-busting */
  buildVersion?: string;
}

// ─── Constants ──────────────────────────────────────────────

const DEFAULT_MANIFEST_PATH = 'assets/manifest.json';

const ATLAS_PATHS = [
  'assets/atlases/game-atlas.json',
  'assets/atlases/particle-atlas.json',
];

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 1000,
  backoffMultiplier: 2,
};

// ─── LoadController ─────────────────────────────────────────

/**
 * Manages asset bundle loading with:
 * - Core bundle preloading during splash screen
 * - Per-world lazy loading when entering a world
 * - Exponential backoff retry on failure
 * - Cache-busting via build version query param
 */
export class LoadController {
  private manifest: AssetManifest | null = null;
  private loadedBundles = new Set<string>();
  private loadingBundles = new Map<string, Promise<BundleLoadResult>>();
  private readonly retryConfig: RetryConfig;
  private readonly manifestPath: string;
  private readonly cacheBusting: boolean;
  private readonly buildVersion: string;
  private _atlasLoaded = false;

  constructor(config: LoadControllerConfig = {}) {
    this.manifestPath = config.manifestPath ?? DEFAULT_MANIFEST_PATH;
    this.retryConfig = { ...DEFAULT_RETRY, ...config.retry };
    this.cacheBusting = config.cacheBusting ?? true;
    this.buildVersion = config.buildVersion ?? '0.0.0';
  }

  /** Whether spritesheet atlases were successfully loaded */
  get atlasLoaded(): boolean {
    return this._atlasLoaded;
  }

  // ─── Manifest Loading ───────────────────────────────────

  /** Load and parse the asset manifest */
  async loadManifest(): Promise<AssetManifest> {
    if (this.manifest) return this.manifest;

    const url = this.resolveUrl(this.manifestPath);
    const response = await this.fetchWithRetry(url);
    this.manifest = (await response.json()) as AssetManifest;
    return this.manifest;
  }

  /** Get a bundle definition by name */
  getBundle(name: string): AssetBundle | undefined {
    return this.manifest?.bundles.find((b) => b.name === name);
  }

  // ─── Bundle Loading ─────────────────────────────────────

  /**
   * Preload the core bundle during splash screen.
   * Attempts to load spritesheet atlases first (registers all frame aliases).
   * Falls back to individual PNG loading if atlas load fails.
   */
  async preloadCore(onProgress?: ProgressCallback): Promise<BundleLoadResult> {
    const startTime = performance.now();

    try {
      // Load both atlas spritesheets — PixiJS Assets.load() with a spritesheet
      // JSON auto-loads the backing PNG and registers all frame aliases in cache.
      await Promise.all(ATLAS_PATHS.map((path) => Assets.load(path)));
      this._atlasLoaded = true;

      const durationMs = performance.now() - startTime;
      this.loadedBundles.add('core');
      return { bundleName: 'core', assetCount: ATLAS_PATHS.length, durationMs, fromCache: false };
    } catch (err) {
      console.warn(
        '[LoadController] Atlas load failed, falling back to individual PNGs:',
        err instanceof Error ? err.message : err,
      );
      // Fallback: load individual PNGs via the existing bundle mechanism
      const result = await this.loadBundle('core', onProgress);
      // Also register gem/blocker texture aliases for Texture.from() resolution
      const { preloadGemTextures } = await import('../rendering/gem-sprites');
      await preloadGemTextures();
      return result;
    }
  }

  /**
   * Lazy-load a world bundle when the player enters that world.
   * Returns immediately if already loaded.
   */
  async loadWorld(worldId: number, onProgress?: ProgressCallback): Promise<BundleLoadResult> {
    const bundleName: BundleName = `world-${worldId}`;
    return this.loadBundle(bundleName, onProgress);
  }

  /**
   * Load the audio bundle.
   */
  async loadAudio(onProgress?: ProgressCallback): Promise<BundleLoadResult> {
    return this.loadBundle('audio', onProgress);
  }

  /**
   * Load a named bundle. Deduplicates concurrent requests.
   */
  async loadBundle(
    name: string,
    onProgress?: ProgressCallback,
  ): Promise<BundleLoadResult> {
    // Already loaded
    if (this.loadedBundles.has(name)) {
      return { bundleName: name, assetCount: 0, durationMs: 0, fromCache: true };
    }

    // Already loading — return existing promise
    const existing = this.loadingBundles.get(name);
    if (existing) return existing;

    const promise = this._loadBundleImpl(name, onProgress);
    this.loadingBundles.set(name, promise);

    try {
      const result = await promise;
      this.loadedBundles.add(name);
      return result;
    } finally {
      this.loadingBundles.delete(name);
    }
  }

  /** Check if a bundle is loaded */
  isBundleLoaded(name: string): boolean {
    return this.loadedBundles.has(name);
  }

  /** Get all loaded bundle names */
  getLoadedBundles(): string[] {
    return [...this.loadedBundles];
  }

  // ─── Internal ───────────────────────────────────────────

  private async _loadBundleImpl(
    name: string,
    onProgress?: ProgressCallback,
  ): Promise<BundleLoadResult> {
    const startTime = performance.now();

    // Ensure manifest is loaded
    await this.loadManifest();

    const bundle = this.getBundle(name);
    if (!bundle) {
      throw new Error(`Bundle "${name}" not found in manifest`);
    }

    const total = bundle.assets.length;
    let loaded = 0;

    // Load each asset (in production, PixiJS Assets.loadBundle would handle this)
    // For now, we simulate loading by fetching each asset URL
    const loadPromises = bundle.assets.map(async (asset) => {
      const url = this.resolveUrl(asset.src);
      try {
        await this.fetchWithRetry(url);
      } catch {
        // Non-critical: log warning but don't fail the whole bundle
        console.warn(`[LoadController] Failed to load asset: ${asset.alias} (${url})`);
      }
      loaded++;
      onProgress?.(loaded, total, name);
    });

    await Promise.all(loadPromises);

    const durationMs = performance.now() - startTime;
    return { bundleName: name, assetCount: total, durationMs, fromCache: false };
  }

  // ─── Retry Strategy ─────────────────────────────────────

  /**
   * Fetch with exponential backoff retry.
   * Retries up to maxRetries times with increasing delay.
   */
  private async fetchWithRetry(url: string): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < this.retryConfig.maxRetries) {
          const delay =
            this.retryConfig.baseDelayMs *
            Math.pow(this.retryConfig.backoffMultiplier, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError ?? new Error(`Failed to fetch ${url}`);
  }

  // ─── Cache Busting ──────────────────────────────────────

  /**
   * Resolve a URL with optional cache-busting query parameter.
   */
  private resolveUrl(path: string): string {
    if (!this.cacheBusting) return path;
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}v=${this.buildVersion}`;
  }

  // ─── Utilities ──────────────────────────────────────────

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ─── Splash Preload Flow ────────────────────────────────────

/**
 * Execute the full splash-screen preload sequence:
 * 1. Load manifest
 * 2. Load core bundle (gems, UI, particles)
 * 3. Report progress to splash screen
 *
 * @returns Total load duration in ms
 */
export async function runSplashPreload(
  controller: LoadController,
  onProgress?: ProgressCallback,
): Promise<number> {
  const start = performance.now();

  await controller.loadManifest();
  await controller.preloadCore(onProgress);

  return performance.now() - start;
}
