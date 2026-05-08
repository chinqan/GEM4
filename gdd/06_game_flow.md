# 06 · 遊戲流程 (Game Flow)

> **Status**: v1.0 (synced 2026-05-08) · **Owners**: match3-game-designer (規則流) · match3-ux-architect (畫面流)
> **Last updated**: 2026-05-08 · **Phase**: 2 — Systems

---

## 1. 總體流程 (Macro Flow)

```
[使用者打開網頁]
        │
        ▼
[Splash Screen] ── 需 user gesture (tap / click) 以解鎖音訊
        │
        ▼
[Main Menu]
        │
        ├─▶ [World Map] ──▶ [Level Select Card] ──▶ [Game]
        │                                            │
        │                            ┌───────────────┼───────────────┐
        │                            ▼               ▼               ▼
        │                        [Pause]      [Level Complete]  [Level Fail]
        │                            │               │               │
        │                            ▼               ▼               ▼
        │                     (resume/restart)   (next/replay)   (retry/quit)
        │
        ├─▶ [Settings (DOM overlay)]
        ├─▶ [Credits]
        └─▶ [Quit] (關閉頁籤，或回主選單)
```

---

## 2. State Machine (完整)

### 2.1 狀態列舉

```typescript
// src/state/app-state.ts
export type AppState =
  | { kind: 'splash' }
  | { kind: 'menu' }
  | { kind: 'worldMap';      worldId: number }
  | { kind: 'levelSelect';   worldId: number; levelId: number }
  | { kind: 'game';          levelId: number; runState: RunState }
  | { kind: 'pause';         previous: AppState }           // previous 僅允許 game/endless
  | { kind: 'levelComplete'; result: LevelResult }
  | { kind: 'levelFail';     result: LevelResult }
  | { kind: 'endless';       runState: EndlessRunState }
  | { kind: 'endlessEnd';    result: EndlessResult }
  | { kind: 'settings';      returnTo: AppState }           // returnTo 禁止為 settings 自身
  | { kind: 'credits' };

export interface RunState {
  phase: 'loading' | 'intro' | 'playing' | 'resolving' | 'objectiveMet' | 'outOfMoves' | 'outOfTime';
  chainCount: number;
  score: number;
  movesRemaining?: number;
  timeRemainingMs?: number;
  intensity: number;   // 0..1 — for adaptive music
}

export interface LevelResult {
  levelId: number;
  cleared: boolean;
  stars: 0 | 1 | 2 | 3;
  score: number;
  chainMax: number;
  movesRemaining: number;
  specialSpawnedCount: number;
  durationMs: number;
}

export interface EndlessRunState {
  phase: 'playing' | 'resolving' | 'gameOver';
  score: number;
  chainMax: number;
  difficulty: number;  // 1..15
  reshufflesUsed: number;
  reshufflesMax: number;
}

export interface EndlessResult {
  score: number;
  chainMax: number;
  specialSpawnedCount: number;
  durationMs: number;
  rank?: number;
}
```

### 2.2 合法轉移表

| From | To | Trigger | Guard |
|---|---|---|---|
| splash | menu | user gesture → audio unlocked + core bundle ready | asset load complete |
| menu | worldMap | "Play" | `progress.currentWorldId` 決定初始 world |
| menu | settings | gear icon | — |
| menu | credits | "Credits" | — |
| menu | endless | "Endless"（若解鎖） | `progress.maxUnlockedLevelId >= 80` |
| worldMap | levelSelect | tap level node | `levelId <= maxUnlockedLevelId` |
| worldMap | menu | back | — |
| worldMap | settings | gear icon | — |
| worldMap | worldMap | tap world switcher（prev/next） | world 已解鎖 |
| levelSelect | game | "Play" | level spec 載入完成 |
| levelSelect | worldMap | back | — |
| game | pause | ESC / pause button | game.runState.phase == 'playing' |
| game | levelComplete | runState.phase → objectiveMet 且 resolving 結束 | — |
| game | levelFail | runState.phase → outOfMoves / outOfTime 且 resolving 結束 | — |
| game | settings | pause → settings | — |
| pause | game | resume | — |
| pause | menu | quit | 寫存檔 |
| pause | levelSelect | restart level |（不重新讀關卡 JSON，但重設 runState） |
| pause | settings | — | returnTo = 原 game state |
| levelComplete | levelSelect | "Next" | next level 已解鎖 |
| levelComplete | worldMap | "Back to map" | — |
| levelComplete | game | "Replay" | — |
| levelFail | game | "Retry" | — |
| levelFail | levelSelect | "Quit" | — |
| endless | pause | ESC | — |
| endless | endlessEnd | 無解 ∧ 重洗用盡 | — |
| endlessEnd | menu | any CTA | — |
| settings | returnTo | back / save | returnTo 不能是 settings 本身 |
| credits | menu | back | — |

