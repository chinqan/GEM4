# 圖譜行動計畫 (Graph Action Plan)

> 產出日期：2026-05-11 · 基於 `graphify-out/GRAPH_REPORT.md` 的 Suggested Questions
> 圖譜規模：1,241 nodes · 2,988 edges · 99 communities

---

## 優先行動總覽

| # | 問題摘要 | 風險等級 | 需要行動？ | 類型 |
|---|----------|----------|-----------|------|
| 1 | `GameSessionController` 橋接 4 個社群 | Medium | ✅ 監控 | 架構橋接 |
| 2 | `KeybindManager` 跨社群連接 | Low | ❌ 正常 | 架構橋接 |
| 3 | `LoadController` 跨社群連接 | Low | ❌ 正常 | 架構橋接 |
| 4 | `getCell()` 的 31 條 INFERRED 邊是否正確 | Medium | ✅ 驗證 | 邊驗證 |
| 5 | `detectMatches()` 的 9 條 INFERRED 邊是否正確 | Low | ✅ 驗證 | 邊驗證 |
| 6 | `createButton()` 的 9 條 INFERRED 邊是否正確 | Low | ❌ 正確 | 邊驗證 |
| 7 | 85 個弱連接節點缺少連接 | Low | ❌ 預期行為 | 缺失邊 |

---

## 逐題分析

---

### Q1：為什麼 `GameSessionController` 連接了「Combo Matrix & Board Ops」、「Scoring & Game Session」、「Level System & Integration」、「Match Detection & Board Logic」？

#### 問題重述
`GameSessionController` 作為高中介中心性節點（betweenness = 0.0314），為何同時橋接遊戲規則、計分、關卡系統、匹配偵測四大社群？

#### 揭示的架構議題
此問題試圖揭露：是否存在一個「上帝物件」承擔了過多職責，導致系統耦合度過高。

#### 圖譜查詢
```bash
/graphify explain "GameSessionController"
```

#### 基於圖譜的回答

`GameSessionController`（`game/runtime/game-session.ts`，community=3）擁有 40 條邊，其中：
- **30 條 EXTRACTED method 邊**：`.executeSwap()`、`.runCascadeLoop()`、`.checkEndCondition()`、`.processBlockers()` 等
- **2 條 EXTRACTED imports 邊**：被 `game-integration.ts`（community=1, 32）匯入
- **2 條 EXTRACTED imports 邊**：被測試檔案（community=2）匯入
- **1 條 EXTRACTED contains 邊**：包含於 `game-session.ts`（community=0）

跨社群連接路徑：
- → community 0（Scoring & Game Session）：透過 `game-session.ts` 檔案節點
- → community 1（Level System & Integration）：被 `game-integration.ts` 匯入
- → community 2（Match Detection & Board Logic）：被測試檔案匯入
- → community 32（Game Integration Helpers）：被 `src/integration/game-integration.ts` 匯入

#### 受影響模組與檔案
- `src/game/runtime/game-session.ts`
- `src/integration/game-integration.ts`

#### 風險等級：Medium

#### 根本原因
`GameSessionController` 是遊戲的**核心協調器**（Mediator Pattern），負責：
1. 接收玩家輸入（swap/activate）
2. 呼叫規則引擎（match-detect、cascade、combo-matrix）
3. 追蹤計分與目標進度
4. 管理遊戲狀態（moves/time remaining）

這是 Match-3 遊戲架構中**預期的設計**。一個 session controller 必然需要協調多個子系統。真正的 betweenness 最高節點是 `game-integration.ts`（0.15）和 `board-animator.ts`（0.099），它們才是更值得關注的橋接點。

#### 具體方案
**不需要重構**。`GameSessionController` 的職責邊界清晰：
- 它不直接操作 board 資料結構（委託給 `board.ts` 的 `getCell()`/`setCell()`）
- 它不直接處理渲染（委託給 `BoardAnimator`）
- 它不直接處理音效（透過 EventBus 發送事件）

**建議監控**：若未來方法數超過 40 個，考慮拆分為 `SwapExecutor` 和 `SessionStateTracker`。

#### 建議檢視的檔案
- `src/game/runtime/game-session.ts` — 確認方法數量是否持續增長

#### 驗證步驟
```bash
grep -c "^\s*\(public\|private\|protected\)\?\s*\w\+(" src/game/runtime/game-session.ts
# 若超過 40 個方法，考慮拆分
```

#### 信心等級：High
圖譜中的邊全部為 EXTRACTED，反映真實的程式碼結構。

---

### Q2：為什麼 `KeybindManager` 連接了「Keybind Manager」、「Game Integration Helpers」、「Input System & Viewport」、「Keybinds & Command Queue」？

