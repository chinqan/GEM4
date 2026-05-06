# Graph Report - .  (2026-05-06)

## Corpus Check
- 190 files · ~137,913 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 958 nodes · 1845 edges · 100 communities (36 shown, 64 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 129 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Blocker & Lock System|Blocker & Lock System]]
- [[_COMMUNITY_Game Integration Layer|Game Integration Layer]]
- [[_COMMUNITY_Match Detection & Board|Match Detection & Board]]
- [[_COMMUNITY_Synth SFX Engine|Synth SFX Engine]]
- [[_COMMUNITY_Game Design Documents|Game Design Documents]]
- [[_COMMUNITY_Adaptive Music System|Adaptive Music System]]
- [[_COMMUNITY_Objectives & Scoring|Objectives & Scoring]]
- [[_COMMUNITY_Animation Manager|Animation Manager]]
- [[_COMMUNITY_Accessibility Config|Accessibility Config]]
- [[_COMMUNITY_Board Renderer|Board Renderer]]
- [[_COMMUNITY_Game Loop & Rules Engine|Game Loop & Rules Engine]]
- [[_COMMUNITY_Particle Effects|Particle Effects]]
- [[_COMMUNITY_Telemetry & Events|Telemetry & Events]]
- [[_COMMUNITY_Input & Keybinds|Input & Keybinds]]
- [[_COMMUNITY_Debug & Stats Panel|Debug & Stats Panel]]
- [[_COMMUNITY_Audio System Core|Audio System Core]]
- [[_COMMUNITY_Endless Mode|Endless Mode]]
- [[_COMMUNITY_State Event Bus|State Event Bus]]
- [[_COMMUNITY_Settings UI Form|Settings UI Form]]
- [[_COMMUNITY_Asset Load Controller|Asset Load Controller]]
- [[_COMMUNITY_Module Group 20|Module Group 20]]
- [[_COMMUNITY_Module Group 21|Module Group 21]]
- [[_COMMUNITY_Module Group 22|Module Group 22]]
- [[_COMMUNITY_Module Group 23|Module Group 23]]
- [[_COMMUNITY_Module Group 24|Module Group 24]]
- [[_COMMUNITY_Module Group 25|Module Group 25]]
- [[_COMMUNITY_Module Group 26|Module Group 26]]
- [[_COMMUNITY_Module Group 27|Module Group 27]]
- [[_COMMUNITY_Module Group 28|Module Group 28]]
- [[_COMMUNITY_Module Group 30|Module Group 30]]
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
- [[_COMMUNITY_Module Group 70|Module Group 70]]
- [[_COMMUNITY_Module Group 71|Module Group 71]]
- [[_COMMUNITY_Module Group 72|Module Group 72]]
- [[_COMMUNITY_Module Group 73|Module Group 73]]
- [[_COMMUNITY_Module Group 74|Module Group 74]]
- [[_COMMUNITY_Module Group 75|Module Group 75]]
- [[_COMMUNITY_Module Group 76|Module Group 76]]
- [[_COMMUNITY_Module Group 77|Module Group 77]]
- [[_COMMUNITY_Module Group 78|Module Group 78]]
- [[_COMMUNITY_Module Group 79|Module Group 79]]
- [[_COMMUNITY_Module Group 80|Module Group 80]]
- [[_COMMUNITY_Module Group 81|Module Group 81]]
- [[_COMMUNITY_Module Group 82|Module Group 82]]
- [[_COMMUNITY_Module Group 83|Module Group 83]]
- [[_COMMUNITY_Module Group 84|Module Group 84]]
- [[_COMMUNITY_Module Group 85|Module Group 85]]
- [[_COMMUNITY_Module Group 86|Module Group 86]]
- [[_COMMUNITY_Module Group 87|Module Group 87]]
- [[_COMMUNITY_Module Group 88|Module Group 88]]
- [[_COMMUNITY_Module Group 89|Module Group 89]]
- [[_COMMUNITY_Module Group 90|Module Group 90]]
- [[_COMMUNITY_Module Group 91|Module Group 91]]
- [[_COMMUNITY_Module Group 92|Module Group 92]]
- [[_COMMUNITY_Module Group 93|Module Group 93]]
- [[_COMMUNITY_Module Group 94|Module Group 94]]
- [[_COMMUNITY_Module Group 95|Module Group 95]]
- [[_COMMUNITY_Module Group 96|Module Group 96]]
- [[_COMMUNITY_Module Group 97|Module Group 97]]
- [[_COMMUNITY_Module Group 98|Module Group 98]]
- [[_COMMUNITY_Module Group 99|Module Group 99]]

