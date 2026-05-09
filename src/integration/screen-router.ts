// ─── Screen Router ──────────────────────────────────────────
// Extracted from GameIntegration to handle all screen navigation.
// Each screen method lazily imports its UI module and mounts it.
//
// The router does NOT own state transitions — it receives them
// from the parent orchestrator (GameIntegration) and renders
// the appropriate screen.

import type { Container } from 'pixi.js';
import type { AppState } from '../state/app-state';
import type { LevelResult, EndlessResult, Objective } from '../types';
import type { LayerRefs } from '../rendering/app-layers';

// ─── Types ──────────────────────────────────────────────────

export interface ScreenRouterConfig {
  /** Get the current canvas dimensions */
  getScreenSize: () => { width: number; height: number };
  /** Get the UI layer to mount screens on */
  getUiLayer: () => Container;
  /** Trigger a state transition */
  transitionTo: (state: AppState) => void;
  /** Get the current app state */
  getCurrentState: () => AppState;
  /** Format objective text for display */
  formatObjectiveText: (objective: Objective) => string;
}

// ─── Screen Router ──────────────────────────────────────────

/**
 * Handles all screen navigation and mounting.
 *
 * Responsibilities:
 * - Lazily import and create screen UI components
 * - Mount/unmount screens on the UI layer
 * - Wire screen callbacks to state transitions
 *
 * Does NOT handle:
 * - State machine logic
 * - Game session management
 * - Asset loading
 */
export class ScreenRouter {
  private activeScreen: Container | null = null;
  private readonly config: ScreenRouterConfig;

  constructor(config: ScreenRouterConfig) {
    this.config = config;
  }

  // ─── Public API ─────────────────────────────────────────

  async showSplash(): Promise<void> {
    const { createSplashScreen } = await import('../ui/screens/splash');
    const { width, height } = this.config.getScreenSize();
    const splash = createSplashScreen({ width, height });
    splash.setLoadProgress(1);
    splash.showTapPrompt(true);
    this.setScreen(splash);

    splash.eventMode = 'static';
    splash.on('pointertap', () => {
      // Splash tap is the mandatory user gesture that unlocks AudioContext —
      // kick off SFX preload here so Howls are decoded before first gameplay.
      void import('../audio/sfx-player').then(({ preloadAllMapped }) => preloadAllMapped());
      this.config.transitionTo({ kind: 'menu' });
    });
  }

  async showMenu(): Promise<void> {
    const { createMainMenuScreen } = await import('../ui/screens/main-menu');
    const { width, height } = this.config.getScreenSize();
    const menu = createMainMenuScreen({
      width,
      height,
      endlessUnlocked: false,
      onPlay: () => this.config.transitionTo({ kind: 'worldMap', worldId: 1 }),
      onEndless: () => this.config.transitionTo({ kind: 'endless' }),
      onTestMode: () => this.config.transitionTo({ kind: 'game', levelId: -1 }),
      onSettings: () => this.config.transitionTo({ kind: 'settings', returnTo: this.config.getCurrentState() } as any),
      onCredits: () => this.config.transitionTo({ kind: 'credits' }),
    });
    this.setScreen(menu);
  }

  async showWorldMap(worldId: number): Promise<void> {
    const { createWorldMapScreen } = await import('../ui/screens/world-map');
    const { SaveManager } = await import('../state/save-state');
    const { width, height } = this.config.getScreenSize();

    const saveManager = new SaveManager();
    const save = saveManager.load();

    const levels = [];
    const startLevel = (worldId - 1) * 20 + 1;
    for (let i = 0; i < 20; i++) {
      const levelId = startLevel + i;
      const record = save.levels[levelId];
      const isUnlocked = save.progress.unlockedLevels.includes(levelId);
      const isCompleted = record && record.stars > 0;
      levels.push({
        levelId,
        state: isCompleted ? 'completed' as const
          : isUnlocked ? (i === 0 ? 'current' as const : 'unlocked' as const)
            : 'locked' as const,
        stars: (record?.stars ?? 0) as 0 | 1 | 2 | 3,
      });
    }

    const worldNames: Record<number, string> = {
      1: 'Crystal Cavern',
      2: 'Ocean Depths',
      3: 'Mystic Garden',
      4: 'Solar Temple',
    };

    const worldMap = createWorldMapScreen({
      width,
      height,
      worldId,
      worldName: worldNames[worldId] ?? `World ${worldId}`,
      levels,
      onBack: () => this.config.transitionTo({ kind: 'menu' }),
      onLevelTap: (levelId) => this.config.transitionTo({ kind: 'levelSelect', worldId, levelId }),
      onPrevWorld: worldId > 1 ? () => this.config.transitionTo({ kind: 'worldMap', worldId: worldId - 1 }) : undefined,
      onNextWorld: worldId < 4 ? () => this.config.transitionTo({ kind: 'worldMap', worldId: worldId + 1 }) : undefined,
    });
    worldMap.setWorldNavigation(worldId > 1, worldId < 4);
    this.setScreen(worldMap);
  }

