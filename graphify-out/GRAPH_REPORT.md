# Graph Report - .  (2026-05-11)

## Corpus Check
- 97 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1221 nodes · 2917 edges · 79 communities (47 shown, 32 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 205 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_SFX Player & Audio Buffers|SFX Player & Audio Buffers]]
- [[_COMMUNITY_Blocker & Jelly Layer Logic|Blocker & Jelly Layer Logic]]
- [[_COMMUNITY_Board State & Clone Operations|Board State & Clone Operations]]
- [[_COMMUNITY_Level System & Screen Routing|Level System & Screen Routing]]
- [[_COMMUNITY_Board Input & Pointer Handling|Board Input & Pointer Handling]]
- [[_COMMUNITY_Board Queries & Combo Matrix|Board Queries & Combo Matrix]]
- [[_COMMUNITY_Debug Tools & Stats Panel|Debug Tools & Stats Panel]]
- [[_COMMUNITY_App Bootstrap & Load Flow|App Bootstrap & Load Flow]]
- [[_COMMUNITY_Board Interaction System|Board Interaction System]]
- [[_COMMUNITY_Game Integration Core|Game Integration Core]]
- [[_COMMUNITY_Accessibility & Colour Palettes|Accessibility & Colour Palettes]]
- [[_COMMUNITY_Particle Systems & Effects|Particle Systems & Effects]]
- [[_COMMUNITY_Audio Outsource & SFX Design|Audio Outsource & SFX Design]]
- [[_COMMUNITY_Telemetry & Event Tracking|Telemetry & Event Tracking]]
- [[_COMMUNITY_Game Design Document|Game Design Document]]
- [[_COMMUNITY_Audio System Core|Audio System Core]]
- [[_COMMUNITY_Endless Mode Runner|Endless Mode Runner]]
- [[_COMMUNITY_Audio Buses & Volume|Audio Buses & Volume]]
- [[_COMMUNITY_Visual Filters & Bloom|Visual Filters & Bloom]]
- [[_COMMUNITY_Settings UI Form|Settings UI Form]]
- [[_COMMUNITY_Asset Load Controller|Asset Load Controller]]
- [[_COMMUNITY_SFX Catalog & Variants|SFX Catalog & Variants]]
- [[_COMMUNITY_Adaptive Music System|Adaptive Music System]]
- [[_COMMUNITY_Game Rules Modules|Game Rules Modules]]
- [[_COMMUNITY_Bundle Budget Validation|Bundle Budget Validation]]
- [[_COMMUNITY_Core System Orchestration|Core System Orchestration]]
- [[_COMMUNITY_Performance Validation|Performance Validation]]
- [[_COMMUNITY_Art Style & UI Design Docs|Art Style & UI Design Docs]]
- [[_COMMUNITY_Production Validation|Production Validation]]
- [[_COMMUNITY_Atlas Packing Pipeline|Atlas Packing Pipeline]]
- [[_COMMUNITY_Game Loop Core|Game Loop Core]]
- [[_COMMUNITY_Board Data Model|Board Data Model]]
- [[_COMMUNITY_Architecture Documentation|Architecture Documentation]]
- [[_COMMUNITY_Audio Track Definitions|Audio Track Definitions]]
- [[_COMMUNITY_Jelly SFX Playback|Jelly SFX Playback]]
- [[_COMMUNITY_Juice Screen Shake|Juice Screen Shake]]
- [[_COMMUNITY_Build & Asset Pipeline|Build & Asset Pipeline]]
- [[_COMMUNITY_Stats.js Type Definitions|Stats.js Type Definitions]]
- [[_COMMUNITY_Keybind Map|Keybind Map]]
- [[_COMMUNITY_Endless Difficulty|Endless Difficulty]]
- [[_COMMUNITY_Game Loop Events|Game Loop Events]]
- [[_COMMUNITY_i18n Translator|i18n Translator]]
- [[_COMMUNITY_EventBus Integration Docs|EventBus Integration Docs]]
- [[_COMMUNITY_Screen Router Pattern|Screen Router Pattern]]
- [[_COMMUNITY_Endless Difficulty Params|Endless Difficulty Params]]
- [[_COMMUNITY_Hint Timer|Hint Timer]]
- [[_COMMUNITY_Hint Events|Hint Events]]
- [[_COMMUNITY_Reshuffle Init|Reshuffle Init]]
- [[_COMMUNITY_Special Gem Clear Result|Special Gem Clear Result]]
- [[_COMMUNITY_Special Gem Passive Types|Special Gem Passive Types]]
- [[_COMMUNITY_Board Gem Factory|Board Gem Factory]]
- [[_COMMUNITY_Objective Preservation Tests|Objective Preservation Tests]]
- [[_COMMUNITY_Objective Unit Tests|Objective Unit Tests]]
- [[_COMMUNITY_Blocker Tests|Blocker Tests]]
- [[_COMMUNITY_Events Test|Events Test]]
- [[_COMMUNITY_Viewport Tests|Viewport Tests]]
- [[_COMMUNITY_Index HTML|Index HTML]]
- [[_COMMUNITY_Determinism Rules|Determinism Rules]]
- [[_COMMUNITY_World Narrative|World Narrative]]
- [[_COMMUNITY_Additional GDD Specs|Additional GDD Specs]]
- [[_COMMUNITY_Telemetry Spec|Telemetry Spec]]

