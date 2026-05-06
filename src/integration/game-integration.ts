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
import type { Container } from 'pixi.js';
import type { RulesEngine, GameLoop } from '../game/runtime/game-loop';
import type { BoardRenderer } from '../rendering/board-renderer';
import type { BoardInput } from '../input/board-input';
import type { InputSystem } from '../input/input-system';
import type { ViewportManager } from '../rendering/viewport';
import type { Objective, GemColour, BlockerKind, CellPos } from '../types';
import type { ScreenRouter } from './screen-router';
import type { GameSessionController, SwapResult, ActivateResult } from '../game/runtime/game-session';
import type { BoardAnimator } from '../rendering/board-animator';
import type { BoardInteraction } from '../input/board-interaction';

// ─── Objective Text Formatting ──────────────────────────────

/** Colour name mapping for objective text */
const COLOUR_NAMES: Record<GemColour, string> = {
  R: '紅色',
  G: '綠色',
  B: '藍色',
  Y: '黃色',
  P: '紫色',
  W: '白色',
  O: '橙色',
};

/** Blocker name mapping for objective text */
const BLOCKER_NAMES: Record<BlockerKind, string> = {
  jelly: '果凍',
  lock: '鎖鏈',
  generator: '生成器',
  unstable: '不穩定方塊',
};

/**
 * Convert an Objective to its Chinese display text.
 *
 * - score  → 「達成 {target} 分」
 * - collect → 「收集 {count} 個{colour}寶石」(joined with 、)
 * - clear  → 「清除 {count} 個{blocker}」(joined with 、)
 * - drop   → 「送達 {count} 個寶石」
 * - multi  → sub-objective descriptions joined with 、
 */
