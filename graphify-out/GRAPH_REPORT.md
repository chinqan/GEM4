# Graph Report - .  (2026-05-12)

## Corpus Check
- 98 files · ~50,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1360 nodes · 3256 edges · 109 communities (59 shown, 50 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 232 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Game Rules & Session|Game Rules & Session]]
- [[_COMMUNITY_SFX Player & Catalog|SFX Player & Catalog]]
- [[_COMMUNITY_Level Spec & Screen Router|Level Spec & Screen Router]]
- [[_COMMUNITY_Debug & Legacy Audio|Debug & Legacy Audio]]
- [[_COMMUNITY_App Bootstrap & i18n|App Bootstrap & i18n]]
- [[_COMMUNITY_Code Index & Resize|Code Index & Resize]]
- [[_COMMUNITY_Special Gems & Board Ops|Special Gems & Board Ops]]
- [[_COMMUNITY_Accessibility & Rendering|Accessibility & Rendering]]
- [[_COMMUNITY_Objective Tracking|Objective Tracking]]
- [[_COMMUNITY_Particle Systems|Particle Systems]]
- [[_COMMUNITY_Audio Design (GDD)|Audio Design (GDD)]]
- [[_COMMUNITY_Audio System Core|Audio System Core]]
- [[_COMMUNITY_Telemetry|Telemetry]]
- [[_COMMUNITY_GDD Overview & Requirements|GDD Overview & Requirements]]
- [[_COMMUNITY_Input & Keybinds|Input & Keybinds]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]

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

## Communities (109 total, 50 thin omitted)

### Community 0 - "Game Rules & Session"
Cohesion: 0.06
Nodes (76): breakLock(), createBlockerByKind(), isLocked(), processBlockersOnClear(), processJellyOnClear(), tickGenerators(), tickUnstables(), calculateStars() (+68 more)

### Community 1 - "SFX Player & Catalog"
Cohesion: 0.05
Nodes (72): getConfig(), getCtx(), getOrCreateHowl(), loadBuffer(), playBlockerImmovable(), playBuffer(), playCascade(), playCombo() (+64 more)

### Community 2 - "Level Spec & Screen Router"
Cohesion: 0.07
Nodes (26): ScreenRouter, getAllLevelIds(), getLevelsByWorld(), loadLevel(), registerLevel(), createCreditsScreen(), createGameHUD(), createLevelCompleteScreen() (+18 more)

### Community 3 - "Debug & Legacy Audio"
Cohesion: 0.06
Nodes (16): playStone(), preloadStoneSfx(), ClockScaleController, createStatsPanel(), createDebugPanel(), createDefaultMetrics(), createGame(), formatObjectiveText() (+8 more)

### Community 4 - "App Bootstrap & i18n"
Cohesion: 0.07
Nodes (14): detectBrowserLocale(), getTranslator(), initTranslator(), t(), Translator, GameIntegration, createLayerHierarchy(), bootstrapApp() (+6 more)

### Community 5 - "Code Index & Resize"
Cohesion: 0.05
Nodes (58): bootstrapApp() — Pixi init + WebGPU detect, detectBackend() helper, setupResizeHandler (ResizeObserver), main() entry point, createSfxTestPanel (debug DOM panel), LoadController class, fetchWithRetry exponential backoff, runSplashPreload() (+50 more)

### Community 6 - "Special Gems & Board Ops"
Cohesion: 0.15
Nodes (15): getCell(), activateAreaBomb(), activateColourGem(), activateLineBomb(), areaBombTargets(), clearCell(), clearPositions(), findPassiveActivations() (+7 more)

### Community 7 - "Accessibility & Rendering"
Cohesion: 0.11
Nodes (25): createAccessibilityConfig(), getColourPalette(), getContrastConfig(), getGemColour(), getMotionConfig(), onPrefersReducedMotionChange(), checkStorageStatus(), clearSessionState() (+17 more)

### Community 8 - "Objective Tracking"
Cohesion: 0.06
Nodes (6): ClearTracker, CollectTracker, createTracker(), DropTracker, MultiTracker, ScoreTracker

