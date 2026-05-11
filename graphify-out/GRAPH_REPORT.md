# Graph Report - .  (2026-05-11)

## Corpus Check
- 98 files · ~108,949 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1241 nodes · 2988 edges · 99 communities (58 shown, 41 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 205 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Scoring & Game Session|Scoring & Game Session]]
- [[_COMMUNITY_Level System & Integration|Level System & Integration]]
- [[_COMMUNITY_Match Detection & Board Logic|Match Detection & Board Logic]]
- [[_COMMUNITY_Combo Matrix & Board Ops|Combo Matrix & Board Ops]]
- [[_COMMUNITY_App Bootstrap & Entry|App Bootstrap & Entry]]
- [[_COMMUNITY_i18n & UI Screens|i18n & UI Screens]]
- [[_COMMUNITY_Accessibility & Rendering Config|Accessibility & Rendering Config]]
- [[_COMMUNITY_Board Renderer|Board Renderer]]
- [[_COMMUNITY_Particle Effects|Particle Effects]]
- [[_COMMUNITY_Audio Design Docs|Audio Design Docs]]
- [[_COMMUNITY_SFX Player|SFX Player]]
- [[_COMMUNITY_Audio Synth & Animator|Audio Synth & Animator]]
- [[_COMMUNITY_Telemetry Events|Telemetry Events]]
- [[_COMMUNITY_GDD Consolidated Reqs|GDD Consolidated Reqs]]
- [[_COMMUNITY_Audio System Core|Audio System Core]]
- [[_COMMUNITY_Keybind Manager|Keybind Manager]]
- [[_COMMUNITY_Endless Mode|Endless Mode]]
- [[_COMMUNITY_Audio Buses|Audio Buses]]
- [[_COMMUNITY_Settings Form|Settings Form]]
- [[_COMMUNITY_Animation Library|Animation Library]]
- [[_COMMUNITY_State Events & Pools|State Events & Pools]]
- [[_COMMUNITY_Rendering Filters|Rendering Filters]]
- [[_COMMUNITY_Asset Load Controller|Asset Load Controller]]
- [[_COMMUNITY_Board Input|Board Input]]
- [[_COMMUNITY_Debug Stats|Debug Stats]]
- [[_COMMUNITY_Input System & Viewport|Input System & Viewport]]
- [[_COMMUNITY_Adaptive Music|Adaptive Music]]
- [[_COMMUNITY_Audio Catalog|Audio Catalog]]
- [[_COMMUNITY_Synth SFX Buffers|Synth SFX Buffers]]
- [[_COMMUNITY_Board Interaction|Board Interaction]]
- [[_COMMUNITY_Board & Game Loop Modules|Board & Game Loop Modules]]
- [[_COMMUNITY_Keybinds & Command Queue|Keybinds & Command Queue]]
- [[_COMMUNITY_Game Integration Helpers|Game Integration Helpers]]
- [[_COMMUNITY_Stone SFX & Index|Stone SFX & Index]]
- [[_COMMUNITY_Build Budget Validation|Build Budget Validation]]
- [[_COMMUNITY_Animation Module Refs|Animation Module Refs]]
- [[_COMMUNITY_Animation Manager|Animation Manager]]
- [[_COMMUNITY_Special Overlay Graphics|Special Overlay Graphics]]
- [[_COMMUNITY_Perf Validation|Perf Validation]]
- [[_COMMUNITY_Art Style & Accessibility GDD|Art Style & Accessibility GDD]]
- [[_COMMUNITY_Input System Class|Input System Class]]
- [[_COMMUNITY_Production Validation|Production Validation]]
- [[_COMMUNITY_Atlas Packing|Atlas Packing]]
- [[_COMMUNITY_Staged Blast|Staged Blast]]
- [[_COMMUNITY_Adaptive Music Tracks|Adaptive Music Tracks]]
- [[_COMMUNITY_Game Loop Interfaces|Game Loop Interfaces]]
- [[_COMMUNITY_Board Data Types|Board Data Types]]
- [[_COMMUNITY_CLAUDE.md Project Info|CLAUDE.md Project Info]]
- [[_COMMUNITY_Jelly SFX|Jelly SFX]]
- [[_COMMUNITY_Scoring Rules (GDD)|Scoring Rules (GDD)]]
- [[_COMMUNITY_UI Juice Shake|UI Juice Shake]]
- [[_COMMUNITY_Stats Type Defs|Stats Type Defs]]
- [[_COMMUNITY_Build Pipeline Docs|Build Pipeline Docs]]
- [[_COMMUNITY_Special Gems GDD Spec|Special Gems GDD Spec]]
- [[_COMMUNITY_Keybind Types|Keybind Types]]
- [[_COMMUNITY_Endless Difficulty|Endless Difficulty]]
- [[_COMMUNITY_Game Loop Commands|Game Loop Commands]]
- [[_COMMUNITY_Translator Types|Translator Types]]
- [[_COMMUNITY_Event Bus Integration|Event Bus Integration]]
- [[_COMMUNITY_Design Pillars & Anti-Frustration|Design Pillars & Anti-Frustration]]
- [[_COMMUNITY_Screen Router Pattern|Screen Router Pattern]]
- [[_COMMUNITY_Endless Difficulty Params|Endless Difficulty Params]]
- [[_COMMUNITY_Hint Timer|Hint Timer]]
- [[_COMMUNITY_Hint Event|Hint Event]]
- [[_COMMUNITY_Reshuffle Init|Reshuffle Init]]
- [[_COMMUNITY_Special Gems Clear|Special Gems Clear]]
- [[_COMMUNITY_Special Gems Passive|Special Gems Passive]]
- [[_COMMUNITY_Board Create Gem|Board Create Gem]]
- [[_COMMUNITY_Objective Preservation Tests|Objective Preservation Tests]]
- [[_COMMUNITY_Objective Unit Tests|Objective Unit Tests]]
- [[_COMMUNITY_Blocker Tests|Blocker Tests]]
- [[_COMMUNITY_Events Test|Events Test]]
- [[_COMMUNITY_Viewport Tests|Viewport Tests]]
- [[_COMMUNITY_Index Document|Index Document]]
- [[_COMMUNITY_Determinism|Determinism]]
- [[_COMMUNITY_World Narrative|World Narrative]]
- [[_COMMUNITY_Additional Specs|Additional Specs]]
- [[_COMMUNITY_Telemetry GDD|Telemetry GDD]]
- [[_COMMUNITY_Gem Game Concept|Gem Game Concept]]
- [[_COMMUNITY_Success Metrics|Success Metrics]]

