# Graph Report - .  (2026-05-12)

## Corpus Check
- 99 files · ~114,117 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1379 nodes · 3283 edges · 113 communities (63 shown, 50 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 232 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Level & Screen Routing|Level & Screen Routing]]
- [[_COMMUNITY_Scoring & Game Session|Scoring & Game Session]]
- [[_COMMUNITY_Board Logic & Matching|Board Logic & Matching]]
- [[_COMMUNITY_App Init & i18n|App Init & i18n]]
- [[_COMMUNITY_App Bootstrap & Index|App Bootstrap & Index]]
- [[_COMMUNITY_Game Integration & SFX|Game Integration & SFX]]
- [[_COMMUNITY_Objectives & Tracking|Objectives & Tracking]]
- [[_COMMUNITY_Particle Effects|Particle Effects]]
- [[_COMMUNITY_Board Animator & Juice|Board Animator & Juice]]
- [[_COMMUNITY_Audio Design Docs|Audio Design Docs]]
- [[_COMMUNITY_SFX Player Core|SFX Player Core]]
- [[_COMMUNITY_Rendering Filters|Rendering Filters]]
- [[_COMMUNITY_Audio System Class|Audio System Class]]
- [[_COMMUNITY_Telemetry Events|Telemetry Events]]
- [[_COMMUNITY_GDD Overview & Requirements|GDD Overview & Requirements]]
- [[_COMMUNITY_Input Keybinds|Input Keybinds]]
- [[_COMMUNITY_Endless Mode|Endless Mode]]
- [[_COMMUNITY_Audio Buses|Audio Buses]]
- [[_COMMUNITY_Animation Factories|Animation Factories]]
- [[_COMMUNITY_Asset Load Controller|Asset Load Controller]]
- [[_COMMUNITY_Settings Form|Settings Form]]
- [[_COMMUNITY_State Events & Pools|State Events & Pools]]
- [[_COMMUNITY_Debug Stats & Clock|Debug Stats & Clock]]
- [[_COMMUNITY_Board Input Handler|Board Input Handler]]
- [[_COMMUNITY_SFX Catalog|SFX Catalog]]
- [[_COMMUNITY_Board Module Helpers|Board Module Helpers]]
- [[_COMMUNITY_Adaptive Music|Adaptive Music]]
- [[_COMMUNITY_Game Integration States|Game Integration States]]
- [[_COMMUNITY_Board Creation & Cells|Board Creation & Cells]]
- [[_COMMUNITY_Synth SFX Engine|Synth SFX Engine]]
- [[_COMMUNITY_Module Group 30|Module Group 30]]
- [[_COMMUNITY_Module Group 31|Module Group 31]]
- [[_COMMUNITY_Module Group 32|Module Group 32]]
- [[_COMMUNITY_Module Group 33|Module Group 33]]
- [[_COMMUNITY_Module Group 34|Module Group 34]]
- [[_COMMUNITY_Module Group 35|Module Group 35]]
- [[_COMMUNITY_Module Group 36|Module Group 36]]
- [[_COMMUNITY_Module Group 37|Module Group 37]]
- [[_COMMUNITY_Module Group 38|Module Group 38]]
- [[_COMMUNITY_Module Group 39|Module Group 39]]
- [[_COMMUNITY_Module Group 40|Module Group 40]]
- [[_COMMUNITY_Module Group 41|Module Group 41]]
- [[_COMMUNITY_Module Group 42|Module Group 42]]
- [[_COMMUNITY_Module Group 43|Module Group 43]]
- [[_COMMUNITY_Module Group 44|Module Group 44]]
- [[_COMMUNITY_Module Group 45|Module Group 45]]
- [[_COMMUNITY_Module Group 46|Module Group 46]]
- [[_COMMUNITY_Module Group 47|Module Group 47]]
- [[_COMMUNITY_Module Group 48|Module Group 48]]
- [[_COMMUNITY_Module Group 49|Module Group 49]]
- [[_COMMUNITY_Module Group 50|Module Group 50]]
- [[_COMMUNITY_Module Group 51|Module Group 51]]
- [[_COMMUNITY_Module Group 52|Module Group 52]]
- [[_COMMUNITY_Module Group 53|Module Group 53]]
- [[_COMMUNITY_Module Group 54|Module Group 54]]
- [[_COMMUNITY_Module Group 55|Module Group 55]]
- [[_COMMUNITY_Module Group 56|Module Group 56]]
- [[_COMMUNITY_Module Group 57|Module Group 57]]
- [[_COMMUNITY_Module Group 58|Module Group 58]]
- [[_COMMUNITY_Module Group 59|Module Group 59]]
- [[_COMMUNITY_Module Group 60|Module Group 60]]
- [[_COMMUNITY_Module Group 61|Module Group 61]]
- [[_COMMUNITY_Module Group 62|Module Group 62]]
- [[_COMMUNITY_Module Group 63|Module Group 63]]
- [[_COMMUNITY_Module Group 64|Module Group 64]]
- [[_COMMUNITY_Module Group 65|Module Group 65]]
- [[_COMMUNITY_Module Group 66|Module Group 66]]
- [[_COMMUNITY_Module Group 67|Module Group 67]]
- [[_COMMUNITY_Module Group 68|Module Group 68]]
- [[_COMMUNITY_Module Group 69|Module Group 69]]
- [[_COMMUNITY_Module Group 73|Module Group 73]]
- [[_COMMUNITY_Module Group 74|Module Group 74]]
- [[_COMMUNITY_Module Group 75|Module Group 75]]
- [[_COMMUNITY_Module Group 76|Module Group 76]]
- [[_COMMUNITY_Module Group 77|Module Group 77]]
- [[_COMMUNITY_Module Group 78|Module Group 78]]
- [[_COMMUNITY_Module Group 79|Module Group 79]]
- [[_COMMUNITY_Module Group 81|Module Group 81]]
- [[_COMMUNITY_Module Group 82|Module Group 82]]
- [[_COMMUNITY_Module Group 83|Module Group 83]]
- [[_COMMUNITY_Module Group 84|Module Group 84]]
- [[_COMMUNITY_Module Group 88|Module Group 88]]
- [[_COMMUNITY_Module Group 90|Module Group 90]]
- [[_COMMUNITY_Module Group 91|Module Group 91]]
- [[_COMMUNITY_Module Group 93|Module Group 93]]
- [[_COMMUNITY_Module Group 94|Module Group 94]]
- [[_COMMUNITY_Module Group 95|Module Group 95]]
- [[_COMMUNITY_Module Group 104|Module Group 104]]
- [[_COMMUNITY_Module Group 105|Module Group 105]]
- [[_COMMUNITY_Module Group 106|Module Group 106]]
- [[_COMMUNITY_Module Group 107|Module Group 107]]
- [[_COMMUNITY_Module Group 108|Module Group 108]]
- [[_COMMUNITY_Module Group 109|Module Group 109]]
- [[_COMMUNITY_Module Group 110|Module Group 110]]
- [[_COMMUNITY_Module Group 111|Module Group 111]]

