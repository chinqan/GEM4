# Graph Report - .  (2026-05-11)

## Corpus Check
- 1247 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1247 nodes · 3020 edges · 94 communities (56 shown, 38 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 205 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Scoring & Game Session|Scoring & Game Session]]
- [[_COMMUNITY_Level System & Screen Router|Level System & Screen Router]]
- [[_COMMUNITY_Match Detection & Board Rules|Match Detection & Board Rules]]
- [[_COMMUNITY_Blocker & Jelly System|Blocker & Jelly System]]
- [[_COMMUNITY_Board Input & Interaction|Board Input & Interaction]]
- [[_COMMUNITY_App Bootstrap & i18n|App Bootstrap & i18n]]
- [[_COMMUNITY_Bootstrap & Asset Loading|Bootstrap & Asset Loading]]
- [[_COMMUNITY_Board Rendering|Board Rendering]]
- [[_COMMUNITY_Particle Effects|Particle Effects]]
- [[_COMMUNITY_SFX Playback Engine|SFX Playback Engine]]
- [[_COMMUNITY_Audio Design & Delivery|Audio Design & Delivery]]
- [[_COMMUNITY_Game State & Persistence|Game State & Persistence]]
- [[_COMMUNITY_Animation & Juice|Animation & Juice]]
- [[_COMMUNITY_Audio System|Audio System]]
- [[_COMMUNITY_Telemetry & Analytics|Telemetry & Analytics]]
- [[_COMMUNITY_Game Design Documents|Game Design Documents]]
- [[_COMMUNITY_Endless Mode|Endless Mode]]
- [[_COMMUNITY_Audio Bus & Volume|Audio Bus & Volume]]
- [[_COMMUNITY_Visual Filters & Shaders|Visual Filters & Shaders]]
- [[_COMMUNITY_Rendering Animations|Rendering Animations]]
- [[_COMMUNITY_Settings Form|Settings Form]]
- [[_COMMUNITY_Event Bus & Pools|Event Bus & Pools]]
- [[_COMMUNITY_Asset Load Controller|Asset Load Controller]]
- [[_COMMUNITY_Debug Stats & Clock|Debug Stats & Clock]]
- [[_COMMUNITY_SFX Catalog & Audio|SFX Catalog & Audio]]
- [[_COMMUNITY_Synth SFX Engine|Synth SFX Engine]]
- [[_COMMUNITY_Adaptive Music|Adaptive Music]]
- [[_COMMUNITY_Board Interaction Layer|Board Interaction Layer]]
- [[_COMMUNITY_Game Integration Entry|Game Integration Entry]]
- [[_COMMUNITY_Board Module & Game Loop|Board Module & Game Loop]]
- [[_COMMUNITY_Build Budget Validation|Build Budget Validation]]
- [[_COMMUNITY_Rendering Accessibility|Rendering Accessibility]]
- [[_COMMUNITY_Animation Manager|Animation Manager]]
- [[_COMMUNITY_Module Integration References|Module Integration References]]
- [[_COMMUNITY_Special Gem Overlays|Special Gem Overlays]]
- [[_COMMUNITY_Perf Validation Tools|Perf Validation Tools]]
- [[_COMMUNITY_Art Style & Design Tokens GDD|Art Style & Design Tokens GDD]]
- [[_COMMUNITY_Production Validation|Production Validation]]
- [[_COMMUNITY_Staged Blast System|Staged Blast System]]
- [[_COMMUNITY_Atlas Packing Tools|Atlas Packing Tools]]
- [[_COMMUNITY_Misc 40|Misc 40]]
- [[_COMMUNITY_Misc 41|Misc 41]]
- [[_COMMUNITY_Misc 42|Misc 42]]
- [[_COMMUNITY_Misc 43|Misc 43]]
- [[_COMMUNITY_Misc 44|Misc 44]]
- [[_COMMUNITY_Misc 45|Misc 45]]
- [[_COMMUNITY_Misc 46|Misc 46]]
- [[_COMMUNITY_Misc 47|Misc 47]]
- [[_COMMUNITY_Misc 48|Misc 48]]
- [[_COMMUNITY_Misc 49|Misc 49]]
- [[_COMMUNITY_Misc 50|Misc 50]]
- [[_COMMUNITY_Misc 51|Misc 51]]
- [[_COMMUNITY_Misc 52|Misc 52]]
- [[_COMMUNITY_Misc 53|Misc 53]]
- [[_COMMUNITY_Misc 54|Misc 54]]
- [[_COMMUNITY_Misc 55|Misc 55]]
- [[_COMMUNITY_Misc 59|Misc 59]]
- [[_COMMUNITY_Misc 60|Misc 60]]
- [[_COMMUNITY_Misc 61|Misc 61]]
- [[_COMMUNITY_Misc 62|Misc 62]]
- [[_COMMUNITY_Misc 63|Misc 63]]
- [[_COMMUNITY_Misc 64|Misc 64]]
- [[_COMMUNITY_Misc 65|Misc 65]]
- [[_COMMUNITY_Misc 67|Misc 67]]
- [[_COMMUNITY_Misc 68|Misc 68]]
- [[_COMMUNITY_Misc 69|Misc 69]]
- [[_COMMUNITY_Misc 70|Misc 70]]
- [[_COMMUNITY_Misc 71|Misc 71]]
- [[_COMMUNITY_Misc 75|Misc 75]]
- [[_COMMUNITY_Misc 77|Misc 77]]
- [[_COMMUNITY_Misc 78|Misc 78]]
- [[_COMMUNITY_Misc 80|Misc 80]]
- [[_COMMUNITY_Misc 81|Misc 81]]
- [[_COMMUNITY_Misc 82|Misc 82]]
- [[_COMMUNITY_Misc 92|Misc 92]]
- [[_COMMUNITY_Misc 93|Misc 93]]