#### 問題重述
`KeybindManager` 為何跨越多個輸入相關社群？

#### 揭示的架構議題
輸入系統是否過度分散，或者 `KeybindManager` 是否承擔了不屬於它的職責。

#### 圖譜查詢
```bash
/graphify explain "KeybindManager"
```

#### 基於圖譜的回答

`KeybindManager`（`src/input/keybinds.ts`，community=15）擁有 25 條邊：
- **21 條 EXTRACTED method 邊**：全部指向自身的方法（`.handleKeyDown()`、`._executeAction()` 等）
- **2 條 EXTRACTED contains 邊**：指向 `keybinds.ts` 檔案節點（community=31）
- **2 條 EXTRACTED imports 邊**：指向 `input-system.ts`（community=25, 32）

跨社群連接完全是因為**檔案級別的 contains/imports 邊**，而非方法級別的耦合。

#### 受影響模組與檔案
- `src/input/keybinds.ts`
- `src/input/input-system.ts`

#### 風險等級：Low

#### 根本原因
這是圖譜社群偵測的**假陽性**。`KeybindManager` 的所有方法都在同一個檔案中，但因為：
1. `keybinds.ts` 檔案節點被分到 community 31
2. `input-system.ts` 被分到 community 25/32
3. `KeybindManager` class 本身在 community 15

社群演算法將同一個模組的不同抽象層級分到了不同社群，造成「跨社群」的假象。

#### 具體方案
**不需要行動**。這是正常的輸入系統架構：`KeybindManager` 管理鍵盤綁定，`InputSystem` 是上層抽象，`BoardInput` 處理棋盤互動。職責分離合理。

#### 信心等級：High

---

### Q3：為什麼 `LoadController` 連接了「Asset Load Controller」和「Game Integration Helpers」？

#### 問題重述
`LoadController` 的跨社群連接是否暗示資產載入與遊戲整合之間存在不當耦合？

#### 揭示的架構議題
資產載入是否被遊戲邏輯直接依賴，而非透過抽象層。

#### 圖譜查詢
```bash
/graphify explain "LoadController class"
```

#### 基於圖譜的回答

`LoadController class`（`src/assets/load-controller.ts`，community=4）僅有 3 條邊：
- `--calls-->` `runSplashPreload()` [EXTRACTED]
- `--calls-->` `fetchWithRetry exponential backoff` [EXTRACTED]
- `--implements-->` `LoadController spec` [EXTRACTED]（指向 GDD 文件）

實際的高 betweenness 來自 `LoadController` 的**完整類別節點**（`assets_load_controller_loadcontroller`，community=22），它有更多方法邊。但報告中提到的 betweenness 0.032 可能是指 `LoadController` 作為 `game-integration.ts` 的依賴之一。

#### 風險等級：Low

#### 根本原因
`LoadController` 被 `game-integration.ts`（最高 betweenness 節點）匯入使用，這是正常的：遊戲啟動時需要載入資產。連接路徑是 `LoadController` → `game-integration.ts` → 其他系統。

#### 具體方案
**不需要行動**。資產載入器被整合層使用是標準架構模式。

#### 信心等級：High

---

### Q4：`getCell()` 的 31 條 INFERRED 邊是否正確？

#### 問題重述
`getCell()` 擁有 31 條推斷邊（confidence_score=0.8），這些「呼叫」關係是否真實存在？

#### 揭示的架構議題
圖譜的 INFERRED 邊是否過度推斷，將「使用同一個函式」誤判為「直接呼叫」。

#### 圖譜查詢
```bash
/graphify explain "getCell"
```

#### 基於圖譜的回答

`getCell()`（`src/game/rules/board.ts`，degree=60）的 31 條 INFERRED 邊全部標記為 `--calls-->` 關係，指向：
- `game-session.ts` 的方法（`.executeActivation()`、`.runCascadeLoop()` 等）— 11 條
- `game-loop.ts` 的方法（`.processSwap()`、`.processMatches()` 等）— 4 條
- `reshuffle.ts` 的函式（`placeBLockers()`、`initBoard()`、`findValidSwaps()`）— 3 條
- `cascade.ts`（`runCascade()`）— 1 條
- `combo-matrix.ts`（`clearCell()`、`colourTransform()`、`resolveCombo()`）— 3 條
- `special-gems.ts`（`activateLineBomb()`、`activateAreaBomb()` 等）— 5 條
- `blocker.ts`（`processJellyOnClear()`、`isLocked()` 等）— 5 條

#### 受影響模組與檔案
- `src/game/rules/board.ts`（`getCell()` 定義處）
- 所有上述呼叫者檔案

#### 風險等級：Medium

#### 根本原因
這些 INFERRED 邊的**方向是反的**。正確的關係應該是：