### Community 9 - "Particle Systems"
Cohesion: 0.11
Nodes (7): emitChainGlow(), emitSpecialSpawnRing(), getRingTex(), JellyParticleSystem, MergeParticleSystem, Particle, ParticlePool

### Community 10 - "Audio Design (GDD)"
Cohesion: 0.11
Nodes (40): Audio Delivery Phases (Phase 1: board+match+chain; Phase 2: special+combo; Phase 3: progression+UI), Audio Design Principles (mystical/warm tone, progressive escalation, non-fatigue, frequency separation), Audio Ducking: Stingers trigger BGM -6dB ducking (chain.tier3, chain.wow, combo.*, level.complete, world.complete), Chain Audio Progression Design, Combo Scale Hierarchy Design, Audio Delivery Phases (51 files), Frequency Band Design Principle, LUFS Loudness Standard (+32 more)

### Community 12 - "Telemetry"
Cohesion: 0.11
Nodes (4): getTelemetry(), resetTelemetry(), TelemetryRecorder, TutorialStepTracker

### Community 13 - "GDD Overview & Requirements"
Cohesion: 0.08
Nodes (27): Consolidated Requirements 2026-05-08, Core Gameplay Loop, Design Pillars, Game Overview (GDD 01), Scoring Economy, Blocker System Design, Scene & Level Design (GDD 02), Objective Types (+19 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (8): calculateDifficulty(), checkEndlessEndCondition(), createEndlessEndScreenData(), EndlessRunner, getDifficultyParams(), getLeaderboardRank(), updateEndlessBestRecords(), updateLeaderboard()

### Community 17 - "Community 17"
Cohesion: 0.16
Nodes (6): applyBloom(), applyGlowBlur(), createShockwaveEffect(), FilterManager, removeBloom(), removeGlowBlur()

### Community 19 - "Community 19"
Cohesion: 0.16
Nodes (5): createCascadeStepPool(), createIntensityPool(), createMatchLandedPool(), EventBusImpl, EventPool

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (9): cloneBoard, detectMatches, RawRun, scanHorizontal, scanVertical, findValidSwaps, createRngStreams, Mulberry32 (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (14): BoardAnimator.animateActivation, createBoard, createGem, getCell, createGame, GameIntegration, GameIntegration.startLevel, GameIntegration.updateHud (+6 more)

### Community 27 - "Community 27"
Cohesion: 0.22
Nodes (14): GameIntegration.initialize, GameIntegration.onStateChanged, GameIntegration.transitionTo, AppState State Machine, ScreenRouter, ScreenRouter.setScreen, ScreenRouter.showLevelComplete, ScreenRouter.showLevelFail (+6 more)

### Community 29 - "Community 29"
Cohesion: 0.15
Nodes (13): Animation, AnimationManager, createBlastZoneOverlay, createBrewAnimation, createCascadeDropAnimation, createEnhancedBlastAnimation, createGemConvergeAnimation, createMarkEffect (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.24
Nodes (3): mapPointerSource(), mapPointerType(), CommandQueue

### Community 33 - "Community 33"
Cohesion: 0.22
Nodes (11): createButton, createObjectiveChip, createStarDisplay, objectiveToDisplayInfo, UIButton, UIObjectiveChip, UIStarDisplay, createGameHUD (+3 more)

### Community 35 - "Community 35"
Cohesion: 0.31
Nodes (9): GameSessionController.checkEndCondition, EndCondition, GameSessionController.executeSwap, Anti-Frustration Stance, 5 Design Pillars, GDD 01: Game Overview, Scoring Economy & Rule Ledger, Special Combos Matrix (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.57
Nodes (6): collectFiles(), estimateGzipSize(), formatBytes(), getFileSize(), getTotalSize(), main()

### Community 37 - "Community 37"
Cohesion: 0.57
Nodes (6): createSpecialOverlayGraphics(), drawAreaOverlay(), drawColourOverlay(), drawLineHOverlay(), drawLineVOverlay(), getSpecialIndicatorColour()

### Community 38 - "Community 38"
Cohesion: 0.39
Nodes (8): Animations, Board Animator, Board Interaction, Board Renderer, Game Integration, Game Session Controller, Staged Blast Timeline, Validate Production Build

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (8): BoardAnimator.animateSwap, BoardAnimator.playColourGemStagedTimeline, BoardAnimator.playRadiationTimeline, BoardAnimator.runTimeline, SwapResult, Special Gems Specification, determineSpecial, mergeRuns

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (5): main(), printBudgets(), validateDrawCalls(), validateFps(), validateMemoryDrift()

### Community 42 - "Community 42"
Cohesion: 0.29
Nodes (7): Art Style & Narrative (GDD 04), Gem Archetypes (7 Colors), Accessibility Requirements, Component Library, Design Tokens System, UI/UX Design (GDD 05), Internationalization (i18n)

### Community 44 - "Community 44"
Cohesion: 0.6
Nodes (4): check(), collectFiles(), formatBytes(), main()

### Community 45 - "Community 45"
Cohesion: 0.8
Nodes (3): buildManifest(), listFiles(), main()

### Community 46 - "Community 46"
Cohesion: 0.8
Nodes (3): getCtx(), playBlockerImmovable(), playJellyHit()

### Community 47 - "Community 47"
Cohesion: 0.4
Nodes (5): BoardAnimator.animateCascadeSteps, BoardSnapshot, CascadeStep, GameSessionController.runCascadeLoop, Intra-Level Phase Flow

### Community 49 - "Community 49"
Cohesion: 0.5
Nodes (3): CommandQueue, GameEventBus, RulesEngine

### Community 50 - "Community 50"
Cohesion: 0.67
Nodes (4): Gem (Match-3 PixiJS game), game subsystem (pure logic), rendering subsystem (PixiJS), state subsystem (EventBus + AppState)

### Community 51 - "Community 51"
Cohesion: 0.5
Nodes (4): Cascade End-Condition Timing, Chain Multiplier Formula, Move-Counting Rules, Scoring Economy & Rule Ledger

### Community 52 - "Community 52"
Cohesion: 0.5
Nodes (4): Board, Cell, Gem, GameSessionController.runGravity

### Community 53 - "Community 53"
Cohesion: 0.5
Nodes (4): Edge Cases (Tab/Offline/Storage), Macro Flow (Screen Navigation), Onboarding Flow (First 3 Minutes), Game Flow State Machine

### Community 54 - "Community 54"
Cohesion: 0.5
Nodes (4): Event Bus Telemetry Hooks, Fail / Retry Flow, Intensity Calculation, Intra-Level Flow (Phase Sequence)

### Community 55 - "Community 55"
Cohesion: 0.67
Nodes (3): Atlas Packing System, Build Pipeline, Performance Budget System

### Community 58 - "Community 58"
Cohesion: 0.67
Nodes (3): Core Gameplay Loop, Special Combos Matrix, Special Gems Spec

## Knowledge Gaps
- **118 isolated node(s):** `Performance Budget System`, `Atlas Packing System`, `setupResizeHandler (ResizeObserver)`, `createSfxTestPanel (debug DOM panel)`, `KeyAction` (+113 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameSessionController` connect `Special Gems & Board Ops` to `Game Rules & Session`, `Objective Tracking`, `Debug & Legacy Audio`, `Community 31`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `KeybindManager` connect `Input & Keybinds` to `Community 32`, `Community 31`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `BoardRenderer` connect `Debug & Legacy Audio` to `SFX Player & Catalog`, `Community 31`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 32 inferred relationships involving `getCell()` (e.g. with `.executeActivation()` and `.snapshotColoursAt()`) actually correct?**
  _`getCell()` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `detectMatches()` (e.g. with `scoreSwap()` and `.runCascadeLoop()`) actually correct?**
  _`detectMatches()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Performance Budget System`, `Atlas Packing System`, `setupResizeHandler (ResizeObserver)` to the rest of the system?**
  _118 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Game Rules & Session` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._