## God Nodes (most connected - your core abstractions)
1. `getCell()` - 60 edges
2. `GameSessionController` - 40 edges
3. `playEvent()` - 36 edges
4. `detectMatches()` - 33 edges
5. `createButton()` - 31 edges
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
- `runCascade()` --calls--> `detectMatches()`  [INFERRED]
  /Users/chinqan/GEM4/src/game/rules/cascade.ts → game/rules/match-detect.ts
- `bootstrapApp() — Pixi init + WebGPU detect` --implements--> `WebGPU/WebGL backend detection`  [EXTRACTED]
  src/app.ts → gdd/03_technical_foundation.md
- `detectBackend() helper` --implements--> `WebGPU/WebGL backend detection`  [EXTRACTED]
  src/app.ts → gdd/03_technical_foundation.md

## Communities (94 total, 38 thin omitted)

### Community 0 - "Scoring & Game Session"
Cohesion: 0.05
Nodes (20): calculateStars(), ClearTracker, CollectTracker, createTracker(), DropTracker, MultiTracker, ScoreTracker, applyGravity() (+12 more)

### Community 1 - "Level System & Screen Router"
Cohesion: 0.07
Nodes (26): ScreenRouter, getAllLevelIds(), getLevelsByWorld(), loadLevel(), registerLevel(), createCreditsScreen(), createGameHUD(), createLevelCompleteScreen() (+18 more)

### Community 2 - "Match Detection & Board Rules"
Cohesion: 0.08
Nodes (43): cloneBlocker(), cloneBoard(), cloneCell(), cloneGem(), createBoard(), createCell(), createGem(), setCell() (+35 more)

### Community 3 - "Blocker & Jelly System"
Cohesion: 0.08
Nodes (37): breakLock(), createBlockerByKind(), isLocked(), JellyOverlay, processBlockersOnClear(), processJellyOnClear(), tickGenerators(), tickUnstables() (+29 more)

### Community 4 - "Board Input & Interaction"
Cohesion: 0.05
Nodes (10): BoardInput, screenToGrid(), InputSystem, mapPointerSource(), mapPointerType(), defaultKeybinds(), eventToKeyCode(), KeybindManager (+2 more)

### Community 5 - "App Bootstrap & i18n"
Cohesion: 0.07
Nodes (14): detectBrowserLocale(), getTranslator(), initTranslator(), t(), Translator, GameIntegration, createLayerHierarchy(), bootstrapApp() (+6 more)

