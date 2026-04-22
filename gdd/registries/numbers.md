# Numeric Registry

Every shipping number used in the Gem GDD, with value, unit, canonical chapter, consumers, and status.

Status legend: `placeholder | proposed | frozen`
`proposed` = authored with an initial value, awaiting convergence via headless-sim / playtest.

Last updated: 2026-04-22.

---

## Scoring (canonical in 01§6)

| Number | Value | Unit | Canonical | Consumers | Status |
|--------|-------|------|-----------|-----------|--------|
| Base score — 3-match | 60 | points | 01§6.1 | 09 | proposed |
| Base score — 4-match | 120 | points | 01§6.1 | 09 | proposed |
| Base score — 5-straight | 200 | points | 01§6.1 | 09 | proposed |
| Base score — T-match | 200 | points | 01§6.1 | 09 | proposed |
| Base score — L-match | 200 | points | 01§6.1 | 09 | proposed |
| Base score — 5-cross / ≥6 其他 | 300 | points | 01§6.1 | 09 | proposed |
| Cascade step bonus | 50 | points/step | 01§6.1 | 09 | proposed |
| Remaining moves bonus | 1000 | points/move | 01§6.1 | 09 | proposed |
| Chain multiplier formula | `min(1 + (chain-1)×0.5, 4.0)` | ratio | 01§6.2 | 09 | proposed |
| Chain multiplier cap | ×4.0 (chain ≥7) | ratio | 01§6.2 | 09 | proposed |
| Line Bomb activation | `60 × cells_cleared × multiplier` | points | 01§6.3 | 09 | proposed |
| Area Bomb activation | `60 × cells_cleared × multiplier` | points | 01§6.3 | 09 | proposed |
| Colour Gem activation | `(60 × cells + 500) × multiplier` | points | 01§6.3 | 09 | proposed |
| Combo Line×Line | 3,000 | points | 01§6.4 | 09 | proposed |
| Combo Line×Area | 4,000 | points | 01§6.4 | 09 | proposed |
| Combo Area×Area | 5,000 | points | 01§6.4 | 09 | proposed |
| Combo Colour×Line | 6,000 | points | 01§6.4 | 09 | proposed |
| Combo Colour×Area | 7,000 | points | 01§6.4 | 09 | proposed |
| Combo Colour×Colour | 10,000 | points | 01§6.4 | 09 | proposed |

## Star thresholds

| Number | Value | Unit | Canonical | Status |
|--------|-------|------|-----------|--------|
| ★ ratio | ×1.0 | ratio-of-base | 02§6.1 | proposed |
| ★★ ratio | ×1.6 | ratio-of-base | 02§6.1 | proposed |
| ★★★ ratio | ×2.5 | ratio-of-base | 02§6.1 | proposed |
| Per-level thresholds (L1–L80) | varies | score / moves | 02§7 | **placeholder** (headless-sim convergence outstanding) |

## Intensity formula (canonical 06§3.5; 07 now cites, no duplication)

| Weight | Value | Status |
|--------|-------|--------|
| Chain weight | 0.2 | stable |
| Moves-urgency weight | 0.4 | stable |
| Active-specials weight | 0.3 | stable |
| Objective-progress weight | 0.1 | stable |
| Urgency threshold | movesRatio < 0.3 | stable |
| Chain normaliser | 6 | stable |
| Active-specials normaliser | 4 | stable |

## Adaptive music layer thresholds (smoothstep)

| Layer | Edge0 | Edge1 | Canonical | Status |
|-------|-------|-------|-----------|--------|
| L1 (chain≥2) | 0.1 | 0.3 | 07§4.3 | stable |
| L2 (chain≥4) | 0.35 | 0.55 | 07§4.3 | stable |
| L3 (chain≥6+) | 0.6 | 0.85 | 07§4.3 | stable |

## Animation durations (ms) — canonical 06§3.3

| Event | Duration | Status |
|-------|----------|--------|
| Gem pick feedback | 80 | stable |
| Swap animation | 200 | stable |
| Invalid shake | 240 | stable |
| Match clear scale | 200 | stable |
| Cascade drop step | 120 per row fallen | stable |
| Special spawn shockwave | 600 | stable |
| Special activation | 800 | stable |
| Victory stinger → screen | 1800 | stable |
| Fail pause → screen | 1200 | stable |
| Cascade sub-step min | 200 | stable (new, 03§13.5) |
| Remaining-moves bonus anim | 120 per move | stable |

## Performance budgets — canonical 03§9; duplicated (match) in 08§8.1

| Metric | Budget | Status |
|--------|--------|--------|
| Initial JS (gzipped) | 500 KB | frozen |
| Initial CSS | 50 KB | frozen |
| Core atlas | 3 MB | frozen |
| Per-world atlas | 2 MB | frozen |
| Initial SFX | 1 MB | frozen |
| Total audio | 8 MB | frozen |
| Total startup payload | 5 MB | frozen |
| Sustained desktop FPS | 55 (99th pct) | frozen |
| 99p frame time | 25 ms | frozen |
| Draw calls/frame | 80 desktop | frozen |
| Particle ceiling | 500 desktop | frozen |
| VRAM | 80 MB desktop | frozen |
| 30-min memory drift | 10 MB | frozen |

## Runtime (canonical 03§13)

| Metric | Value | Status |
|--------|-------|--------|
| Game-loop rules tick | 60 Hz (16.667 ms) | frozen |
| Tab-hidden catch-up clamp | 250 ms | stable |
| Command queue depth cap | 8 | stable |
| Cascade sub-step safety cap | 50 per command | stable |
| RNG algorithm | Mulberry32 | stable |
| RNG streams per level | 4 (boardInit / cascadeFill / juice / misc) | stable |

## Gameplay timings

| Setting | Default | Canonical | Status |
|---------|---------|-----------|--------|
| Hint idle delay | 5000 ms | 06§3.4 + 08§4 | stable |
| Save debounce | 500 ms | 03§6.3 | stable |

## Endless mode

| Number | Value | Canonical | Status |
|--------|-------|-----------|--------|
| Level-up score step | 5000 | 01§4.3, 08§6.3 | stable |
| Max difficulty level | 15 | 02§10.1, 08§6.2 | stable |
| Max reshuffles per run | 3 | 02§10.2, 08§6.4 | stable |

## Unstable gem

| Number | Value | Canonical | Status |
|--------|-------|-----------|--------|
| Countdown N (moves before explosion) | 6 | 02§4.4 | proposed |
| Score penalty on explosion | -300 | 02§4.4 | proposed |
| 3×3 explosion radius | yes | 02§4.4 | stable |

## Audio — canonical 07§7.2, §4.4

| Metric | Value | Status |
|--------|-------|--------|
| Music LUFS | -18 | stable |
| Gameplay SFX LUFS | -14 | stable |
| UI SFX LUFS | -16 | stable |
| Stinger LUFS | -12 | stable |
| Peak max | -1 dBFS | stable |
| Ducking on big stinger | -6 dB / 150 ms | stable |
| Ducking release | +6 dB / 400 ms | stable |
| Master voice cap | 32 | stable |

## Accessibility / motion

| Metric | Value | Canonical | Status |
|--------|-------|-----------|--------|
| Motion-reduction truncation | >240 ms → 100 ms | 05§2.6 | proposed (OQ-25 open) |
| Max luminance change | ≤10% per 200 ms | 05§7.2, 08§3.2 | stable |