## God Nodes (most connected - your core abstractions)
1. `getCell()` - 65 edges
2. `GameSessionController` - 41 edges
3. `playEvent()` - 36 edges
4. `detectMatches()` - 35 edges
5. `BoardAnimator` - 34 edges
6. `createButton()` - 33 edges
7. `createGem()` - 31 edges
8. `BoardRenderer` - 29 edges
9. `音效委外製作規格書 (Audio Outsourcing Specification)` - 29 edges
10. `Mulberry32` - 28 edges

## Surprising Connections (you probably didn't know these)
- `GameSessionController.executeSwap` --rationale_for--> `Special Combos Matrix`  [INFERRED]
  src/game/runtime/game-session.ts → gdd/01_game_overview.md
- `GameSessionController.runCascadeLoop` --rationale_for--> `Intra-Level Phase Flow`  [INFERRED]
  src/game/runtime/game-session.ts → gdd/06_game_flow.md
- `ScreenRouter` --rationale_for--> `AppState State Machine`  [INFERRED]
  src/integration/screen-router.ts → gdd/06_game_flow.md
- `GameIntegration.transitionTo` --rationale_for--> `AppState State Machine`  [INFERRED]
  src/integration/game-integration.ts → gdd/06_game_flow.md
- `GameSessionController.checkEndCondition` --rationale_for--> `Cascade End-Condition Timing Intent`  [INFERRED]
  src/game/runtime/game-session.ts → gdd/06_game_flow.md

