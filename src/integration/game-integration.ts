// ─── Game Integration Module ────────────────────────────────
// Main integration module connecting all subsystems:
// rules + rendering + audio + input + state + UI + telemetry + debug
//
// This is the top-level orchestrator that bootstraps the game
// and wires all subsystems together via the event bus.

import type { AppState, AppStateKind } from '../state/app-state';
import type { EventBus, GameEventKind } from '../state/events';
import { EventBusImpl } from '../state/events';
import type { AppRefs } from '../app';
import type { DebugPanel } from '../debug/tweakpane';
import type { StatsPanel } from '../debug/stats';
import type { LoadController } from '../assets/load-controller';

// ─── Types ──────────────────────────────────────────────────

/** Configuration for the game integration */
export interface GameIntegrationConfig {
  /** HTML container element for the canvas */
  container: HTMLElement;
  /** Build version for cache-busting */
  buildVersion: string;
  /** Enable dev tools (Tweakpane, Stats.js) */
  enableDevtools: boolean;
}

/** All subsystem references held by the integration module */
export interface SubsystemRefs {
  /** PixiJS application and layer references */
  app: AppRefs | null;
  /** Event bus for inter-subsystem communication */
  eventBus: EventBus;
  /** Asset loading controller */
  loadController: LoadController | null;
  /** Debug panel (dev only) */
  debugPanel: DebugPanel | null;
  /** Stats panel (dev only) */
  statsPanel: StatsPanel | null;
  /** Current application state */
  currentState: AppState;
}

/** Game lifecycle phases */
export type LifecyclePhase =
  | 'uninitialized'
  | 'loading'
  | 'ready'
  | 'running'
  | 'paused'
  | 'destroyed';

// ─── Game Integration ───────────────────────────────────────

/**
 * Main game integration class.
 *
 * Responsibilities:
 * 1. Bootstrap all subsystems in correct order
 * 2. Wire event bus connections between subsystems
 * 3. Manage application lifecycle (init → load → run → destroy)
 * 4. Handle state transitions and route to appropriate screens
 * 5. Coordinate save/load operations
 */
export class GameIntegration {
  private phase: LifecyclePhase = 'uninitialized';
  private readonly config: GameIntegrationConfig;
  private readonly eventBus: EventBusImpl;
  private currentState: AppState = { kind: 'splash' };
  private subsystems: SubsystemRefs;
  private cleanupFns: Array<() => void> = [];

  constructor(config: GameIntegrationConfig) {
    this.config = config;
    this.eventBus = new EventBusImpl();
    this.subsystems = {
      app: null,
      eventBus: this.eventBus,
      loadController: null,
      debugPanel: null,
      statsPanel: null,
      currentState: this.currentState,
    };
  }

  // ─── Lifecycle ──────────────────────────────────────────

  /**
   * Initialize all subsystems and start the game.
   *
   * Boot sequence:
   * 1. Create PixiJS application
   * 2. Initialize asset loader and load manifest
   * 3. Show splash screen with loading progress
   * 4. Preload core assets
   * 5. Initialize audio system (after user gesture)
   * 6. Initialize input system
   * 7. Initialize debug tools (dev only)
   * 8. Transition to main menu
   */
  async initialize(): Promise<void> {
    if (this.phase !== 'uninitialized') {
      throw new Error(`Cannot initialize from phase: ${this.phase}`);
    }

    this.phase = 'loading';

    try {
      // 1. Bootstrap PixiJS
      const { bootstrapApp } = await import('../app');
      const appRefs = await bootstrapApp({ container: this.config.container });
      this.subsystems.app = appRefs;
      this.cleanupFns.push(() => appRefs.destroy());

      // 2. Initialize asset loader
      const { LoadController } = await import('../assets/load-controller');
      const loadController = new LoadController({
        buildVersion: this.config.buildVersion,
      });
      this.subsystems.loadController = loadController;

      // 3. Load manifest and preload core assets
      await loadController.loadManifest();
      await loadController.preloadCore((loaded, total) => {
        this.eventBus.emit({
          kind: 'app.loaded',
          ts: performance.now(),
          durationMs: 0,
        } as any);
        // Update splash screen progress
        this.updateSplashProgress(loaded / total);
      });

      // 4. Initialize debug tools (dev only)
      if (this.config.enableDevtools) {
        await this.initDebugTools();
      }

      // 5. Load state machine
      await this.loadStateMachine();

      // 6. Set up event listeners
      this.setupEventListeners();

      // 7. Set up edge case handlers
      this.setupEdgeCaseHandlers();

      this.phase = 'ready';

      // 8. Transition to menu (after user gesture on splash)
      this.transitionTo({ kind: 'menu' });

      this.phase = 'running';
    } catch (err) {
      console.error('[GameIntegration] Initialization failed:', err);
      this.phase = 'uninitialized';
      throw err;
    }
  }

