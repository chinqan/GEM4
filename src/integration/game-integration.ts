// ─── Game Integration Module ────────────────────────────────
// Main integration module connecting all subsystems:
// rules + rendering + audio + input + state + UI + telemetry + debug
//
// This is the top-level orchestrator that bootstraps the game
// and wires all subsystems together via the event bus.

import type { AppState } from '../state/app-state';
import type { EventBus } from '../state/events';
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
import type { ScreenRouter } from './screen-router';
import type { GameSessionController } from '../game/runtime/game-session';
import type { BoardAnimator } from '../rendering/board-animator';
import type { BoardInteraction } from '../input/board-interaction';
import { calculateStars } from '../game/level/objective';

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
  private sessionCleanupFns: Array<() => void> = [];

  // ─── Extracted subsystems ─────────────────────────────────
  private screenRouter: ScreenRouter | null = null;
  private activeSession: GameSessionController | null = null;
  private activeBoardAnimator: BoardAnimator | null = null;
  private activeBoardInteraction: BoardInteraction | null = null;
  private audioSystem: import('../audio/audio-system').AudioSystem | null = null;
  /** 當前 intensity（GDD 06§3.5），swap 結算時更新、render 迴圈緩慢衰減 */
  private _intensity = 0;
  private _lastEmittedIntensity = 0;

  // ─── Active game session (legacy — kept for GameLoop compatibility)
  private activeRulesEngine: RulesEngine | null = null;
  private activeGameLoop: GameLoop | null = null;
  private activeBoardRenderer: BoardRenderer | null = null;
  private activeBoardInput: BoardInput | null = null;
  private activeInputSystem: InputSystem | null = null;
  private activeViewportManager: ViewportManager | null = null;
  private activeHud: Container | null = null;

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
      onAudioSettingsChange: (audio) => {
        // 設定即時生效（GDD 05§4.9：音量類設定 exception 即時套用）
        this.audioSystem?.buses.restore({
          master: { volume: audio.masterVolume, muted: audio.muted },
          music: { volume: audio.musicVolume, muted: false },
          sfx: { volume: audio.sfxVolume, muted: false },
          ambience: { volume: audio.ambienceVolume ?? 0.4, muted: false },
        });
      },
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

      // 3.5 Initialize audio system（橋接存檔音量 → buses，接上 event bus）
      try {
        const { AudioSystem } = await import('../audio/audio-system');
        const { SaveManager } = await import('../state/save-state');
        const audio = new SaveManager().load().settings.audio;
        this.audioSystem = new AudioSystem({
          busSnapshot: {
            master: { volume: audio.masterVolume, muted: audio.muted },
            music: { volume: audio.musicVolume, muted: false },
            sfx: { volume: audio.sfxVolume, muted: false },
            ambience: { volume: audio.ambienceVolume ?? 0.4, muted: false },
          },
        });
        this.audioSystem.connectEventBus(this.eventBus);
        this.cleanupFns.push(() => {
          this.audioSystem?.dispose();
          this.audioSystem = null;
        });
      } catch (err) {
        console.warn('[GameIntegration] Audio system init failed:', err);
      }

      // 3.6 Initialize i18n（依存檔語言載入字串）
      try {
        const { initTranslator } = await import('../i18n/translator');
        const { SaveManager } = await import('../state/save-state');
        const language = new SaveManager().load().settings.language;
        await initTranslator(language as import('../i18n/translator').SupportedLocale);
      } catch (err) {
        console.warn('[GameIntegration] i18n init failed:', err);
      }

      // 4. Initialize debug tools (controlled by settings)
      try {
        await this.initDebugTools();
      } catch {
        // Non-critical — game continues without debug tools
      }

      // 5. Load state machine
      await this.loadStateMachine();

      // 6. Set up event listeners
      this.setupEventListeners();

      // 7. Set up edge case handlers
      this.setupEdgeCaseHandlers();

      this.phase = 'ready';

      // 8. Transition to menu — or jump directly to a level via ?level=<id>
      const _devLevel = new URLSearchParams(window.location.search).get('level');
      this.transitionTo({ kind: 'menu' });
      if (_devLevel !== null) {
        this.transitionTo({ kind: 'game', levelId: parseInt(_devLevel, 10) });
      }

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

  /** Show or hide the debug panel at runtime */
  setDebugVisible(visible: boolean): void {
    this.subsystems.debugPanel?.setVisible(visible);
    this.subsystems.statsPanel?.setVisible?.(visible);
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

    // 音樂路由：選單類畫面播 menu 曲（Ambience off，GDD 07§4.6）；
    // 世界音樂在 startLevel 依 worldId 啟動。Pause 時暫停音訊（GDD 07§4.5）。
    if (to.kind === 'menu' || to.kind === 'worldMap' || to.kind === 'levelSelect' || to.kind === 'credits') {
      void this.playMenuAudio();
    }
    if (to.kind === 'pause') {
      this.audioSystem?.suspend();
    } else if (from.kind === 'pause') {
      this.audioSystem?.resume();
    }

    // Tear down game session when leaving game/pause for a non-game screen
    const leavingGame = from.kind === 'game' || from.kind === 'pause' || from.kind === 'endless';
    const enteringNonGame = to.kind !== 'game' && to.kind !== 'pause' && to.kind !== 'endless'
      && to.kind !== 'levelComplete' && to.kind !== 'levelFail' && to.kind !== 'endlessEnd'
      && to.kind !== 'settings';
    if (leavingGame && enteringNonGame) {
      this.teardownGameSession();
      // Clear world background to free VRAM
      this.subsystems.app?.layers.background.removeChildren();
    }

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

    // World background sprite (fills canvas, behind board)
    await this.applyWorldBackground(appRefs, spec.worldId);

    // Draw grid background
    await this.drawGridBackground(appRefs, board, CELL_SIZE);

    // --- 世界音樂 + 環境音（同世界續播不中斷）---
    void this.playWorldAudio(spec.worldId);

    // --- combo-required 關卡開場提示（GDD 02§7 L63）---
    const { parseSpecialRules } = await import('../game/level/special-rules');
    if (parseSpecialRules(spec.specialRules).comboRequired) {
      const { createToast } = await import('../ui/juice/toast');
      const { t } = await import('../i18n/translator');
      const { width: vw, height: vh } = this.getScreenSize();
      const toast = createToast({
        message: t('level.comboRequiredHint'),
        variant: 'info',
        position: 'top',
        duration: 4000,
        viewportWidth: vw,
        viewportHeight: vh,
      });
      appRefs.layers.uiLayer.addChild(toast.container);
    }

    // --- Create Board Animator ---
    const { BoardAnimator } = await import('../rendering/board-animator');
    const animator = new BoardAnimator({
      boardRenderer,
      layers: appRefs.layers,
      renderer: appRefs.app.renderer,
    });
    this.activeBoardAnimator = animator;

    // Real-time score update: refresh HUD score as each cascade step scores
    let animatedScore = 0;
    animator.onScoreUpdate = (delta: number) => {
      animatedScore += delta;
      if (this.activeHud) {
        this.activeHud.setScore(animatedScore);
        // Progressively update score-type objective progress
        if (spec.objective.type === 'score') {
          this.activeHud.setObjective(Math.min(animatedScore, spec.objective.target), spec.objective.target);
        } else if (spec.objective.type === 'multi') {
          const state = session.getState();
          const progress = state.objectiveProgress.map((p, i) => {
            const sub = spec.objective.type === 'multi' ? spec.objective.objectives[i] : null;
            if (sub?.type === 'score') {
              return { current: Math.min(animatedScore, sub.target), total: sub.target };
            }
            return p;
          });
          this.activeHud.setObjective(progress);
        }
      }
    };

    // --- Preload all SFX (ensures combo/special sounds are ready on first trigger) ---
    import('../audio/sfx-player').then(({ preloadAllMapped }) => preloadAllMapped());

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

    // --- Wire HintTimer ---
    const { HintTimer } = await import('../game/runtime/hint');
    let hintDelayMs = 5000;
    try {
      const { SaveManager: SM } = await import('../state/save-state');
      hintDelayMs = new SM().load().settings.gameplay.hintDelayMs;
    } catch { /* use default */ }
    const onNoHint = async (): Promise<void> => {
      const moves = session.checkAndReshuffle();
      if (moves) {
        await animator.animateReshuffleSlide(moves, () => boardRenderer.sync(board));
        this.eventBus.emit({ kind: 'reshuffle.triggered', reason: 'noMoves' });
      }
    };
    const hintTimer = new HintTimer(() => board, this.eventBus, hintDelayMs, () => { void onNoHint(); });

    const unsubHint = this.eventBus.on('hint.shown', (e) => {
      animator.showHintFlash(e.cells);
    });
    this.sessionCleanupFns.push(unsubHint);
    this.sessionCleanupFns.push(() => animator.clearHintFlash());

    interaction.attach({
      onSwap: async (from, to) => {
        hintTimer.reset();
        animator.clearHintFlash();
        animatedScore = session.score;
        const result = session.executeSwap(from, to);
        if (result.valid) {
          const chainMax = result.cascadeSteps.reduce((m, s) => Math.max(m, s.chain), 1);
          this.updateIntensity(session, chainMax);
          // 連鎖讚美（GDD 08§10.3：chain ≥2 頂部浮現）
          if (chainMax >= 2) hud.showChain(chainMax);
        }
        await animator.animateSwap(result, from, to, board);
        boardRenderer.sync(board);
        this.updateHud(hud, session, spec);

        if (result.endCondition) {
          this.emitLevelResolved(result.endCondition, 0);
          return;
        }
        const movesAfterSwap = session.checkAndReshuffle();
        if (movesAfterSwap) {
          await animator.animateReshuffleSlide(movesAfterSwap, () => boardRenderer.sync(board));
          this.eventBus.emit({ kind: 'reshuffle.triggered', reason: 'noMoves' });
        }
      },
      onActivate: async (at) => {
        hintTimer.reset();
        animator.clearHintFlash();
        animatedScore = session.score;
        const result = session.executeActivation(at);
        if (result) {
          const chainMax = result.cascadeSteps.reduce((m, s) => Math.max(m, s.chain), 1);
          this.updateIntensity(session, chainMax);
          await animator.animateActivation(result, board);
          boardRenderer.sync(board);
          this.updateHud(hud, session, spec);

          if (result.endCondition) {
            this.emitLevelResolved(result.endCondition, 0);
            return;
          }
          const movesAfterActivate = session.checkAndReshuffle();
          if (movesAfterActivate) {
            await animator.animateReshuffleSlide(movesAfterActivate, () => boardRenderer.sync(board));
            this.eventBus.emit({ kind: 'reshuffle.triggered', reason: 'noMoves' });
          }
        }
      },
      onSelectionChange: (cell) => {
        boardRenderer.setSelection(cell);
      },
    });

    // --- Create HUD ---
    const { createGameHUD } = await import('../ui/screens/game-hud');
    const { getTranslator } = await import('../i18n/translator');
    const { width, height } = this.getScreenSize();
    const locale = getTranslator().locale;
    const levelName = spec.name?.[locale] ?? spec.name?.['zh-TW'] ?? spec.name?.en ?? '';
    let hud = createGameHUD({
      width,
      height,
      mode: spec.constraints.timeBudget ? 'time' : 'moves',
      objective: spec.objective,
      worldId: spec.worldId,
      levelId: spec.id,
      levelName,
      onPause: () => this.transitionTo({ kind: 'pause', previous: this.currentState } as any),
      onSettings: () => this.screenRouter!.showSettings(),
      onReset: () => this.transitionTo({ kind: 'game', levelId }),
    });
    const movesDisplay = session.movesRemaining === Infinity ? 99 : session.movesRemaining;
    hud.setMoves(movesDisplay);
    if (spec.constraints.timeBudget) {
      hud.setTime(session.timeRemaining === Infinity ? 0 : session.timeRemaining);
    }
    hud.setScore(0);
    this.updateHud(hud, session, spec);
    this.screenRouter!.clearScreen();
    this.activeHud = hud;
    this.subsystems.app?.layers.uiLayer.addChild(hud);

    // --- Resize handler: rebuild HUD and refit background on window resize ---
    const rebuildHudOnResize = (): void => {
      if (!this.activeHud || !this.subsystems.app) return;
      const { width: newW, height: newH } = this.getScreenSize();

      // Destroy old HUD
      this.activeHud.destroy({ children: true });

      // Rebuild HUD with new dimensions
      const newHud = createGameHUD({
        width: newW,
        height: newH,
        mode: spec.constraints.timeBudget ? 'time' : 'moves',
        objective: spec.objective,
        worldId: spec.worldId,
        levelId: spec.id,
        levelName,
        onPause: () => this.transitionTo({ kind: 'pause', previous: this.currentState } as any),
        onSettings: () => this.screenRouter!.showSettings(),
        onReset: () => this.transitionTo({ kind: 'game', levelId }),
      });
      this.updateHud(newHud, session, spec);
      this.activeHud = newHud;
      this.subsystems.app.layers.uiLayer.addChild(newHud);

      // Also update the hud reference used by the game loop render callback
      hud = newHud;

      // Refit world background and recalculate board viewport with fresh canvas size
      this.refitWorldBackground();
      this.activeViewportManager?.recalculate();
    };

    let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedResize = (): void => {
      if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = setTimeout(rebuildHudOnResize, 100);
    };

    let hudResizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      hudResizeObserver = new ResizeObserver(debouncedResize);
      const parent = canvas.parentElement;
      if (parent) {
        hudResizeObserver.observe(parent);
      }
    } else {
      window.addEventListener('resize', debouncedResize);
    }

    this.sessionCleanupFns.push(() => {
      if (hudResizeObserver) {
        hudResizeObserver.disconnect();
        hudResizeObserver = null;
      } else {
        window.removeEventListener('resize', debouncedResize);
      }
      if (resizeDebounceTimer) {
        clearTimeout(resizeDebounceTimer);
        resizeDebounceTimer = null;
      }
    });

    // --- Wire level.resolved event ---
    const { SaveManager } = await import('../state/save-state');
    const { playLevelComplete, playLevelFail, playNewLevelUnlock } = await import('../audio/sfx-player');

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
          const isNewUnlock = !save.progress.unlockedLevels.includes(nextLevel);
          if (isNewUnlock) {
            save.progress.unlockedLevels.push(nextLevel);
            // Play unlock sound after a short delay
            setTimeout(() => playNewLevelUnlock(), 2000);
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
    this.sessionCleanupFns.push(unsubResolved);

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
          animator.update(16.67);
          hintTimer.update(16.67);
          if (spec.constraints.timeBudget && session.timeRemaining !== Infinity) {
            hud.setTime(session.timeRemaining);
          }
          // intensity 緩慢衰減（GDD 07§4.3：chain 結束後 1–2 秒 graceful fade）
          if (this._intensity > 0.001) {
            this._intensity *= 0.9985;
            this.emitIntensityIfChanged();
          }
        },
      },
      this.audioSystem ?? { update: () => {} },
      { tick: () => {} },
      this.eventBus,
    );
    gameLoop.start();
    this.activeGameLoop = gameLoop;
  }

  // ─── 音樂路由（GDD 07§4）──────────────────────────────────

  /** 選單類畫面：menu 曲 + 關閉環境音（資產未到位時靜默跳過，見 music-tracks.ts） */
  private async playMenuAudio(): Promise<void> {
    const audio = this.audioSystem;
    if (!audio) return;
    audio.stopAmbience();
    const { MUSIC_ASSETS_READY, MENU_MUSIC_BASE } = await import('../audio/music-tracks');
    if (!MUSIC_ASSETS_READY) return;
    if (audio.music.getTrackId() !== 'menu') {
      const { createTrackDef } = await import('../audio/adaptive-music');
      audio.playMusic(createTrackDef('menu', [MENU_MUSIC_BASE], ['mp3']));
    }
  }

  /** 進入關卡：世界音樂（4 stems）+ 世界環境音；同世界續播不中斷（GDD 07§4.1）。
   *  資產未到位時靜默跳過（見 music-tracks.ts）。 */
  private async playWorldAudio(worldId: number): Promise<void> {
    const audio = this.audioSystem;
    if (!audio) return;
    const w = worldId >= 1 && worldId <= 4 ? worldId : 1;
    const { MUSIC_ASSETS_READY, AMBIENCE_ASSETS_READY, worldMusicBasePaths, worldAmbiencePath } =
      await import('../audio/music-tracks');

    if (MUSIC_ASSETS_READY) {
      const trackId = `world-${w}`;
      if (audio.music.getTrackId() !== trackId) {
        const { createTrackDef } = await import('../audio/adaptive-music');
        audio.playMusic(createTrackDef(trackId, worldMusicBasePaths(w), ['mp3']));
      }
    }
    if (AMBIENCE_ASSETS_READY) {
      audio.playAmbience(worldAmbiencePath(w));
    }
  }

  /**
   * 依 GDD 06§3.5 公式計算 intensity 並發送 intensity.updated。
   * 在每次 swap/activation 結算後呼叫；render 迴圈另做緩慢衰減。
   */
  private updateIntensity(session: GameSessionController, currentChain: number): void {
    const spec = session.spec;
    const initialMoves = spec.constraints.moveBudget ?? 0;
    const movesRatio =
      initialMoves > 0 && session.movesRemaining !== Infinity
        ? session.movesRemaining / initialMoves
        : 1;
    const urgencyKick = movesRatio < 0.3 ? 1 : 0;

    let specialsOnBoard = 0;
    for (let c = 0; c < session.board.width; c++) {
      for (let r = 0; r < session.board.height; r++) {
        if (session.board.cells[c][r].gem?.special) specialsOnBoard++;
      }
    }

    const progress = session.getState().objectiveProgress;
    const objectiveProgress =
      progress.length > 0
        ? progress.reduce((s, p) => s + Math.min(1, p.current / Math.max(1, p.total)), 0) / progress.length
        : 0;

    const intensity = Math.max(
      0,
      Math.min(
        1,
        0.2 * (currentChain / 6) +
          0.4 * (1 - movesRatio) * urgencyKick +
          0.3 * Math.min(specialsOnBoard / 4, 1) +
          0.1 * objectiveProgress,
      ),
    );

    this._intensity = Math.max(this._intensity, intensity);
    this.emitIntensityIfChanged();
  }

  private emitIntensityIfChanged(): void {
    if (Math.abs(this._intensity - this._lastEmittedIntensity) > 0.02) {
      this._lastEmittedIntensity = this._intensity;
      this.eventBus.emit({ kind: 'intensity.updated', value: this._intensity });
    }
  }

  /** Update HUD from session state */
  private updateHud(hud: any, session: GameSessionController, _spec: import('../game/level/level-spec').LevelSpec): void {
    hud.setScore(session.score);
    hud.setMoves(session.movesRemaining === Infinity ? 99 : session.movesRemaining);
    const state = session.getState();
    if (state.objectiveProgress.length === 1) {
      hud.setObjective(state.objectiveProgress[0].current, state.objectiveProgress[0].total);
    } else {
      hud.setObjective(state.objectiveProgress);
    }
    // Update star display based on current progress
    if (_spec.stars) {
      const currentStars = calculateStars(
        _spec.stars,
        session.score,
        session.movesRemaining === Infinity ? 0 : session.movesRemaining,
        session.timeRemaining === Infinity ? 0 : session.timeRemaining,
      );
      hud.setStars(currentStars);
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

    // Destroy HUD so it doesn't stack on replay
    if (this.activeHud) {
      this.activeHud.destroy({ children: true });
      this.activeHud = null;
    }

    // Run and clear per-session cleanup (event subscriptions, etc.)
    for (let i = this.sessionCleanupFns.length - 1; i >= 0; i--) {
      try {
        this.sessionCleanupFns[i]();
      } catch { /* non-critical */ }
    }
    this.sessionCleanupFns = [];

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

  /**
   * Apply a world background gradient into the background layer.
   * Uses the new bright natural style instead of image sprites.
   */
  private async applyWorldBackground(
    appRefs: AppRefs,
    _worldId: number,
  ): Promise<void> {
    const { Assets, Sprite, Graphics } = await import('pixi.js');
    const bg = appRefs.layers.background;
    bg.removeChildren();

    const cw = appRefs.app.screen.width;
    const ch = appRefs.app.screen.height;

    // 使用世界背景圖片，適應高度、水平置中
    // worldId=0（測試模式）fallback 到 world-1
    const effectiveWorldId = _worldId > 0 ? _worldId : 1;
    const worldBgPath = `assets/worlds/world-${effectiveWorldId}-bg.png`;

    try {
      const texture = await Assets.load(worldBgPath);
      const sprite = new Sprite(texture);
      sprite.label = 'world-bg';

      // 適應高度（cover height），水平置中
      const texW = texture.width || 1;
      const texH = texture.height || 1;
      const scale = ch / texH;
      sprite.width = texW * scale;
      sprite.height = ch;
      sprite.x = (cw - sprite.width) / 2;
      sprite.y = 0;

      bg.addChild(sprite);
    } catch {
      // Fallback：純色背景（深藍綠）
      const fallback = new Graphics();
      fallback.label = 'world-bg';
      fallback.rect(0, 0, cw, ch);
      fallback.fill({ color: 0x0b1a2a });
      bg.addChild(fallback);
    }
  }

  /**
   * Refit the world background to the current canvas size.
   * Re-applies cover-height + center-x logic on resize.
   */
  private refitWorldBackground(): void {
    const appRefs = this.subsystems.app;
    if (!appRefs) return;

    const bg = appRefs.layers.background;
    const sprite = bg.children.find((c) => c.label === 'world-bg') as import('pixi.js').Sprite | undefined;
    if (!sprite || !sprite.texture) return;

    const cw = appRefs.app.screen.width;
    const ch = appRefs.app.screen.height;
    const texW = sprite.texture.width || 1;
    const texH = sprite.texture.height || 1;
    const scale = ch / texH;
    sprite.width = texW * scale;
    sprite.height = ch;
    sprite.x = (cw - sprite.width) / 2;
    sprite.y = 0;
  }

  /** Draw a grid background for the board */
  private async drawGridBackground(
    appRefs: AppRefs,
    board: import('../game/rules/board').Board,
    cellSize: number,
  ): Promise<void> {
    const { Graphics, Sprite, Texture } = await import('pixi.js');

    // ── 棋盤外框面板（圓角半透明深色背景） ──────────────
    const boardPixelW = board.width * cellSize;
    const boardPixelH = board.height * cellSize;
    const framePad = 8;
    const frameRadius = 20;
    const frame = new Graphics();
    frame.label = 'board-frame';
    frame.roundRect(
      -framePad,
      -framePad,
      boardPixelW + framePad * 2,
      boardPixelH + framePad * 2,
      frameRadius,
    );
    frame.fill({ color: 0x243a48, alpha: 0.4 });
    appRefs.layers.cellLayer.addChild(frame);

    // ── 格子背景 ────────────────────────────────────────
    const grid = new Graphics();
    grid.label = 'grid-bg';

    for (let col = 0; col < board.width; col++) {
      for (let row = 0; row < board.height; row++) {
        const cell = board.cells[col][row];
        if (cell.isEmpty) {
          // 永久空格 → 貼上木板擋牆
          const plank = new Sprite(Texture.from('assets/items/wood-plank.png'));
          plank.label = 'gate-plank';
          plank.position.set(col * cellSize, row * cellSize);
          plank.width = cellSize;
          plank.height = cellSize;
          appRefs.layers.cellLayer.addChild(plank);
          continue;
        }
        const x = col * cellSize;
        const y = row * cellSize;
        const isEven = (col + row) % 2 === 0;
        grid.rect(x, y, cellSize, cellSize);
        grid.fill({ color: isEven ? 0x2a4050 : 0x243a48, alpha: 0.4 });
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

    // Chain escalation → debug panel
    const unsubChain = this.eventBus.on('chain.escalated', (e) => {
      this.subsystems.debugPanel?.updateMetrics({ chainCount: e.to });
    });
    this.cleanupFns.push(unsubChain);
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
    // Read showDebugPanel from saved settings
    let showDebug = false;
    try {
      const { SaveManager } = await import('../state/save-state');
      const sm = new SaveManager();
      const save = sm.load();
      showDebug = save.settings.gameplay.showDebugPanel ?? false;
    } catch { /* use default */ }

    try {
      const { createDebugPanel } = await import('../debug/tweakpane');
      const { getDrawCallCount } = await import('../debug/stats');
      const panel = await createDebugPanel();
      if (panel) {
        this.subsystems.debugPanel = panel;
        panel.setVisible(showDebug);
        this.cleanupFns.push(() => panel.destroy());

        // Per-frame debug metrics update via PixiJS ticker
        const app = this.subsystems.app?.app;
        if (app) {
          const ticker = app.ticker;
          const particleLayer = this.subsystems.app!.layers.particleLayer;
          const boardLayer = this.subsystems.app!.layers.boardLayer;
          const stage = app.stage;
          const renderer = app.renderer;

          const updateDebugMetrics = () => {
            // FPS from PixiJS ticker
            const fps = Math.round(ticker.FPS);

            // Particle count: visible children in particleLayer + boardLayer's merge-fx/jelly-fx containers
            let particleCount = 0;
            for (const child of particleLayer.children) {
              if (child.visible) particleCount++;
            }
            for (const child of boardLayer.children) {
              if (child.label === 'merge-fx' || child.label === 'jelly-fx') {
                for (const p of (child as any).children ?? []) {
                  if (p.visible) particleCount++;
                }
              }
            }

            // Draw calls: read from PixiJS renderer internals (falls back to leaf-node count)
            let drawCalls = 0;
            const rendererCount = getDrawCallCount(renderer);
            if (rendererCount >= 0) {
              drawCalls = rendererCount;
            } else {
              // Fallback: approximate by counting visible leaf nodes in stage
              const countVisible = (container: any) => {
                for (const child of container.children ?? []) {
                  if (!child.visible) continue;
                  if (child.children && child.children.length > 0) {
                    countVisible(child);
                  } else {
                    drawCalls++;
                  }
                }
              };
              countVisible(stage);
            }

            // Game state metrics from active session
            const session = this.activeSession;
            const score = session?.score ?? 0;
            const movesRemaining = session
              ? (session.movesRemaining === Infinity ? 99 : session.movesRemaining)
              : 0;

            panel.updateMetrics({ fps, drawCalls, particleCount, score, movesRemaining });
          };

          ticker.add(updateDebugMetrics);
          this.cleanupFns.push(() => ticker.remove(updateDebugMetrics));
        }
      }
    } catch {
      // Non-critical
    }

    try {
      const { createStatsPanel } = await import('../debug/stats');
      const statsPanel = await createStatsPanel();
      if (statsPanel) {
        this.subsystems.statsPanel = statsPanel;
        if (!showDebug) statsPanel.setVisible?.(false);
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