## Hyperedges (group relationships)
- **Quality Assurance Pipeline** — gdd09_testing, gdd09_release_gates, gdd09_headless_sim, gdd09_test_coverage [EXTRACTED 1.00]
- **Presentation Layer Design** — gdd04_art_style, gdd05_ui_ux, gdd07_audio, gdd05_design_tokens [INFERRED 0.80]
- **Progressive SFX Escalation System: match.base variants + chain tiers + combo scale gradient form a unified audio escalation arc** — match_base_scale_progression, chain_tier_events, combo_scale_gradient, audio_design_principles [INFERRED 0.85]
- **Stinger+Ducking System: chain.tier3, chain.wow, combo.*, level.complete, world.complete all trigger BGM -6dB ducking together** — audio_ducking_stinger, chain_tier_events, combo_events, progression_events [EXTRACTED 1.00]
- **Jelly 3-tier audio arc: blocker.immovable + jelly.hit.l3 + jelly.hit.l2 + jelly.clear form a pitch-progressive feedback loop for obstacle removal** — jelly_blocker_events, jelly_pitch_progression, sfx_trigger_flow [EXTRACTED 1.00]
- **Complete Game Lifecycle** — game_flow_state_machine, game_flow_intra_level, game_flow_fail_retry, game_flow_onboarding [INFERRED 0.85]

## Communities (113 total, 50 thin omitted)

### Community 0 - "Level & Screen Routing"
Cohesion: 0.06
Nodes (33): ScreenRouter, getAllLevelIds(), getLevelsByWorld(), loadLevel(), registerLevel(), createCreditsScreen(), createGameHUD(), createLevelCompleteScreen() (+25 more)

### Community 1 - "Scoring & Game Session"
Cohesion: 0.07
Nodes (42): breakLock(), createBlockerByKind(), isLocked(), processBlockersOnClear(), processJellyOnClear(), tickGenerators(), tickUnstables(), getCell() (+34 more)

### Community 2 - "Board Logic & Matching"
Cohesion: 0.07
Nodes (50): AnimationManager, cloneBlocker(), cloneBoard(), cloneCell(), cloneGem(), createBoard(), createCell(), createGem() (+42 more)

### Community 3 - "App Init & i18n"
Cohesion: 0.07
Nodes (14): detectBrowserLocale(), getTranslator(), initTranslator(), t(), Translator, GameIntegration, createLayerHierarchy(), bootstrapApp() (+6 more)

### Community 4 - "App Bootstrap & Index"
Cohesion: 0.05
Nodes (58): bootstrapApp() — Pixi init + WebGPU detect, detectBackend() helper, setupResizeHandler (ResizeObserver), main() entry point, createSfxTestPanel (debug DOM panel), LoadController class, fetchWithRetry exponential backoff, runSplashPreload() (+50 more)

### Community 5 - "Game Integration & SFX"
Cohesion: 0.08
Nodes (12): playStone(), preloadStoneSfx(), createGame(), formatObjectiveText(), BoardRenderer, cellKey(), buildGemSprite(), computeShimmerAlpha() (+4 more)

### Community 6 - "Objectives & Tracking"
Cohesion: 0.07
Nodes (7): calculateStars(), ClearTracker, CollectTracker, createTracker(), DropTracker, MultiTracker, ScoreTracker

### Community 7 - "Particle Effects"
Cohesion: 0.1
Nodes (7): emitChainGlow(), emitSpecialSpawnRing(), getRingTex(), JellyParticleSystem, MergeParticleSystem, Particle, ParticlePool

### Community 8 - "Board Animator & Juice"
Cohesion: 0.11
Nodes (6): playSwap(), createScorePopup(), detectPrefersReducedMotion(), BoardAnimator, chebyshev(), computeStagedPhases()

### Community 9 - "Audio Design Docs"
Cohesion: 0.11
Nodes (40): Audio Delivery Phases (Phase 1: board+match+chain; Phase 2: special+combo; Phase 3: progression+UI), Audio Design Principles (mystical/warm tone, progressive escalation, non-fatigue, frequency separation), Audio Ducking: Stingers trigger BGM -6dB ducking (chain.tier3, chain.wow, combo.*, level.complete, world.complete), Chain Audio Progression Design, Combo Scale Hierarchy Design, Audio Delivery Phases (51 files), Frequency Band Design Principle, LUFS Loudness Standard (+32 more)

### Community 10 - "SFX Player Core"
Cohesion: 0.13
Nodes (36): getConfig(), getCtx(), getOrCreateHowl(), loadBuffer(), playBlockerImmovable(), playBuffer(), playCascade(), playCombo() (+28 more)