### Community 6 - "Bootstrap & Asset Loading"
Cohesion: 0.05
Nodes (58): bootstrapApp() — Pixi init + WebGPU detect, detectBackend() helper, setupResizeHandler (ResizeObserver), main() entry point, createSfxTestPanel (debug DOM panel), LoadController class, fetchWithRetry exponential backoff, runSplashPreload() (+50 more)

### Community 7 - "Board Rendering"
Cohesion: 0.11
Nodes (5): BoardRenderer, cellKey(), buildGemSprite(), computeShimmerAlpha(), GemSpriteFactory

### Community 8 - "Particle Effects"
Cohesion: 0.11
Nodes (7): emitChainGlow(), emitSpecialSpawnRing(), getRingTex(), JellyParticleSystem, MergeParticleSystem, Particle, ParticlePool

### Community 9 - "SFX Playback Engine"
Cohesion: 0.13
Nodes (36): getConfig(), getCtx(), getOrCreateHowl(), loadBuffer(), playBlockerImmovable(), playBuffer(), playCascade(), playCombo() (+28 more)

### Community 10 - "Audio Design & Delivery"
Cohesion: 0.11
Nodes (40): Audio Delivery Phases (Phase 1: board+match+chain; Phase 2: special+combo; Phase 3: progression+UI), Audio Design Principles (mystical/warm tone, progressive escalation, non-fatigue, frequency separation), Audio Ducking: Stingers trigger BGM -6dB ducking (chain.tier3, chain.wow, combo.*, level.complete, world.complete), Chain Audio Progression Design, Combo Scale Hierarchy Design, Audio Delivery Phases (51 files), Frequency Band Design Principle, LUFS Loudness Standard (+32 more)

### Community 11 - "Game State & Persistence"
Cohesion: 0.14
Nodes (19): checkStorageStatus(), clearSessionState(), EdgeCaseManager, getSaveTimestamp(), loadSessionState(), safeGetItem(), safeSetItem(), saveSessionState() (+11 more)

### Community 12 - "Animation & Juice"
Cohesion: 0.18
Nodes (3): createScorePopup(), detectPrefersReducedMotion(), BoardAnimator

### Community 14 - "Telemetry & Analytics"
Cohesion: 0.11
Nodes (4): getTelemetry(), resetTelemetry(), TelemetryRecorder, TutorialStepTracker

### Community 15 - "Game Design Documents"
Cohesion: 0.08
Nodes (27): Consolidated Requirements 2026-05-08, Core Gameplay Loop, Design Pillars, Game Overview (GDD 01), Scoring Economy, Blocker System Design, Scene & Level Design (GDD 02), Objective Types (+19 more)

### Community 16 - "Endless Mode"
Cohesion: 0.16
Nodes (8): calculateDifficulty(), checkEndlessEndCondition(), createEndlessEndScreenData(), EndlessRunner, getDifficultyParams(), getLeaderboardRank(), updateEndlessBestRecords(), updateLeaderboard()

### Community 18 - "Visual Filters & Shaders"
Cohesion: 0.16
Nodes (6): applyBloom(), applyGlowBlur(), createShockwaveEffect(), FilterManager, removeBloom(), removeGlowBlur()

### Community 19 - "Rendering Animations"
Cohesion: 0.32
Nodes (15): createBlastZoneOverlay(), createBrewAnimation(), createCascadeDropAnimation(), createChainSaturationPulse(), createEnhancedBlastAnimation(), createInvalidShakeAnimation(), createMarkEffect(), createMatchClearAnimation() (+7 more)

### Community 21 - "Event Bus & Pools"
Cohesion: 0.16
Nodes (5): createCascadeStepPool(), createIntensityPool(), createMatchLandedPool(), EventBusImpl, EventPool

### Community 23 - "Debug Stats & Clock"
Cohesion: 0.18
Nodes (4): ClockScaleController, createStatsPanel(), createDebugPanel(), createDefaultMetrics()

### Community 25 - "Synth SFX Engine"
Cohesion: 0.27
Nodes (14): ensure(), getNoiseBuffer(), loadAllBuffers(), play(), playCascade(), playCombo(), playInvalid(), playLevelComplete() (+6 more)

### Community 28 - "Game Integration Entry"
Cohesion: 0.36
Nodes (7): playStone(), preloadStoneSfx(), createGame(), formatObjectiveText(), preloadGemTextures(), createSfxTestPanel(), main()

