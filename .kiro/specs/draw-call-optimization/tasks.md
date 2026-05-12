# Implementation Plan: Draw Call Optimization

## Overview

Reduce draw calls from ~267 (peak 300+) to 3–5 static / 8–12 during cascades by implementing texture atlases, converting Graphics-based particles to Sprites in ParticleContainers, merging render layers, and pooling temporary Graphics objects. Implementation proceeds bottom-up: build tooling first, then runtime loading, then each particle system, then layer consolidation, pooling, and finally verification tooling.

## Tasks

- [x] 1. Atlas builder tool (`build-tools/pack-atlases.mjs`)
  - [x] 1.1 Implement atlas packing with `free-tex-packer-core`
    - Replace the current manifest-only stub with actual texture packing
    - Add `free-tex-packer-core` as a devDependency
    - Pack all gem, blocker, item, and UI PNGs into `game-atlas.png` + `game-atlas.json`
    - Generate pre-rendered particle shape PNGs (circle 16×16, diamond 16×16, blob 16×16) and pack into `particle-atlas.png` + `particle-atlas.json`
    - Output to `public/assets/atlases/`
    - Produce PixiJS-compatible spritesheet JSON with frame aliases matching existing names (e.g. `gem-tex-R`, `blocker-stone`)
    - Enforce max atlas size 4096×4096; emit build error for oversized inputs
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 1.2 Write property test for atlas packing correctness
    - **Property 1: Atlas packing correctness**
    - Generate random sets of image dimensions (each ≤ 4096×4096), run packing logic, verify: at most 2 atlas files each ≤ 4096×4096, JSON contains frame entry for every input with valid coordinates and matching aliases
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [ ]* 1.3 Write unit tests for atlas builder edge cases
    - Test that oversized image (>4096×4096) produces a build error identifying the asset
    - Test that output JSON frame coordinates fall within atlas bounds
    - _Requirements: 1.4_