  /**
   * Destroy all subsystems and clean up resources.
   */
  destroy(): void {
    this.phase = 'destroyed';

    // Run cleanup in reverse order
    for (let i = this.cleanupFns.length - 1; i >= 0; i--) {
      try {
        this.cleanupFns[i]();
      } catch (err) {
        console.warn('[GameIntegration] Cleanup error:', err);
      }
    }
    this.cleanupFns = [];

    // Clear event bus
    this.eventBus.clear();

    // Destroy debug tools
    this.subsystems.debugPanel?.destroy();
    this.subsystems.statsPanel?.destroy();
  }

  // ─── State Management ───────────────────────────────────

  /** Get current application state */
  getState(): AppState {
    return this.currentState;
  }

  /** Get current lifecycle phase */
  getPhase(): LifecyclePhase {
    return this.phase;
  }

  /**
   * Transition to a new application state.
   * Routes to the appropriate screen/handler.
   */
  transitionTo(newState: AppState): void {
    try {
      const resolvedState = GameIntegration.transitionFn(this.currentState, newState);
      const prevState = this.currentState;
      this.currentState = resolvedState;
      this.subsystems.currentState = resolvedState;

      this.onStateChanged(prevState, resolvedState);
    } catch (err) {
      console.error(
        `[GameIntegration] Invalid transition: ${this.currentState.kind} → ${newState.kind}`,
        err,
      );
    }
  }

  /** Lazily loaded transition function */
  private static transitionFn: (from: AppState, to: AppState) => AppState = () => {
    throw new Error('State machine not loaded');
  };

  /** Load the state machine module */
  private async loadStateMachine(): Promise<void> {
    const mod = await import('../state/state-machine');
    GameIntegration.transitionFn = mod.transition;
  }

  // ─── State Change Routing ───────────────────────────────

  private onStateChanged(from: AppState, to: AppState): void {
    // Update debug panel
    this.subsystems.debugPanel?.updateMetrics({ appState: to.kind });

    // Route to appropriate handler
    switch (to.kind) {
      case 'splash':
        this.showSplash();
        break;
      case 'menu':
        this.showMenu();
        break;
      case 'worldMap':
        this.showWorldMap(to.worldId);
        break;
      case 'levelSelect':
        this.showLevelSelect(to.worldId, to.levelId);
        break;
      case 'game':
        this.startLevel(to.levelId, to.seed);
        break;
      case 'pause':
        this.showPause();
        break;
      case 'levelComplete':
        this.showLevelComplete(to.result);
        break;
      case 'levelFail':
        this.showLevelFail(to.result);
        break;
      case 'endless':
        this.startEndless(to.seed);
        break;
      case 'endlessEnd':
        this.showEndlessEnd(to.result);
        break;
      case 'settings':
        this.showSettings();
        break;
      case 'credits':
        this.showCredits();
        break;
    }
  }

  // ─── Screen Handlers (stubs) ────────────────────────────

  private showSplash(): void {
    // TODO: Show splash screen with loading progress
  }

  private showMenu(): void {
    // TODO: Show main menu (Play, Endless, Settings, Credits)
  }

