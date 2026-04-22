# Terminology Registry

One concept, one name, across all chapters. When a chapter introduces or cites a term, it must cite the definition here.

Status legend: `draft` (being shaped) · `stable` (used broadly, unlikely to change) · `frozen` (locked for v1.0)

## Core vocabulary

| Term | Canonical definition | Canonical chapter | Also used in | Status |
|------|----------------------|-------------------|--------------|--------|
| Match | Three or more same-colour gems aligned in a single row or column | 01§4.1 | 02, 03, 07, 09 | stable |
| Cascade | Gravity-driven drop and new-gem spawn after a clear, possibly producing a subsequent match | 01§4.1 | 02, 03, 06, 07, 09 | stable |
| Chain | Count of cascade sub-steps triggered by a single player swap | 01§4.1 | 05, 06, 07, 09 | stable |
| Combo | Detonation of two special gems against each other (distinct from regular chain) | 08§9 | 01, 07 | stable |
| Blocker | Any element that restricts movement or clearing (Jelly / Lock / Generator / Unstable) | 02§4 | 03, 06, 09 | stable |
| Jelly | "Forgotten Mist" — layered overlay cleared by matching into the cell | 02§4.1 | 04, 06, 09 | stable |
| Lock | "Fossilised Memory" — gem frozen in place, cannot move or be cleared without unlock | 02§4.2 | 09 | stable |
| Generator | "Mist Source" — periodically spawns a jelly or lock in an adjacent cell | 02§4.3 | 09 | stable |
| Unstable | Gem that explodes if not cleared within 6 moves; -300 score penalty | 02§4.4 | 09 | stable |
| Delivery Cell | Bottom-marked cell where Drop-objective gems must land | 02§4.5 | 06, 09 | stable |
| Line Bomb | Special gem spawned by a 4-match; clears full row or column | 01§5.2 | 04, 07, 09 | stable |
| Area Bomb | Special gem spawned by T- or L-match; clears 3×3 area | 01§5.2 | 04, 07, 09 | stable |
| Colour Gem | Special gem spawned by a 5-straight match; clears all gems of one colour | 01§5.2 | 04, 07, 09 | stable |
| Special Gem | Umbrella term for Line Bomb, Area Bomb, Colour Gem | 01§5.2 | all | stable |
| Seed (RNG) | 64-bit value used to seed the four Mulberry32 streams per level | runtime-architect spec | 02, 03, 09 | proposed |
| Intensity | 0..1 signal feeding adaptive music, computed from chain/moves/specials/objective | 06§3.5 | 07 | stable |
| Gate | Level requiring a minimum accumulated ★ count to enter | 02§1.2 | 01, 08 | stable |
| Boss | Final level of each world with unique structure | 02§2.3 | all | stable |
| Reshuffle | Board reseed triggered on no-moves state | 01§5.1 | 02, 03, 06, 08, 09 | stable |
| Dreamwarden | Player character in narrative framing | 04§2.1 | all narrative-adjacent | stable |
| World | One of four chapters (Lost Mountain / Crystal Roots / Moonlit Sanctum / Stardust Tower) | 04§4 | all | stable |
| Rules Engine | Pure-function logic in `src/game/rules/`, zero Pixi/DOM dependency | 03§3 | 09 | stable |
| Endless | Infinite difficulty-ramp mode unlocked after World 4 | 01§4.3 | 02, 06, 08 | stable |
| Star / ★ | Per-level rating 0..3 based on score or moves-remaining threshold | 01§5.1 | 02, 05, 08 | stable |
| Move Budget | Total swaps allowed in a turn-mode level | 02§5 | all | stable |
| Time Budget | Total seconds allowed in a time-mode level | 02§2.4 | all | stable |

## Drift watch (resolved in future audits)

- `Unstable` vs `Unstable Gem` vs `不穩定寶石` — all three appear. Pick one canonical form. Route: match3-level-designer.
- Locale-specific spellings (`Colour Gem` vs `Color Gem`) — defer to i18n audit before freeze.
