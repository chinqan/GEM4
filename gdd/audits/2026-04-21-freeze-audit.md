# GDD Freeze Audit — 2026-04-21

**Auditor**: `match3-gdd-integrator` (acting proxy; the agent was just authored, running the first pass against v0.9 GDD state)
**Target**: all 9 GDD chapters at v0.9
**Scope**: v1.0 freeze readiness assessment

---

## Executive Summary

**Verdict**: **NO-GO on v1.0 freeze.**

**Headline blockers**:

1. **Scoring economy (base points, chain multiplier, combo table) is entirely absent from GDD proper.** The numbers exist only inside Chapter 09's unit-test `describe` strings and inside the `match3-game-designer` agent template. Single-source-of-truth violated.
2. **Four new Critical-Rule deliverables are completely unspecified**: Special-gem spawn-position rules, Blocker × Special interaction matrix, Move-counting table, Anti-frustration stance.
3. **Level-design placeholders dominate Chapter 02**: every per-level star threshold (L1–L80) is `[PLACEHOLDER]`; L6 carries a known self-conflict; L21–L80 reduced to "略".
4. **Orphan type references in `LevelJson` (02§9)**: `GemType`, `GemColour`, `BlockerPlacement`, `Objective` are referenced but never defined anywhere.
5. **45 Open Questions across all chapters**, none had an explicit owner + deadline before this audit (owners now assigned).

**What's in reasonable shape**: terminology consistency, performance budgets, intensity formula (matches byte-for-byte across 06 and 07 modulo one variable name), state machine and save schema, audio taxonomy, test strategy skeleton.

**Counts**: 15 routed findings · 22 open placeholders · 23 pre-freeze open questions.

---

## Step 1 — Terminology Drift

Scanned all 9 chapters for cross-chapter consistency on key domain terms.

**Consistent (no action)**: Match, Cascade, Chain, Combo, Jelly, Lock, Generator, Delivery Cell, Line Bomb, Area Bomb, Colour Gem, Dreamwarden, World, Gate, Boss, Endless, ★, Intensity, Rules Engine.

**Minor drift — advisory**:
- `Unstable` / `Unstable Gem` / `不穩定寶石` all appear. Pick one canonical form. Route → match3-level-designer.
- Spelling `Colour` vs `Color` — defer to i18n/locale audit.

**Zero drift blockers at this audit.**

---

## Step 2 — Type Registry Audit

See `docs/gdd/registries/types.md` for the full accounting.

**Defined types**: 13 (9 stable, 4 draft)
**Orphan references**: 11

**Freeze-blocking orphans**:
- `GemType`, `GemColour`, `BlockerPlacement`, `Objective` are referenced by canonical `LevelJson` in 02§9 but are **never defined**.
- `SpecialGemType`, `ComboType`, `MatchDescriptor`, `ObjectiveDelta` are needed by the event-bus authored in the new `match3-runtime-architect` agent spec and by the combo-matrix still owed by game-designer.
- `GameEvent`, `EventBus`, `Command`, `LoadController`, `BundleId`, `ColumnDrop`, `Unsubscribe` — runtime-layer types currently living only in the runtime-architect agent spec. Must land in Chapter 03 before freeze.

**Integrity note**: `AppState` is duplicated in 03§7 and 06§2.1. The 06 copy is richer (has `endless`, `endlessEnd`). Recommend canonical = 06§2.1; 03§7 becomes a pointer.

Routed to: match3-game-designer (4), match3-level-designer (1 `BlockerPlacement`), match3-runtime-architect (7), match3-ux-architect (1 advisory — `AppState` harmonise).

---

## Step 3 — Numeric Audit

See `docs/gdd/registries/numbers.md`.

**Matches (byte-for-byte across chapters)**:
- ✅ Intensity formula in 06§3.5 is semantically identical to 07§4.3 (only variable naming differs — minor advisory).
- ✅ Performance budgets in 03§9 and 08§8.1 align.
- ✅ Endless-mode numbers (5000 score step / 15 max difficulty / 3 reshuffles) align across 01 / 02 / 08.

**Critical gaps**:

| Gap | Severity |
|-----|----------|
| Scoring economy (3/4/5-match, cascade, remaining-moves) only in 09 test descriptions, absent from GDD body | **freeze blocker** |
| Chain multiplier value unspecified | **freeze blocker** |
| Combo score per combo-matrix entry unspecified; "10+ 種" claim vs 6 enumerated combos | **freeze blocker** |
| Star-threshold ratios + all per-level absolute values `[PLACEHOLDER]` | freeze blocker (headless-sim convergence expected) |
| Unstable-gem N and penalty both `?` | freeze blocker |

---

## Step 4 — Placeholder Sweep

See `docs/gdd/registries/placeholders.md`.

**Total open categories**: 22 (14 tagged `[PLACEHOLDER]` in chapter text + 8 silently-missing canonical deliverables).

**Accepted with convergence plan**: 0.
**Past deadline**: 0 (first audit).
**Freeze threshold**: ≤10 open — currently **far over**.

**Action**: every suggested owner must accept or re-route within 1 week (by 2026-04-28). Acceptance requires setting `Status: accepted` with confirmed convergence method + milestone.

---

## Step 5 — Open Questions Triage

See `docs/gdd/registries/open-questions.md`.

**Total**: 45 consolidated from chapter §Open Questions.

