# Gem — Game Design Document (GDD)

> **Status**: v0.9 (整體草稿) · **Last updated**: 2026-04-21

本目錄是 **Gem** (Bejeweled 風格三消遊戲，PixiJS 2D) 的遊戲設計文件集。撰寫順序依 `/Users/chinqan/gem/docs/workflow/gdd-workflow.md` 的 Phase 執行。

---

## 章節索引

| # | 章節 | 檔案 | 主責 agent |
|---|---|---|---|
| 1 | 遊戲概述 | [01_game_overview.md](./01_game_overview.md) | match3-game-designer |
| 2 | 場景與關卡設計 | [02_scene_and_level_design.md](./02_scene_and_level_design.md) | match3-level-designer |
| 3 | 遊戲基礎建設 | [03_technical_foundation.md](./03_technical_foundation.md) | match3-technical-artist · match3-ux-architect |
| 4 | 遊戲風格與故事設計 | [04_art_style_and_narrative.md](./04_art_style_and_narrative.md) | match3-narrative-designer · match3-ui-designer · match3-technical-artist |
| 5 | 遊戲 UI/UX 設計 | [05_ui_ux_design.md](./05_ui_ux_design.md) | match3-ui-designer · match3-ux-architect |
| 6 | 遊戲流程設計 | [06_game_flow.md](./06_game_flow.md) | match3-game-designer · match3-ux-architect |
| 7 | 遊戲音樂音效設計 | [07_audio_design.md](./07_audio_design.md) | match3-audio-engineer |
| 8 | 遊戲其他規格與設定 | [08_additional_specs.md](./08_additional_specs.md) | match3-game-designer (召集) |
| 9 | 遊戲測試 | [09_testing.md](./09_testing.md) | match3-qa-engineer |

---

## 版本

- **v0.9** (2026-04-21) — 全章節首輪草稿，含 placeholder；待進入 Phase 5 整合審查後凍結 v1.0

## 閱讀順序建議

新成員建議閱讀順序：

1. **01 遊戲概述** — 掌握支柱與 scope
2. **04 風格與故事** — 掌握 tone
3. **03 技術基礎** — 掌握架構
4. **02 場景與關卡** — 掌握玩法節奏
5. **06 遊戲流程** — 掌握 state machine
6. **05 UI/UX** — 掌握交付規格
7. **07 音訊** + **08 其他** + **09 測試** — 依角色關注

---

## 撰寫工作流

見 [`../workflow/gdd-workflow.md`](../workflow/gdd-workflow.md)。

## 相關目錄

- 設計與工程 agents 定義：`/Users/chinqan/gem/.claude/agents/`
- Skills：`/Users/chinqan/gem/.claude/skills/`
- 未來實作：`/Users/chinqan/gem/src/`