## God Nodes (most connected - your core abstractions)
1. `getCell()` - 38 edges
2. `GameIntegration` - 31 edges
3. `createGem()` - 26 edges
4. `KeybindManager` - 23 edges
5. `AudioSystem` - 23 edges
6. `RulesEngine` - 22 edges
7. `detectMatches()` - 22 edges
8. `AudioBuses` - 22 edges
9. `Mulberry32` - 21 edges
10. `createButton()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `simulateFixedDoSwapScore()` --calls--> `remainingMovesBonus()`  [INFERRED]
  src/ui/screens/__tests__/level-select-bugfix.property.test.ts → src/game/rules/scoring.ts
- `createLevelNode()` --calls--> `createStarDisplay()`  [INFERRED]
  src/ui/screens/world-map.ts → src/ui/factory.ts
- `placeBLockers()` --calls--> `getCell()`  [INFERRED]
  src/game/runtime/reshuffle.ts → src/game/rules/board.ts
- `initBoard()` --calls--> `createBoard()`  [INFERRED]
  src/game/runtime/reshuffle.ts → src/game/rules/board.ts
- `initBoard()` --calls--> `getCell()`  [INFERRED]
  src/game/runtime/reshuffle.ts → src/game/rules/board.ts

## Hyperedges (group relationships)
- **Five design pillars form the non-negotiable experience set** — gdd_concept_p1_learnable, gdd_concept_p2_cascade, gdd_concept_p3_clarity, gdd_concept_p4_mastery, gdd_concept_p5_respect_time [EXTRACTED 1.00]
- **Scoring canon: chain multiplier + move counting + EOL timing form the rule ledger** — gdd_concept_scoring_economy, gdd_concept_chain_multiplier, gdd_concept_move_counting, gdd_concept_eol_timing [EXTRACTED 1.00]
- **Runtime loop: command queue + event bus + RNG drive fixed-step game loop** — gdd_concept_game_loop, gdd_concept_command_queue, gdd_concept_event_bus, gdd_concept_rng [EXTRACTED 1.00]

## Communities (100 total, 64 thin omitted)

### Community 0 - "Blocker & Lock System"
Cohesion: 0.07
Nodes (62): breakLock(), createBlockerByKind(), isLocked(), processBlockersOnClear(), processJellyOnClear(), tickGenerators(), tickUnstables(), cloneBlocker() (+54 more)

### Community 1 - "Game Integration Layer"
Cohesion: 0.07
Nodes (22): GameIntegration, loadLevel(), registerLevel(), createCreditsScreen(), createGameHUD(), createLevelCompleteScreen(), createLevelFailScreen(), createLevelSelectCard() (+14 more)

### Community 2 - "Match Detection & Board"
Cohesion: 0.06
Nodes (41): cloneBoard(), classifyGroup(), classifyMergedShape(), classifySingleRun(), detectMatches(), determineSpawnAt(), determineSpecial(), findSharedCells() (+33 more)

### Community 3 - "Synth SFX Engine"
Cohesion: 0.05
Nodes (23): ensure(), getNoiseBuffer(), loadAllBuffers(), play(), playCascade(), playCombo(), playInvalid(), playLevelComplete() (+15 more)

### Community 4 - "Game Design Documents"
Cohesion: 0.05
Nodes (60): 01 Game Overview, 02 Scene & Level Design, 03 Technical Foundation, 04 Art Style & Narrative, 05 UI/UX Design, 06 Game Flow, 07 Audio Design, 08 Additional Specs (+52 more)

### Community 5 - "Adaptive Music System"
Cohesion: 0.07
Nodes (4): AdaptiveMusic, AudioBuses, clampVolume(), SfxCatalog

### Community 6 - "Objectives & Scoring"
Cohesion: 0.06
Nodes (8): calculateStars(), ClearTracker, CollectTracker, createTracker(), DropTracker, MultiTracker, ScoreTracker, simulateFixedDoSwapScore()

### Community 7 - "Animation Manager"
Cohesion: 0.06
Nodes (11): AnimationManager, createLayerHierarchy(), applyBloom(), applyGlowBlur(), createShockwaveEffect(), FilterManager, removeBloom(), removeGlowBlur() (+3 more)

### Community 8 - "Accessibility Config"
Cohesion: 0.08
Nodes (19): createAccessibilityConfig(), getColourPalette(), getContrastConfig(), checkStorageStatus(), EdgeCaseManager, getSaveTimestamp(), safeGetItem(), safeSetItem() (+11 more)

### Community 9 - "Board Renderer"
Cohesion: 0.11
Nodes (4): BoardRenderer, cellKey(), computeShimmerAlpha(), GemSpriteFactory

### Community 10 - "Game Loop & Rules Engine"
Cohesion: 0.11
Nodes (5): CommandQueue, RulesEngine, makeEngine(), makeSpec(), mockEventBus()

### Community 11 - "Particle Effects"
Cohesion: 0.12
Nodes (6): emitChainGlow(), emitSpecialSpawnRing(), getRingTex(), MergeParticleSystem, Particle, ParticlePool

### Community 13 - "Input & Keybinds"
Cohesion: 0.12
Nodes (3): defaultKeybinds(), eventToKeyCode(), KeybindManager

### Community 14 - "Debug & Stats Panel"
Cohesion: 0.13
Nodes (8): ClockScaleController, createStatsPanel(), createDebugPanel(), createDefaultMetrics(), canTransition(), getValidTargets(), IllegalTransitionError, transition()

### Community 16 - "Endless Mode"
Cohesion: 0.13
Nodes (7): calculateDifficulty(), checkEndlessEndCondition(), createEndlessEndScreenData(), EndlessRunner, getLeaderboardRank(), updateEndlessBestRecords(), updateLeaderboard()

### Community 17 - "State Event Bus"
Cohesion: 0.14
Nodes (5): createCascadeStepPool(), createIntensityPool(), createMatchLandedPool(), EventBusImpl, EventPool

### Community 20 - "Module Group 20"
Cohesion: 0.22
Nodes (6): chainBlast(), comboBlast(), gemShatter(), levelComplete(), mix(), rockCrush()

### Community 21 - "Module Group 21"
Cohesion: 0.19
Nodes (5): detectBrowserLocale(), getTranslator(), initTranslator(), t(), Translator

### Community 22 - "Module Group 22"
Cohesion: 0.61
Nodes (8): ensureDir(), generateGems(), generateGemSvg(), generateParticleImages(), generateUiImages(), generateWorldBackgrounds(), main(), writeSvg()

### Community 24 - "Module Group 24"
Cohesion: 0.48
Nodes (6): collectFiles(), estimateGzipSize(), formatBytes(), getFileSize(), getTotalSize(), main()

### Community 25 - "Module Group 25"
Cohesion: 0.48
Nodes (5): createSpecialOverlayGraphics(), drawAreaOverlay(), drawColourOverlay(), drawLineHOverlay(), drawLineVOverlay()

### Community 26 - "Module Group 26"
Cohesion: 0.6
Nodes (5): main(), printBudgets(), validateDrawCalls(), validateFps(), validateMemoryDrift()

### Community 28 - "Module Group 28"
Cohesion: 0.83
Nodes (3): buildManifest(), listFiles(), main()

## Knowledge Gaps
- **77 isolated node(s):** `Stats`, `RunState phases`, `Boss Special Rules Schema`, `P3 Clear Thinking Space`, `P5 Respects Player Time` (+72 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **64 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AudioSystem` connect `Audio System Core` to `Adaptive Music System`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `GameIntegration` connect `Game Integration Layer` to `Synth SFX Engine`, `Debug & Stats Panel`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `KeybindManager` connect `Input & Keybinds` to `Blocker & Lock System`, `Synth SFX Engine`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 20 inferred relationships involving `getCell()` (e.g. with `.processSwap()` and `.processComboSwap()`) actually correct?**
  _`getCell()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `createGem()` (e.g. with `placeGem()` and `placeGem()`) actually correct?**
  _`createGem()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Stats`, `RunState phases`, `Boss Special Rules Schema` to the rest of the system?**
  _77 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Blocker & Lock System` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._