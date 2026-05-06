# Graph Report - .  (2026-05-07)

## Corpus Check
- 128 files · ~132,572 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1044 nodes · 2050 edges · 110 communities (35 shown, 75 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 129 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Blocker & Lock System|Blocker & Lock System]]
- [[_COMMUNITY_Game Integration Layer|Game Integration Layer]]
- [[_COMMUNITY_Game Design Documents|Game Design Documents]]
- [[_COMMUNITY_Match Detection & Board|Match Detection & Board]]
- [[_COMMUNITY_Objectives & Scoring|Objectives & Scoring]]
- [[_COMMUNITY_Adaptive Music System|Adaptive Music System]]
- [[_COMMUNITY_Animation Manager|Animation Manager]]
- [[_COMMUNITY_Accessibility Config|Accessibility Config]]
- [[_COMMUNITY_Session & Interaction|Session & Interaction]]
- [[_COMMUNITY_Board Renderer|Board Renderer]]
- [[_COMMUNITY_Game Session Controller|Game Session Controller]]
- [[_COMMUNITY_Particle Effects|Particle Effects]]
- [[_COMMUNITY_Telemetry & Events|Telemetry & Events]]
- [[_COMMUNITY_Debug & Stats Panel|Debug & Stats Panel]]
- [[_COMMUNITY_Audio System Core|Audio System Core]]
- [[_COMMUNITY_Input & Keybinds|Input & Keybinds]]
- [[_COMMUNITY_Endless Mode|Endless Mode]]
- [[_COMMUNITY_State Event Bus|State Event Bus]]
- [[_COMMUNITY_Synth SFX Engine|Synth SFX Engine]]
- [[_COMMUNITY_Settings UI Form|Settings UI Form]]
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
- [[_COMMUNITY_Community 40|Community 40]]
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
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]

## God Nodes (most connected - your core abstractions)
1. `getCell()` - 38 edges
2. `GameIntegration` - 35 edges
3. `GameSessionController` - 32 edges
4. `createGem()` - 26 edges
5. `KeybindManager` - 23 edges
6. `AudioSystem` - 23 edges
7. `RulesEngine` - 22 edges
8. `detectMatches()` - 22 edges
9. `AudioBuses` - 22 edges
10. `Mulberry32` - 21 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `createGame()`  [INFERRED]
  src/index.ts → integration/game-integration.ts
- `createGem()` --calls--> `placeGem()`  [INFERRED]
  src/game/rules/board.ts → src/game/rules/__tests__/special-gems.test.ts
- `createStarDisplay()` --calls--> `createLevelNode()`  [INFERRED]
  src/ui/factory.ts → src/ui/screens/world-map.ts
- `simulateFixedDoSwapScore()` --calls--> `remainingMovesBonus()`  [INFERRED]
  src/ui/screens/__tests__/level-select-bugfix.property.test.ts → src/game/rules/scoring.ts
- `placeGem()` --calls--> `createGem()`  [INFERRED]
  src/integration/__tests__/special-activation.test.ts → src/game/rules/board.ts

## Hyperedges (group relationships)
- **Five design pillars form the non-negotiable experience set** — gdd_concept_p1_learnable, gdd_concept_p2_cascade, gdd_concept_p3_clarity, gdd_concept_p4_mastery, gdd_concept_p5_respect_time [EXTRACTED 1.00]
- **Scoring canon: chain multiplier + move counting + EOL timing form the rule ledger** — gdd_concept_scoring_economy, gdd_concept_chain_multiplier, gdd_concept_move_counting, gdd_concept_eol_timing [EXTRACTED 1.00]
- **Runtime loop: command queue + event bus + RNG drive fixed-step game loop** — gdd_concept_game_loop, gdd_concept_command_queue, gdd_concept_event_bus, gdd_concept_rng [EXTRACTED 1.00]

## Communities (110 total, 75 thin omitted)

### Community 0 - "Blocker & Lock System"
Cohesion: 0.06
Nodes (66): breakLock(), createBlockerByKind(), isLocked(), processBlockersOnClear(), processJellyOnClear(), tickGenerators(), tickUnstables(), cloneBlocker() (+58 more)

### Community 1 - "Game Integration Layer"
Cohesion: 0.06
Nodes (22): GameIntegration, loadLevel(), registerLevel(), createCreditsScreen(), createGameHUD(), createLevelCompleteScreen(), createLevelFailScreen(), createLevelSelectCard() (+14 more)

### Community 2 - "Game Design Documents"
Cohesion: 0.05
Nodes (60): 01 Game Overview, 02 Scene & Level Design, 03 Technical Foundation, 04 Art Style & Narrative, 05 UI/UX Design, 06 Game Flow, 07 Audio Design, 08 Additional Specs (+52 more)

