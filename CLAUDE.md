# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Gem** — a browser Match-3 puzzle game (Bejeweled-style) built on PixiJS 8 (WebGPU with WebGL fallback) and TypeScript. Targets desktop browsers at 60 FPS; design docs live in `gdd/` (Chinese, v0.9 draft).

## Commands

```bash
npm run dev              # Vite dev server on :3000 (auto-opens browser)
npm run build            # tsc --noEmit + vite build -> dist/
npm run preview          # Preview production build
npm test                 # vitest (watch)
npm run test:ci          # vitest run --coverage
npm run test:e2e         # Playwright tests in e2e/
npm run lint             # eslint . --max-warnings=0
npm run format           # prettier --write .
npm run type-check       # tsc --noEmit

# Single test
npx vitest run src/game/rules/__tests__/match-detect.test.ts
npx vitest run -t "cascade resolves"        # by test name

# Build/asset tooling (build-tools/)
npm run generate-assets       # Generate placeholder art
npm run pack-atlases          # Pack texture atlases
npm run validate-budgets      # Asset/bundle budget gate
npm run validate-production   # Full production readiness check
npm run perf-validation       # Performance budget check
```

Vite env flags (define-injected globals): `__TELEMETRY_ENDPOINT__`, `__BUILD_VERSION__`, `__ENABLE_DEVTOOLS__` (from `VITE_*` env vars).

## Architecture

Entry point: `src/index.ts` → `createGame()` in `src/integration/game-integration.ts`. The integration module is the **top-level orchestrator** — it owns subsystem lifecycle and wires everything via an event bus. Subsystems do not import each other directly; they communicate through `EventBus` in `src/state/events.ts`.

**Subsystem layers** (each under `src/`):

- `game/` — pure game logic, no rendering/DOM deps.
  - `rules/` — board model, match detection, cascade resolution, scoring, RNG, special gems, combo matrix.
  - `runtime/` — game loop, hint system, reshuffle, endless mode (drives rules from state transitions).
  - `level/` — level spec, objectives, blockers, level data.
- `rendering/` — PixiJS rendering (board renderer, gem sprites, particles, animations, filters, viewport, layer hierarchy, design tokens, a11y).
- `state/` — `AppState` state machine, event bus, save-state persistence + migrations, edge-case handling.
- `input/` — keyboard/pointer input system and board swap input.
- `audio/` — Howler-based audio system, buses, SFX catalog, adaptive music, synth SFX.
- `ui/` (Pixi-drawn) + `ui-dom/` (HTML overlays) + `i18n/` + `telemetry/` + `debug/` (Tweakpane + stats.js, dev only) + `assets/` (load-controller, manifest) + `types/`.

**Bootstrap** (`src/app.ts`): initializes the PixiJS `Application`, detects WebGPU vs WebGL backend, constructs `LayerRefs` via `createLayerHierarchy`. Returns `AppRefs` (app, layers, backend, destroy).

**Key flow**: `index.ts` → `createGame(container)` → bootstraps `AppRefs` → builds `RulesEngine` / `GameLoop` / `BoardRenderer` / `BoardInput` / `ViewportManager` / `LoadController` / debug panels → `EventBus` connects input → rules → state transitions → rendering + audio + telemetry.

**Path aliases** (see `vite.config.ts`): `@game`, `@rendering`, `@ui`, `@audio`, `@state`, `@input`, `@types`. These are Vite-only — TypeScript uses relative imports throughout the existing code; stay consistent with the file you're editing.

## Testing conventions

- Unit tests live next to sources in `__tests__/` (e.g. `src/game/rules/__tests__/`). Property-based tests use `fast-check`.
- Integration property tests: `src/integration/__tests__/`.
- E2E in `e2e/` via Playwright (`playwright.config.ts`).
- `game/rules/` logic must stay deterministic — use the seeded `rng.ts`, not `Math.random`.

## Design docs

`gdd/` contains the full Game Design Document (in Chinese). For gameplay/UX/audio decisions consult:
- `01_game_overview.md` pillars & scope
- `03_technical_foundation.md` architecture & budgets
- `06_game_flow.md` state machine
- `09_testing.md` QA plan

Build output `dist/` and the Vite cache `node_modules/.vite/` are committed/tracked partially — ignore the `.vite/` churn in git status.

## codebase-memory-mcp

This project is indexed by the codebase-memory-mcp MCP server (SQLite graph in `~/.cache/codebase-memory-mcp/`).

Rules:
- For architecture, call-chain, or "how does X relate to Y" questions, prefer the `codebase-memory-mcp` MCP tools (structural search, call tracing, impact analysis) over grep/reading raw files.
- The index updates incrementally; after large refactors, re-index with `codebase-memory-mcp cli index_repository --repo-path <repo>` if results look stale.
