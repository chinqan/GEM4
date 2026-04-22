# Type Registry

Every TypeScript type referenced in the GDD. Each type has exactly one canonical definition location. References from other chapters cite, not redefine.

Status legend: `draft | proposed | stable | frozen`

Last updated: 2026-04-23.

## Defined types (all stable)

| Type | Canonical location | Consumers (chapter) | Status |
|------|---------------------|---------------------|--------|
| `AppState` | 06§2.1 (canonical; 03§7 pointer) | 03, 06 | stable |
| `RunState` | 06§2.1 | 03, 06 | stable |
| `EndlessRunState` | 06§2.1 | 06, 08 | stable |
| `LevelResult` | 06§2.1 | 05, 06 | stable |
| `EndlessResult` | 06§2.1 | 06 | stable |
| `SaveState` | 03§6.2 | 06, 08, 09 | stable |
| `LevelRecord` | 03§6.2 | 06 | stable |
| `LevelJson` | 02§9 | 03, 08, 09 | stable |
| `PointerEvent` (game-local) | 03§8.1 | 03 | stable |
| `GemColour` | 02§9.1 | 01, 03, 07, 08, 09 | stable |
| `SpecialGemType` | 02§9.1 | 01, 03, 07, 09 | stable |
| `GemType` | 02§9.1 | 02, 03 | stable |
| `Objective` | 02§9.1 | 02, 06 | stable |
| `BlockerKind` | 02§9.1 | 02 | stable |
| `BlockerPlacement` | 02§9.1 | 02 | stable |
| `ObjectiveDelta` | 02§9.1 | 03, 06 | stable |
| `ComboType` | 02§9.1 | 01, 03, 07, 09 | stable |
| `MatchDescriptor` | 02§9.1 | 03, 09 | stable |
| `GameEvent` | 03§13.1 | 06, 07, 09 | stable |
| `EventBus` | 03§13.1 | 03 | stable |
| `Unsubscribe` | 03§13.1 | 03 | stable |
| `Command` | 03§13.2 | 03 | stable |
| `BundleId` | 03§13.8 | 03 | stable |
| `LoadController` | 03§13.8 | 03 | stable |
| `ColumnDrop` | 03§13.5 | 03 | stable |

## Orphan references

**None.** All referenced types are defined.

## Integrity notes

- `AppState` canonical = 06§2.1 (03§7 is pointer only). F-05 closed.
- Runtime-layer types all live in 03§13 (owned by `match3-runtime-architect`).
- Level-data types all live in 02§9.1 (owned by `match3-game-designer` + `match3-level-designer`).
- `ColumnDrop` defined inline in 03§13.5 on 2026-04-23.