### Community 11 - "Rendering Filters"
Cohesion: 0.1
Nodes (18): applyBloom(), applyGlowBlur(), createShockwaveEffect(), FilterManager, removeBloom(), removeGlowBlur(), checkStorageStatus(), clearSessionState() (+10 more)

### Community 13 - "Telemetry Events"
Cohesion: 0.11
Nodes (4): getTelemetry(), resetTelemetry(), TelemetryRecorder, TutorialStepTracker

### Community 14 - "GDD Overview & Requirements"
Cohesion: 0.08
Nodes (27): Consolidated Requirements 2026-05-08, Core Gameplay Loop, Design Pillars, Game Overview (GDD 01), Scoring Economy, Blocker System Design, Scene & Level Design (GDD 02), Objective Types (+19 more)

### Community 16 - "Endless Mode"
Cohesion: 0.16
Nodes (8): calculateDifficulty(), checkEndlessEndCondition(), createEndlessEndScreenData(), EndlessRunner, getDifficultyParams(), getLeaderboardRank(), updateEndlessBestRecords(), updateLeaderboard()

### Community 18 - "Animation Factories"
Cohesion: 0.32
Nodes (16): createBlastZoneOverlay(), createBrewAnimation(), createCascadeDropAnimation(), createChainSaturationPulse(), createEnhancedBlastAnimation(), createGemConvergeAnimation(), createInvalidShakeAnimation(), createMarkEffect() (+8 more)

### Community 21 - "State Events & Pools"
Cohesion: 0.16
Nodes (5): createCascadeStepPool(), createIntensityPool(), createMatchLandedPool(), EventBusImpl, EventPool

### Community 22 - "Debug Stats & Clock"
Cohesion: 0.16
Nodes (4): ClockScaleController, createStatsPanel(), createDebugPanel(), createDefaultMetrics()

### Community 25 - "Board Module Helpers"
Cohesion: 0.17
Nodes (9): cloneBoard, detectMatches, RawRun, scanHorizontal, scanVertical, findValidSwaps, createRngStreams, Mulberry32 (+1 more)

### Community 27 - "Game Integration States"
Cohesion: 0.22
Nodes (14): GameIntegration.initialize, GameIntegration.onStateChanged, GameIntegration.transitionTo, AppState State Machine, ScreenRouter, ScreenRouter.setScreen, ScreenRouter.showLevelComplete, ScreenRouter.showLevelFail (+6 more)

### Community 28 - "Board Creation & Cells"
Cohesion: 0.18
Nodes (14): BoardAnimator.animateActivation, createBoard, createGem, getCell, createGame, GameIntegration, GameIntegration.startLevel, GameIntegration.updateHud (+6 more)

### Community 29 - "Synth SFX Engine"
Cohesion: 0.3
Nodes (13): ensure(), getNoiseBuffer(), loadAllBuffers(), play(), playCascade(), playCombo(), playInvalid(), playLevelComplete() (+5 more)

### Community 31 - "Module Group 31"
Cohesion: 0.28
Nodes (9): buildManifest(), fixFrameNames(), generateBlob(), generateCircle(), generateDiamond(), listFiles(), main(), packAtlas() (+1 more)

### Community 32 - "Module Group 32"
Cohesion: 0.15
Nodes (13): Animation, AnimationManager, createBlastZoneOverlay, createBrewAnimation, createCascadeDropAnimation, createEnhancedBlastAnimation, createGemConvergeAnimation, createMarkEffect (+5 more)

### Community 34 - "Module Group 34"
Cohesion: 0.24
Nodes (3): mapPointerSource(), mapPointerType(), CommandQueue

### Community 36 - "Module Group 36"
Cohesion: 0.22
Nodes (11): createButton, createObjectiveChip, createStarDisplay, objectiveToDisplayInfo, UIButton, UIObjectiveChip, UIStarDisplay, createGameHUD (+3 more)

### Community 38 - "Module Group 38"
Cohesion: 0.31
Nodes (9): GameSessionController.checkEndCondition, EndCondition, GameSessionController.executeSwap, Anti-Frustration Stance, 5 Design Pillars, GDD 01: Game Overview, Scoring Economy & Rule Ledger, Special Combos Matrix (+1 more)

### Community 39 - "Module Group 39"
Cohesion: 0.57
Nodes (6): collectFiles(), estimateGzipSize(), formatBytes(), getFileSize(), getTotalSize(), main()

### Community 40 - "Module Group 40"
Cohesion: 0.39
Nodes (8): Animations, Board Animator, Board Interaction, Board Renderer, Game Integration, Game Session Controller, Staged Blast Timeline, Validate Production Build

