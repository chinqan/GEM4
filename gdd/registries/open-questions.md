# Open Questions Ledger

Consolidated from every chapter's §Open Questions section. Last updated: 2026-04-23.

## Consolidated ledger

| ID | Raised in | Question | Owner | Deadline | Status |
|----|-----------|----------|-------|----------|--------|
| OQ-01 | 01§10 | Difficulty-curve validity | match3-level-designer | v1.0 beta (sim) | open (sim-driven) |
| OQ-02 | 01§10 | Autoplay-policy browser drift | match3-audio-engineer | ongoing | monitor |
| OQ-03 | 01§10 | Mobile touch precision | match3-ux-architect | v1.1 | deferred |
| OQ-04 | 01§10 | Theme attractiveness | match3-narrative-designer | v1.0 playtest | open (playtest-driven) |
| OQ-05 | 01§10 | Cloud save | user | resolved | closed |
| OQ-06 | 01§10 | Endless stop-loss | match3-game-designer | — | **closed 2026-04-23** (PH-03 / 02§10.2 spec'd) |
| OQ-07 | 02§11 | L6 jelly redesign | match3-level-designer | — | closed (L6 rewritten) |
| OQ-08 | 02§11 | W2–W4 per-level detail | match3-level-designer | — | **closed 2026-04-23** (02§7.5 table) |
| OQ-09 | 02§11 | Boss-level special-rule schema | match3-level-designer | — | **closed 2026-04-23** (02§2.3.1) |
| OQ-10 | 02§11 | Endless difficulty formula detail | match3-game-designer | — | closed (02§10.1.1) |
| OQ-11 | 02§11 | Community level editor | user | v1.x | deferred |
| OQ-12 | 03§14 | `@pixi/sound` vs Howler | match3-audio-engineer | — | closed (Howler) |
| OQ-13 | 03§14 | WebGPU detection / fallback detail | match3-technical-artist | — | **closed 2026-04-23** (03§1.3.1) |
| OQ-14 | 03§14 | i18n string load strategy | match3-ux-architect | — | **closed 2026-04-23** (08§1.3) |
| OQ-15 | 03§14 | CI bundle-budget thresholds | match3-qa-engineer | — | **closed 2026-04-23** (03§9 is canonical) |
| OQ-16 | 03§14 | Cloud-telemetry endpoint contract | user | v1.x | deferred |
| OQ-17 | 04§10 | Lumi character in v1? | match3-narrative-designer | — | **closed 2026-04-23** (04§5.2 已定 "not in v1") |
| OQ-18 | 04§10 | World-4 boss visual | match3-narrative-designer | — | **closed 2026-04-23** (L80 spec includes shifting 3×3 core; visual render left to art team within constraints) |
| OQ-19 | 04§10 | Endless visual variant | match3-narrative-designer | v1.x | deferred |
| OQ-20 | 04§10 | Additional-locale priority | user | v1.x | deferred |
| OQ-21 | 05§10 | Figma as SSOT | match3-ui-designer | — | **closed 2026-04-23** (text-form wireframe is SSOT for v1; Figma is visual-exploration layer, non-blocking) |
| OQ-22 | 05§10 | Component hot-reload (dev) | match3-ui-designer | nice-to-have | deferred |
| OQ-23 | 05§10 | Tooltip touch alternative | match3-ui-designer | v1.1 | deferred |
| OQ-24 | 05§10 | Settings DOM vs @pixi/ui | match3-ui-designer | — | closed (DOM) |
| OQ-25 | 05§10 | Motion-reduction duration formula | match3-ui-designer | — | **closed 2026-04-23** (05§2.6 formula) |
| OQ-26 | 06§9 | Render-preset live-apply scope | match3-ux-architect | — | closed |
| OQ-27 | 06§9 | Tab-return continue behaviour | match3-ux-architect | — | closed |
| OQ-28 | 06§9 | Daily-seed challenge mode | match3-game-designer | v1.1 | deferred |
| OQ-29 | 06§9 | Offline-play after initial load | match3-runtime-architect | — | **closed 2026-04-23** (06§6.2 canonical, Service-Worker based) |
| OQ-30 | 06§9 | Migration-overlay UX | match3-ux-architect | v1.x | deferred |
| OQ-31 | 07§13 | Voice-over for characters | match3-audio-engineer | v1.1 | deferred |
| OQ-32 | 07§13 | Music outsource vs commission | user | budget-decision | **pending user decision** (recommended: commission W1/W4, CC-BY for W2/W3) |
| OQ-33 | 07§13 | Endless custom playlist | match3-audio-engineer | — | closed (no) |
| OQ-34 | 07§13 | Ambience default per world | match3-audio-engineer | — | **closed 2026-04-23** (07§4.6 table) |
| OQ-35 | 07§13 | iOS low-power audio throttling | match3-audio-engineer | — | **closed 2026-04-23** (07§4.7 strategy) |
| OQ-36 | 08§12 | Project licence | user | — | **closed 2026-04-23** (MIT, PH-11) |
| OQ-37 | 08§12 | Cloud-telemetry timeline | user | v1.x | deferred |
| OQ-38 | 08§12 | Achievements cloud vs local | match3-game-designer | v1.x | deferred |
| OQ-39 | 08§12 | Font-subset toolchain | match3-technical-artist | — | **closed 2026-04-23** (08§7.1 pyftsubset pipeline) |
| OQ-40 | 08§12 | QR-code share feature | — | v1.x | deferred |
| OQ-41 | 09§12 | Pro-solver policy | match3-qa-engineer | v1.x | deferred |
| OQ-42 | 09§12 | Visual-regression testing | match3-qa-engineer | — | **closed 2026-04-23** (decision: Playwright screenshot diff, adopted in v1.1 post-freeze; v1 uses manual visual + axe-core) |
| OQ-43 | 09§12 | Load testing | — | — | closed (no backend) |
| OQ-44 | 09§12 | Sentry error reporting | user | v1.x | deferred |
| OQ-45 | 09§12 | Playtest stipend budget | user | — | **closed 2026-04-23** (PH-13 / 08§8.4) |

## Summary

| Status | v0.9 (04-21) | v0.10 (04-22) | v0.11 (04-23) |
|--------|--------------|---------------|---------------|
| Open (`pre-freeze`) | 23 | 18 | **2** |
| Pending user decision | 0 | 0 | 1 (OQ-32 music) |
| Monitor / ongoing | 0 | 0 | 1 (OQ-02) |
| Deferred | 13 | 13 | 13 |
| Closed | 9 | 13 | **29** |

## Remaining open items (non-blocking at freeze)

| OQ | What's needed |
|----|---------------|
| OQ-01 | Run headless-sim — validates PH-05 numeric values |
| OQ-02 | Ongoing monitoring; no decision owed |
| OQ-04 | First playtest session produces data |
| OQ-32 | User chooses music sourcing model (commission vs CC-BY library vs AI-assist allowed vs outsource) |

None of these block v1.0 **structural** freeze.
