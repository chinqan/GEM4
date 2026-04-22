# Placeholder Ledger

Every `[PLACEHOLDER]` (and every silently-missing canonical deliverable) across the GDD.

Convergence methods: `headless-sim | playtest | designer-decision | external-dep | spike`

Last updated: 2026-04-23 — after closure pass.

## Closed placeholders (all 22 items addressed)

| ID | Description | Resolution |
|----|-------------|------------|
| PH-01 | 30-day retention KPI target | Set 25% proposed; post-launch sim (01§8.1) |
| PH-02 | Total dev cycle duration | 9 months solo / 5 months 3-person (01§9) |
| PH-03 | Endless stop-loss mechanism detail | Expanded in 02§10.2 (3 conditions: no-swap+reshuffle cap / manual end / 120s idle) |
| PH-04 | Star threshold ratios final | Canonical formula in 02§6.1 with basis-specific rules |
| PH-05 | Per-level star threshold values L1–L80 | Full table published in 02§7.5 (80 rows, proposed) |
| PH-06 | L6 jelly vs W1 conflict | L6 rewritten as Collect-15-Red (02§7) |
| PH-07 | L21–L80 per-level spec detail | Canonical parameter table in 02§7.5; JSON file splits deferred to impl-time using table as contract |
| PH-08 | Endless difficulty formula detail | Canonical formula + 15-tier table in 02§10.1.1 |
| PH-09 | World-title calligraphy font | Ma Shan Zheng (OFL, Google Fonts) (04§8) |
| PH-10 | Figma wireframes | Text-form canonical in 05§9; Figma deferred to post-MVP polish |
| PH-11 | Project licence | MIT for code; LICENSE file created; 08§7.5 updated |
| PH-12 | Playtest stipend budget | USD 40/session proposed, total USD 600–960 to v1.0 (08§8.4) |
| PH-13 | Playtest recruitment comp | Cross-ref 08§8.4 (09§8.1 updated) |
| PH-14 | Unstable-gem N + penalty | N=6 moves, -300 penalty (02§4.4) |
| PH-15 | Scoring economy table | Canonical 01§6.1 (19 entries proposed) |
| PH-16 | Chain multiplier formula | `min(1+(c-1)×0.5, 4.0)` canonical 01§6.2 |
| PH-17 | Combo score table | Six pairs priced (01§6.4) |
| PH-18 | Move-counting table | Canonical 01§6.5 + exec 03§13.7 |
| PH-19 | Anti-frustration stance | All four `don't` (01§6.7) |
| PH-20 | Blocker × Special matrix | Canonical 02§4.6 |
| PH-21 | Special-gem spawn position | Canonical 01§5.2 |
| PH-22 | Cascade end-condition timing | 01§6.6 intent + 03§13.6 exec |

## Summary

| Metric | v0.9 (04-21) | v0.10 (04-22) | v0.11 (04-23) |
|--------|--------------|---------------|---------------|
| Open placeholders | 22 | 12 | **0** |
| Closed / addressed | 0 | 10 | 22 |

## Post-freeze revision track

These items have `proposed` status and await quantitative convergence after the simulator is stood up:

| Area | Items | Convergence | Timeline |
|------|-------|-------------|----------|
| Scoring economy numeric values | 01§6 (base scores / chain multi / combo prices) | headless-sim 1000 seeds × 80 levels | v1.0 beta |
| Star threshold absolute values | 02§7.5 (80-row table) | headless-sim | v1.0 beta |
| Retention KPI target | 01§8.1 | post-launch telemetry | v1.x |
| Endless difficulty curve | 02§10.1 | internal playtest | v1.0 RC |

These are **not freeze blockers**; they are tuning cycles on already-locked structure.

## Cadence

gdd-integrator runs weekly drift checks; any chapter edit that re-introduces a `[PLACEHOLDER]` without ledger entry is blocked at PR.