## God Nodes (most connected - your core abstractions)
1. `getCell()` - 60 edges
2. `GameSessionController` - 40 edges
3. `playEvent()` - 36 edges
4. `createButton()` - 30 edges
5. `detectMatches()` - 30 edges
6. `BoardRenderer` - 29 edges
7. `音效委外製作規格書 (Audio Outsourcing Specification)` - 29 edges
8. `Mulberry32` - 28 edges
9. `AudioSystem` - 28 edges
10. `BoardAnimator` - 28 edges

## Surprising Connections (you probably didn't know these)
- `bootstrapApp() — Pixi init + WebGPU detect` --implements--> `WebGPU/WebGL backend detection`  [EXTRACTED]
  src/app.ts → gdd/03_technical_foundation.md
- `detectBackend() helper` --implements--> `WebGPU/WebGL backend detection`  [EXTRACTED]
  src/app.ts → gdd/03_technical_foundation.md
- `LoadController class` --implements--> `LoadController spec`  [EXTRACTED]
  src/assets/load-controller.ts → gdd/03_technical_foundation.md
- `runSplashPreload()` --implements--> `LoadController spec`  [EXTRACTED]
  src/assets/load-controller.ts → gdd/03_technical_foundation.md
- `fetchWithRetry exponential backoff` --implements--> `LoadController spec`  [EXTRACTED]
  src/assets/load-controller.ts → gdd/03_technical_foundation.md

## Hyperedges (group relationships)
- **Core Game Systems Design** — gdd01_core_loop, gdd01_scoring_economy, gdd02_objective_types, gdd02_blocker_system [INFERRED 0.85]
- **Quality Assurance Pipeline** — gdd09_testing, gdd09_release_gates, gdd09_headless_sim, gdd09_test_coverage [EXTRACTED 1.00]
- **Presentation Layer Design** — gdd04_art_style, gdd05_ui_ux, gdd07_audio, gdd05_design_tokens [INFERRED 0.80]
- **Progressive SFX Escalation System: match.base variants + chain tiers + combo scale gradient form a unified audio escalation arc** — match_base_scale_progression, chain_tier_events, combo_scale_gradient, audio_design_principles [INFERRED 0.85]
- **Stinger+Ducking System: chain.tier3, chain.wow, combo.*, level.complete, world.complete all trigger BGM -6dB ducking together** — audio_ducking_stinger, chain_tier_events, combo_events, progression_events [EXTRACTED 1.00]
- **Jelly 3-tier audio arc: blocker.immovable + jelly.hit.l3 + jelly.hit.l2 + jelly.clear form a pitch-progressive feedback loop for obstacle removal** — jelly_blocker_events, jelly_pitch_progression, sfx_trigger_flow [EXTRACTED 1.00]

## Communities (79 total, 32 thin omitted)

### Community 0 - "SFX Player & Audio Buffers"
Cohesion: 0.05
Nodes (70): getConfig(), getCtx(), getOrCreateHowl(), loadBuffer(), playBlockerImmovable(), playBuffer(), playCascade(), playCombo() (+62 more)

