# Graph Report - .  (2026-05-13)

## Corpus Check
- 12 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1407 nodes · 3533 edges · 105 communities (58 shown, 47 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 233 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Game Rules & Scoring|Game Rules & Scoring]]
- [[_COMMUNITY_SFX Player & Audio|SFX Player & Audio]]
- [[_COMMUNITY_Level Spec & Routing|Level Spec & Routing]]
- [[_COMMUNITY_Asset Loading|Asset Loading]]
- [[_COMMUNITY_App Bootstrap & Debug|App Bootstrap & Debug]]
- [[_COMMUNITY_App Entry & Resize|App Entry & Resize]]
- [[_COMMUNITY_Accessibility & Rendering|Accessibility & Rendering]]
- [[_COMMUNITY_Particle Effects|Particle Effects]]
- [[_COMMUNITY_Audio Design Docs|Audio Design Docs]]
- [[_COMMUNITY_Objective Tracking|Objective Tracking]]
- [[_COMMUNITY_Game Session Controller|Game Session Controller]]
- [[_COMMUNITY_Audio System Core|Audio System Core]]
- [[_COMMUNITY_GDD & Requirements|GDD & Requirements]]
- [[_COMMUNITY_Telemetry Events|Telemetry Events]]
- [[_COMMUNITY_Input Keybinds|Input Keybinds]]
- [[_COMMUNITY_Match Detection|Match Detection]]
- [[_COMMUNITY_Endless Mode|Endless Mode]]
- [[_COMMUNITY_Audio Buses|Audio Buses]]
- [[_COMMUNITY_Settings Form|Settings Form]]
- [[_COMMUNITY_Rules Engine Loop|Rules Engine Loop]]
- [[_COMMUNITY_State Event Pools|State Event Pools]]
- [[_COMMUNITY_Rendering Filters|Rendering Filters]]
- [[_COMMUNITY_Board Input|Board Input]]
- [[_COMMUNITY_Adaptive Music|Adaptive Music]]
- [[_COMMUNITY_Board & Special Gems|Board & Special Gems]]
- [[_COMMUNITY_Command Queue|Command Queue]]
- [[_COMMUNITY_SFX Catalog|SFX Catalog]]
- [[_COMMUNITY_i18n Translation|i18n Translation]]
- [[_COMMUNITY_Game Integration Flow|Game Integration Flow]]
- [[_COMMUNITY_Board Data Model|Board Data Model]]
- [[_COMMUNITY_Module 30|Module 30]]
- [[_COMMUNITY_Module 31|Module 31]]
- [[_COMMUNITY_Module 32|Module 32]]
- [[_COMMUNITY_Module 33|Module 33]]
- [[_COMMUNITY_Module 34|Module 34]]
- [[_COMMUNITY_Module 35|Module 35]]
- [[_COMMUNITY_Module 36|Module 36]]
- [[_COMMUNITY_Module 37|Module 37]]
- [[_COMMUNITY_Module 38|Module 38]]
- [[_COMMUNITY_Module 39|Module 39]]
- [[_COMMUNITY_Module 40|Module 40]]
- [[_COMMUNITY_Module 41|Module 41]]
- [[_COMMUNITY_Module 42|Module 42]]
- [[_COMMUNITY_Module 43|Module 43]]
- [[_COMMUNITY_Module 44|Module 44]]
- [[_COMMUNITY_Module 45|Module 45]]
- [[_COMMUNITY_Module 46|Module 46]]
- [[_COMMUNITY_Module 47|Module 47]]
- [[_COMMUNITY_Module 48|Module 48]]
- [[_COMMUNITY_Module 49|Module 49]]
- [[_COMMUNITY_Module 50|Module 50]]
- [[_COMMUNITY_Module 51|Module 51]]
- [[_COMMUNITY_Module 52|Module 52]]
- [[_COMMUNITY_Module 53|Module 53]]
- [[_COMMUNITY_Module 54|Module 54]]
- [[_COMMUNITY_Module 55|Module 55]]
- [[_COMMUNITY_Module 56|Module 56]]
- [[_COMMUNITY_Module 57|Module 57]]
- [[_COMMUNITY_Module 58|Module 58]]
- [[_COMMUNITY_Module 59|Module 59]]
- [[_COMMUNITY_Module 60|Module 60]]
- [[_COMMUNITY_Module 61|Module 61]]
- [[_COMMUNITY_Module 62|Module 62]]
- [[_COMMUNITY_Module 66|Module 66]]
- [[_COMMUNITY_Module 67|Module 67]]
- [[_COMMUNITY_Module 68|Module 68]]
- [[_COMMUNITY_Module 69|Module 69]]
- [[_COMMUNITY_Module 70|Module 70]]
- [[_COMMUNITY_Module 71|Module 71]]
- [[_COMMUNITY_Module 72|Module 72]]
- [[_COMMUNITY_Module 74|Module 74]]
- [[_COMMUNITY_Module 75|Module 75]]
- [[_COMMUNITY_Module 76|Module 76]]
- [[_COMMUNITY_Module 77|Module 77]]
- [[_COMMUNITY_Module 81|Module 81]]
- [[_COMMUNITY_Module 83|Module 83]]
- [[_COMMUNITY_Module 84|Module 84]]
- [[_COMMUNITY_Module 86|Module 86]]
- [[_COMMUNITY_Module 87|Module 87]]
- [[_COMMUNITY_Module 88|Module 88]]
- [[_COMMUNITY_Module 96|Module 96]]
- [[_COMMUNITY_Module 97|Module 97]]
- [[_COMMUNITY_Module 98|Module 98]]
- [[_COMMUNITY_Module 99|Module 99]]
- [[_COMMUNITY_Module 100|Module 100]]
- [[_COMMUNITY_Module 101|Module 101]]
- [[_COMMUNITY_Module 102|Module 102]]
- [[_COMMUNITY_Module 103|Module 103]]