  private showWorldMap(worldId: number): void {
    // TODO: Show world map with level nodes
    // Lazy-load world assets if needed
    this.subsystems.loadController?.loadWorld(worldId);
  }

  private showLevelSelect(worldId: number, levelId: number): void {
    // TODO: Show level select card with objectives
  }

  private startLevel(levelId: number, seed?: bigint): void {
    // TODO: Initialize RulesEngine, start GameLoop
  }

  private showPause(): void {
    // TODO: Show pause overlay
  }

  private showLevelComplete(result?: import('../types').LevelResult): void {
    // TODO: Show level complete screen with star animation
  }

  private showLevelFail(result?: import('../types').LevelResult): void {
    // TODO: Show level fail screen
  }

  private startEndless(seed?: bigint): void {
    // TODO: Initialize endless mode
  }

  private showEndlessEnd(result?: import('../types').EndlessResult): void {
    // TODO: Show endless end screen
  }

  private showSettings(): void {
    // TODO: Show settings DOM overlay
  }

  private showCredits(): void {
    // TODO: Show credits screen
  }

  private updateSplashProgress(progress: number): void {
    // TODO: Update splash screen progress bar
  }

  // ─── Event Listeners ────────────────────────────────────

  private setupEventListeners(): void {
    // Level resolved → transition to complete/fail
    const unsubResolved = this.eventBus.on('level.resolved', (e) => {
      if (e.result.cleared) {
        this.transitionTo({ kind: 'levelComplete', result: e.result });
      } else {
        this.transitionTo({ kind: 'levelFail', result: e.result });
      }
    });
    this.cleanupFns.push(unsubResolved);

    // Intensity updates → debug panel
    const unsubIntensity = this.eventBus.on('intensity.updated', (e) => {
      this.subsystems.debugPanel?.updateMetrics({ intensity: e.value });
    });
    this.cleanupFns.push(unsubIntensity);
  }

  // ─── Edge Case Handlers ─────────────────────────────────

  private setupEdgeCaseHandlers(): void {
    // Visibility change → auto-pause
    const onVisibilityChange = (): void => {
      if (document.hidden && this.currentState.kind === 'game') {
        this.transitionTo({ kind: 'pause', previous: this.currentState as any });
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    this.cleanupFns.push(() =>
      document.removeEventListener('visibilitychange', onVisibilityChange),
    );

    // Before unload → warn if in game
    const onBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (this.currentState.kind === 'game' || this.currentState.kind === 'endless') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    this.cleanupFns.push(() =>
      window.removeEventListener('beforeunload', onBeforeUnload),
    );
  }

  // ─── Debug Tools ────────────────────────────────────────

  private async initDebugTools(): Promise<void> {
    try {
      const { createDebugPanel } = await import('../debug/tweakpane');
      const panel = await createDebugPanel();
      if (panel) {
        this.subsystems.debugPanel = panel;
        this.cleanupFns.push(() => panel.destroy());
      }
    } catch {
      // Non-critical
    }

    try {
      const { createStatsPanel } = await import('../debug/stats');
      const statsPanel = await createStatsPanel();
      if (statsPanel) {
        this.subsystems.statsPanel = statsPanel;
        this.cleanupFns.push(() => statsPanel.destroy());
      }
    } catch {
      // Non-critical
    }
  }
}

// ─── Factory ────────────────────────────────────────────────

/**
 * Create and initialize the game integration.
 * This is the main entry point for starting the game.
 */
export async function createGame(
  container: HTMLElement = document.body,
): Promise<GameIntegration> {
  const game = new GameIntegration({
    container,
    buildVersion: typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : '0.0.0',
    enableDevtools: typeof __ENABLE_DEVTOOLS__ !== 'undefined' ? __ENABLE_DEVTOOLS__ === 'true' : false,
  });

  await game.initialize();
  return game;
}

// ─── Declare globals for Vite define ────────────────────────

declare const __BUILD_VERSION__: string;
declare const __ENABLE_DEVTOOLS__: string;
