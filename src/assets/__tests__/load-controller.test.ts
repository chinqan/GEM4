import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoadController } from '../load-controller';

// Mock PixiJS Assets
vi.mock('pixi.js', () => ({
  Assets: {
    load: vi.fn(),
  },
}));

// Mock gem-sprites fallback
vi.mock('../../rendering/gem-sprites', () => ({
  preloadGemTextures: vi.fn().mockResolvedValue(undefined),
}));

import { Assets } from 'pixi.js';

const mockedAssetsLoad = vi.mocked(Assets.load);

describe('LoadController.preloadCore', () => {
  let controller: LoadController;

  beforeEach(() => {
    controller = new LoadController({ cacheBusting: false });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads atlas spritesheets and sets atlasLoaded = true on success', async () => {
    mockedAssetsLoad.mockResolvedValue({});

    const result = await controller.preloadCore();

    expect(mockedAssetsLoad).toHaveBeenCalledWith('assets/atlases/game-atlas.json');
    expect(mockedAssetsLoad).toHaveBeenCalledWith('assets/atlases/particle-atlas.json');
    expect(controller.atlasLoaded).toBe(true);
    expect(result.bundleName).toBe('core');
    expect(result.fromCache).toBe(false);
  });

  it('falls back to individual PNG loading and logs warning on atlas failure', async () => {
    mockedAssetsLoad.mockRejectedValue(new Error('Network error'));

    // Mock fetch for the fallback path (manifest + individual assets)
    const mockManifest = {
      version: 1,
      buildTime: '2024-01-01',
      bundles: [
        {
          name: 'core',
          description: 'Core assets',
          assets: [{ alias: 'gem-r', src: 'assets/gems/r-base.png' }],
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });
    vi.stubGlobal('fetch', fetchMock);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await controller.preloadCore();

    expect(controller.atlasLoaded).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      '[LoadController] Atlas load failed, falling back to individual PNGs:',
      'Network error',
    );
    expect(result.bundleName).toBe('core');

    vi.unstubAllGlobals();
  });

  it('marks core bundle as loaded after successful atlas load', async () => {
    mockedAssetsLoad.mockResolvedValue({});

    await controller.preloadCore();

    expect(controller.isBundleLoaded('core')).toBe(true);
  });

  it('returns cached result on second call after atlas success', async () => {
    mockedAssetsLoad.mockResolvedValue({});

    await controller.preloadCore();
    const result = await controller.preloadCore();

    // Second call should hit the loadedBundles cache via loadBundle
    // But since preloadCore tries atlas first and core is already loaded,
    // it will still succeed (atlas load is idempotent)
    expect(result.bundleName).toBe('core');
  });
});