## God Nodes (most connected - your core abstractions)
1. `getCell()` - 66 edges
2. `GameSessionController` - 43 edges
3. `playEvent()` - 38 edges
4. `createButton()` - 36 edges
5. `detectMatches()` - 36 edges
6. `BoardAnimator` - 36 edges
7. `createGem()` - 32 edges
8. `BoardRenderer` - 32 edges
9. `音效委外製作規格書 (Audio Outsourcing Specification)` - 29 edges
10. `Mulberry32` - 28 edges

## Surprising Connections (you probably didn't know these)
- `GameSessionController.executeSwap` --rationale_for--> `Special Combos Matrix`  [INFERRED]
  src/game/runtime/game-session.ts → gdd/01_game_overview.md
- `GameSessionController.runCascadeLoop` --rationale_for--> `Intra-Level Phase Flow`  [INFERRED]
  src/game/runtime/game-session.ts → gdd/06_game_flow.md
- `BoardAnimator.playColourGemStagedTimeline` --rationale_for--> `Special Gems Specification`  [INFERRED]
  src/rendering/board-animator.ts → gdd/01_game_overview.md
- `ScreenRouter` --rationale_for--> `AppState State Machine`  [INFERRED]
  src/integration/screen-router.ts → gdd/06_game_flow.md
- `GameIntegration.transitionTo` --rationale_for--> `AppState State Machine`  [INFERRED]
  src/integration/game-integration.ts → gdd/06_game_flow.md

## Communities (105 total, 47 thin omitted)

### Community 0 - "Game Rules & Scoring"
Cohesion: 0.07
Nodes (73): breakLock(), createBlockerByKind(), isLocked(), processBlockersOnClear(), processJellyOnClear(), tickGenerators(), tickUnstables(), calculateStars() (+65 more)

### Community 1 - "SFX Player & Audio"
Cohesion: 0.05
Nodes (75): getConfig(), getCtx(), getOrCreateHowl(), loadBuffer(), playBlockerImmovable(), playBuffer(), playCascade(), playCombo() (+67 more)

### Community 2 - "Level Spec & Routing"
Cohesion: 0.06
Nodes (37): ScreenRouter, getAllLevelIds(), getLevelsByWorld(), loadLevel(), registerLevel(), createCreditsScreen(), createGameHUD(), createHudCircleButton() (+29 more)

### Community 3 - "Asset Loading"
Cohesion: 0.06
Nodes (11): LoadController, runSplashPreload(), createGame(), BoardRenderer, cellKey(), buildGemSprite(), computeShimmerAlpha(), GemSpriteFactory (+3 more)

### Community 4 - "App Bootstrap & Debug"
Cohesion: 0.06
Nodes (13): ClockScaleController, createStatsPanel(), createDebugPanel(), createDefaultMetrics(), GameIntegration, createLayerHierarchy(), bootstrapApp(), detectBackend() (+5 more)

### Community 5 - "App Entry & Resize"
Cohesion: 0.05
Nodes (58): bootstrapApp() — Pixi init + WebGPU detect, detectBackend() helper, setupResizeHandler (ResizeObserver), main() entry point, createSfxTestPanel (debug DOM panel), LoadController class, fetchWithRetry exponential backoff, runSplashPreload() (+50 more)

### Community 6 - "Accessibility & Rendering"
Cohesion: 0.11
Nodes (25): createAccessibilityConfig(), getColourPalette(), getContrastConfig(), getGemColour(), getMotionConfig(), onPrefersReducedMotionChange(), checkStorageStatus(), clearSessionState() (+17 more)