```
.executeActivation() --calls--> getCell()  ✅ 正確方向
getCell() --calls--> .executeActivation()  ❌ 圖譜中的方向
```

`getCell()` 是一個純粹的**存取器函式**（accessor），它不會呼叫 `executeActivation()` 或 `runCascadeLoop()`。相反，是那些方法在內部呼叫 `getCell()` 來讀取棋盤狀態。

圖譜推斷引擎在建立 INFERRED 邊時，將「A 使用 B」的關係方向搞反了。

#### 具體方案

**選項 A（推薦）**：在下次完整 `/graphify` 執行時修正邊方向。目前這些邊不影響圖譜的導航價值（仍然能找到連接），但語義上不精確。

**選項 B**：手動驗證並標記。執行以下指令確認呼叫方向：

```bash
grep -n "getCell" src/game/runtime/game-session.ts | head -20
grep -n "getCell" src/game/rules/cascade.ts | head -10
grep -n "getCell" src/game/rules/combo-matrix.ts | head -10
```

預期結果：這些檔案**呼叫** `getCell()`，而非被 `getCell()` 呼叫。

#### 建議檢視的檔案
- `src/game/rules/board.ts` — 確認 `getCell()` 的實作（應為純 accessor）

#### 驗證步驟
```bash
grep -c "getCell" src/game/runtime/game-session.ts
# 預期：多次出現，確認 game-session 呼叫 getCell，而非反向
```

#### 信心等級：High
邊的存在是正確的（這些模組確實有關聯），但方向標記為反向。

---

### Q5：`detectMatches()` 的 9 條 INFERRED 邊是否正確？

#### 問題重述
`detectMatches()` 的 9 條推斷邊是否反映真實的呼叫關係？

#### 揭示的架構議題
同 Q4 — INFERRED 邊的方向性問題。

#### 圖譜查詢
```bash
/graphify explain "detectMatches"
```

#### 基於圖譜的回答

`detectMatches()`（`game/rules/match-detect.ts`，degree=33）的 9 條 INFERRED 邊：
- `--calls-->` `scoreSwap()`（hint.ts）
- `--calls-->` `.runCascadeLoop()`（game-session.ts）
- `--calls-->` `.doSwap()`（game-session.ts）
- `--calls-->` `.doNormalSwap()`（game-session.ts）
- `--calls-->` `.processSwap()`（game-loop.ts）
- `--calls-->` `findValidSwaps()`（reshuffle.ts）
- `--calls-->` `initBoard()`（reshuffle.ts）
- `--calls-->` `reshuffle()`（reshuffle.ts）
- `--calls-->` `runCascade()`（cascade.ts）

#### 風險等級：Low

#### 根本原因
與 Q4 相同的方向性問題。`detectMatches()` 是一個**純函式**，接收 board 狀態並回傳匹配結果。它不會呼叫 `scoreSwap()` 或 `runCascadeLoop()`。

正確方向：
- `scoreSwap()` → calls → `detectMatches()` ✅
- `.runCascadeLoop()` → calls → `detectMatches()` ✅
- `runCascade()` → calls → `detectMatches()` ✅

#### 具體方案
同 Q4 — 邊的存在正確，方向需在下次完整建構時修正。不影響圖譜的導航功能。

#### 驗證步驟
```bash
grep -n "detectMatches" src/game/runtime/game-session.ts src/game/rules/cascade.ts src/game/runtime/hint.ts
# 預期：這些檔案呼叫 detectMatches()，確認方向
```

#### 信心等級：High

---

### Q6：`createButton()` 的 9 條 INFERRED 邊是否正確？

#### 問題重述
`createButton()` 被推斷為呼叫各個 screen 建立函式，這是否正確？

#### 揭示的架構議題
UI 工廠函式與各畫面之間的依賴方向。

#### 圖譜查詢
```bash
/graphify explain "createButton"
```

#### 基於圖譜的回答

`createButton()`（`src/ui/factory.ts`，degree=30）的 9 條 INFERRED 邊：
- `--calls-->` `getButtonColours()`（theme.ts）
- `--calls-->` `createLevelSelectCard()`（level-select.ts）
- `--calls-->` `createCreditsScreen()`（credits.ts）
- `--calls-->` `createLevelCompleteScreen()`（level-complete.ts）
- `--calls-->` `createWorldMapScreen()`（world-map.ts）
- `--calls-->` `createMainMenuScreen()`（main-menu.ts）
- `--calls-->` `createGameHUD()`（game-hud.ts）
- `--calls-->` `createLevelFailScreen()`（level-fail.ts）
- `--calls-->` `createPauseOverlay()`（pause-overlay.ts）

#### 風險等級：Low

