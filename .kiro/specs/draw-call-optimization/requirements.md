# Requirements Document

## Introduction

This feature optimizes draw call count in the PixiJS 8 match-3 game by consolidating textures into atlases, converting Graphics-based particles to Sprite-based systems using ParticleContainer, merging render layers for batching, and pooling temporary Graphics objects. The goal is to reduce draw calls from ~267 (peak 300+) down to 3-5 static / 8-12 during cascades.

## Glossary

- **Renderer**: The PixiJS 8 WebGPU/WebGL2 rendering backend responsible for issuing draw calls to the GPU
- **Draw_Call**: A single GPU command to render a batch of geometry sharing the same texture and blend mode
- **Texture_Atlas**: A single GPU texture containing multiple sub-images (frames) packed together, enabling the Renderer to batch all sprites using that atlas into one Draw_Call
- **Spritesheet**: The PixiJS data structure that maps frame names to regions within a Texture_Atlas
- **ParticleContainer**: A PixiJS optimized container that renders thousands of same-texture Sprites in a single Draw_Call by sacrificing per-child features (filters, nested containers)
- **Batch_Break**: An event that forces the Renderer to flush the current batch and issue a new Draw_Call (caused by texture switch, blend mode change, or filter boundary)
- **Object_Pool**: A pre-allocated collection of reusable display objects that avoids runtime allocation and GC pressure
- **GemLayer**: The Container holding all gem Sprites on the board
- **GlowLayer**: The Container holding blocker overlay Sprites, currently separate from GemLayer
- **ParticlePool**: The existing object pool for basic circle particles (class in particles.ts)
- **MergeParticleSystem**: The particle system for combo effects using ring Sprites, shard Graphics, and dot Graphics
- **JellyParticleSystem**: The particle system for jelly blocker hit/clear effects, currently creating new Graphics per spawn without pooling
- **Atlas_Builder**: A build-time tool that packs individual PNG files into a Texture_Atlas and produces a Spritesheet JSON descriptor

## Requirements

### Requirement 1: Texture Atlas Generation

**User Story:** As a developer, I want all game PNG assets packed into one or two texture atlases at build time, so that the Renderer can batch all board sprites into minimal Draw_Calls.

#### Acceptance Criteria

1. WHEN the build pipeline runs, THE Atlas_Builder SHALL pack all gem, blocker, item, and UI PNGs into at most 2 Texture_Atlas files (max 4096×4096 each)
2. WHEN the Atlas_Builder completes, THE Atlas_Builder SHALL produce a Spritesheet JSON descriptor for each Texture_Atlas containing frame coordinates, dimensions, and trim data
3. THE Atlas_Builder SHALL preserve the original asset alias names (e.g. "gem-tex-R", "blocker-stone") as frame identifiers in the Spritesheet descriptor
4. IF an individual PNG exceeds 4096×4096, THEN THE Atlas_Builder SHALL emit a build error identifying the oversized asset
5. WHEN the atlas is loaded at runtime, THE Renderer SHALL resolve all existing `Texture.from(path)` calls to atlas sub-textures without code changes to consumers beyond the loading path

### Requirement 2: Atlas-Based Sprite Loading

**User Story:** As a developer, I want the asset loading system to load Spritesheet atlases instead of individual PNGs, so that texture binding switches are eliminated during rendering.

#### Acceptance Criteria

1. WHEN the application starts, THE LoadController SHALL load the Spritesheet JSON and its backing Texture_Atlas instead of individual PNG files
2. WHEN the Spritesheet is loaded, THE LoadController SHALL register all frame aliases with the PixiJS Assets cache so that `Texture.from(alias)` resolves to atlas sub-textures
3. THE GemSpriteFactory SHALL create gem Sprites using atlas sub-textures without any change to its public API
4. WHEN all board gems share the same Texture_Atlas, THE Renderer SHALL render the entire GemLayer in a single Draw_Call (assuming no blend mode or filter breaks)
5. IF the Spritesheet fails to load, THEN THE LoadController SHALL fall back to loading individual PNGs and log a warning

### Requirement 3: Particle System Sprite Conversion

**User Story:** As a developer, I want particle effects rendered as texture-based Sprites in a ParticleContainer, so that hundreds of active particles produce only 1-2 Draw_Calls instead of one per particle.

#### Acceptance Criteria

1. THE ParticlePool SHALL render particles as Sprites using a pre-rendered circle texture from the Texture_Atlas instead of individual Graphics objects
2. WHEN particles are rendered via ParticleContainer, THE Renderer SHALL batch all active particles of the same texture into a single Draw_Call
3. THE ParticlePool SHALL support per-particle position, scale, alpha, and tint without causing Batch_Breaks
4. WHEN a particle is spawned, THE ParticlePool SHALL set the Sprite tint to the requested colour instead of redrawing a Graphics circle
5. WHEN the ParticlePool is at capacity, THE ParticlePool SHALL return null (preserving existing overflow behavior)