## God Nodes (most connected - your core abstractions)
1. `getCell()` - 60 edges
2. `GameSessionController` - 40 edges
3. `playEvent()` - 36 edges
4. `detectMatches()` - 33 edges
5. `createButton()` - 30 edges
6. `BoardRenderer` - 29 edges
7. `BoardAnimator` - 29 edges
8. `音效委外製作規格書 (Audio Outsourcing Specification)` - 29 edges
9. `Mulberry32` - 28 edges
10. `AudioSystem` - 28 edges

## Surprising Connections (you probably didn't know these)
- `placeBLockers()` --calls--> `getCell()`  [INFERRED]
  game/runtime/reshuffle.ts → /Users/chinqan/GEM4/src/game/rules/board.ts
- `initBoard()` --calls--> `getCell()`  [INFERRED]
  game/runtime/reshuffle.ts → /Users/chinqan/GEM4/src/game/rules/board.ts
- `bootstrapApp() — Pixi init + WebGPU detect` --implements--> `WebGPU/WebGL backend detection`  [EXTRACTED]
  src/app.ts → gdd/03_technical_foundation.md
- `detectBackend() helper` --implements--> `WebGPU/WebGL backend detection`  [EXTRACTED]
  src/app.ts → gdd/03_technical_foundation.md
- `LoadController class` --implements--> `LoadController spec`  [EXTRACTED]
  src/assets/load-controller.ts → gdd/03_technical_foundation.md

## Hyperedges (group relationships)
- **Scoring Design-to-Code Pipeline** — 01_game_overview_scoring_economy, 01_game_overview_chain_multiplier, scoring_chainMultiplier, scoring_scoreMatch [INFERRED 0.85]
- **Special Gem Full Specification** — 01_game_overview_special_gems, 01_game_overview_special_combos, special-gems_createSpecialGem, combo-matrix_COMBO_MATRIX [INFERRED 0.80]

## Communities (99 total, 41 thin omitted)

### Community 0 - "Scoring & Game Session"
Cohesion: 0.05
Nodes (24): breakLock(), createBlockerByKind(), isLocked(), JellyOverlay, processBlockersOnClear(), processJellyOnClear(), tickGenerators(), tickUnstables() (+16 more)

### Community 1 - "Level System & Integration"
Cohesion: 0.07
Nodes (26): ScreenRouter, getAllLevelIds(), getLevelsByWorld(), loadLevel(), registerLevel(), createCreditsScreen(), createGameHUD(), createLevelCompleteScreen() (+18 more)

### Community 2 - "Match Detection & Board Logic"
Cohesion: 0.08
Nodes (47): cloneBlocker(), cloneBoard(), cloneCell(), cloneGem(), createBoard(), createCell(), createGem(), setCell() (+39 more)

