# GDD Registries

Single source of truth for cross-chapter concepts in the Gem match-3 GDD. Owned by `match3-gdd-integrator`.

Every registry is a structured table. When a value / term / type / number / question is introduced in any chapter, a corresponding registry entry must be added or updated in the same PR.

## Files

| Registry | Purpose |
|----------|---------|
| [terms.md](terms.md) | Canonical definitions for every domain term (chain, cascade, combo, blocker, etc.) |
| [types.md](types.md) | Every TypeScript type referenced in the GDD, with canonical location and consumers |
| [numbers.md](numbers.md) | Every shipping number (scoring, timings, budgets, thresholds, weights) with unit, status, canonical chapter |
| [placeholders.md](placeholders.md) | Every `[PLACEHOLDER]` with owner, convergence method, target milestone |
| [open-questions.md](open-questions.md) | Consolidated Open Questions ledger from all chapter §Open Questions sections |

## Intake rules

- Every chapter PR lists which registries it touched in its commit message.
- New references (e.g. a new type name) that are not resolved to a registry entry in the same PR block merge.
- Canonical entries have status `draft | proposed | stable | frozen`. Freeze milestones require target-status `frozen`.
- One concept has exactly one canonical chapter. Other chapters cite, never restate.

## Audits

Pre-freeze audits live under [../audits/](../audits/). Each audit is a dated snapshot produced by the seven-step protocol in the `match3-gdd-integrator` agent spec.

Current audits:
- [2026-04-21-freeze-audit.md](../audits/2026-04-21-freeze-audit.md) — v0.9 initial readiness (**NO-GO** · 15 findings / 22 placeholders)
- [2026-04-22-progress-audit.md](../audits/2026-04-22-progress-audit.md) — post fill-in (**still NO-GO** · 2 findings / 12 placeholders)
- [2026-04-23-freeze-readiness-audit.md](../audits/2026-04-23-freeze-readiness-audit.md) — final closure pass (**GO** · 0 findings / 0 placeholders · v1.0-gdd-frozen)