### Community 29 - "Board Module & Game Loop"
Cohesion: 0.21
Nodes (6): cloneBoard, detectMatches, findValidSwaps, createRngStreams, Mulberry32, RngStreams

### Community 30 - "Build Budget Validation"
Cohesion: 0.57
Nodes (6): collectFiles(), estimateGzipSize(), formatBytes(), getFileSize(), getTotalSize(), main()

### Community 31 - "Rendering Accessibility"
Cohesion: 0.5
Nodes (6): createAccessibilityConfig(), getColourPalette(), getContrastConfig(), getGemColour(), getMotionConfig(), onPrefersReducedMotionChange()

### Community 33 - "Module Integration References"
Cohesion: 0.39
Nodes (8): Animations, Board Animator, Board Interaction, Board Renderer, Game Integration, Game Session Controller, Staged Blast Timeline, Validate Production Build

### Community 34 - "Special Gem Overlays"
Cohesion: 0.57
Nodes (6): createSpecialOverlayGraphics(), drawAreaOverlay(), drawColourOverlay(), drawLineHOverlay(), drawLineVOverlay(), getSpecialIndicatorColour()

### Community 35 - "Perf Validation Tools"
Cohesion: 0.67
Nodes (5): main(), printBudgets(), validateDrawCalls(), validateFps(), validateMemoryDrift()

### Community 36 - "Art Style & Design Tokens GDD"
Cohesion: 0.29
Nodes (7): Art Style & Narrative (GDD 04), Gem Archetypes (7 Colors), Accessibility Requirements, Component Library, Design Tokens System, UI/UX Design (GDD 05), Internationalization (i18n)

### Community 37 - "Production Validation"
Cohesion: 0.6
Nodes (4): check(), collectFiles(), formatBytes(), main()

### Community 39 - "Atlas Packing Tools"
Cohesion: 0.8
Nodes (3): buildManifest(), listFiles(), main()

### Community 41 - "Misc 41"
Cohesion: 0.5
Nodes (3): CommandQueue, GameEventBus, RulesEngine

### Community 42 - "Misc 42"
Cohesion: 0.5
Nodes (4): Board, Cell, Gem, scanHorizontal

### Community 43 - "Misc 43"
Cohesion: 0.67
Nodes (4): Gem (Match-3 PixiJS game), game subsystem (pure logic), rendering subsystem (PixiJS), state subsystem (EventBus + AppState)

### Community 44 - "Misc 44"
Cohesion: 0.83
Nodes (3): getCtx(), playBlockerImmovable(), playJellyHit()

### Community 45 - "Misc 45"
Cohesion: 0.5
Nodes (4): Cascade End-Condition Timing, Chain Multiplier Formula, Move-Counting Rules, Scoring Economy & Rule Ledger

### Community 47 - "Misc 47"
Cohesion: 0.67
Nodes (3): Atlas Packing System, Build Pipeline, Performance Budget System

### Community 49 - "Misc 49"
Cohesion: 0.67
Nodes (3): Core Gameplay Loop, Special Combos Matrix, Special Gems Spec

## Knowledge Gaps
- **85 isolated node(s):** `Performance Budget System`, `Atlas Packing System`, `setupResizeHandler (ResizeObserver)`, `createSfxTestPanel (debug DOM panel)`, `KeyAction` (+80 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameSessionController` connect `Blocker & Jelly System` to `Scoring & Game Session`, `Match Detection & Board Rules`, `Game Integration Entry`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `KeybindManager` connect `Board Input & Interaction` to `Scoring & Game Session`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `LoadController` connect `Asset Load Controller` to `Scoring & Game Session`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 31 inferred relationships involving `getCell()` (e.g. with `.executeActivation()` and `.snapshotColoursAt()`) actually correct?**
  _`getCell()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `detectMatches()` (e.g. with `scoreSwap()` and `.runCascadeLoop()`) actually correct?**
  _`detectMatches()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `createButton()` (e.g. with `getButtonColours()` and `createLevelSelectCard()`) actually correct?**
  _`createButton()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Performance Budget System`, `Atlas Packing System`, `setupResizeHandler (ResizeObserver)` to the rest of the system?**
  _85 weakly-connected nodes found - possible documentation gaps or missing edges._