  async showLevelSelect(worldId: number, levelId: number): Promise<void> {
    const { createLevelSelectCard } = await import('../ui/screens/level-select');
    const { loadLevel } = await import('../game/level/level-spec');
    const { SaveManager } = await import('../state/save-state');
    const { width, height } = this.config.getScreenSize();

    await import('../game/level/levels/index');

    const spec = loadLevel(levelId);
    const saveManager = new SaveManager();
    const save = saveManager.load();
    const record = save.levels[levelId];

    const card = createLevelSelectCard({
      width,
      height,
      data: {
        worldId,
        levelId,
        objectiveText: spec ? this.config.formatObjectiveText(spec.objective) : 'Score 1000 points',
        moveBudget: spec?.constraints.moveBudget,
        timeBudget: spec?.constraints.timeBudget,
        bestStars: (record?.stars ?? 0) as 0 | 1 | 2 | 3,
        bestScore: record?.highScore ?? 0,
        attempts: record?.attempts ?? 0,
      },
      onPlay: () => this.config.transitionTo({ kind: 'game', levelId }),
      onCancel: () => this.config.transitionTo({ kind: 'worldMap', worldId }),
    });
    this.setScreen(card);
  }

  async showPause(): Promise<void> {
    const { createPauseOverlay } = await import('../ui/screens/pause-overlay');
    const { width, height } = this.config.getScreenSize();
    const pauseState = this.config.getCurrentState() as import('../state/app-state').PauseState;
    const overlay = createPauseOverlay({
      width,
      height,
      onResume: () => this.config.transitionTo(pauseState.previous),
      onRestart: () => {
        // Restart the level (or endless) from scratch
        if (pauseState.previous.kind === 'game') {
          this.config.transitionTo({ kind: 'game', levelId: pauseState.previous.levelId });
        } else {
          this.config.transitionTo(pauseState.previous);
        }
      },
      onSettings: () => this.config.transitionTo({ kind: 'settings', returnTo: this.config.getCurrentState() } as any),
      onQuit: () => this.config.transitionTo({ kind: 'menu' }),
    });
    this.setScreen(overlay);
  }

  async showLevelComplete(result?: LevelResult): Promise<void> {
    const { createLevelCompleteScreen } = await import('../ui/screens/level-complete');
    const { loadLevel } = await import('../game/level/level-spec');
    await import('../game/level/levels/index');
    const { width, height } = this.config.getScreenSize();
    const spec = loadLevel(result?.levelId ?? 1);
    const wId = spec?.worldId ?? 1;
    const screen = createLevelCompleteScreen({
      width,
      height,
      result,
      worldId: wId,
      onNext: () => this.config.transitionTo({ kind: 'worldMap', worldId: wId }),
      onReplay: () => this.config.transitionTo({ kind: 'game', levelId: result?.levelId ?? 1 }),
      onMap: () => this.config.transitionTo({ kind: 'worldMap', worldId: wId }),
    });
    this.setScreen(screen);
  }

  async showLevelFail(result?: LevelResult): Promise<void> {
    const { createLevelFailScreen } = await import('../ui/screens/level-fail');
    const { loadLevel } = await import('../game/level/level-spec');
    await import('../game/level/levels/index');
    const { width, height } = this.config.getScreenSize();
    const spec = loadLevel(result?.levelId ?? 1);
    const wId = spec?.worldId ?? 1;
    const screen = createLevelFailScreen({
      width,
      height,
      onRetry: () => this.config.transitionTo({ kind: 'game', levelId: result?.levelId ?? 1 }),
      onMap: () => this.config.transitionTo({ kind: 'worldMap', worldId: wId }),
    });
    this.setScreen(screen);
  }

  async showEndlessEnd(result?: EndlessResult): Promise<void> {
    const { createLevelCompleteScreen } = await import('../ui/screens/level-complete');
    const { width, height } = this.config.getScreenSize();
    const screen = createLevelCompleteScreen({
      width,
      height,
      onNext: () => this.config.transitionTo({ kind: 'menu' }),
      onReplay: () => this.config.transitionTo({ kind: 'menu' }),
      onMap: () => this.config.transitionTo({ kind: 'menu' }),
    });
    this.setScreen(screen);
  }

  async showSettings(): Promise<void> {
    const { createCreditsScreen } = await import('../ui/screens/credits');
    const { width, height } = this.config.getScreenSize();
    const settingsState = this.config.getCurrentState() as import('../state/app-state').SettingsState;
    const screen = createCreditsScreen({
      width,
      height,
      onClose: () => this.config.transitionTo(settingsState.returnTo),
    });
    this.setScreen(screen);
  }

  async showCredits(): Promise<void> {
    const { createCreditsScreen } = await import('../ui/screens/credits');
    const { width, height } = this.config.getScreenSize();
    const screen = createCreditsScreen({
      width,
      height,
      onClose: () => this.config.transitionTo({ kind: 'menu' }),
    });
    this.setScreen(screen);
  }

  // Audio settings panel removed — outsourced audio is now directly integrated

  // ─── Public: Splash Progress ────────────────────────────

  updateSplashProgress(progress: number): void {
    if (this.activeScreen && 'setLoadProgress' in this.activeScreen) {
      (this.activeScreen as any).setLoadProgress(progress);
    }
  }

  // ─── Public: Cleanup ────────────────────────────────────

  clearScreen(): void {
    if (this.activeScreen) {
      const uiLayer = this.config.getUiLayer();
      if (this.activeScreen.parent === uiLayer) {
        uiLayer.removeChild(this.activeScreen);
      }
      this.activeScreen.destroy({ children: true });
      this.activeScreen = null;
    }
  }

  destroy(): void {
    this.clearScreen();
  }

  // ─── Private ────────────────────────────────────────────

  private setScreen(screen: Container): void {
    this.clearScreen();
    this.activeScreen = screen;
    this.config.getUiLayer().addChild(screen);
    // Play page transition sound
    import('../audio/sfx-player').then(({ playPageTransition }) => playPageTransition());
  }
}