### Community 41 - "Module Group 41"
Cohesion: 0.57
Nodes (6): createSpecialOverlayGraphics(), drawAreaOverlay(), drawColourOverlay(), drawLineHOverlay(), drawLineVOverlay(), getSpecialIndicatorColour()

### Community 42 - "Module Group 42"
Cohesion: 0.29
Nodes (8): BoardAnimator.animateSwap, BoardAnimator.playColourGemStagedTimeline, BoardAnimator.playRadiationTimeline, BoardAnimator.runTimeline, SwapResult, Special Gems Specification, determineSpecial, mergeRuns

### Community 43 - "Module Group 43"
Cohesion: 0.5
Nodes (6): createAccessibilityConfig(), getColourPalette(), getContrastConfig(), getGemColour(), getMotionConfig(), onPrefersReducedMotionChange()

### Community 44 - "Module Group 44"
Cohesion: 0.67
Nodes (5): main(), printBudgets(), validateDrawCalls(), validateFps(), validateMemoryDrift()

### Community 46 - "Module Group 46"
Cohesion: 0.29
Nodes (7): Art Style & Narrative (GDD 04), Gem Archetypes (7 Colors), Accessibility Requirements, Component Library, Design Tokens System, UI/UX Design (GDD 05), Internationalization (i18n)

### Community 48 - "Module Group 48"
Cohesion: 0.6
Nodes (4): check(), collectFiles(), formatBytes(), main()

### Community 50 - "Module Group 50"
Cohesion: 0.8
Nodes (3): getCtx(), playBlockerImmovable(), playJellyHit()

### Community 51 - "Module Group 51"
Cohesion: 0.4
Nodes (5): BoardAnimator.animateCascadeSteps, BoardSnapshot, CascadeStep, GameSessionController.runCascadeLoop, Intra-Level Phase Flow

### Community 53 - "Module Group 53"
Cohesion: 0.5
Nodes (3): CommandQueue, GameEventBus, RulesEngine

### Community 54 - "Module Group 54"
Cohesion: 0.67
Nodes (4): Gem (Match-3 PixiJS game), game subsystem (pure logic), rendering subsystem (PixiJS), state subsystem (EventBus + AppState)

### Community 55 - "Module Group 55"
Cohesion: 0.5
Nodes (4): Cascade End-Condition Timing, Chain Multiplier Formula, Move-Counting Rules, Scoring Economy & Rule Ledger

### Community 56 - "Module Group 56"
Cohesion: 0.5
Nodes (4): Board, Cell, Gem, GameSessionController.runGravity

### Community 57 - "Module Group 57"
Cohesion: 0.5
Nodes (4): Edge Cases (Tab/Offline/Storage), Macro Flow (Screen Navigation), Onboarding Flow (First 3 Minutes), Game Flow State Machine

### Community 58 - "Module Group 58"
Cohesion: 0.5
Nodes (4): Event Bus Telemetry Hooks, Fail / Retry Flow, Intensity Calculation, Intra-Level Flow (Phase Sequence)

### Community 60 - "Module Group 60"
Cohesion: 0.67
Nodes (3): Atlas Packing System, Build Pipeline, Performance Budget System

### Community 62 - "Module Group 62"
Cohesion: 0.67
Nodes (3): Core Gameplay Loop, Special Combos Matrix, Special Gems Spec

## Knowledge Gaps
- **118 isolated node(s):** `Performance Budget System`, `Atlas Packing System`, `setupResizeHandler (ResizeObserver)`, `createSfxTestPanel (debug DOM panel)`, `KeyAction` (+113 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameSessionController` connect `Scoring & Game Session` to `Board Logic & Matching`, `Module Group 35`, `Game Integration & SFX`, `Objectives & Tracking`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `KeybindManager` connect `Input Keybinds` to `Module Group 34`, `Module Group 35`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `BoardRenderer` connect `Game Integration & SFX` to `Animation Factories`, `Module Group 35`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 32 inferred relationships involving `getCell()` (e.g. with `.executeActivation()` and `.snapshotColoursAt()`) actually correct?**
  _`getCell()` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `detectMatches()` (e.g. with `scoreSwap()` and `.runCascadeLoop()`) actually correct?**
  _`detectMatches()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Performance Budget System`, `Atlas Packing System`, `setupResizeHandler (ResizeObserver)` to the rest of the system?**
  _118 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Level & Screen Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._