export function formatObjectiveText(objective: Objective): string {
  switch (objective.type) {
    case 'score':
      return `達成 ${objective.target} 分`;
    case 'collect':
      return objective.target
        .map((t) => `收集 ${t.count} 個${COLOUR_NAMES[t.colour]}寶石`)
        .join('、');
    case 'clear':
      return objective.target
        .map((t) => `清除 ${t.count} 個${BLOCKER_NAMES[t.blocker]}`)
        .join('、');
    case 'drop':
      return `送達 ${objective.target.count} 個道具`;
    case 'multi':
      return objective.objectives.map((o) => formatObjectiveText(o)).join('、');
  }
}

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

  // ─── Extracted subsystems ─────────────────────────────────
  private screenRouter: ScreenRouter | null = null;
  private activeSession: GameSessionController | null = null;
  private activeBoardAnimator: BoardAnimator | null = null;
  private activeBoardInteraction: BoardInteraction | null = null;

  // ─── Active game session (legacy — kept for GameLoop compatibility)
  private activeRulesEngine: RulesEngine | null = null;
  private activeGameLoop: GameLoop | null = null;
  private activeBoardRenderer: BoardRenderer | null = null;
  private activeBoardInput: BoardInput | null = null;
  private activeInputSystem: InputSystem | null = null;
  private activeViewportManager: ViewportManager | null = null;

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

  /** Initialize the screen router (called after app is bootstrapped) */
  private async initScreenRouter(): Promise<void> {
    const { ScreenRouter } = await import('./screen-router');
    this.screenRouter = new ScreenRouter({
      getScreenSize: () => this.getScreenSize(),
      getUiLayer: () => this.subsystems.app!.layers.uiLayer,
      transitionTo: (state) => this.transitionTo(state),
      getCurrentState: () => this.currentState,
      formatObjectiveText,
    });
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

      // 1b. Initialize screen router
      await this.initScreenRouter();

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
        void this.screenRouter!.showSplash();
        break;
      case 'menu':
        void this.screenRouter!.showMenu();
        break;
      case 'worldMap':
        void this.screenRouter!.showWorldMap(to.worldId);
        break;
      case 'levelSelect':
        void this.screenRouter!.showLevelSelect(to.worldId, to.levelId);
        break;
      case 'game':
        void this.startLevel(to.levelId, to.seed);
        break;
      case 'pause':
        void this.screenRouter!.showPause();
        break;
      case 'levelComplete':
        void this.screenRouter!.showLevelComplete(to.result);
        break;
      case 'levelFail':
        void this.screenRouter!.showLevelFail(to.result);
        break;
      case 'endless':
        this.startEndless(to.seed);
        break;
      case 'endlessEnd':
        void this.screenRouter!.showEndlessEnd(to.result);
        break;
      case 'settings':
        void this.screenRouter!.showSettings();
        break;
      case 'credits':
        void this.screenRouter!.showCredits();
        break;
    }
  }

  // ─── Screen Management ───────────────────────────────────

  // ─── Screen Management (delegated to ScreenRouter) ──────

  /** Get the current canvas dimensions */
  private getScreenSize(): { width: number; height: number } {
    const app = this.subsystems.app?.app;
    if (app) {
      return { width: app.screen.width, height: app.screen.height };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }

  private async startLevel(levelId: number, seed?: bigint): Promise<void> {
    // Tear down any existing game session
    this.teardownGameSession();
    this.screenRouter!.clearScreen();

    // Ensure level registry is loaded
    await import('../game/level/levels/index');

    const { loadLevel } = await import('../game/level/level-spec');
    const spec = loadLevel(levelId);
    if (!spec) {
      console.error(`[GameIntegration] Level ${levelId} not found`);
      this.transitionTo({ kind: 'worldMap', worldId: 1 });
      return;
    }

    // Create RNG streams and initialize board
    const { createRngStreams } = await import('../game/rules/rng');
    const gameSeed = seed ?? BigInt(Date.now());
    const rngStreams = createRngStreams(gameSeed);

    const { initBoard } = await import('../game/runtime/reshuffle');
    const board = initBoard(spec, rngStreams.boardInit);

    // --- Create Game Session Controller ---
    const { GameSessionController } = await import('../game/runtime/game-session');
    const session = new GameSessionController({ spec, seed: gameSeed, rngStreams, board });
    this.activeSession = session;

    // --- Set up rendering ---
    const appRefs = this.subsystems.app;
    if (!appRefs) return;

    const { BoardRenderer } = await import('../rendering/board-renderer');
    const boardRenderer = new BoardRenderer(appRefs.layers);
    boardRenderer.sync(board);
    this.activeBoardRenderer = boardRenderer;

    // Position the board layer using viewport
    const { ViewportManager } = await import('../rendering/viewport');
    const { CELL_SIZE } = await import('../rendering/design-tokens');
    const canvas = appRefs.app.canvas as HTMLCanvasElement;
    const viewportManager = new ViewportManager(appRefs.layers.boardLayer, canvas);
    viewportManager.start(board.width, board.height, CELL_SIZE);
    this.activeViewportManager = viewportManager;

    // Draw grid background
    await this.drawGridBackground(appRefs, board, CELL_SIZE);

    // --- Create Board Animator ---
    const { BoardAnimator } = await import('../rendering/board-animator');
    const animator = new BoardAnimator({
      boardRenderer,
      layers: appRefs.layers,
      renderer: appRefs.app.renderer,
    });
    this.activeBoardAnimator = animator;

    // --- Create Board Interaction ---
    const { getCell } = await import('../game/rules/board');
    const { BoardInteraction } = await import('../input/board-interaction');
    const interaction = new BoardInteraction({
      boardLayer: appRefs.layers.boardLayer,
      boardWidth: board.width,
      boardHeight: board.height,
      cellSize: CELL_SIZE,
      getSprite: (col, row) => boardRenderer.getSprite(col, row) || boardRenderer.getDeliverySprite(col, row),
      isStandaloneSpecial: (pos) => {
        const cell = getCell(board, pos);
        return !!(cell?.gem?.special && cell.gem.colour === null);
      },
      isProcessing: () => session.isProcessing,
    });
    this.activeBoardInteraction = interaction;

    interaction.attach({
      onSwap: async (from, to) => {
        const result = session.executeSwap(from, to);
        await animator.animateSwap(result, from, to, board);
        boardRenderer.sync(board);
        this.updateHud(hud, session, spec);

        if (result.endCondition) {
          this.emitLevelResolved(result.endCondition, 0);
        }
      },
      onActivate: async (at) => {
        const result = session.executeActivation(at);
        if (result) {
          await animator.animateActivation(result, board);
          boardRenderer.sync(board);
          this.updateHud(hud, session, spec);

          if (result.endCondition) {
            this.emitLevelResolved(result.endCondition, 0);
          }
        }
      },
      onSelectionChange: (cell) => {
        boardRenderer.setSelection(cell);
      },
    });

    // --- Create HUD ---
    const { createGameHUD } = await import('../ui/screens/game-hud');
    const { width, height } = this.getScreenSize();
    const hud = createGameHUD({
      width,
      height,
      mode: spec.constraints.timeBudget ? 'time' : 'moves',
      objective: spec.objective,
      onPause: () => this.transitionTo({ kind: 'pause', previous: this.currentState } as any),
    });
    const movesDisplay = session.movesRemaining === Infinity ? 99 : session.movesRemaining;
    hud.setMoves(movesDisplay);
    if (spec.constraints.timeBudget) {
      hud.setTime(session.timeRemaining === Infinity ? 0 : session.timeRemaining);
    }
    hud.setScore(0);
    this.updateHud(hud, session, spec);
    this.screenRouter!.clearScreen();
    this.subsystems.app?.layers.uiLayer.addChild(hud);

    // --- Wire level.resolved event ---
    const { SaveManager } = await import('../state/save-state');
    const { playLevelComplete, playLevelFail } = await import('../audio/synth-sfx');

    const unsubResolved = this.eventBus.on('level.resolved', (e) => {
      if (e.result.cleared) {
        try {
          const sm = new SaveManager();
          const save = sm.load();
          const prev = save.levels[e.result.levelId];
          save.levels[e.result.levelId] = {
            stars: Math.max(prev?.stars ?? 0, e.result.stars) as 0|1|2|3,
            highScore: Math.max(prev?.highScore ?? 0, e.result.score),
            attempts: (prev?.attempts ?? 0) + 1,
          };
          const nextLevel = e.result.levelId + 1;
          if (!save.progress.unlockedLevels.includes(nextLevel)) {
            save.progress.unlockedLevels.push(nextLevel);
          }
          save.progress.totalStars = Object.values(save.levels).reduce((s, l) => s + l.stars, 0);
          sm.save(save, true);
        } catch { /* non-critical */ }
        playLevelComplete();
      } else {
        playLevelFail();
      }

      setTimeout(() => {
        this.teardownGameSession();
        if (e.result.cleared) {
          this.transitionTo({ kind: 'levelComplete', result: e.result });
        } else {
          this.transitionTo({ kind: 'levelFail', result: e.result });
        }
      }, 1500);
    });
    this.cleanupFns.push(unsubResolved);

    // --- Create Game Loop ---
    const { GameLoop } = await import('../game/runtime/game-loop');
    const gameLoop = new GameLoop(
      // Minimal RulesEngine stub - session controller handles logic
      { advance: () => {}, board, score: 0, movesRemaining: 0, timeRemaining: 0,
        chainCount: 0, cascadeDepth: 0, resolving: false, paused: false, settled: false,
        tick: 0, intensity: 0, tracker: { isComplete: () => false, getProgress: () => 0, getDelta: () => ({ type: 'score', progress: 0 }), getSummary: () => ({ current: 0, total: 0 }) },
        tickTime: (dt: number) => { session.tickTime(dt); },
      } as any,
      {
        render: (_alpha: number) => {
          boardRenderer.update(16.67);
          animator.update(16);
          if (spec.constraints.timeBudget && session.timeRemaining !== Infinity) {
            hud.setTime(session.timeRemaining);
          }
        },
      },
      { update: () => {} },
      { tick: () => {} },
      this.eventBus,
    );
    gameLoop.start();
    this.activeGameLoop = gameLoop;
  }

  /** Update HUD from session state */
  private updateHud(hud: any, session: GameSessionController, spec: import('../game/level/level-spec').LevelSpec): void {
    hud.setScore(session.score);
    hud.setMoves(session.movesRemaining === Infinity ? 99 : session.movesRemaining);
    const state = session.getState();
    if (state.objectiveProgress.length === 1) {
      hud.setObjective(state.objectiveProgress[0].current, state.objectiveProgress[0].total);
    } else {
      hud.setObjective(state.objectiveProgress);
    }
  }

  /** Emit level.resolved event from EndCondition */
  private emitLevelResolved(endCondition: import('../game/runtime/game-session').EndCondition, chainMax: number): void {
    this.eventBus.emit({
      kind: 'level.resolved',
      result: {
        levelId: endCondition.levelId,
        cleared: endCondition.cleared,
        stars: endCondition.stars,
        score: endCondition.score,
        chainMax,
        movesRemaining: endCondition.movesRemaining,
        timeRemaining: endCondition.timeRemaining,
        specialSpawnedCount: 0,
        durationMs: 0,
      },
    });
  }

  /** Tear down the active game session */
  private teardownGameSession(): void {
    this.activeGameLoop?.stop();
    this.activeGameLoop = null;

    this.activeBoardInteraction?.detach();
    this.activeBoardInteraction = null;

    this.activeBoardAnimator?.destroy();
    this.activeBoardAnimator = null;

    this.activeBoardRenderer?.destroy();
    this.activeBoardRenderer = null;

    this.activeViewportManager?.destroy();
    this.activeViewportManager = null;

    this.activeRulesEngine = null;
    this.activeSession = null;

    // Clear board layer children and events
    if (this.subsystems.app) {
      const { boardLayer, cellLayer, gemLayer, glowLayer, specialOverlay, selectionRing } = this.subsystems.app.layers;
      boardLayer.removeAllListeners();
      boardLayer.eventMode = 'auto';
      cellLayer.removeChildren();
      gemLayer.removeChildren();
      glowLayer.removeChildren();
      specialOverlay.removeChildren();
      selectionRing.removeChildren();
    }
  }

  /** Draw a grid background for the board */
  private async drawGridBackground(
    appRefs: AppRefs,
    board: import('../game/rules/board').Board,
    cellSize: number,
  ): Promise<void> {
    const { Graphics } = await import('pixi.js');
    const grid = new Graphics();
    grid.label = 'grid-bg';

    for (let col = 0; col < board.width; col++) {
      for (let row = 0; row < board.height; row++) {
        const cell = board.cells[col][row];
        if (cell.isEmpty) continue;
        const x = col * cellSize;
        const y = row * cellSize;
        const isEven = (col + row) % 2 === 0;
        grid.rect(x, y, cellSize, cellSize);
        grid.fill({ color: isEven ? 0x1a1f3a : 0x14183a, alpha: 0.8 });
      }
    }

    appRefs.layers.cellLayer.addChild(grid);
  }

  private startEndless(seed?: bigint): void {
    // Endless mode — for now show a placeholder via game HUD
    this.startLevel(0, seed);
  }

  private updateSplashProgress(progress: number): void {
    this.screenRouter?.updateSplashProgress(progress);
  }

  // ─── Event Listeners ────────────────────────────────────

  private setupEventListeners(): void {
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