- [x] 2. LoadController + GemSpriteFactory atlas integration
  - [x] 2.1 Update `LoadController.preloadCore()` to load spritesheet atlases
    - Load `assets/atlases/game-atlas.json` and `assets/atlases/particle-atlas.json` via PixiJS `Assets.load()` (which auto-loads backing PNGs and registers frame aliases)
    - Implement fallback: if atlas load fails, load individual PNGs (existing behavior) and log warning
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 2.2 Update `GemSpriteFactory` to resolve textures via atlas aliases
    - Replace direct path-based `Texture.from('assets/gems/r-base.png')` with alias-based `Texture.from('gem-tex-R')`
    - No public API changes — `create()` signature unchanged
    - Update `preloadGemTextures()` to be a no-op when atlas is loaded (aliases already registered)
    - _Requirements: 2.3, 2.4_

  - [x] 2.3 Update `BoardRenderer.createBlockerOverlay()` to use atlas aliases
    - Replace path-based texture loading with alias-based resolution (e.g. `blocker-stone`, `blocker-jelly`)
    - _Requirements: 2.2, 2.4_

  - [ ]* 2.4 Write unit tests for LoadController fallback
    - Test that spritesheet load failure triggers individual PNG loading and logs warning
    - Test that `Texture.from(alias)` resolves correctly after atlas load
    - _Requirements: 2.5_

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. ParticlePool refactor (Graphics → Sprite + ParticleContainer)
  - [x] 4.1 Refactor `ParticlePool` to use `ParticleContainer` with Sprite instances
    - Replace the plain `Container` with a `ParticleContainer`
    - Pre-allocate `Sprite` objects (using the circle texture from particle-atlas) instead of `Particle` class with `Graphics`
    - Toggle visibility via `sprite.visible` instead of creating/destroying
    - Map `ParticleConfig.colour` → `sprite.tint`, `radius` → `sprite.scale` (relative to 16px base), `alpha` → `sprite.alpha`
    - Preserve existing public API: `spawn()` returns index or null at capacity, `update(dtMs)`, `clear()`, `destroy()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 4.2 Write property test for particle sprite properties
    - **Property 2: Particle sprite properties match config**
    - Generate random valid `ParticleConfig` values, spawn into pool, assert Sprite tint/position/scale/alpha match config
    - **Validates: Requirements 3.3, 3.4**

  - [ ]* 4.3 Write unit test for ParticlePool capacity overflow
    - Test that `spawn()` returns null when pool is at capacity
    - _Requirements: 3.5_

- [x] 5. MergeParticleSystem refactor (shard/dot Graphics → Sprites)
  - [x] 5.1 Convert shard and dot pools from `Graphics` to `Sprite`
    - Replace `acquireShard()` / `releaseShard()` to use diamond texture Sprites with tint instead of `Graphics.moveTo/lineTo/fill`
    - Replace `acquireDot()` / `releaseDot()` to use circle texture Sprites with tint instead of `Graphics.circle/fill`
    - Animate rotation/scale/position per-frame on Sprites (same as before)
    - Reset Sprite properties on release: `visible=false`, `alpha=1`, `scale=(1,1)`, `rotation=0`, `tint=0xFFFFFF`
    - Ring pool (already Sprite-based) unchanged
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 5.2 Write property test for MergeParticleSystem pool bounded
    - **Property 3: MergeParticleSystem pool bounded**
    - Generate random spawn/update sequences, assert total shard Sprites ≤ POOL_CAP (128) and total dot Sprites ≤ POOL_CAP (128)
    - **Validates: Requirements 4.4**

  - [ ]* 5.3 Write property test for MergeParticleSystem release resets state
    - **Property 4: MergeParticleSystem release resets state**
    - Generate random particle end-states, trigger release, assert Sprite has `visible=false`, `alpha=1`, `scale=(1,1)`, `rotation=0`, `tint=0xFFFFFF`, not destroyed
    - **Validates: Requirements 4.5**

- [x] 6. JellyParticleSystem refactor (add pool + convert to Sprites)
  - [x] 6.1 Refactor `JellyParticleSystem` to use pooled Sprites
    - Pre-allocate 48 `Sprite` objects with blob texture at construction
    - `spawn()` acquires from pool, sets tint/position/scale; skips if pool exhausted
    - `update()` animates position/alpha/scale; returns Sprite to pool (visible=false) on lifetime expiry
    - Remove `Graphics` creation/destruction during gameplay
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 6.2 Write property test for jelly pool lifecycle
    - **Property 5: Jelly pool lifecycle**
    - Generate random spawn/update sequences, assert: spawning N blobs decreases available by N (clamped to 0), expired blobs increase available by 1 with `visible=false`
    - **Validates: Requirements 5.2, 5.4**

  - [ ]* 6.3 Write unit test for jelly pool exhaustion
    - Test that `spawn()` skips additional particles when pool is exhausted (no crash)
    - _Requirements: 5.5_

- [x] 7. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Blocker layer merge (glowLayer → gemLayer)
  - [x] 8.1 Move blocker overlays from `glowLayer` to `gemLayer` in `BoardRenderer`
    - Change `this.layers.glowLayer.addChild(overlay)` → `this.layers.gemLayer.addChild(overlay)` for blocker sprites
    - Maintain z-ordering: add blocker overlay AFTER the gem Sprite at the same cell position
    - Update `removeBlockerSprite()`, `syncBlockers()`, `applyBlockerHits()`, and `clear()` to reference `gemLayer` instead of `glowLayer`
    - Keep `glowLayer` available for selection glow effects (unchanged)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 8.2 Write property test for blocker z-ordering invariant
    - **Property 6: Blocker z-ordering invariant**
    - Generate random board configurations with gems and blockers, sync, assert blocker child index > gem child index in gemLayer for same cell
    - **Validates: Requirements 6.3**

  - [ ]* 8.3 Write property test for blocker removal isolation
    - **Property 7: Blocker removal isolation**
    - Generate board transitions with blocker removal, assert gem Sprite remains present and unchanged
    - **Validates: Requirements 6.4**

- [x] 9. GraphicsPool for temporary effects
  - [x] 9.1 Implement `GraphicsPool` class
    - Create `src/rendering/graphics-pool.ts` with `acquire()`, `release()`, `destroy()` methods
    - Pre-allocate configurable number of `Graphics` objects (default 16) at construction
    - `release()` calls `clear()` and sets `visible=false` without destroying
    - Overflow strategy: if pool exhausted, create non-pooled `Graphics` (destroyed on completion)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 9.2 Integrate `GraphicsPool` into `BoardAnimator`
    - Replace direct `new Graphics()` calls in blast zone overlays, mark effect highlights, and hint flash rectangles with pool acquire/release
    - Ensure release is called on effect completion (animation end callbacks)
    - _Requirements: 7.1, 7.2_

  - [ ]* 9.3 Write property test for graphics pool lifecycle
    - **Property 8: Graphics pool lifecycle**
    - Generate random acquire/release sequences, assert: released Graphics has `visible=false` and empty context, not destroyed, available count increases by 1
    - **Validates: Requirements 7.2, 7.3**

  - [ ]* 9.4 Write unit test for GraphicsPool overflow
    - Test that exhausted pool creates non-pooled overflow Graphics and destroys it on completion
    - _Requirements: 7.5_

- [x] 10. Draw call stats integration
  - [x] 10.1 Add draw call counter to debug stats panel
    - Create `getDrawCallCount(renderer)` utility reading from `renderer.renderPipes.batch` internals
    - Add draw call count display to existing Tweakpane debug panel
    - Add over-budget warning indicator when count exceeds 12
    - _Requirements: 8.3, 8.4_

  - [ ]* 10.2 Write unit tests for draw call stats
    - Test that `getDrawCallCount` returns a number
    - Test that over-budget warning triggers when count > 12
    - _Requirements: 8.3, 8.4_

- [x] 11. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify idle board renders in ≤ 5 draw calls
  - Verify peak cascade renders in ≤ 12 draw calls
  - _Requirements: 8.1, 8.2_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` (already in devDependencies) with minimum 100 iterations
- Checkpoints ensure incremental validation between major phases
- The atlas builder (task 1) is the foundation — all subsequent tasks depend on atlas textures being available
- ParticleContainer requires all children to share the same texture, which is why particle shapes are pre-rendered as white textures and tinted at runtime