### 2.3 不變式 (Invariants)

1. `pause.previous` 僅能是 `game` 或 `endless`；任何其他暫停需求（設定、讀檔）走 `settings` 或 modal-in-place，不進 pause state
2. `settings.returnTo` 僅能是非 settings 的狀態
3. 任何 state transition 必須經 `transition(from, to)` 唯一入口；lint rule 禁止 `state = ...` 直接賦值
4. 當 state 進入 `game` 時，存檔 `progress.lastAttemptedLevelId = levelId`；玩家若中途離開，下次開遊戲詢問「是否續玩？」

---

## 3. 單場關卡內流程 (Intra-Level Flow)

### 3.1 Phase 時序

```
[Entered game state]
        │
        ▼
[phase: loading] ── 載入 level JSON + world assets（若未預載） ── 1–3 秒 max
        │
        ▼
[phase: intro] ── 顯示目標 chip + 手數/時間 + 「Tap to Start」 ── ≤2 秒 或 tap
        │
        ▼
[phase: playing]
        │
   ┌────┴────┐
   │         │
   ▼         ▼
[tap/drag swap] ──▶ [invalid → shake → 回 playing]
                        或
                   [valid → resolving]
   │
   ▼
[phase: resolving]
        │
        ├── match detect → gems → particles → score +=
        ├── cascade → drop → new spawn
        ├── chain++
        ├── 若無 match → 回 playing
        ├── 若 objective 達成 → phase: objectiveMet
        └── 若 moves/time 用盡 ∧ 未達成 → phase: outOfMoves / outOfTime
   │
   ▼
[phase: objectiveMet] ── 播 victory stinger + 停 playing 互動
        │
        ▼
[計算 moves-remaining bonus] ── 動畫：每手換分 120ms
        │
        ▼
[進入 levelComplete state]
```

### 3.2 關卡內具體 Tick

每 `tick` 為 `requestAnimationFrame`：

1. **Input step**：消化 pointer events，轉為 game command
2. **Rules step** (固定 60Hz)：
   - 若 pending command → apply
   - 若 resolving → advance one cascade step per 2–6 ticks (視粒子時長)
   - 若 phase 切換 → emit event
3. **Audio step**：根據 intensity + chain 層疊音樂
4. **Render step**：同步 rules → graphics；粒子 tick
5. **Telemetry step**：每秒一次（低頻）

### 3.3 關鍵計時（所有以 ms）

| 事件 | 時長 |
|---|---|
| 寶石選取反饋 | 80 |
| Swap 動畫 | 200 |
| Invalid shake | 240 |
| Match 消除縮放 | 200 |
| Cascade drop step | 120 per row fallen |
| 特殊寶石 spawn 震波 | 600 |
| 特殊寶石啟動效果 | 800 |
| Victory stinger 開始到畫面切換 | 1800 |
| Fail 停頓到畫面切換 | 1200 |

### 3.4 無解處理

若玩家閒置 > `hintDelayMs`（設定，預設 5000），系統：

1. 先跑 solver 尋找可行 swap
2. 若有：將該 swap 的兩顆寶石顯示輕微脈動提示
3. 若無：顯示「重洗中」並自動 reshuffle 棋盤（保留計分、手數）

### 3.5 Intensity 計算

```
intensity = clamp(
  0.2 * (currentChain / 6) +
  0.4 * (1 - (movesRemaining / initialMoves)) * urgencyKick +
  0.3 * (activeSpecialsOnBoard / 4) +
  0.1 * (objectiveProgress),
  0, 1
)

urgencyKick = 1 if movesRemaining / initialMoves < 0.3 else 0
```

音訊層疊與此聯動（見 `07_audio_design.md#adaptive-music`）。

### 3.6 Move Counting