### Community 3 - "Combo Matrix & Board Ops"
Cohesion: 0.11
Nodes (28): getCell(), isValidPos(), clearCell(), clearPositions(), colourTransform(), comboKey(), crossClear(), fullBoardClear() (+20 more)

### Community 4 - "App Bootstrap & Entry"
Cohesion: 0.05
Nodes (58): bootstrapApp() — Pixi init + WebGPU detect, detectBackend() helper, setupResizeHandler (ResizeObserver), main() entry point, createSfxTestPanel (debug DOM panel), LoadController class, fetchWithRetry exponential backoff, runSplashPreload() (+50 more)

### Community 5 - "i18n & UI Screens"
Cohesion: 0.07
Nodes (14): detectBrowserLocale(), getTranslator(), initTranslator(), t(), Translator, GameIntegration, createLayerHierarchy(), bootstrapApp() (+6 more)

### Community 6 - "Accessibility & Rendering Config"
Cohesion: 0.11
Nodes (25): createAccessibilityConfig(), getColourPalette(), getContrastConfig(), getGemColour(), getMotionConfig(), onPrefersReducedMotionChange(), checkStorageStatus(), clearSessionState() (+17 more)

### Community 7 - "Board Renderer"
Cohesion: 0.11
Nodes (5): BoardRenderer, cellKey(), buildGemSprite(), computeShimmerAlpha(), GemSpriteFactory

### Community 8 - "Particle Effects"
Cohesion: 0.11
Nodes (7): emitChainGlow(), emitSpecialSpawnRing(), getRingTex(), JellyParticleSystem, MergeParticleSystem, Particle, ParticlePool

### Community 9 - "Audio Design Docs"
Cohesion: 0.11
Nodes (40): Audio Delivery Phases (Phase 1: board+match+chain; Phase 2: special+combo; Phase 3: progression+UI), Audio Design Principles (mystical/warm tone, progressive escalation, non-fatigue, frequency separation), Audio Ducking: Stingers trigger BGM -6dB ducking (chain.tier3, chain.wow, combo.*, level.complete, world.complete), Chain Audio Progression Design, Combo Scale Hierarchy Design, Audio Delivery Phases (51 files), Frequency Band Design Principle, LUFS Loudness Standard (+32 more)

### Community 10 - "SFX Player"
Cohesion: 0.13
Nodes (35): getConfig(), getCtx(), getOrCreateHowl(), loadBuffer(), playBlockerImmovable(), playBuffer(), playCascade(), playCombo() (+27 more)

### Community 11 - "Audio Synth & Animator"
Cohesion: 0.14
Nodes (5): playJellyHitByLayer(), playSwap(), createScorePopup(), detectPrefersReducedMotion(), BoardAnimator

### Community 12 - "Telemetry Events"
Cohesion: 0.11
Nodes (4): getTelemetry(), resetTelemetry(), TelemetryRecorder, TutorialStepTracker

### Community 13 - "GDD Consolidated Reqs"
Cohesion: 0.08
Nodes (27): Consolidated Requirements 2026-05-08, Core Gameplay Loop, Design Pillars, Game Overview (GDD 01), Scoring Economy, Blocker System Design, Scene & Level Design (GDD 02), Objective Types (+19 more)

### Community 16 - "Endless Mode"
Cohesion: 0.16
Nodes (8): calculateDifficulty(), checkEndlessEndCondition(), createEndlessEndScreenData(), EndlessRunner, getDifficultyParams(), getLeaderboardRank(), updateEndlessBestRecords(), updateLeaderboard()

### Community 19 - "Animation Library"
Cohesion: 0.32
Nodes (15): createBlastZoneOverlay(), createBrewAnimation(), createCascadeDropAnimation(), createChainSaturationPulse(), createEnhancedBlastAnimation(), createInvalidShakeAnimation(), createMarkEffect(), createMatchClearAnimation() (+7 more)

### Community 20 - "State Events & Pools"
Cohesion: 0.16
Nodes (5): createCascadeStepPool(), createIntensityPool(), createMatchLandedPool(), EventBusImpl, EventPool

### Community 21 - "Rendering Filters"
Cohesion: 0.17
Nodes (6): applyBloom(), applyGlowBlur(), createShockwaveEffect(), FilterManager, removeBloom(), removeGlowBlur()

### Community 24 - "Debug Stats"
Cohesion: 0.18
Nodes (4): ClockScaleController, createStatsPanel(), createDebugPanel(), createDefaultMetrics()

### Community 25 - "Input System & Viewport"
Cohesion: 0.18
Nodes (4): mapPointerSource(), mapPointerType(), calculateViewport(), ViewportManager

### Community 27 - "Audio Catalog"
Cohesion: 0.19
Nodes (3): SfxCatalog, sfxSrc(), createMockEventBus()