| Disposition | Count |
|-------------|-------|
| `open` with `pre-freeze` deadline | 23 |
| `deferred` to v1.1 / v1.x (explicit) | 13 |
| `closed` (already resolved in chapter text) | 9 |

**Clock starts**: deadlines are now tracked. Subsequent audits will escalate entries past deadline.

Every entry now has an explicit routed owner.

---

## Step 6 — Cross-Chapter Conflict Register

| ID | Finding | Chapters | Routed to | Severity |
|----|---------|----------|-----------|----------|
| F-01 | L6 uses Jelly as "placeholder target" but W1 principle says no Jelly until W2 | 02§7 L6 | match3-level-designer | **freeze blocker** |
| F-02 | Scoring numbers exist in 09 test names, absent from GDD body — single-source-of-truth violated | 09§3.3 ↔ 01 / 08 | match3-game-designer | **freeze blocker** |
| F-03 | 01§5.3 claims "10+ 種組合" but matrix enumerates only 6 unique pairs | 01§5.3 | match3-game-designer | **freeze blocker** |
| F-04 | 02§9 `LevelJson` references 4 undefined subtypes | 02§9 | match3-game-designer + match3-level-designer | **freeze blocker** |
| F-05 | `AppState` duplicated across 03§7 and 06§2.1; 06 richer | 03§7, 06§2.1 | match3-ux-architect | advisory |
| F-06 | Intensity formula variable naming differs between 06§3.5 and 07§4.3 (semantically identical) | 06§3.5, 07§4.3 | match3-audio-engineer | advisory |
| F-07 | Special-gem spawn position never specified (which cell becomes the new special?) | 01§5.2, 09§3.4 | match3-game-designer | **freeze blocker** |
| F-08 | Blocker × Special interaction undefined — zero coverage | — | match3-game-designer | **freeze blocker** |
| F-09 | Move-counting rule undefined — zero coverage | — | match3-game-designer | **freeze blocker** |
| F-10 | Anti-frustration mechanism stance undefined — zero coverage | — | match3-game-designer | **freeze blocker** |
| F-11 | Cascade-completion semantics at moves/time exhaust never specified | 06§6 | match3-game-designer (intent) + match3-runtime-architect (execution) | **freeze blocker** |
| F-12 | Event-name taxonomy in 06§8 exists but without typed payloads; `GameEvent` union needs to land in 03 | 06§8, 03 | match3-runtime-architect | **freeze blocker** |
| F-13 | W2–W4 per-level specs are "略"; only outline table exists | 02§7 | match3-level-designer | **freeze blocker** (content gap) |
| F-14 | Figma wireframes absent (05§9 self-flagged) | 05§9 | match3-ui-designer | **freeze blocker** |
| F-15 | RNG algorithm unspecified in 03 (runtime-architect proposes Mulberry32; must land in 03) | 03 | match3-runtime-architect | **freeze blocker** |

---

## Step 7 — Routing Summary

Blocker workload per owner:

| Owner | Freeze blockers | Advisory | Total |
|-------|-----------------|----------|-------|
| match3-game-designer | F-02, F-03, F-04 (partial), F-07, F-08, F-09, F-10, F-11 (intent) + PH-15 through PH-22 | — | **heaviest load** |
| match3-level-designer | F-01, F-04 (partial), F-13, PH-04, PH-05, PH-06, PH-07, PH-14 | terminology drift | heavy |
| match3-runtime-architect | F-11 (exec), F-12, F-15 + runtime-layer orphan types | — | medium |
| match3-ui-designer | F-14 (wireframes) | OQ-21, OQ-25 | light-medium |
| match3-ux-architect | — | F-05 (AppState harmonise) | advisory only |
| match3-audio-engineer | — | F-06, OQ-34, OQ-35 | advisory only |
| match3-narrative-designer | — | OQ-17, OQ-18 | advisory only |
| match3-technical-artist | OQ-13, OQ-39 | — | light |
| match3-qa-engineer | — | OQ-42 | advisory only |
| user | PH-11, PH-12, PH-13 | OQ-32 | light |

---

## Sign-off

**Decision**: **NO-GO on v1.0 freeze.**

**Counts**:
- 15 routed findings (13 freeze-blocking)
- 22 open placeholder categories (0 accepted)
- 23 pre-freeze open questions
- 11 orphan type references

**Next audit**:
- Weekly lightweight drift check.
- Next full pre-freeze audit when owners report ≥70% blocker closure.

**Immediate next actions** (ordered by leverage):

1. **match3-game-designer authors a Scoring section** in Chapter 01 (or 08 appendix). Covers F-02, F-03, PH-15, PH-16, PH-17. Unblocks downstream simulator and star-threshold calibration.
2. **match3-game-designer fills the 4 new Critical-Rule tables** (Special-gem position, Blocker × Special, Move-counting, Anti-frustration). Covers F-07, F-08, F-09, F-10 and PH-18–PH-22.
3. **match3-runtime-architect lands `GameEvent` / `Command` / `EventBus` / RNG choice in Chapter 03**. Covers F-12, F-15, and unblocks the runtime-layer orphan types from F-04.
4. **match3-level-designer fixes L6** (F-01) and **begins per-level star-threshold convergence via headless-sim** (PH-05). L6 fix is a quick win; the sim-driven convergence is longer-term.
5. **All owners accept or re-route their assigned placeholders by 2026-04-28.** No progression until placeholder ledger has owner acceptance on every entry.

---

*End of audit.*