### Community 3 - "Match Detection & Board"
Cohesion: 0.08
Nodes (38): isValidPos(), clearCell(), clearPositions(), colourTransform(), comboKey(), crossClear(), fullBoardClear(), largeAreaClear() (+30 more)

### Community 4 - "Objectives & Scoring"
Cohesion: 0.06
Nodes (9): calculateStars(), ClearTracker, CollectTracker, createTracker(), DropTracker, MultiTracker, ScoreTracker, remainingMovesBonus() (+1 more)

### Community 5 - "Adaptive Music System"
Cohesion: 0.07
Nodes (4): AdaptiveMusic, AudioBuses, clampVolume(), SfxCatalog

### Community 6 - "Animation Manager"
Cohesion: 0.06
Nodes (11): AnimationManager, createLayerHierarchy(), applyBloom(), applyGlowBlur(), createShockwaveEffect(), FilterManager, removeBloom(), removeGlowBlur() (+3 more)

### Community 7 - "Accessibility Config"
Cohesion: 0.08
Nodes (19): createAccessibilityConfig(), getColourPalette(), getContrastConfig(), checkStorageStatus(), EdgeCaseManager, getSaveTimestamp(), safeGetItem(), safeSetItem() (+11 more)

### Community 8 - "Session & Interaction"
Cohesion: 0.11
Nodes (5): BoardInteraction, formatObjectiveText(), BoardAnimator, makeSession(), makeSpec()

### Community 9 - "Board Renderer"
Cohesion: 0.11
Nodes (4): BoardRenderer, cellKey(), computeShimmerAlpha(), GemSpriteFactory

### Community 11 - "Particle Effects"
Cohesion: 0.12
Nodes (6): emitChainGlow(), emitSpecialSpawnRing(), getRingTex(), MergeParticleSystem, Particle, ParticlePool

### Community 13 - "Debug & Stats Panel"
Cohesion: 0.13
Nodes (8): ClockScaleController, createStatsPanel(), createDebugPanel(), createDefaultMetrics(), canTransition(), getValidTargets(), IllegalTransitionError, transition()

### Community 16 - "Endless Mode"
Cohesion: 0.13
Nodes (7): calculateDifficulty(), checkEndlessEndCondition(), createEndlessEndScreenData(), EndlessRunner, getLeaderboardRank(), updateEndlessBestRecords(), updateLeaderboard()

### Community 17 - "State Event Bus"
Cohesion: 0.14
Nodes (5): createCascadeStepPool(), createIntensityPool(), createMatchLandedPool(), EventBusImpl, EventPool

### Community 18 - "Synth SFX Engine"
Cohesion: 0.21
Nodes (16): ensure(), getNoiseBuffer(), loadAllBuffers(), play(), playCascade(), playCombo(), playInvalid(), playLevelComplete() (+8 more)

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (6): chainBlast(), comboBlast(), gemShatter(), levelComplete(), mix(), rockCrush()

### Community 25 - "Community 25"
Cohesion: 0.19
Nodes (5): detectBrowserLocale(), getTranslator(), initTranslator(), t(), Translator

### Community 27 - "Community 27"
Cohesion: 0.61
Nodes (8): ensureDir(), generateGems(), generateGemSvg(), generateParticleImages(), generateUiImages(), generateWorldBackgrounds(), main(), writeSvg()

### Community 32 - "Community 32"
Cohesion: 0.48
Nodes (6): collectFiles(), estimateGzipSize(), formatBytes(), getFileSize(), getTotalSize(), main()

### Community 34 - "Community 34"
Cohesion: 0.48
Nodes (5): createSpecialOverlayGraphics(), drawAreaOverlay(), drawColourOverlay(), drawLineHOverlay(), drawLineVOverlay()

### Community 35 - "Community 35"
Cohesion: 0.6
Nodes (5): main(), printBudgets(), validateDrawCalls(), validateFps(), validateMemoryDrift()

### Community 38 - "Community 38"
Cohesion: 0.83
Nodes (3): buildManifest(), listFiles(), main()

## Knowledge Gaps
- **77 isolated node(s):** `Stats`, `RunState phases`, `Boss Special Rules Schema`, `P3 Clear Thinking Space`, `P5 Respects Player Time` (+72 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **75 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameIntegration` connect `Game Integration Layer` to `Session & Interaction`, `Debug & Stats Panel`, `Community 29`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `GameSessionController` connect `Game Session Controller` to `Session & Interaction`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 20 inferred relationships involving `getCell()` (e.g. with `.processSwap()` and `.processComboSwap()`) actually correct?**
  _`getCell()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `createGem()` (e.g. with `placeGem()` and `placeGem()`) actually correct?**
  _`createGem()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Stats`, `RunState phases`, `Boss Special Rules Schema` to the rest of the system?**
  _77 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Blocker & Lock System` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Game Integration Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._