### Community 1 - "Blocker & Jelly Layer Logic"
Cohesion: 0.05
Nodes (24): breakLock(), createBlockerByKind(), isLocked(), JellyOverlay, processBlockersOnClear(), processJellyOnClear(), tickGenerators(), tickUnstables() (+16 more)

### Community 2 - "Board State & Clone Operations"
Cohesion: 0.07
Nodes (46): cloneBlocker(), cloneBoard(), cloneCell(), cloneGem(), createBoard(), createCell(), createGem(), setCell() (+38 more)

### Community 3 - "Level System & Screen Routing"
Cohesion: 0.07
Nodes (25): ScreenRouter, getAllLevelIds(), getLevelsByWorld(), loadLevel(), registerLevel(), createCreditsScreen(), createGameHUD(), createLevelCompleteScreen() (+17 more)

### Community 4 - "Board Input & Pointer Handling"
Cohesion: 0.05
Nodes (11): BoardInput, screenToGrid(), InputSystem, mapPointerSource(), mapPointerType(), defaultKeybinds(), eventToKeyCode(), KeybindManager (+3 more)

### Community 5 - "Board Queries & Combo Matrix"
Cohesion: 0.12
Nodes (28): getCell(), isValidPos(), clearCell(), clearPositions(), colourTransform(), comboKey(), crossClear(), fullBoardClear() (+20 more)

### Community 6 - "Debug Tools & Stats Panel"
Cohesion: 0.05
Nodes (15): ClockScaleController, createStatsPanel(), createDebugPanel(), createDefaultMetrics(), detectBrowserLocale(), getTranslator(), initTranslator(), t() (+7 more)

### Community 7 - "App Bootstrap & Load Flow"
Cohesion: 0.05
Nodes (58): bootstrapApp() — Pixi init + WebGPU detect, detectBackend() helper, setupResizeHandler (ResizeObserver), main() entry point, createSfxTestPanel (debug DOM panel), LoadController class, fetchWithRetry exponential backoff, runSplashPreload() (+50 more)

### Community 8 - "Board Interaction System"
Cohesion: 0.06
Nodes (16): BoardInteraction, createSpecialOverlayGraphics(), drawAreaOverlay(), drawColourOverlay(), drawLineHOverlay(), drawLineVOverlay(), getSpecialIndicatorColour(), createCascadeStepPool() (+8 more)

### Community 9 - "Game Integration Core"
Cohesion: 0.09
Nodes (11): playStone(), preloadStoneSfx(), createGame(), BoardRenderer, cellKey(), buildGemSprite(), computeShimmerAlpha(), GemSpriteFactory (+3 more)

### Community 10 - "Accessibility & Colour Palettes"
Cohesion: 0.11
Nodes (25): createAccessibilityConfig(), getColourPalette(), getContrastConfig(), getGemColour(), getMotionConfig(), onPrefersReducedMotionChange(), checkStorageStatus(), clearSessionState() (+17 more)

### Community 11 - "Particle Systems & Effects"
Cohesion: 0.11
Nodes (7): emitChainGlow(), emitSpecialSpawnRing(), getRingTex(), JellyParticleSystem, MergeParticleSystem, Particle, ParticlePool

### Community 12 - "Audio Outsource & SFX Design"
Cohesion: 0.11
Nodes (40): Audio Delivery Phases (Phase 1: board+match+chain; Phase 2: special+combo; Phase 3: progression+UI), Audio Design Principles (mystical/warm tone, progressive escalation, non-fatigue, frequency separation), Audio Ducking: Stingers trigger BGM -6dB ducking (chain.tier3, chain.wow, combo.*, level.complete, world.complete), Chain Audio Progression Design, Combo Scale Hierarchy Design, Audio Delivery Phases (51 files), Frequency Band Design Principle, LUFS Loudness Standard (+32 more)

### Community 13 - "Telemetry & Event Tracking"
Cohesion: 0.11
Nodes (4): getTelemetry(), resetTelemetry(), TelemetryRecorder, TutorialStepTracker