### Community 7 - "Particle Effects"
Cohesion: 0.1
Nodes (8): emitChainGlow(), emitSpecialSpawnRing(), getRingTex(), getWhiteRingTex(), JellyParticleSystem, MergeParticleSystem, Particle, ParticlePool

### Community 8 - "Audio Design Docs"
Cohesion: 0.11
Nodes (40): Audio Delivery Phases (Phase 1: board+match+chain; Phase 2: special+combo; Phase 3: progression+UI), Audio Design Principles (mystical/warm tone, progressive escalation, non-fatigue, frequency separation), Audio Ducking: Stingers trigger BGM -6dB ducking (chain.tier3, chain.wow, combo.*, level.complete, world.complete), Chain Audio Progression Design, Combo Scale Hierarchy Design, Audio Delivery Phases (51 files), Frequency Band Design Principle, LUFS Loudness Standard (+32 more)

### Community 9 - "Objective Tracking"
Cohesion: 0.07
Nodes (5): ClearTracker, CollectTracker, DropTracker, MultiTracker, ScoreTracker

### Community 12 - "GDD & Requirements"
Cohesion: 0.08
Nodes (27): Consolidated Requirements 2026-05-08, Core Gameplay Loop, Design Pillars, Game Overview (GDD 01), Scoring Economy, Blocker System Design, Scene & Level Design (GDD 02), Objective Types (+19 more)

### Community 13 - "Telemetry Events"
Cohesion: 0.11
Nodes (4): getTelemetry(), resetTelemetry(), TelemetryRecorder, TutorialStepTracker

### Community 14 - "Input Keybinds"
Cohesion: 0.12
Nodes (3): defaultKeybinds(), eventToKeyCode(), KeybindManager

### Community 15 - "Match Detection"
Cohesion: 0.34
Nodes (18): classifyGroup(), classifyMergedShape(), classifySingleRun(), determineSpawnAt(), determineSpecial(), findSharedCells(), getCenterCell(), getIntersectionCell() (+10 more)

### Community 16 - "Endless Mode"
Cohesion: 0.16
Nodes (8): calculateDifficulty(), checkEndlessEndCondition(), createEndlessEndScreenData(), EndlessRunner, getDifficultyParams(), getLeaderboardRank(), updateEndlessBestRecords(), updateLeaderboard()

### Community 20 - "State Event Pools"
Cohesion: 0.16
Nodes (5): createCascadeStepPool(), createIntensityPool(), createMatchLandedPool(), EventBusImpl, EventPool

### Community 21 - "Rendering Filters"
Cohesion: 0.17
Nodes (6): applyBloom(), applyGlowBlur(), createShockwaveEffect(), FilterManager, removeBloom(), removeGlowBlur()

### Community 24 - "Board & Special Gems"
Cohesion: 0.14
Nodes (12): cloneBoard, Special Gems Specification, detectMatches, determineSpecial, mergeRuns, RawRun, scanHorizontal, scanVertical (+4 more)

### Community 27 - "i18n Translation"
Cohesion: 0.22
Nodes (5): detectBrowserLocale(), getTranslator(), initTranslator(), t(), Translator

### Community 28 - "Game Integration Flow"
Cohesion: 0.22
Nodes (14): GameIntegration.initialize, GameIntegration.onStateChanged, GameIntegration.transitionTo, AppState State Machine, ScreenRouter, ScreenRouter.setScreen, ScreenRouter.showLevelComplete, ScreenRouter.showLevelFail (+6 more)

### Community 29 - "Board Data Model"
Cohesion: 0.14
Nodes (14): Board, Cell, createBoard, createGem, Gem, getCell, createGame, GameIntegration (+6 more)

### Community 30 - "Module 30"
Cohesion: 0.19
Nodes (14): BoardAnimator.animateActivation, BoardAnimator.animateCascadeSteps, BoardAnimator.animateSwap, BoardAnimator.playColourGemStagedTimeline, BoardAnimator.playRadiationTimeline, BoardAnimator.runTimeline, GameIntegration.startLevel, ActivateResult (+6 more)

### Community 31 - "Module 31"
Cohesion: 0.38
Nodes (11): buildManifest(), fixFrameNames(), generateBlob(), generateCircle(), generateDiamond(), getAlias(), listFiles(), listPngs() (+3 more)

### Community 32 - "Module 32"
Cohesion: 0.15
Nodes (13): Animation, AnimationManager, createBlastZoneOverlay, createBrewAnimation, createCascadeDropAnimation, createEnhancedBlastAnimation, createGemConvergeAnimation, createMarkEffect (+5 more)

