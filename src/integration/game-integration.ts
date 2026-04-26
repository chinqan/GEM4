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
import type { Objective, GemColour, BlockerKind } from '../types';

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
      return `送達 ${objective.target.count} 個寶石`;
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

  // ─── Active game session ────────────────────────────────
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

    // Route to appropriate handler (fire-and-forget for async screens)
    switch (to.kind) {
      case 'splash':
        void this.showSplash();
        break;
      case 'menu':
        void this.showMenu();
        break;
      case 'worldMap':
        void this.showWorldMap(to.worldId);
        break;
      case 'levelSelect':
        void this.showLevelSelect(to.worldId, to.levelId);
        break;
      case 'game':
        void this.startLevel(to.levelId, to.seed);
        break;
      case 'pause':
        void this.showPause();
        break;
      case 'levelComplete':
        void this.showLevelComplete(to.result);
        break;
      case 'levelFail':
        void this.showLevelFail(to.result);
        break;
      case 'endless':
        this.startEndless(to.seed);
        break;
      case 'endlessEnd':
        void this.showEndlessEnd(to.result);
        break;
      case 'settings':
        void this.showSettings();
        break;
      case 'credits':
        void this.showCredits();
        break;
    }
  }

  // ─── Screen Management ───────────────────────────────────

  /** Currently displayed screen container */
  private activeScreen: Container | null = null;

  /** Remove the current screen from the UI layer */
  private clearScreen(): void {
    if (this.activeScreen && this.subsystems.app) {
      const uiLayer = this.subsystems.app.layers.uiLayer;
      if (this.activeScreen.parent === uiLayer) {
        uiLayer.removeChild(this.activeScreen);
      }
      this.activeScreen.destroy({ children: true });
      this.activeScreen = null;
    }
  }

  /** Tear down game session when leaving game state */
  private onLeavingGameState(from: AppState): void {
    if (from.kind === 'game' || from.kind === 'endless') {
      // Don't tear down if going to pause — we want to resume
      // Tear down happens explicitly when level resolves
    }
  }

  /** Set a new screen on the UI layer */
  private setScreen(screen: Container): void {
    this.clearScreen();
    this.activeScreen = screen;
    this.subsystems.app?.layers.uiLayer.addChild(screen);
  }

  /** Get the current canvas dimensions */
  private getScreenSize(): { width: number; height: number } {
    const app = this.subsystems.app?.app;
    if (app) {
      return { width: app.screen.width, height: app.screen.height };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }

  // ─── Screen Handlers ────────────────────────────────────

  private async showSplash(): Promise<void> {
    const { createSplashScreen } = await import('../ui/screens/splash');
    const { width, height } = this.getScreenSize();
    const splash = createSplashScreen({ width, height });
    splash.setLoadProgress(1);
    splash.showTapPrompt(true);
    this.setScreen(splash);

    // Tap to proceed to menu
    splash.eventMode = 'static';
    splash.on('pointertap', () => {
      this.transitionTo({ kind: 'menu' });
    });
  }

  private async showMenu(): Promise<void> {
    const { createMainMenuScreen } = await import('../ui/screens/main-menu');
    const { width, height } = this.getScreenSize();
    const menu = createMainMenuScreen({
      width,
      height,
      endlessUnlocked: false,
      onPlay: () => this.transitionTo({ kind: 'worldMap', worldId: 1 }),
      onEndless: () => this.transitionTo({ kind: 'endless' }),
      onSettings: () => this.transitionTo({ kind: 'settings', returnTo: this.currentState } as any),
      onCredits: () => this.transitionTo({ kind: 'credits' }),
    });
    this.setScreen(menu);
  }

  private async showWorldMap(worldId: number): Promise<void> {
    this.subsystems.loadController?.loadWorld(worldId);

    const { createWorldMapScreen } = await import('../ui/screens/world-map');
    const { SaveManager } = await import('../state/save-state');
    const { width, height } = this.getScreenSize();

    // 從存檔讀取關卡進度
    const saveManager = new SaveManager();
    const save = saveManager.load();

    // Generate level node data for this world (20 levels per world)
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
      onBack: () => this.transitionTo({ kind: 'menu' }),
      onLevelTap: (levelId) => this.transitionTo({ kind: 'levelSelect', worldId, levelId }),
      onPrevWorld: worldId > 1 ? () => this.transitionTo({ kind: 'worldMap', worldId: worldId - 1 }) : undefined,
      onNextWorld: worldId < 4 ? () => this.transitionTo({ kind: 'worldMap', worldId: worldId + 1 }) : undefined,
    });
    worldMap.setWorldNavigation(worldId > 1, worldId < 4);
    this.setScreen(worldMap);
  }

  private async showLevelSelect(worldId: number, levelId: number): Promise<void> {
    const { createLevelSelectCard } = await import('../ui/screens/level-select');
    const { loadLevel } = await import('../game/level/level-spec');
    const { SaveManager } = await import('../state/save-state');
    const { width, height } = this.getScreenSize();

    // Ensure level registry is loaded
    await import('../game/level/levels/index');

    // Read LevelSpec for objective and constraints
    const spec = loadLevel(levelId);

    // Read save state for player records
    const saveManager = new SaveManager();
    const save = saveManager.load();
    const record = save.levels[levelId];

    const card = createLevelSelectCard({
      width,
      height,
      data: {
        worldId,
        levelId,
        objectiveText: spec ? formatObjectiveText(spec.objective) : 'Score 1000 points',
        moveBudget: spec?.constraints.moveBudget,
        timeBudget: spec?.constraints.timeBudget,
        bestStars: (record?.stars ?? 0) as 0 | 1 | 2 | 3,
        bestScore: record?.highScore ?? 0,
        attempts: record?.attempts ?? 0,
      },
      onPlay: () => this.transitionTo({ kind: 'game', levelId }),
      onCancel: () => this.transitionTo({ kind: 'worldMap', worldId }),
    });
    this.setScreen(card);
  }

  private async startLevel(levelId: number, seed?: bigint): Promise<void> {
    // Tear down any existing game session
    this.teardownGameSession();

    // Ensure level registry is loaded
    await import('../game/level/levels/index');

    const { loadLevel } = await import('../game/level/level-spec');
    const spec = loadLevel(levelId);
    if (!spec) {
      console.error(`[GameIntegration] Level ${levelId} not found`);
      this.transitionTo({ kind: 'worldMap', worldId: 1 });
      return;
    }

    // Create RNG streams
    const { createRngStreams } = await import('../game/rules/rng');
    const gameSeed = seed ?? BigInt(Date.now());
    const rngStreams = createRngStreams(gameSeed);

    // Initialize board
    const { initBoard } = await import('../game/runtime/reshuffle');
    const board = initBoard(spec, rngStreams.boardInit);

    // Create command queue and rules engine
    const { CommandQueue, RulesEngine } = await import('../game/runtime/game-loop');
    const commandQueue = new CommandQueue();
    const rulesEngine = new RulesEngine({
      board,
      spec,
      cascadeRng: rngStreams.cascadeFill,
      eventBus: this.eventBus,
      commandQueue,
    });
    this.activeRulesEngine = rulesEngine;

    // Create board renderer
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
    await this.drawGridBackground(appRefs, board.width, board.height, CELL_SIZE);

    // Create board input
    const { BoardInput } = await import('../input/board-input');
    const boardInput = new BoardInput({
      commandQueue,
      boardWidth: board.width,
      boardHeight: board.height,
      cellSize: CELL_SIZE,
    });
    boardInput.updateViewport(viewportManager.viewport);
    boardInput.onSelectionChange = (cell) => {
      boardRenderer.setSelection(cell);
    };
    this.activeBoardInput = boardInput;

    // Use PixiJS event system on boardLayer for reliable pointer handling
    // This avoids coordinate issues with raw DOM events
    const boardLayer = appRefs.layers.boardLayer;
    boardLayer.eventMode = 'static';
    boardLayer.hitArea = {
      contains: (x: number, y: number) => {
        return x >= 0 && x < board.width * CELL_SIZE &&
               y >= 0 && y < board.height * CELL_SIZE;
      },
    };

    let tapStartCell: [number, number] | null = null;
    let selectedCell: [number, number] | null = null;

    const pixelToGrid = (localX: number, localY: number): [number, number] | null => {
      const col = Math.floor(localX / CELL_SIZE);
      const row = Math.floor(localY / CELL_SIZE);
      if (col < 0 || col >= board.width || row < 0 || row >= board.height) return null;
      return [col, row];
    };

    const isAdjacent = (a: [number, number], b: [number, number]): boolean => {
      const dc = Math.abs(a[0] - b[0]);
      const dr = Math.abs(a[1] - b[1]);
      return (dc === 1 && dr === 0) || (dc === 0 && dr === 1);
    };

    // ─── 動畫化交換流程 ──────────────────────────────────
    const { createSwapAnimation, createMatchClearAnimation,
            createCascadeDropAnimation, createSpecialActivationEffect,
            createBlastZoneOverlay } = await import('../rendering/animations');
    const { getSpecialActivationDuration } = await import('../rendering/design-tokens');
    const { ParticlePool, MergeParticleSystem } = await import('../rendering/particles');
    const { createScorePopup } = await import('../ui/juice/score-popup');
    const { getCell, cloneBoard } = await import('../game/rules/board');
    const { detectMatches } = await import('../game/rules/match-detect');
    const { applyGravity, fillFromTop } = await import('../game/rules/cascade');
    const { matchScore, specialActivationScore, comboScore } = await import('../game/rules/scoring');
    const { resolveCombo, comboKey } = await import('../game/rules/combo-matrix');
    const { activateColourGem, activateLineBomb, activateAreaBomb, processSpecialActivations } = await import('../game/rules/special-gems');
    const { CollectTracker } = await import('../game/level/objective');
    const { Howl } = await import('howler');
    const { SaveManager } = await import('../state/save-state');
    const { GEM_COLOURS } = await import('../rendering/design-tokens');
    const { playMatchSfx, playSwap, playInvalid, playCascade,
            playLevelComplete, playLevelFail, playCombo } = await import('../audio/synth-sfx');

    const mergeFx = new MergeParticleSystem(appRefs.layers.boardLayer, appRefs.app.renderer);

    // 工具：等待指定毫秒
    const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

    // 工具：並行播放一組動畫
    const playAnims = (anims: Array<{ elapsed: number; duration: number; update(dt: number): boolean; complete(): void }>) => {
      if (anims.length === 0) return Promise.resolve();
      return new Promise<void>(resolve => {
        let last = performance.now();
        // 動畫安全上限：即使每幀 16.67ms，任何動畫超過 10 秒就強制結束
        const STALL_TIMEOUT_MS = 10_000;
        let totalElapsed = 0;
        const tick = (now: number) => {
          const dt = now - last;
          last = now;
          totalElapsed += dt;
          let allDone = true;
          for (const a of anims) {
            try {
              if (!a.update(dt)) allDone = false;
            } catch (err) {
              // 單一動畫出錯不應讓整個 Promise 卡死。視為該動畫已完成。
              console.error('[playAnims] animation update threw:', err);
            }
          }
          if (allDone || totalElapsed > STALL_TIMEOUT_MS) {
            for (const a of anims) {
              try { a.complete(); } catch (err) { console.error('[playAnims] complete threw:', err); }
            }
            resolve();
          } else {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      });
    };

    // ─── Objective tracker helpers ────────────────────────────
    // 對 RulesEngine 的 tracker（含 MultiTracker 內的子 tracker）遞迴找 CollectTracker
    // 並呼叫 addCollected。配 score tracker 交由 RulesEngine.score 透過 ScoreTracker.updateScore
    // 處理，但 game-integration 直接改 rulesEngine.score，所以這裡不負責 score tracker。
    const addCollectToTracker = (colour: import('../types').GemColour, count: number): void => {
      const walk = (t: any) => {
        if (t instanceof CollectTracker) t.addCollected(colour, count);
        if (t && typeof t.getTrackers === 'function') {
          for (const sub of t.getTrackers()) walk(sub);
        }
      };
      walk(rulesEngine.tracker);
    };

    // 在清除前以座標記錄目前 board 的顏色；讓 combo / colour / bomb 路徑
    // 能在清除後仍知道原本每格是什麼顏色，用來餵給 collect tracker。
    const snapshotColoursAt = (
      cells: Array<[number, number]>,
    ): Map<string, import('../types').GemColour> => {
      const map = new Map<string, import('../types').GemColour>();
      for (const [c, r] of cells) {
        const cell = getCell(board, [c, r]);
        const g = cell?.gem;
        if (g && g.colour) map.set(`${c},${r}`, g.colour);
      }
      return map;
    };

    const recordCollectedFromSnapshot = (
      clearedCells: Array<[number, number]>,
      snapshot: Map<string, import('../types').GemColour>,
    ): void => {
      const counts = new Map<import('../types').GemColour, number>();
      for (const [c, r] of clearedCells) {
        const colour = snapshot.get(`${c},${r}`);
        if (!colour) continue;
        counts.set(colour, (counts.get(colour) ?? 0) + 1);
      }
      for (const [colour, count] of counts) addCollectToTracker(colour, count);
    };

    let isProcessing = false;

    // 同步 rulesEngine.score 到所有 ScoreTracker（含 MultiTracker 內的子 tracker）
    const syncScoreToTracker = (t: any, score: number): void => {
      if (t && typeof t.updateScore === 'function') t.updateScore(score);
      if (t && typeof t.getTrackers === 'function') {
        for (const sub of t.getTrackers()) syncScoreToTracker(sub, score);
      }
    };

    // 取得目標進度：multi 目標回傳每個子 tracker 的獨立進度，其他回傳單一進度
    const getObjectiveProgress = (): import('../ui/screens/game-hud').ObjectiveProgress[] => {
      const tracker = rulesEngine.tracker;
      if (tracker && typeof (tracker as any).getTrackers === 'function') {
        // MultiTracker：回傳每個子 tracker 的獨立 summary
        const subs = (tracker as any).getTrackers() as Array<{ getSummary(): { current: number; total: number } }>;
        return subs.map((t) => t.getSummary());
      }
      // 單一目標
      const s = tracker.getSummary();
      return [s];
    };

    const updateHudObjective = () => {
      // 先同步分數到 ScoreTracker，確保「達成分數」chip 與 SCORE 一致
      syncScoreToTracker(rulesEngine.tracker, rulesEngine.score);
      const progress = getObjectiveProgress();
      if (progress.length === 1) {
        hud.setObjective(progress[0].current, progress[0].total);
      } else {
        hud.setObjective(progress);
      }
    };

    const doSwap = async (from: [number, number], to: [number, number]) => {
      if (isProcessing || rulesEngine.settled) return;
      isProcessing = true;

      try {

      const spriteA = boardRenderer.getSprite(from[0], from[1]);
      const spriteB = boardRenderer.getSprite(to[0], to[1]);

      // ── 階段 1：Swap 滑動動畫（200ms）──
      if (spriteA && spriteB) {
        playSwap();
        await playAnims([createSwapAnimation({ spriteA, spriteB, posA: from, posB: to })]);
      }

      // 在資料層執行交換
      const cellFrom = getCell(board, from)!;
      const cellTo = getCell(board, to)!;
      if (!cellFrom.gem || !cellTo.gem) { return; }

      const tempGem = cellFrom.gem;
      cellFrom.gem = cellTo.gem;
      cellTo.gem = tempGem;

      // ── 交換類型偵測 ──
      const effectLayer = appRefs.layers.boardLayer;

      // ─── 輔助：播放一組格子的消除動畫 + 粒子 ───
      const playClearAnimsForCells = async (cells: [number, number][], chainVal: number) => {
        const anims: Array<ReturnType<typeof createMatchClearAnimation>> = [];
        for (const [c, r] of cells) {
          const spr = boardRenderer.getSprite(c, r);
          if (spr) {
            anims.push(createMatchClearAnimation(spr));
            const cl = getCell(board, [c, r]);
            if (cl?.gem?.colour) {
              const fxLevel = Math.min(chainVal - 1, 3);
              mergeFx.spawn(c * CELL_SIZE + CELL_SIZE / 2, r * CELL_SIZE + CELL_SIZE / 2, fxLevel, GEM_COLOURS[cl.gem.colour]);
            }
          }
        }
        await playAnims(anims);
      };

      // ─── 輔助：顯示加分飛字 ───
      const showScorePopup = (score: number, cells: [number, number][], chainVal: number) => {
        if (score > 0 && cells.length > 0) {
          const avgCol = cells.reduce((s, c) => s + c[0], 0) / cells.length;
          const avgRow = cells.reduce((s, c) => s + c[1], 0) / cells.length;
          const popup = createScorePopup({
            text: `+${score}`,
            x: avgCol * CELL_SIZE + CELL_SIZE / 2,
            y: avgRow * CELL_SIZE + CELL_SIZE / 2,
            colour: chainVal >= 3 ? 0xff6644 : 0xf6c453,
            fontSize: chainVal >= 2 ? 28 : 22,
          });
          appRefs.layers.boardLayer.addChild(popup.container);
        }
      };

      // ─── 輔助：顯示彩色特效文字（連鎖、特殊寶石觸發）───
      const showFlavorText = (
        text: string,
        cells: [number, number][],
        colour: number,
        fontSize: number,
        yOffsetCells = -0.6,
      ) => {
        if (cells.length === 0) return;
        const avgCol = cells.reduce((s, c) => s + c[0], 0) / cells.length;
        const avgRow = cells.reduce((s, c) => s + c[1], 0) / cells.length;
        const popup = createScorePopup({
          text,
          x: avgCol * CELL_SIZE + CELL_SIZE / 2,
          y: avgRow * CELL_SIZE + CELL_SIZE / 2 + yOffsetCells * CELL_SIZE,
          colour,
          fontSize,
          floatDistance: 80,
          duration: 1100,
        });
        appRefs.layers.boardLayer.addChild(popup.container);
      };

      const showComboChainText = (chainVal: number, cells: [number, number][]) => {
        if (chainVal < 2) return;
        // 字體：ch=2→22, ch=3→26, ch=4→30, ch=5→34, ch=6+→42（封頂）
        const fontSize = Math.min(14 + chainVal * 4, 42);
        // 顏色：連鎖越高越熱烈
        const colour =
          chainVal >= 5 ? 0xff2244
          : chainVal >= 4 ? 0xff5533
          : chainVal >= 3 ? 0xff8844
          : 0xffbb44;
        showFlavorText(`COMBO ×${chainVal}`, cells, colour, fontSize, -1.0);
      };

      const SPECIAL_FLAVOR: Record<'lineH' | 'lineV' | 'area' | 'colour' | 'combo', { text: string; colour: number }> = {
        lineH: { text: 'LINE BLAST!', colour: 0x44ddff },
        lineV: { text: 'LINE BLAST!', colour: 0x44ddff },
        area:  { text: 'AREA BOMB!', colour: 0xff9944 },
        colour:{ text: 'COLOR BURST!', colour: 0xff44ff },
        combo: { text: 'MEGA COMBO!', colour: 0xffd54a },
      };

      const showSpecialFlavor = (
        kind: 'lineH' | 'lineV' | 'area' | 'colour' | 'combo',
        cells: [number, number][],
        fontSize = 36,
      ) => {
        const { text, colour } = SPECIAL_FLAVOR[kind];
        showFlavorText(text, cells, colour, fontSize, -1.4);
      };

      // ─── 輔助：播放被動啟動動畫與計分 ───
      const handlePassiveActivations = async (
        clearedCells: [number, number][],
        chainVal: number,
        excludePositions?: Set<string>,
        specialSnapshot?: Map<string, 'lineH' | 'lineV' | 'area' | 'colour'>,
      ): Promise<[number, number][]> => {
        // 暫時移除需要排除的特殊寶石（例如剛生成的），避免被 processSpecialActivations 引爆
        const savedGems: Array<{ pos: [number, number]; gem: any }> = [];
        if (excludePositions) {
          for (const key of excludePositions) {
            const [cs, rs] = key.split(',');
            const c = parseInt(cs);
            const r = parseInt(rs);
            const cell = getCell(board, [c, r]);
            if (cell?.gem?.special) {
              savedGems.push({ pos: [c, r], gem: cell.gem });
              cell.gem = null;
            }
            // 也從快照中移除被排除的位置
            if (specialSnapshot) specialSnapshot.delete(key);
          }
        }

        // 預先抓取所有格子的 sprite 引用和顏色（processSpecialActivations 會清除 gem）
        const spriteMap = new Map<string, { sprite: any; colour: number | null }>();
        for (let c = 0; c < board.width; c++) {
          for (let r = 0; r < board.height; r++) {
            const spr = boardRenderer.getSprite(c, r);
            const cl = getCell(board, [c, r]);
            if (spr && cl?.gem) {
              spriteMap.set(`${c},${r}`, {
                sprite: spr,
                colour: cl.gem.colour ? GEM_COLOURS[cl.gem.colour] : null,
              });
            }
          }
        }

        const passiveResult = processSpecialActivations(board, clearedCells, specialSnapshot, {
          rng: rngStreams.cascadeFill,
          colours: [...spec.gems.colours],
        });

        // 還原被暫時移除的特殊寶石
        for (const { pos, gem } of savedGems) {
          const cell = getCell(board, pos);
          if (cell && !cell.gem) cell.gem = gem;
        }

        let extraCleared: [number, number][] = [];

        if (passiveResult.triggeredSpecials.length > 0) {
          // 播放啟動特效（擴展環）+ 紅色遮片標示影響區域
          const activationAnims: Array<ReturnType<typeof createSpecialActivationEffect>> = [];
          let passiveMaxDur = 0;
          for (const pos of passiveResult.triggeredSpecials) {
            const [c, r] = pos;
            const ptype = specialSnapshot?.get(`${c},${r}`) ?? 'area';
            const pdur = getSpecialActivationDuration(ptype, true);
            if (pdur > passiveMaxDur) passiveMaxDur = pdur;
            activationAnims.push(createSpecialActivationEffect(
              c * CELL_SIZE + CELL_SIZE / 2, r * CELL_SIZE + CELL_SIZE / 2, 0xffffff, effectLayer, pdur,
            ));
            showSpecialFlavor(ptype, [[c, r]], 30);
          }
          const originalSet = new Set(clearedCells.map(([c, r]) => `${c},${r}`));
          const passiveExtraCells = passiveResult.clearedCells
            .filter(([c, r]) => !originalSet.has(`${c},${r}`))
            .map(([c, r]) => [c, r] as [number, number]);
          if (passiveExtraCells.length > 0) {
            activationAnims.push(createBlastZoneOverlay(passiveExtraCells, effectLayer, passiveMaxDur));
          }
          playMatchSfx(passiveResult.clearedCells.length, chainVal);
          await playAnims(activationAnims);

          extraCleared = passiveExtraCells;

          if (extraCleared.length > 0) {
            const passiveScore = specialActivationScore(extraCleared.length, chainVal, false);
            rulesEngine.score += passiveScore;
            showScorePopup(passiveScore, extraCleared, chainVal);

            // 使用預先抓取的 sprite 引用播放消除動畫
            const clearAnims: Array<ReturnType<typeof createMatchClearAnimation>> = [];
            for (const [c, r] of extraCleared) {
              const ref = spriteMap.get(`${c},${r}`);
              if (ref) {
                clearAnims.push(createMatchClearAnimation(ref.sprite));
                if (ref.colour !== null) {
                  const fxLevel = Math.min(chainVal - 1, 3);
                  mergeFx.spawn(c * CELL_SIZE + CELL_SIZE / 2, r * CELL_SIZE + CELL_SIZE / 2, fxLevel, ref.colour);
                }
              }
            }
            await playAnims(clearAnims);
          }
        }

        return extraCleared;
      };

      // ─── 輔助：重力 + 填充 + 掉落動畫 ───
      const runGravityAndDrop = async () => {
        const gemsBefore: Map<number, Array<{ row: number; gem: typeof board.cells[0][0]['gem'] }>> = new Map();
        for (let c = 0; c < board.width; c++) {
          const colGems: Array<{ row: number; gem: typeof board.cells[0][0]['gem'] }> = [];
          for (let r = 0; r < board.height; r++) {
            const cell = board.cells[c][r];
            if (cell.gem && !cell.isEmpty) colGems.push({ row: r, gem: cell.gem });
          }
          gemsBefore.set(c, colGems);
        }

        applyGravity(board);
        fillFromTop(board, rngStreams.cascadeFill, [...spec.gems.colours]);

        const dropDistances: Map<string, number> = new Map();
        for (let c = 0; c < board.width; c++) {
          const before = gemsBefore.get(c) || [];
          const emptySlots: number[] = [];
          for (let r = 0; r < board.height; r++) {
            if (board.cells[c][r].isEmpty) continue;
            emptySlots.push(r);
          }
          const numExisting = before.length;
          const numTotal = emptySlots.length;
          const numNew = numTotal - numExisting;
          for (let i = 0; i < numExisting; i++) {
            const oldRow = before[i].row;
            const newRow = emptySlots[numNew + i];
            if (newRow !== undefined && newRow !== oldRow) dropDistances.set(`${c},${newRow}`, newRow - oldRow);
          }
          for (let i = 0; i < numNew; i++) {
            const newRow = emptySlots[i];
            // 新寶石在畫面外排隊：第 i 顆排在 row -(numNew - i)
            // 掉落距離 = newRow + numNew - i，所有新寶石同時掉、速度一致
            if (newRow !== undefined) dropDistances.set(`${c},${newRow}`, newRow + numNew - i);
          }
        }

        boardRenderer.sync(board);

        const dropAnims: Array<ReturnType<typeof createCascadeDropAnimation>> = [];
        for (const [key, dist] of dropDistances) {
          const [cs, rs] = key.split(',');
          const c = parseInt(cs);
          const r = parseInt(rs);
          const spr = boardRenderer.getSprite(c, r);
          if (!spr || dist <= 0) continue;
          const fromRow = r - dist;
          spr.position.set(c * CELL_SIZE + CELL_SIZE / 2, fromRow * CELL_SIZE + CELL_SIZE / 2);
          dropAnims.push(createCascadeDropAnimation({ sprite: spr, fromRow, toRow: r, col: c }));
        }

        if (dropAnims.length > 0) {
          await playAnims(dropAnims);
        } else {
          await wait(80);
        }
      };

      // ─── 輔助：cascade 循環 ───
      const MAX_CASCADE_LOOP_STEPS = 50;
      const runCascadeLoop = async (chainStart: number): Promise<number> => {
        let ch = chainStart;
        let steps = 0;
        let mtchs = detectMatches(board);

        while (mtchs.length > 0) {
          if (++steps > MAX_CASCADE_LOOP_STEPS) {
            console.warn('[cascade] exceeded MAX_CASCADE_LOOP_STEPS, aborting');
            break;
          }
          ch++;
          const cSet = new Set<string>();
          const cCells: [number, number][] = [];
          for (const m of mtchs) {
            for (const c of m.cells) {
              const k = `${c[0]},${c[1]}`;
              if (!cSet.has(k)) { cSet.add(k); cCells.push([c[0], c[1]]); }
            }
            addCollectToTracker(m.colour, m.cells.length);
          }

          // 先確認 spawnAt 位置，立刻賦予特殊寶石（不參與消除動畫）
          const spawnPos = new Set<string>();
          for (const m of mtchs) {
            if (m.spawnsSpecial && m.spawnAt) {
              const spKey = `${m.spawnAt[0]},${m.spawnAt[1]}`;
              spawnPos.add(spKey);
              const sc = getCell(board, m.spawnAt);
              if (sc?.gem) {
                sc.gem.special = m.spawnsSpecial;
              }
              cSet.delete(spKey);
            }
          }

          // 立刻更新 spawnAt 位置的 sprite
          if (spawnPos.size > 0) {
            boardRenderer.sync(board);
          }

          let sScore = 0;
          for (const m of mtchs) sScore += matchScore(m.shape, ch, 0);
          rulesEngine.score += sScore;

          // 對排除 spawnAt 後的 cells 播消除動畫
          const cascadeCellsToClear = cCells.filter(([c, r]) => cSet.has(`${c},${r}`));
          playMatchSfx(cascadeCellsToClear.length, ch);
          await playClearAnimsForCells(cascadeCellsToClear, ch);
          showScorePopup(sScore, cascadeCellsToClear, ch);
          showComboChainText(ch, cascadeCellsToClear);

          // ── 在清除前，啟動 match 中包含的特殊寶石（lineH/lineV/area）──
          const cascadeInMatchSpecials: [number, number][] = [];
          for (const [c, r] of cCells) {
            const k = `${c},${r}`;
            if (!cSet.has(k)) continue;
            if (spawnPos.has(k)) continue;
            const cl = getCell(board, [c, r]);
            if (cl?.gem?.special && (cl.gem.special === 'lineH' || cl.gem.special === 'lineV' || cl.gem.special === 'area' || cl.gem.special === 'colour')) {
              cascadeInMatchSpecials.push([c, r]);
            }
          }

          // 在啟動前，先快照所有 cCells 中的特殊寶石狀態（用於後續被動啟動判斷）
          const cascadeSnapshot = new Map<string, 'lineH' | 'lineV' | 'area' | 'colour'>();
          for (const [c, r] of cCells) {
            const cl = getCell(board, [c, r]);
            if (cl?.gem?.special && (cl.gem.special === 'lineH' || cl.gem.special === 'lineV' || cl.gem.special === 'area' || cl.gem.special === 'colour')) {
              if (!spawnPos.has(`${c},${r}`)) {
                cascadeSnapshot.set(`${c},${r}`, cl.gem.special);
              }
            }
          }

          for (const [sc, sr] of cascadeInMatchSpecials) {
            const sCell = getCell(board, [sc, sr]);
            if (!sCell?.gem?.special) continue;
            const sType = sCell.gem.special;

            // 暫時保護 spawnAt 位置的寶石，避免被爆炸清除
            const savedCascadeSpawnGems: Array<{ pos: [number, number]; gem: any }> = [];
            for (const spKey of spawnPos) {
              const [scs, srs] = spKey.split(',');
              const spc = parseInt(scs);
              const spr2 = parseInt(srs);
              const spCell = getCell(board, [spc, spr2]);
              if (spCell?.gem) {
                savedCascadeSpawnGems.push({ pos: [spc, spr2], gem: spCell.gem });
                spCell.gem = null;
              }
            }

            // 預先計算爆炸目標並抓取 sprite 引用（啟動後 gem 會被清空）
            let blastTargets: [number, number][] = [];
            if (sType === 'lineH') {
              for (let c = 0; c < board.width; c++) blastTargets.push([c, sr]);
            } else if (sType === 'lineV') {
              for (let r = 0; r < board.height; r++) blastTargets.push([sc, r]);
            } else {
              for (let dc = -1; dc <= 1; dc++) {
                for (let dr = -1; dr <= 1; dr++) {
                  const c = sc + dc, r = sr + dr;
                  if (c >= 0 && c < board.width && r >= 0 && r < board.height) blastTargets.push([c, r]);
                }
              }
            }
            const blastSpriteRefs: Array<{ sprite: any; col: number; row: number; colour: number | null }> = [];
            for (const [bc, br] of blastTargets) {
              // 跳過 spawnAt 位置（已被保護，不應播消除動畫）
              if (spawnPos.has(`${bc},${br}`)) continue;
              const spr = boardRenderer.getSprite(bc, br);
              const cl = getCell(board, [bc, br]);
              if (spr) {
                blastSpriteRefs.push({
                  sprite: spr, col: bc, row: br,
                  colour: cl?.gem?.colour ? GEM_COLOURS[cl.gem.colour] : null,
                });
              }
            }

            let actResult: { clearedCells: [number, number][]; triggeredSpecials: [number, number][] };

            // 在啟動前快照爆炸範圍內的特殊寶石（啟動會清除 gem）
            for (const [bc, br] of blastTargets) {
              const bk = `${bc},${br}`;
              if (!cascadeSnapshot.has(bk)) {
                const bcl = getCell(board, [bc, br]);
                if (bcl?.gem?.special && (bcl.gem.special === 'lineH' || bcl.gem.special === 'lineV' || bcl.gem.special === 'area' || bcl.gem.special === 'colour')) {
                  if (!spawnPos.has(bk)) {
                    cascadeSnapshot.set(bk, bcl.gem.special);
                  }
                }
              }
            }

            if (sType === 'lineH' || sType === 'lineV') {
              actResult = activateLineBomb(board, [sc, sr]);
            } else {
              actResult = activateAreaBomb(board, [sc, sr]);
            }

            // 還原被保護的 spawnAt 寶石
            for (const { pos, gem } of savedCascadeSpawnGems) {
              const restoreCell = getCell(board, pos);
              if (restoreCell && !restoreCell.gem) restoreCell.gem = gem;
            }

            for (const [ac, ar] of actResult.clearedCells) {
              const ak = `${ac},${ar}`;
              if (!cSet.has(ak)) { cSet.add(ak); cCells.push([ac, ar]); }
            }
            const actScore = specialActivationScore(actResult.clearedCells.length, ch, false);
            rulesEngine.score += actScore;

            // 播放啟動特效 + 紅色遮片
            const passiveCascadeDur = getSpecialActivationDuration(sType, true);
            showSpecialFlavor(sType, [[sc, sr]], 30);
            await playAnims([
              createSpecialActivationEffect(
                sc * CELL_SIZE + CELL_SIZE / 2, sr * CELL_SIZE + CELL_SIZE / 2, 0xffffff, effectLayer, passiveCascadeDur,
              ),
              createBlastZoneOverlay(
                actResult.clearedCells.map(([ac, ar]) => [ac, ar] as [number, number]),
                effectLayer,
                passiveCascadeDur,
              ),
            ]);

            // 播放消除動畫（使用預先抓取的 sprite 引用）
            playMatchSfx(actResult.clearedCells.length, ch);
            const blastClearAnims: Array<ReturnType<typeof createMatchClearAnimation>> = [];
            for (const ref of blastSpriteRefs) {
              blastClearAnims.push(createMatchClearAnimation(ref.sprite));
              if (ref.colour !== null) {
                const fxLevel = Math.min(ch - 1, 3);
                mergeFx.spawn(ref.col * CELL_SIZE + CELL_SIZE / 2, ref.row * CELL_SIZE + CELL_SIZE / 2, fxLevel, ref.colour);
              }
            }
            await playAnims(blastClearAnims);

            showScorePopup(actScore, actResult.clearedCells.map(([ac, ar]) => [ac, ar] as [number, number]), ch);
          }

          // 清除所有格子
          for (const [c, r] of cCells) {
            const k = `${c},${r}`;
            if (cSet.has(k)) { const cl = getCell(board, [c, r]); if (cl) cl.gem = null; }
          }

          // 被動啟動處理
          const actualCleared = cCells.filter(([c, r]) => cSet.has(`${c},${r}`));
          const extra = await handlePassiveActivations(actualCleared, ch, spawnPos, cascadeSnapshot);
          for (const [c, r] of extra) cSet.add(`${c},${r}`);

          await runGravityAndDrop();

          hud.setScore(rulesEngine.score);
          hud.setMoves(rulesEngine.movesRemaining === Infinity ? 99 : rulesEngine.movesRemaining);
          updateHudObjective();

          mtchs = detectMatches(board);
        }

        return ch;
      };

      let chain = 0;

      if (cellFrom.gem.special && cellTo.gem.special) {
        // ═══════════════════════════════════════════════════
        // ── Combo 路徑（兩顆特殊寶石交換）──
        // ═══════════════════════════════════════════════════
        // 在 resolveCombo 清除格子前，快照整個棋盤的特殊寶石狀態
        const comboSnapshot = new Map<string, 'lineH' | 'lineV' | 'area' | 'colour'>();
        for (let c = 0; c < board.width; c++) {
          for (let r = 0; r < board.height; r++) {
            const cl = getCell(board, [c, r]);
            if (cl?.gem?.special && (cl.gem.special === 'lineH' || cl.gem.special === 'lineV' || cl.gem.special === 'area' || cl.gem.special === 'colour')) {
              comboSnapshot.set(`${c},${r}`, cl.gem.special);
            }
          }
        }

        // 在 resolveCombo 前預先抓取所有格子的 sprite 引用和顏色
        const comboSpriteMap = new Map<string, { sprite: any; colour: number | null }>();
        for (let c = 0; c < board.width; c++) {
          for (let r = 0; r < board.height; r++) {
            const spr = boardRenderer.getSprite(c, r);
            const cl = getCell(board, [c, r]);
            if (spr && cl?.gem) {
              comboSpriteMap.set(`${c},${r}`, {
                sprite: spr,
                colour: cl.gem.colour ? GEM_COLOURS[cl.gem.colour] : null,
              });
            }
          }
        }

        // 在 resolveCombo 清除格子前先抓兩顆特殊寶石的類型（resolveCombo 會把 gem 設為 null）
        const comboTypeA = cellFrom.gem.special!;
        const comboTypeB = cellTo.gem.special!;

        // 在 resolveCombo 前快照全盤顏色，讓清除後仍能記錄哪些色被收集
        const comboAllCells: [number, number][] = [];
        for (let c = 0; c < board.width; c++) {
          for (let r = 0; r < board.height; r++) comboAllCells.push([c, r]);
        }
        const comboColourSnapshot = snapshotColoursAt(comboAllCells);

        const comboResult = resolveCombo(board, from, to, rngStreams.cascadeFill);
        if (!comboResult || comboResult.clearedCells.length === 0) {
          cellTo.gem = cellFrom.gem;
          cellFrom.gem = tempGem;
          playInvalid();
          boardRenderer.sync(board);
          return;
        }

        rulesEngine.movesRemaining--;
        chain = 1;

        const cType = comboKey(comboTypeA, comboTypeB);
        const comboPoints = cType ? comboScore(cType, chain) : 0;
        rulesEngine.score += comboPoints;

        playCombo();
        const comboClearedCells = comboResult.clearedCells.map(([c, r]) => [c, r] as [number, number]);
        recordCollectedFromSnapshot(comboClearedCells, comboColourSnapshot);
        playMatchSfx(comboClearedCells.length, chain);

        // Combo 啟動：在兩顆特殊寶石的中點播放擴張光環 + 紅色遮片，全程 ~1100ms
        const comboDur = getSpecialActivationDuration('combo', false);
        const comboCx = ((from[0] + to[0]) / 2) * CELL_SIZE + CELL_SIZE / 2;
        const comboCy = ((from[1] + to[1]) / 2) * CELL_SIZE + CELL_SIZE / 2;
        showSpecialFlavor('combo', [from, to], 44);
        await playAnims([
          createSpecialActivationEffect(comboCx, comboCy, 0xffffff, effectLayer, comboDur),
          createBlastZoneOverlay(comboClearedCells, effectLayer, comboDur),
        ]);

        // 使用預先抓取的 sprite 引用播放消除動畫（含粒子）
        {
          const comboClearAnims: Array<ReturnType<typeof createMatchClearAnimation>> = [];
          for (const [c, r] of comboClearedCells) {
            const ref = comboSpriteMap.get(`${c},${r}`);
            if (ref) {
              comboClearAnims.push(createMatchClearAnimation(ref.sprite));
              if (ref.colour !== null) {
                const fxLevel = Math.min(chain - 1, 3);
                mergeFx.spawn(c * CELL_SIZE + CELL_SIZE / 2, r * CELL_SIZE + CELL_SIZE / 2, fxLevel, ref.colour);
              }
            }
          }
          await playAnims(comboClearAnims);
        }
        showScorePopup(comboPoints, comboClearedCells, chain);

        // 排除 combo 本身的兩顆特殊寶石：它們已被 resolveCombo 顯式啟動，
        // 不應再被 processSpecialActivations 以被動觸發身份重跑一次。
        const comboExclude = new Set<string>([
          `${from[0]},${from[1]}`,
          `${to[0]},${to[1]}`,
        ]);
        await handlePassiveActivations(comboClearedCells, chain, comboExclude, comboSnapshot);

        boardRenderer.sync(board);
        await runGravityAndDrop();

        hud.setScore(rulesEngine.score);
        hud.setMoves(rulesEngine.movesRemaining === Infinity ? 99 : rulesEngine.movesRemaining);
        updateHudObjective();

        chain = await runCascadeLoop(chain);

      } else if (
        (cellFrom.gem.special === 'colour' && cellTo.gem.colour !== null) ||
        (cellTo.gem.special === 'colour' && cellFrom.gem.colour !== null)
      ) {
        // ═══════════════════════════════════════════════════
        // ── Colour Gem 路徑 ──
        // ═══════════════════════════════════════════════════
        const colourGemPos: [number, number] = cellFrom.gem.special === 'colour' ? from : to;
        const normalPos: [number, number] = cellFrom.gem.special === 'colour' ? to : from;
        const normalCell = getCell(board, normalPos)!;
        const targetColour = normalCell.gem!.colour!;

        rulesEngine.movesRemaining--;
        chain = 1;

        // 在 activateColourGem 清除格子前，快照特殊寶石狀態
        const colourSnapshot = new Map<string, 'lineH' | 'lineV' | 'area' | 'colour'>();
        for (let c = 0; c < board.width; c++) {
          for (let r = 0; r < board.height; r++) {
            const cl = getCell(board, [c, r]);
            if (cl?.gem?.special && (cl.gem.special === 'lineH' || cl.gem.special === 'lineV' || cl.gem.special === 'area' || cl.gem.special === 'colour')) {
              colourSnapshot.set(`${c},${r}`, cl.gem.special);
            }
          }
        }

        // 在 activateColourGem 前預先抓取所有格子的 sprite 引用和顏色
        const colourSpriteMap = new Map<string, { sprite: any; colour: number | null }>();
        for (let c = 0; c < board.width; c++) {
          for (let r = 0; r < board.height; r++) {
            const spr = boardRenderer.getSprite(c, r);
            const cl = getCell(board, [c, r]);
            if (spr && cl?.gem) {
              colourSpriteMap.set(`${c},${r}`, {
                sprite: spr,
                colour: cl.gem.colour ? GEM_COLOURS[cl.gem.colour] : null,
              });
            }
          }
        }

        // 在 activateColourGem 前快照全盤顏色
        const colourAllCells: [number, number][] = [];
        for (let c = 0; c < board.width; c++) {
          for (let r = 0; r < board.height; r++) colourAllCells.push([c, r]);
        }
        const colourColourSnapshot = snapshotColoursAt(colourAllCells);

        const colourResult = activateColourGem(board, colourGemPos, targetColour);
        const colourClearedCells = colourResult.clearedCells.map(([c, r]) => [c, r] as [number, number]);
        recordCollectedFromSnapshot(colourClearedCells, colourColourSnapshot);

        const activationPoints = specialActivationScore(colourClearedCells.length, chain, true);
        rulesEngine.score += activationPoints;

        const [cgc, cgr] = colourGemPos;
        const colourDur = getSpecialActivationDuration('colour', false);
        showSpecialFlavor('colour', [[cgc, cgr]], 40);
        await playAnims([
          createSpecialActivationEffect(
            cgc * CELL_SIZE + CELL_SIZE / 2, cgr * CELL_SIZE + CELL_SIZE / 2, 0xffffff, effectLayer, colourDur,
          ),
          createBlastZoneOverlay(colourClearedCells, effectLayer, colourDur),
        ]);

        // 使用預先抓取的 sprite 引用播放消除動畫（含粒子）
        playMatchSfx(colourClearedCells.length, chain);
        {
          const colourClearAnims: Array<ReturnType<typeof createMatchClearAnimation>> = [];
          for (const [c, r] of colourClearedCells) {
            const ref = colourSpriteMap.get(`${c},${r}`);
            if (ref) {
              colourClearAnims.push(createMatchClearAnimation(ref.sprite));
              if (ref.colour !== null) {
                const fxLevel = Math.min(chain - 1, 3);
                mergeFx.spawn(c * CELL_SIZE + CELL_SIZE / 2, r * CELL_SIZE + CELL_SIZE / 2, fxLevel, ref.colour);
              }
            }
          }
          await playAnims(colourClearAnims);
        }
        showScorePopup(activationPoints, colourClearedCells, chain);

        // 排除 Colour Gem 本身：它已被 activateColourGem 以玩家指定色顯式啟動，
        // 不應再被被動觸發隨機挑一色多清一次。
        const colourExclude = new Set<string>([`${colourGemPos[0]},${colourGemPos[1]}`]);
        await handlePassiveActivations(colourClearedCells, chain, colourExclude, colourSnapshot);

        boardRenderer.sync(board);
        await runGravityAndDrop();

        hud.setScore(rulesEngine.score);
        hud.setMoves(rulesEngine.movesRemaining === Infinity ? 99 : rulesEngine.movesRemaining);
        updateHudObjective();

        chain = await runCascadeLoop(chain);

      } else {
        // ═══════════════════════════════════════════════════
        // ── 普通消除路徑（含 Line/Area Bomb 交換）──
        // 先偵測基本 match，有 match 則先處理消除；
        // 若無 match 但其中一顆是 Line/Area Bomb，則直接啟動炸彈。
        // ═══════════════════════════════════════════════════
        let matches = detectMatches(board, { swapPos: to, swapPos2: from });

        // 判斷是否有 Line/Area Bomb 參與交換
        const swappedSpecialPos: [number, number] | null = (() => {
          const fGem = getCell(board, from)?.gem;
          const tGem = getCell(board, to)?.gem;
          if (fGem?.special && (fGem.special === 'lineH' || fGem.special === 'lineV' || fGem.special === 'area')) return from;
          if (tGem?.special && (tGem.special === 'lineH' || tGem.special === 'lineV' || tGem.special === 'area')) return to;
          return null;
        })();

        if (matches.length === 0 && !swappedSpecialPos) {
          // 無 match 且無特殊寶石 → 無效交換
          cellTo.gem = cellFrom.gem;
          cellFrom.gem = tempGem;
          playInvalid();
          boardRenderer.sync(board);
          return;
        }

        rulesEngine.movesRemaining--;

        if (matches.length === 0 && swappedSpecialPos) {
          // ── 無 match 但有 Line/Area Bomb → 直接啟動炸彈 ──
          const specialCell = getCell(board, swappedSpecialPos)!;
          const specialType = specialCell.gem!.special! as 'lineH' | 'lineV' | 'area';
          chain = 1;

          // 先計算會被清除的格子，並預先抓取 sprite 引用（啟動後 gem 會被清空）
          let targetCells: [number, number][] = [];
          const [sCol, sRow] = swappedSpecialPos;
          if (specialType === 'lineH') {
            for (let c = 0; c < board.width; c++) targetCells.push([c, sRow]);
          } else if (specialType === 'lineV') {
            for (let r = 0; r < board.height; r++) targetCells.push([sCol, r]);
          } else {
            for (let dc = -1; dc <= 1; dc++) {
              for (let dr = -1; dr <= 1; dr++) {
                const c = sCol + dc, r = sRow + dr;
                if (c >= 0 && c < board.width && r >= 0 && r < board.height) targetCells.push([c, r]);
              }
            }
          }

          // 預先抓取 sprite 引用和顏色（用於消除動畫和粒子）
          const spriteRefs: Array<{ sprite: any; col: number; row: number; colour: number | null }> = [];
          for (const [c, r] of targetCells) {
            const spr = boardRenderer.getSprite(c, r);
            const cl = getCell(board, [c, r]);
            if (spr) {
              spriteRefs.push({
                sprite: spr, col: c, row: r,
                colour: cl?.gem?.colour ? GEM_COLOURS[cl.gem.colour] : null,
              });
            }
          }

          // 在啟動前快照特殊寶石狀態（啟動會清除 gem）
          const directSnapshot = new Map<string, 'lineH' | 'lineV' | 'area' | 'colour'>();
          for (const [c, r] of targetCells) {
            const cl = getCell(board, [c, r]);
            if (cl?.gem?.special && (cl.gem.special === 'lineH' || cl.gem.special === 'lineV' || cl.gem.special === 'area' || cl.gem.special === 'colour')) {
              directSnapshot.set(`${c},${r}`, cl.gem.special);
            }
          }

          // 啟動前快照目標區的顏色
          const directColourSnapshot = snapshotColoursAt(targetCells);

          // 啟動特殊寶石（修改 board 資料）
          let activationResult: { clearedCells: [number, number][]; triggeredSpecials: [number, number][] };
          if (specialType === 'lineH' || specialType === 'lineV') {
            activationResult = activateLineBomb(board, swappedSpecialPos);
          } else {
            activationResult = activateAreaBomb(board, swappedSpecialPos);
          }

          const activatedCells = activationResult.clearedCells.map(([c, r]) => [c, r] as [number, number]);
          recordCollectedFromSnapshot(activatedCells, directColourSnapshot);
          const actScore = specialActivationScore(activatedCells.length, chain, false);
          rulesEngine.score += actScore;

          // 播放啟動特效（擴展環）+ 紅色遮片標示影響區域
          const directDur = getSpecialActivationDuration(specialType, false);
          showSpecialFlavor(specialType, [[sCol, sRow]], 36);
          await playAnims([
            createSpecialActivationEffect(
              sCol * CELL_SIZE + CELL_SIZE / 2, sRow * CELL_SIZE + CELL_SIZE / 2, 0xffffff, effectLayer, directDur,
            ),
            createBlastZoneOverlay(activatedCells, effectLayer, directDur),
          ]);

          // 播放消除動畫（使用預先抓取的 sprite 引用）
          playMatchSfx(activatedCells.length, chain);
          const directClearAnims: Array<ReturnType<typeof createMatchClearAnimation>> = [];
          for (const ref of spriteRefs) {
            directClearAnims.push(createMatchClearAnimation(ref.sprite));
            if (ref.colour !== null) {
              const fxLevel = Math.min(chain - 1, 3);
              mergeFx.spawn(ref.col * CELL_SIZE + CELL_SIZE / 2, ref.row * CELL_SIZE + CELL_SIZE / 2, fxLevel, ref.colour);
            }
          }
          await playAnims(directClearAnims);
          showScorePopup(actScore, activatedCells, chain);

          // 被動啟動處理（排除 swap 直接啟動的那顆炸彈，避免被再次當被動觸發）
          const directExclude = new Set<string>([
            `${swappedSpecialPos[0]},${swappedSpecialPos[1]}`,
          ]);
          await handlePassiveActivations(activatedCells, chain, directExclude, directSnapshot);

          boardRenderer.sync(board);
          await runGravityAndDrop();

          hud.setScore(rulesEngine.score);
          hud.setMoves(rulesEngine.movesRemaining === Infinity ? 99 : rulesEngine.movesRemaining);
          updateHudObjective();

          chain = await runCascadeLoop(chain);

        } else {
          // ── 有 match → 先處理基本消除（特殊寶石在 match 中會被 inMatchSpecials 處理）──

          let normalSteps = 0;
          while (matches.length > 0) {
            if (++normalSteps > MAX_CASCADE_LOOP_STEPS) {
              console.warn('[normal-cascade] exceeded MAX_CASCADE_LOOP_STEPS, aborting');
              break;
            }
            chain++;

            const clearedSet = new Set<string>();
            const clearedCells: [number, number][] = [];
            for (const m of matches) {
              for (const c of m.cells) {
                const k = `${c[0]},${c[1]}`;
                if (!clearedSet.has(k)) { clearedSet.add(k); clearedCells.push([c[0], c[1]]); }
              }
              addCollectToTracker(m.colour, m.cells.length);
            }

          // 先確認 spawnAt 位置，立刻賦予特殊寶石（不參與消除動畫）
          const spawnPositions = new Set<string>();
          for (const m of matches) {
            if (m.spawnsSpecial && m.spawnAt) {
              const spKey = `${m.spawnAt[0]},${m.spawnAt[1]}`;
              spawnPositions.add(spKey);
              // 立刻在資料層賦予特殊寶石
              const sc = getCell(board, m.spawnAt);
              if (sc?.gem) {
                sc.gem.special = m.spawnsSpecial;
              }
              // 從 clearedSet 中移除（不會被清除）
              clearedSet.delete(spKey);
            }
          }

          // 立刻更新 spawnAt 位置的 sprite（顯示為特殊寶石）
          if (spawnPositions.size > 0) {
            boardRenderer.sync(board);
          }

          let stepScore = 0;
          for (const m of matches) stepScore += matchScore(m.shape, chain, 0);
          rulesEngine.score += stepScore;

          // 對排除 spawnAt 後的 cells 播消除動畫
          const cellsToClear = clearedCells.filter(([c, r]) => clearedSet.has(`${c},${r}`));
          playMatchSfx(cellsToClear.length, chain);
          await playClearAnimsForCells(cellsToClear, chain);
          showScorePopup(stepScore, cellsToClear, chain);
          showComboChainText(chain, cellsToClear);

          // ── 在清除前，啟動 match 中包含的特殊寶石（lineH/lineV/area）──
          const inMatchSpecials: [number, number][] = [];
          for (const [c, r] of clearedCells) {
            const k = `${c},${r}`;
            if (!clearedSet.has(k)) continue; // 已被 spawnAt 排除
            if (spawnPositions.has(k)) continue; // 剛生成的特殊寶石不啟動
            const cl = getCell(board, [c, r]);
            if (cl?.gem?.special && (cl.gem.special === 'lineH' || cl.gem.special === 'lineV' || cl.gem.special === 'area' || cl.gem.special === 'colour')) {
              inMatchSpecials.push([c, r]);
            }
          }

          // 依序啟動 match 中的特殊寶石
          // 在啟動前，先快照所有 clearedCells 中的特殊寶石狀態（用於後續被動啟動判斷）
          const normalMatchSnapshot = new Map<string, 'lineH' | 'lineV' | 'area' | 'colour'>();
          for (const [c, r] of clearedCells) {
            const k = `${c},${r}`;
            if (spawnPositions.has(k)) continue;
            const cl = getCell(board, [c, r]);
            if (cl?.gem?.special && (cl.gem.special === 'lineH' || cl.gem.special === 'lineV' || cl.gem.special === 'area' || cl.gem.special === 'colour')) {
              normalMatchSnapshot.set(k, cl.gem.special);
            }
          }

          for (const [sc, sr] of inMatchSpecials) {
            const sCell = getCell(board, [sc, sr]);
            if (!sCell?.gem?.special) continue;
            const sType = sCell.gem.special;

            // 暫時保護 spawnAt 位置的寶石，避免被爆炸清除
            const savedSpawnGems: Array<{ pos: [number, number]; gem: any }> = [];
            for (const spKey of spawnPositions) {
              const [scs, srs] = spKey.split(',');
              const spc = parseInt(scs);
              const spr2 = parseInt(srs);
              const spCell = getCell(board, [spc, spr2]);
              if (spCell?.gem) {
                savedSpawnGems.push({ pos: [spc, spr2], gem: spCell.gem });
                spCell.gem = null;
              }
            }

            // 預先計算爆炸目標並抓取 sprite 引用（啟動後 gem 會被清空）
            let inMatchBlastTargets: [number, number][] = [];
            if (sType === 'lineH') {
              for (let c = 0; c < board.width; c++) inMatchBlastTargets.push([c, sr]);
            } else if (sType === 'lineV') {
              for (let r = 0; r < board.height; r++) inMatchBlastTargets.push([sc, r]);
            } else {
              for (let dc = -1; dc <= 1; dc++) {
                for (let dr = -1; dr <= 1; dr++) {
                  const c = sc + dc, r = sr + dr;
                  if (c >= 0 && c < board.width && r >= 0 && r < board.height) inMatchBlastTargets.push([c, r]);
                }
              }
            }
            const inMatchBlastSpriteRefs: Array<{ sprite: any; col: number; row: number; colour: number | null }> = [];
            for (const [bc, br] of inMatchBlastTargets) {
              // 跳過 spawnAt 位置（已被保護，不應播消除動畫）
              if (spawnPositions.has(`${bc},${br}`)) continue;
              const spr = boardRenderer.getSprite(bc, br);
              const cl = getCell(board, [bc, br]);
              if (spr) {
                inMatchBlastSpriteRefs.push({
                  sprite: spr, col: bc, row: br,
                  colour: cl?.gem?.colour ? GEM_COLOURS[cl.gem.colour] : null,
                });
              }
            }

            let actResult: { clearedCells: [number, number][]; triggeredSpecials: [number, number][] };

            // 在啟動前快照爆炸範圍內的特殊寶石（啟動會清除 gem）
            for (const [bc, br] of inMatchBlastTargets) {
              const bk = `${bc},${br}`;
              if (!normalMatchSnapshot.has(bk)) {
                const bcl = getCell(board, [bc, br]);
                if (bcl?.gem?.special && (bcl.gem.special === 'lineH' || bcl.gem.special === 'lineV' || bcl.gem.special === 'area' || bcl.gem.special === 'colour')) {
                  normalMatchSnapshot.set(bk, bcl.gem.special);
                }
              }
            }

            if (sType === 'lineH' || sType === 'lineV') {
              actResult = activateLineBomb(board, [sc, sr]);
            } else {
              actResult = activateAreaBomb(board, [sc, sr]);
            }

            // 還原被保護的 spawnAt 寶石
            for (const { pos, gem } of savedSpawnGems) {
              const restoreCell = getCell(board, pos);
              if (restoreCell && !restoreCell.gem) restoreCell.gem = gem;
            }

            // 合併啟動清除的格子（排除 spawnAt 位置）
            for (const [ac, ar] of actResult.clearedCells) {
              const ak = `${ac},${ar}`;
              if (!clearedSet.has(ak)) { clearedSet.add(ak); clearedCells.push([ac, ar]); }
            }
            // 播放啟動特效 + 紅色遮片
            const actScore = specialActivationScore(actResult.clearedCells.length, chain, false);
            rulesEngine.score += actScore;
            const inMatchPassiveDur = getSpecialActivationDuration(sType, true);
            showSpecialFlavor(sType, [[sc, sr]], 30);
            await playAnims([
              createSpecialActivationEffect(
                sc * CELL_SIZE + CELL_SIZE / 2, sr * CELL_SIZE + CELL_SIZE / 2, 0xffffff, effectLayer, inMatchPassiveDur,
              ),
              createBlastZoneOverlay(
                actResult.clearedCells.map(([ac, ar]) => [ac, ar] as [number, number]),
                effectLayer,
                inMatchPassiveDur,
              ),
            ]);

            // 播放消除動畫（使用預先抓取的 sprite 引用）
            playMatchSfx(actResult.clearedCells.length, chain);
            const inMatchClearAnims: Array<ReturnType<typeof createMatchClearAnimation>> = [];
            for (const ref of inMatchBlastSpriteRefs) {
              inMatchClearAnims.push(createMatchClearAnimation(ref.sprite));
              if (ref.colour !== null) {
                const fxLevel = Math.min(chain - 1, 3);
                mergeFx.spawn(ref.col * CELL_SIZE + CELL_SIZE / 2, ref.row * CELL_SIZE + CELL_SIZE / 2, fxLevel, ref.colour);
              }
            }
            await playAnims(inMatchClearAnims);

            showScorePopup(actScore, actResult.clearedCells.map(([ac, ar]) => [ac, ar] as [number, number]), chain);
          }

          // 清除所有 matched + 啟動波及的格子
          for (const [c, r] of clearedCells) {
            const k = `${c},${r}`;
            if (clearedSet.has(k)) { const cl = getCell(board, [c, r]); if (cl) cl.gem = null; }
          }

          // 被動啟動處理
          // 注意：排除 spawnAt 位置，避免剛生成的特殊寶石被立即引爆
          const actualCleared = clearedCells.filter(([c, r]) => clearedSet.has(`${c},${r}`));
          const extra = await handlePassiveActivations(actualCleared, chain, spawnPositions, normalMatchSnapshot);
          for (const [c, r] of extra) clearedSet.add(`${c},${r}`);

          await runGravityAndDrop();

          hud.setScore(rulesEngine.score);
          hud.setMoves(rulesEngine.movesRemaining === Infinity ? 99 : rulesEngine.movesRemaining);
          updateHudObjective();

          matches = detectMatches(board);
          }
        }
      }

      // ── 階段 5：檢查關卡結束 ──
      // score tracker 已由 updateHudObjective 同步，這裡再同步一次確保最新
      syncScoreToTracker(rulesEngine.tracker, rulesEngine.score);

      const objectiveComplete = rulesEngine.tracker.isComplete();
      const outOfMoves = rulesEngine.movesRemaining !== Infinity && rulesEngine.movesRemaining <= 0;

      if (objectiveComplete || outOfMoves) {
        rulesEngine.settled = true;
        const cleared = objectiveComplete;
        const { calculateStars } = await import('../game/level/objective');
        const mvRem = rulesEngine.movesRemaining === Infinity ? 0 : rulesEngine.movesRemaining;
        // Add remaining moves bonus to score BEFORE calculating stars and emitting event
        if (cleared) {
          const { remainingMovesBonus } = await import('../game/rules/scoring');
          rulesEngine.score += remainingMovesBonus(mvRem);
        }
        const stars = cleared
          ? calculateStars(spec.stars, rulesEngine.score, mvRem, 0)
          : 0;
        this.eventBus.emit({
          kind: 'level.resolved',
          result: {
            levelId: spec.id,
            cleared,
            stars,
            score: rulesEngine.score,
            chainMax: chain,
            movesRemaining: mvRem,
            specialSpawnedCount: 0,
            durationMs: 0,
          },
        });
      }

      } catch (err) {
        console.error('[doSwap] Unexpected error:', err);
        boardRenderer.sync(board);
      } finally {
        isProcessing = false;
      }
    };

    boardLayer.on('pointerdown', (e) => {
      const local = e.getLocalPosition(boardLayer);
      tapStartCell = pixelToGrid(local.x, local.y);
    });

    boardLayer.on('pointerup', (e) => {
      const local = e.getLocalPosition(boardLayer);
      const cell = pixelToGrid(local.x, local.y);
      if (!cell || !tapStartCell) {
        tapStartCell = null;
        return;
      }

      // 如果 down 和 up 在不同格子且相鄰 → drag swap
      if (tapStartCell[0] !== cell[0] || tapStartCell[1] !== cell[1]) {
        if (isAdjacent(tapStartCell, cell)) {
          doSwap(tapStartCell, cell);
          selectedCell = null;
          boardRenderer.setSelection(null);
        }
        tapStartCell = null;
        return;
      }

      // 同一格 → tap-tap swap 邏輯
      if (!selectedCell) {
        selectedCell = cell;
        boardRenderer.setSelection(cell);
      } else if (selectedCell[0] === cell[0] && selectedCell[1] === cell[1]) {
        selectedCell = null;
        boardRenderer.setSelection(null);
      } else if (isAdjacent(selectedCell, cell)) {
        doSwap(selectedCell, cell);
        selectedCell = null;
        boardRenderer.setSelection(null);
      } else {
        selectedCell = cell;
        boardRenderer.setSelection(cell);
      }
      tapStartCell = null;
    });

    // Create HUD
    const { createGameHUD } = await import('../ui/screens/game-hud');
    const { width, height } = this.getScreenSize();
    const hud = createGameHUD({
      width,
      height,
      mode: spec.constraints.timeBudget ? 'time' : 'moves',
      objective: spec.objective,
      onPause: () => this.transitionTo({ kind: 'pause', previous: this.currentState } as any),
    });
    hud.setMoves(rulesEngine.movesRemaining === Infinity ? 99 : rulesEngine.movesRemaining);
    hud.setScore(0);
    updateHudObjective();
    this.setScreen(hud);

    // Wire up event listeners
    const unsubResolved = this.eventBus.on('level.resolved', (e) => {
      // 儲存進度
      if (e.result.cleared) {
        try {
          const sm = new SaveManager();
          const save = sm.load();
          // 更新關卡紀錄
          const prev = save.levels[e.result.levelId];
          save.levels[e.result.levelId] = {
            stars: Math.max(prev?.stars ?? 0, e.result.stars) as 0|1|2|3,
            highScore: Math.max(prev?.highScore ?? 0, e.result.score),
            attempts: (prev?.attempts ?? 0) + 1,
          };
          // 解鎖下一關
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

      // 延遲 1.5 秒讓玩家看到最終盤面，再進入結算
      setTimeout(() => {
        this.teardownGameSession();
        if (e.result.cleared) {
          this.transitionTo({ kind: 'levelComplete', result: e.result });
        } else {
          this.transitionTo({ kind: 'levelFail', result: e.result });
        }
      }, 1500);
    });

    // Create game loop with minimal renderer/audio/telemetry stubs
    const { GameLoop } = await import('../game/runtime/game-loop');
    const gameLoop = new GameLoop(
      rulesEngine,
      {
        render: (_alpha: number) => {
          boardRenderer.update(16.67);
          mergeFx.update(16);
        },
      },
      { update: () => {} },
      { tick: () => {} },
      this.eventBus,
    );
    gameLoop.start();
    this.activeGameLoop = gameLoop;

    // Store cleanup for game-specific event listeners
    this.cleanupFns.push(unsubResolved);
  }

  /** Tear down the active game session */
  private teardownGameSession(): void {
    this.activeGameLoop?.stop();
    this.activeGameLoop = null;

    this.activeBoardRenderer?.destroy();
    this.activeBoardRenderer = null;

    this.activeViewportManager?.destroy();
    this.activeViewportManager = null;

    this.activeRulesEngine = null;

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
  private async drawGridBackground(appRefs: AppRefs, cols: number, rows: number, cellSize: number): Promise<void> {
    const { Graphics } = await import('pixi.js');
    const grid = new Graphics();
    grid.label = 'grid-bg';

    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const x = col * cellSize;
        const y = row * cellSize;
        const isEven = (col + row) % 2 === 0;
        grid.rect(x, y, cellSize, cellSize);
        grid.fill({ color: isEven ? 0x1a1f3a : 0x14183a, alpha: 0.8 });
      }
    }

    appRefs.layers.cellLayer.addChild(grid);
  }

  private async showPause(): Promise<void> {
    const { createPauseOverlay } = await import('../ui/screens/pause-overlay');
    const { width, height } = this.getScreenSize();
    const pauseState = this.currentState as import('../state/app-state').PauseState;
    const overlay = createPauseOverlay({
      width,
      height,
      onResume: () => this.transitionTo(pauseState.previous),
      onRestart: () => this.transitionTo(pauseState.previous),
      onSettings: () => this.transitionTo({ kind: 'settings', returnTo: this.currentState } as any),
      onQuit: () => this.transitionTo({ kind: 'menu' }),
    });
    this.setScreen(overlay);
  }

  private async showLevelComplete(result?: import('../types').LevelResult): Promise<void> {
    const { createLevelCompleteScreen } = await import('../ui/screens/level-complete');
    const { loadLevel } = await import('../game/level/level-spec');
    await import('../game/level/levels/index');
    const { width, height } = this.getScreenSize();
    const spec = loadLevel(result?.levelId ?? 1);
    const wId = spec?.worldId ?? 1;
    const screen = createLevelCompleteScreen({
      width,
      height,
      result,
      worldId: wId,
      onNext: () => this.transitionTo({ kind: 'worldMap', worldId: wId }),
      onReplay: () => this.transitionTo({ kind: 'game', levelId: result?.levelId ?? 1 }),
      onMap: () => this.transitionTo({ kind: 'worldMap', worldId: wId }),
    });
    this.setScreen(screen);
  }

  private async showLevelFail(result?: import('../types').LevelResult): Promise<void> {
    const { createLevelFailScreen } = await import('../ui/screens/level-fail');
    const { loadLevel } = await import('../game/level/level-spec');
    await import('../game/level/levels/index');
    const { width, height } = this.getScreenSize();
    const spec = loadLevel(result?.levelId ?? 1);
    const wId = spec?.worldId ?? 1;
    const screen = createLevelFailScreen({
      width,
      height,
      onRetry: () => this.transitionTo({ kind: 'game', levelId: result?.levelId ?? 1 }),
      onMap: () => this.transitionTo({ kind: 'worldMap', worldId: wId }),
    });
    this.setScreen(screen);
  }

  private startEndless(seed?: bigint): void {
    // Endless mode — for now show a placeholder via game HUD
    this.startLevel(0, seed);
  }

  private async showEndlessEnd(result?: import('../types').EndlessResult): Promise<void> {
    // Reuse level complete screen for now
    const { createLevelCompleteScreen } = await import('../ui/screens/level-complete');
    const { width, height } = this.getScreenSize();
    const screen = createLevelCompleteScreen({
      width,
      height,
      onNext: () => this.transitionTo({ kind: 'menu' }),
      onReplay: () => this.transitionTo({ kind: 'menu' }),
      onMap: () => this.transitionTo({ kind: 'menu' }),
    });
    this.setScreen(screen);
  }

  private async showSettings(): Promise<void> {
    // Use credits screen as a placeholder for settings for now
    const { createCreditsScreen } = await import('../ui/screens/credits');
    const { width, height } = this.getScreenSize();
    const settingsState = this.currentState as import('../state/app-state').SettingsState;
    const screen = createCreditsScreen({
      width,
      height,
      onClose: () => this.transitionTo(settingsState.returnTo),
    });
    this.setScreen(screen);
  }

  private async showCredits(): Promise<void> {
    const { createCreditsScreen } = await import('../ui/screens/credits');
    const { width, height } = this.getScreenSize();
    const screen = createCreditsScreen({
      width,
      height,
      onClose: () => this.transitionTo({ kind: 'menu' }),
    });
    this.setScreen(screen);
  }

  private updateSplashProgress(progress: number): void {
    // Update splash screen if it's the active screen
    if (this.activeScreen && 'setLoadProgress' in this.activeScreen) {
      (this.activeScreen as any).setLoadProgress(progress);
    }
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