### Requirement 4: MergeParticleSystem Sprite Conversion

**User Story:** As a developer, I want the MergeParticleSystem shard and dot effects converted from Graphics to Sprites, so that combo explosions do not cause 30+ individual Draw_Calls.

#### Acceptance Criteria

1. THE MergeParticleSystem SHALL render shard particles as tinted Sprites using a pre-rendered diamond shape texture from the Texture_Atlas
2. THE MergeParticleSystem SHALL render dot particles as tinted Sprites using the same circle texture as the ParticlePool
3. WHEN a combo spawns shard and dot particles, THE Renderer SHALL batch all same-texture particles into at most 2 Draw_Calls (one per texture type)
4. THE MergeParticleSystem SHALL maintain its existing object pool (POOL_CAP = 128) for shard and dot Sprites
5. WHEN shard or dot particles are released back to the pool, THE MergeParticleSystem SHALL reset Sprite properties (position, scale, alpha, tint, rotation) without destroying the display object

### Requirement 5: JellyParticleSystem Object Pool and Sprite Conversion

**User Story:** As a developer, I want the JellyParticleSystem to use pooled Sprites instead of creating new Graphics per spawn, so that jelly effects do not allocate and GC dozens of objects per hit.

#### Acceptance Criteria

1. THE JellyParticleSystem SHALL maintain an Object_Pool of Sprite objects with a configurable capacity (default 48)
2. WHEN a jelly hit or clear event occurs, THE JellyParticleSystem SHALL acquire Sprites from the pool instead of creating new Graphics objects
3. THE JellyParticleSystem SHALL render blob particles as tinted Sprites using a pre-rendered blob texture from the Texture_Atlas
4. WHEN a blob particle's lifetime expires, THE JellyParticleSystem SHALL return the Sprite to the pool with visibility set to false
5. IF the pool is exhausted, THEN THE JellyParticleSystem SHALL skip spawning additional particles (graceful degradation)
6. WHEN jelly particles are rendered, THE Renderer SHALL batch all active jelly Sprites into a single Draw_Call

### Requirement 6: Blocker Layer Merge

**User Story:** As a developer, I want blocker overlay sprites rendered in the same container as gems, so that the Renderer can batch them together without a layer-boundary Batch_Break.

#### Acceptance Criteria

1. THE BoardRenderer SHALL add blocker overlay Sprites to the GemLayer instead of the GlowLayer
2. WHEN blocker overlays share the same Texture_Atlas as gem Sprites, THE Renderer SHALL batch blockers and gems into a single Draw_Call
3. THE BoardRenderer SHALL maintain correct z-ordering by adding blocker overlays after the gem Sprite at the same cell position
4. WHEN a blocker is removed, THE BoardRenderer SHALL remove only the blocker overlay without affecting the gem Sprite at that position
5. WHILE the GlowLayer contains no blocker overlays, THE GlowLayer SHALL remain available for selection glow effects without modification

### Requirement 7: Temporary Graphics Pooling

**User Story:** As a developer, I want temporary visual effects (blast zone overlays, mark effects, hint flashes) to reuse pooled Graphics objects, so that animation-heavy sequences do not allocate and destroy display objects repeatedly.

#### Acceptance Criteria

1. THE BoardAnimator SHALL maintain an Object_Pool of Graphics objects for temporary visual effects (blast zone overlays, mark highlights, hint flashes)
2. WHEN a temporary effect is needed, THE BoardAnimator SHALL acquire a Graphics object from the pool, configure it, and return it when the effect completes
3. WHEN a Graphics object is returned to the pool, THE BoardAnimator SHALL call `clear()` and set `visible = false` without destroying the object
4. THE Object_Pool SHALL pre-allocate a configurable number of Graphics objects (default 16) at initialization
5. IF the pool is exhausted during a cascade, THEN THE BoardAnimator SHALL create a new Graphics object (non-pooled overflow) and destroy it on completion

### Requirement 8: Draw Call Budget Verification

**User Story:** As a developer, I want measurable draw call targets so that I can verify the optimization meets performance goals.

#### Acceptance Criteria

1. WHILE the board is in a static idle state (no animations, no particles), THE Renderer SHALL complete the frame in at most 5 Draw_Calls
2. WHILE a cascade is at peak activity (maximum particles and effects), THE Renderer SHALL complete the frame in at most 12 Draw_Calls
3. WHEN the debug stats panel is enabled, THE stats overlay SHALL display the current frame's Draw_Call count
4. IF the Draw_Call count exceeds 12 during any frame in a cascade, THEN THE stats overlay SHALL flag the frame with a warning indicator