### Community 35 - "Module 35"
Cohesion: 0.22
Nodes (11): createButton, createObjectiveChip, createStarDisplay, objectiveToDisplayInfo, UIButton, UIObjectiveChip, UIStarDisplay, createGameHUD (+3 more)

### Community 37 - "Module 37"
Cohesion: 0.22
Nodes (3): InputSystem, mapPointerSource(), mapPointerType()

### Community 39 - "Module 39"
Cohesion: 0.31
Nodes (9): GameSessionController.checkEndCondition, EndCondition, GameSessionController.executeSwap, Anti-Frustration Stance, 5 Design Pillars, GDD 01: Game Overview, Scoring Economy & Rule Ledger, Special Combos Matrix (+1 more)

### Community 40 - "Module 40"
Cohesion: 0.57
Nodes (6): collectFiles(), estimateGzipSize(), formatBytes(), getFileSize(), getTotalSize(), main()

### Community 41 - "Module 41"
Cohesion: 0.57
Nodes (6): createSpecialOverlayGraphics(), drawAreaOverlay(), drawColourOverlay(), drawLineHOverlay(), drawLineVOverlay(), getSpecialIndicatorColour()

### Community 42 - "Module 42"
Cohesion: 0.39
Nodes (8): Animations, Board Animator, Board Interaction, Board Renderer, Game Integration, Game Session Controller, Staged Blast Timeline, Validate Production Build

### Community 43 - "Module 43"
Cohesion: 0.29
Nodes (7): Art Style & Narrative (GDD 04), Gem Archetypes (7 Colors), Accessibility Requirements, Component Library, Design Tokens System, UI/UX Design (GDD 05), Internationalization (i18n)

### Community 44 - "Module 44"
Cohesion: 0.67
Nodes (5): main(), printBudgets(), validateDrawCalls(), validateFps(), validateMemoryDrift()

### Community 45 - "Module 45"
Cohesion: 0.6
Nodes (4): check(), collectFiles(), formatBytes(), main()

### Community 46 - "Module 46"
Cohesion: 0.8
Nodes (3): getCtx(), playBlockerImmovable(), playJellyHit()

### Community 47 - "Module 47"
Cohesion: 0.5
Nodes (3): CommandQueue, GameEventBus, RulesEngine

### Community 48 - "Module 48"
Cohesion: 0.67
Nodes (4): Gem (Match-3 PixiJS game), game subsystem (pure logic), rendering subsystem (PixiJS), state subsystem (EventBus + AppState)

### Community 49 - "Module 49"
Cohesion: 0.5
Nodes (4): Cascade End-Condition Timing, Chain Multiplier Formula, Move-Counting Rules, Scoring Economy & Rule Ledger

### Community 50 - "Module 50"
Cohesion: 0.5
Nodes (4): Edge Cases (Tab/Offline/Storage), Macro Flow (Screen Navigation), Onboarding Flow (First 3 Minutes), Game Flow State Machine

### Community 51 - "Module 51"
Cohesion: 0.5
Nodes (4): Event Bus Telemetry Hooks, Fail / Retry Flow, Intensity Calculation, Intra-Level Flow (Phase Sequence)

### Community 53 - "Module 53"
Cohesion: 0.67
Nodes (3): Atlas Packing System, Build Pipeline, Performance Budget System

### Community 55 - "Module 55"
Cohesion: 0.67
Nodes (3): Core Gameplay Loop, Special Combos Matrix, Special Gems Spec

## Knowledge Gaps
- **118 isolated node(s):** `Performance Budget System`, `Atlas Packing System`, `setupResizeHandler (ResizeObserver)`, `createSfxTestPanel (debug DOM panel)`, `KeyAction` (+113 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **47 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameSessionController` connect `Game Session Controller` to `Game Rules & Scoring`, `Command Queue`, `Level Spec & Routing`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `ScreenRouter` connect `Level Spec & Routing` to `Game Rules & Scoring`, `Command Queue`, `Accessibility & Rendering`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `KeybindManager` connect `Input Keybinds` to `Command Queue`, `Module 37`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 32 inferred relationships involving `getCell()` (e.g. with `.executeActivation()` and `.snapshotColoursAt()`) actually correct?**
  _`getCell()` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `createButton()` (e.g. with `getButtonColours()` and `createLevelSelectCard()`) actually correct?**
  _`createButton()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `detectMatches()` (e.g. with `scoreSwap()` and `.runCascadeLoop()`) actually correct?**
  _`detectMatches()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Performance Budget System`, `Atlas Packing System`, `setupResizeHandler (ResizeObserver)` to the rest of the system?**
  _118 weakly-connected nodes found - possible documentation gaps or missing edges._