### Community 14 - "Game Design Document"
Cohesion: 0.08
Nodes (27): Consolidated Requirements 2026-05-08, Core Gameplay Loop, Design Pillars, Game Overview (GDD 01), Scoring Economy, Blocker System Design, Scene & Level Design (GDD 02), Objective Types (+19 more)

### Community 16 - "Endless Mode Runner"
Cohesion: 0.16
Nodes (8): calculateDifficulty(), checkEndlessEndCondition(), createEndlessEndScreenData(), EndlessRunner, getDifficultyParams(), getLeaderboardRank(), updateEndlessBestRecords(), updateLeaderboard()

### Community 18 - "Visual Filters & Bloom"
Cohesion: 0.16
Nodes (6): applyBloom(), applyGlowBlur(), createShockwaveEffect(), FilterManager, removeBloom(), removeGlowBlur()

### Community 23 - "Game Rules Modules"
Cohesion: 0.21
Nodes (6): cloneBoard, detectMatches, findValidSwaps, createRngStreams, Mulberry32, RngStreams

### Community 24 - "Bundle Budget Validation"
Cohesion: 0.57
Nodes (6): collectFiles(), estimateGzipSize(), formatBytes(), getFileSize(), getTotalSize(), main()

### Community 25 - "Core System Orchestration"
Cohesion: 0.39
Nodes (8): Animations, Board Animator, Board Interaction, Board Renderer, Game Integration, Game Session Controller, Staged Blast Timeline, Validate Production Build

### Community 26 - "Performance Validation"
Cohesion: 0.67
Nodes (5): main(), printBudgets(), validateDrawCalls(), validateFps(), validateMemoryDrift()

### Community 27 - "Art Style & UI Design Docs"
Cohesion: 0.29
Nodes (7): Art Style & Narrative (GDD 04), Gem Archetypes (7 Colors), Accessibility Requirements, Component Library, Design Tokens System, UI/UX Design (GDD 05), Internationalization (i18n)

### Community 28 - "Production Validation"
Cohesion: 0.6
Nodes (4): check(), collectFiles(), formatBytes(), main()

### Community 29 - "Atlas Packing Pipeline"
Cohesion: 0.8
Nodes (3): buildManifest(), listFiles(), main()

### Community 30 - "Game Loop Core"
Cohesion: 0.5
Nodes (3): CommandQueue, GameEventBus, RulesEngine

### Community 31 - "Board Data Model"
Cohesion: 0.5
Nodes (4): Board, Cell, Gem, scanHorizontal

### Community 32 - "Architecture Documentation"
Cohesion: 0.67
Nodes (4): Gem (Match-3 PixiJS game), game subsystem (pure logic), rendering subsystem (PixiJS), state subsystem (EventBus + AppState)

### Community 34 - "Jelly SFX Playback"
Cohesion: 0.83
Nodes (3): getCtx(), playBlockerImmovable(), playJellyHit()

### Community 36 - "Build & Asset Pipeline"
Cohesion: 0.67
Nodes (3): Atlas Packing System, Build Pipeline, Performance Budget System

## Knowledge Gaps
- **76 isolated node(s):** `Performance Budget System`, `Atlas Packing System`, `setupResizeHandler (ResizeObserver)`, `createSfxTestPanel (debug DOM panel)`, `KeyAction` (+71 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameSessionController` connect `Board Queries & Combo Matrix` to `Blocker & Jelly Layer Logic`, `Board State & Clone Operations`, `Board Input & Pointer Handling`, `Debug Tools & Stats Panel`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `LoadController` connect `Asset Load Controller` to `Board Input & Pointer Handling`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 31 inferred relationships involving `getCell()` (e.g. with `.executeActivation()` and `.snapshotColoursAt()`) actually correct?**
  _`getCell()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `createButton()` (e.g. with `getButtonColours()` and `createLevelSelectCard()`) actually correct?**
  _`createButton()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `detectMatches()` (e.g. with `scoreSwap()` and `.runCascadeLoop()`) actually correct?**
  _`detectMatches()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Performance Budget System`, `Atlas Packing System`, `setupResizeHandler (ResizeObserver)` to the rest of the system?**
  _76 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SFX Player & Audio Buffers` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._