### Community 28 - "Synth SFX Buffers"
Cohesion: 0.3
Nodes (13): ensure(), getNoiseBuffer(), loadAllBuffers(), play(), playCascade(), playCombo(), playInvalid(), playLevelComplete() (+5 more)

### Community 30 - "Board & Game Loop Modules"
Cohesion: 0.21
Nodes (6): cloneBoard, detectMatches, findValidSwaps, createRngStreams, Mulberry32, RngStreams

### Community 31 - "Keybinds & Command Queue"
Cohesion: 0.27
Nodes (3): defaultKeybinds(), eventToKeyCode(), CommandQueue

### Community 33 - "Stone SFX & Index"
Cohesion: 0.56
Nodes (6): playStone(), preloadStoneSfx(), createGame(), preloadGemTextures(), createSfxTestPanel(), main()

### Community 34 - "Build Budget Validation"
Cohesion: 0.57
Nodes (6): collectFiles(), estimateGzipSize(), formatBytes(), getFileSize(), getTotalSize(), main()

### Community 35 - "Animation Module Refs"
Cohesion: 0.39
Nodes (8): Animations, Board Animator, Board Interaction, Board Renderer, Game Integration, Game Session Controller, Staged Blast Timeline, Validate Production Build

### Community 37 - "Special Overlay Graphics"
Cohesion: 0.57
Nodes (6): createSpecialOverlayGraphics(), drawAreaOverlay(), drawColourOverlay(), drawLineHOverlay(), drawLineVOverlay(), getSpecialIndicatorColour()

### Community 38 - "Perf Validation"
Cohesion: 0.67
Nodes (5): main(), printBudgets(), validateDrawCalls(), validateFps(), validateMemoryDrift()

### Community 39 - "Art Style & Accessibility GDD"
Cohesion: 0.29
Nodes (7): Art Style & Narrative (GDD 04), Gem Archetypes (7 Colors), Accessibility Requirements, Component Library, Design Tokens System, UI/UX Design (GDD 05), Internationalization (i18n)

### Community 41 - "Production Validation"
Cohesion: 0.6
Nodes (4): check(), collectFiles(), formatBytes(), main()

### Community 42 - "Atlas Packing"
Cohesion: 0.8
Nodes (3): buildManifest(), listFiles(), main()

### Community 46 - "Game Loop Interfaces"
Cohesion: 0.5
Nodes (3): CommandQueue, GameEventBus, RulesEngine

### Community 47 - "Board Data Types"
Cohesion: 0.5
Nodes (4): Board, Cell, Gem, scanHorizontal

### Community 48 - "CLAUDE.md Project Info"
Cohesion: 0.67
Nodes (4): Gem (Match-3 PixiJS game), game subsystem (pure logic), rendering subsystem (PixiJS), state subsystem (EventBus + AppState)

### Community 49 - "Jelly SFX"
Cohesion: 0.83
Nodes (3): getCtx(), playBlockerImmovable(), playJellyHit()

### Community 50 - "Scoring Rules (GDD)"
Cohesion: 0.5
Nodes (4): Cascade End-Condition Timing, Chain Multiplier Formula, Move-Counting Rules, Scoring Economy & Rule Ledger

### Community 53 - "Build Pipeline Docs"
Cohesion: 0.67
Nodes (3): Atlas Packing System, Build Pipeline, Performance Budget System

### Community 54 - "Special Gems GDD Spec"
Cohesion: 0.67
Nodes (3): Core Gameplay Loop, Special Combos Matrix, Special Gems Spec

## Knowledge Gaps
- **85 isolated node(s):** `Performance Budget System`, `Atlas Packing System`, `setupResizeHandler (ResizeObserver)`, `createSfxTestPanel (debug DOM panel)`, `KeyAction` (+80 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameSessionController` connect `Combo Matrix & Board Ops` to `Scoring & Game Session`, `Level System & Integration`, `Match Detection & Board Logic`, `Game Integration Helpers`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `KeybindManager` connect `Keybind Manager` to `Game Integration Helpers`, `Input System & Viewport`, `Keybinds & Command Queue`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `LoadController` connect `Asset Load Controller` to `Game Integration Helpers`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 31 inferred relationships involving `getCell()` (e.g. with `.executeActivation()` and `.snapshotColoursAt()`) actually correct?**
  _`getCell()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `detectMatches()` (e.g. with `scoreSwap()` and `.runCascadeLoop()`) actually correct?**
  _`detectMatches()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `createButton()` (e.g. with `getButtonColours()` and `createLevelSelectCard()`) actually correct?**
  _`createButton()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Performance Budget System`, `Atlas Packing System`, `setupResizeHandler (ResizeObserver)` to the rest of the system?**
  _85 weakly-connected nodes found - possible documentation gaps or missing edges._