#### 根本原因
方向再次反轉：
- `createButton()` → calls → `getButtonColours()` ✅ **這條可能正確**（factory 呼叫 theme 取色）
- `createLevelSelectCard()` → calls → `createButton()` ✅ **正確方向**（各畫面使用 factory）

第一條邊可能正確，其餘 8 條方向相反。各 screen 函式呼叫 `createButton()` 來建立按鈕，而非 `createButton()` 呼叫它們。

#### 具體方案
**不需要行動**。邊的存在正確反映了模組間的關聯。方向問題是系統性的（同 Q4、Q5），會在下次完整建構時一併修正。

#### 信心等級：High

---

### Q7：什麼連接了 `Performance Budget System`、`Atlas Packing System`、`setupResizeHandler` 等 85 個弱連接節點？

#### 問題重述
圖譜中有 85 個 degree ≤ 1 的節點，它們是否代表文件缺失或架構孤島？

#### 揭示的架構議題
是否有重要模組缺乏文件化的連接，或者這些是正常的葉節點。

#### 圖譜查詢
```bash
/graphify query "isolated nodes"
```

#### 基於圖譜的回答

308 個 degree ≤ 1 的節點中，主要分為三類：

1. **測試檔案**（~20 個）：`blocker.test.ts`、`events.test.ts` 等 — 測試檔案通常只匯入被測模組，degree 低是正常的
2. **類別方法**（~250 個）：`.updateBoardSize()`、`.setCallbacks()` 等 — 這些是 class 的 method 節點，只有一條 `method` 邊連回 class，degree=1 是 AST 提取的正常結果
3. **真正的孤立概念**（~15 個）：`Performance Budget System`、`Atlas Packing System`、`Screen Router Pattern` 等 — 這些是文件中提到但未被程式碼直接引用的概念

#### 風險等級：Low

#### 根本原因
這不是架構問題，而是圖譜提取粒度的自然結果：
- AST 提取為每個 method 建立獨立節點，它們只連回所屬 class → degree=1
- 文件中的概念節點若未被程式碼明確 `implements` 標記，就會成為孤島
- 測試檔案天然是葉節點

#### 具體方案
**不需要行動**。若要減少噪音，可在下次 `/graphify` 時考慮：
- 在 `.graphifyignore` 中排除 `__tests__/` 目錄
- 或在報告中過濾 degree=1 的 method 節點（它們是 class 的內部細節）

#### 信心等級：High

---

## 下一步行動

### 立即可執行

| 行動 | 預估時間 | 影響 |
|------|----------|------|
| 驗證 `getCell()` 的 INFERRED 邊方向（Q4） | 5 分鐘 | 確認圖譜精確度 |
| 驗證 `detectMatches()` 的 INFERRED 邊方向（Q5） | 3 分鐘 | 同上 |

### 中期改善

| 行動 | 預估時間 | 影響 |
|------|----------|------|
| 下次完整 `/graphify` 時修正 INFERRED 邊方向邏輯 | 下次 full run | 提升圖譜語義精確度 |
| 監控 `GameSessionController` 方法數量（Q1） | 持續 | 防止上帝物件膨脹 |
| 考慮在 `.graphifyignore` 排除 `__tests__/` | 1 分鐘 | 減少孤立節點噪音 |

### 不需要行動

| 問題 | 原因 |
|------|------|
| Q2 `KeybindManager` 跨社群 | 社群演算法的假陽性，架構正常 |
| Q3 `LoadController` 跨社群 | 正常的啟動依賴 |
| Q6 `createButton()` INFERRED 邊 | 方向反轉但關聯正確 |
| Q7 弱連接節點 | AST 粒度的自然結果 |

---

## 整體架構健康度評估

| 維度 | 評分 | 說明 |
|------|------|------|
| 模組化 | 8/10 | 清晰的子系統邊界（game/rendering/audio/input/state） |
| 耦合度 | 7/10 | `game-integration.ts` betweenness 偏高（0.15），但作為整合層是預期的 |
| 內聚性 | 8/10 | 主要社群內聚分數合理（Animation Library 0.32、Endless Mode 0.16） |
| 圖譜精確度 | 7/10 | 93% EXTRACTED 邊可靠；7% INFERRED 邊存在方向性問題 |
| 文件覆蓋 | 9/10 | GDD 文件與程式碼之間有明確的 `implements` 邊 |

**總評**：架構健康，無需緊急重構。主要改善方向是修正 INFERRED 邊的方向性，以提升圖譜查詢的語義精確度。

---

## 使用的查詢指令

```bash
/graphify explain "GameSessionController"
/graphify explain "KeybindManager"
/graphify explain "LoadController class"
/graphify explain "getCell"
/graphify explain "detectMatches"
/graphify explain "createButton"
# betweenness centrality 透過 networkx 直接計算
```