完整規則 canonical 於 [`01_game_overview.md#65-move-counting-table` (01§6.5)](01_game_overview.md#65-move-counting-table)。

摘要：
- Invalid swap：不計
- Valid swap：計
- Swap-into-Special：計（swap 本身）
- 直接 tap-activate Special：計
- Cascade-triggered Special：不計
- Hint / Auto-reshuffle：不計

執行面於 [`03_technical_foundation.md#137-move-counting-執行` (03§13.7)](03_technical_foundation.md#137-move-counting-執行)。

### 3.7 End-of-Level Timing

完整設計意圖 canonical 於 [`01_game_overview.md#66-cascade--end-condition-timing-intent` (01§6.6)](01_game_overview.md#66-cascade--end-condition-timing-intent)；執行面於 [`03_technical_foundation.md#136-end-of-level-timing執行面` (03§13.6)](03_technical_foundation.md#136-end-of-level-timing執行面)。

核心原則：**玩家已提交的那一手所產生的 cascade 必完整解算**；時間 / 手數耗盡不得截斷。

---

## 4. Onboarding Flow (前 3 分鐘)

### 4.1 目標

新玩家在 **180 秒內** 通過 L1–L3，**無需任何文字教學**。

### 4.2 具體行為

```
[首次開啟]
        │
        ▼
[Splash] ── 自動偵測語言（browser Accept-Language）
        │
        ▼
[Main Menu] ── "Play" 按鈕脈動提示
        │
        ▼
[World Map] ── 僅 L1 可點；其餘灰階
        │
        ▼
[Level Select (L1)] ── 「Tap to Start」脈動
        │
        ▼
[Game L1] ── 盤面預置的 4-match 機會很明顯
        │
        ├─ 若玩家 15 秒內沒動：播放「暗示」動畫，輕微脈動指向可行 swap
        ├─ 若玩家做了 swap：正常 flow
        ▼
[L1 complete]
        │
        ▼
[Level Complete modal] ── 星星依序亮 + 分數跳動
        │
        ▼
[Next] ── 自動導向 L2
```

### 4.3 禁用

- **禁用**對話框解釋「這是 match-3 遊戲」
- **禁用**教學箭頭除非 5 秒以上閒置
- **禁用**強制觸控點擊引導（可點擊手把），除了 L1 的第一次 idle 暗示

### 4.4 首次進入的系統偵測

- `prefers-reduced-motion` → 自動啟用 reduce motion（可在設定改回）
- `prefers-color-scheme` → v1 僅深色主題，忽略
- `navigator.language` → 預設語言自動帶入

### 4.5 Tutorial step tracker

`saveState.tutorial.completedSteps` 記錄：

- `l1-first-swap` — 玩家做出第一次 swap 後記錄
- `l1-first-match` — 第一次消除
- `l2-saw-line-bomb` — 生成 Line Bomb
- `l4-saw-colour-gem`
- `l5-saw-area-bomb`
- `l6-activated-line-bomb`
- `l9-saw-first-combo`

這些步驟用於遙測漏斗分析，不會鎖住遊戲。

---

## 5. Fail / Retry Flow

### 5.1 Level Fail

```
[phase: outOfMoves / outOfTime]
        │
        ▼
[resolving 結束] ── 仍有動畫則等 resolve
        │
        ▼
[進入 levelFail state]
        │
        ▼
[levelFail modal] ──
    - 鼓勵文案（隨機 1 句）
    - 「再試一次」「回地圖」「設定」
    - 不顯示失敗分數的嘲諷動畫
```

### 5.2 Retry

- 重新載入當前 level JSON
- RNG 使用新 seed（預設）或相同 seed（設定中的 "Daily challenge mode" v1.1+）
- 星門記憶不重設
- `attempts++` 寫入 save

### 5.3 中途離開

- 玩家按 ESC / 瀏覽器 close tab：
  - 觸發 `beforeunload`：若 runState 有進度且非 resolving，顯示原生確認「確定要離開嗎？」
  - 存檔：當局 **不計入**（只有完成才計入）；但 `attempts` +1

---

## 6. Edge Cases

### 6.1 Tab 切出 / 聚焦改變

| 事件 | 行為 |
|---|---|
| `document.visibilityState === 'hidden'` | 自動暫停 game；計時凍結；音樂停 |
| `visibilityState === 'visible'` | 顯示「繼續？」overlay，不直接復原（避免不公平） |

### 6.2 網路斷線 / 離線遊玩

- v1 所有資產需在初期 bundle 或 world bundle 預載
- Service Worker 快取核心 bundle + 已載入的 world bundle → **已下載的世界與關卡完全離線可玩**
- 若 lazy load 失敗（首次進入新世界時斷網）：顯示錯誤 toast + 重試按鈕；遊戲仍可玩已載入的關卡
- **離線保證清單**（v1 承諾）：
  - 主選單、世界地圖、設定、credits — 離線可用
  - 已通關過的關卡 — 離線可重玩
  - 已瀏覽過的世界（bundle 已快取）— 離線可玩新關卡
  - 未載入的世界 → 需連線一次以快取
- 本機存檔（`localStorage`）離線 100% 可用；遙測離線時累積，下次上線 flush（v1.x 上雲後生效；v1 只寫本機，無 flush 動作）

### 6.3 localStorage 滿 / block

- 寫入失敗：顯示 toast「無法儲存進度 — 瀏覽器儲存空間已滿」
- 繼續遊戲但不再嘗試寫入（直到下次 session）
- 提供「匯出存檔」按鈕讓玩家自救

### 6.4 記憶體壓力

- 偵測 `performance.memory`（若可用），過高時：
  - 限制粒子 preset
  - 顯示一次性警告（避免 spam）

### 6.5 瀏覽器重新整理

- 下次開啟：
  - 自動 resume 到上次的 `AppState`（除 `game` 以外）
  - 若上次是 `game`：回到 `levelSelect(levelId)`，顯示「繼續？」選項
  - 若 5 分鐘以上未動：回 menu，不打擾

### 6.6 多頁籤

- 多頁籤開同站：每個頁籤獨立 runtime；localStorage 寫入競態透過 timestamp 解決（較晚 write 勝）
- 不顯示警告

---

## 7. Flow-to-Screen 對應

| Flow Step | Screen | Data Required |
|---|---|---|
| Splash | `splash.ts` | brand logo, loading progress |
| Main Menu | `menu.ts` | `progress.currentWorldId`, unlock flags |
| World Map | `world-map.ts` | `progress.levelRecords`, current world tiles |
| Level Select | `level-select.ts` | level meta, best record |
| Game | `game-hud.ts` + board | level spec, runState |
| Pause | `pause.ts` | current runState snapshot |
| Level Complete | `level-complete.ts` | LevelResult + star breakdown |
| Level Fail | `level-fail.ts` | LevelResult + retry option |
| Settings | DOM overlay | current settings |
| Credits | `credits.ts` | static content |

---

## 8. Event Bus / Telemetry Hooks

Global events 發射點（詳細事件清單在 `08_additional_specs.md#telemetry`）：

| Event | 觸發點 |
|---|---|
| `app.loaded` | Splash 結束 |
| `level.started` | entered `game` state |
| `match.landed` | 每次 match detect |
| `chain.escalated` | chain 遞增到新階（2, 3, 4, 5+） |
| `special.spawned` | 特殊寶石生成 |
| `special.activated` | 特殊寶石啟動 |
| `combo.triggered` | 特殊寶石組合 |
| `level.completed` | entered `levelComplete` |
| `level.failed` | entered `levelFail` |
| `settings.changed` | 每次設定修改 |
| `reshuffle.triggered` | 重洗發生 |
| `hint.shown` | 暗示提示顯示 |

---

## 9. Open Questions

| # | 問題 | 備註 |
|---|---|---|
| 1 | `settings.returnTo = game/endless` 時 settings 內的某些設定（如 render preset）是否允許立即生效？ | v0.9 暫定「音訊即時、渲染 preset 下關卡生效」 |
| 2 | Tab 切回時是否顯示「繼續」還是直接 pause 保留 | 暫定：顯示 overlay 點擊繼續 |
| 3 | 「Daily seed 挑戰模式」v1.1+ 納入 | 架構需要在 rng 設計時保留種子化能力（已做） |
| 4 | 中場斷線：已失去網路時遊戲能否繼續？ | 取決於資產載入；核心關卡應該要能離線繼續 |
| 5 | 新版本上線時的 migration overlay 設計 | v0.9 僅承諾無破壞性遷移，UX 待後續補 |

---

## Changelog

- **2026-04-21** · v0.9 · 初稿（owners: match3-game-designer + match3-ux-architect）
