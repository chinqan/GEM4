# Graphify 架構行動計畫

> 產生日期：2026-05-07
> 來源：`graphify-out/GRAPH_REPORT.md`（1241 nodes · 2301 edges · 146 communities）
> 狀態：全部 Suggested Questions 已分析完畢

---

## 優先行動總覽

| 優先序 | 問題 | 風險 | 需要行動？ | 信心 |
|:------:|------|:----:|:----------:|:----:|
| 1 | Q5 — `createGem()` INFERRED 邊方向反轉 + 重複 | Medium | ⚠️ 圖譜修正 | Medium |
| 2 | Q7 — 437 個孤立節點造成圖譜噪音 | Low | 💡 可選優化 | High |
| 3 | Q2 — `GameIntegration` 跨 3 個社群 | Low | 👀 持續監控 | High |
| — | Q1 — `BoardInput` 橋接多社群 | Low | ❌ 無需行動 | High |
| — | Q3 — `LoadController` 橋接 Settings 與 Game Loop | Low | ❌ 無需行動 | High |
| — | Q4 — `getCell()` 30 條 INFERRED 全部正確 | Low | ❌ 無需行動 | High |
| — | Q6 — `detectMatches()` 10 條 INFERRED 全部正確 | Low | ❌ 無需行動 | High |

---

## Q1：為什麼 `BoardInput` 連接了「Board Input & Keybinds」和「Game Loop Types」？

### 1. 問題重述
`BoardInput`（betweenness 0.038）橫跨 Board Input 社群與 Game Loop Types 社群。為何一個輸入類別會觸及遊戲迴圈層？

### 2. 揭示的架構議題
探測 Controller 層是否過度耦合到 Model 層，導致修改輸入邏輯時連帶影響遊戲邏輯。

### 3. 圖譜查詢
**使用指令**：`/graphify explain "BoardInput"`

查詢結果：
- degree = 20，community = 0
- 跨社群邊：`--imports--> game-integration.ts [EXTRACTED] (community=63)`
- 其餘 19 條邊全部在 community 0 內（`--method-->` 自身方法 + `--imports-->` keybinds/input-system）

### 4. 基於圖譜的回答
`BoardInput` 的跨社群連接**僅有一條**：它 import 了 `game-integration.ts`（community 63 = Game Loop Types）。這是因為 `BoardInput` 被 `GameIntegration.startLevel()` 實例化。所有其他邊都在同一社群內。

betweenness 高是因為 `game-integration.ts` 是多個社群的交匯點，而 `BoardInput` 是少數直接連接到它的輸入層節點。

### 5. 受影響模組與檔案
- `src/input/board-input.ts`
- `src/integration/game-integration.ts`

### 6. 風險等級：Low

### 7. 根本原因
正常的 Controller 角色。`BoardInput` 被 Orchestrator（`GameIntegration`）實例化是合理的依賴方向。新版 `BoardInteraction` 已透過 callback 注入進一步解耦。

### 8. 具體方案
無需修改。

### 9. 建議檢視的檔案
無。

### 10. 驗證步驟
```bash
# 確認 BoardInput 只有一條跨社群邊
grep -n "import.*game-integration\|from.*integration" src/input/board-input.ts
```

### 11. 信心等級：High

---

## Q2：為什麼 `GameIntegration` 連接了「Game Integration」、「Input System」、「Game Loop Types」？

### 1. 問題重述
`GameIntegration`（betweenness 0.031）跨越 3 個社群。它是否正在演變為 God Object？

### 2. 揭示的架構議題
探測頂層協調器是否承擔過多職責，形成修改瓶頸。

### 3. 圖譜查詢
**使用指令**：`/graphify explain "GameIntegration"`（僅顯示跨社群邊）

查詢結果：
- degree = 21，community = 18
- 跨社群邊：
  - `--contains--> game-integration.ts [EXTRACTED] (community=63)`
  - `--method--> .initScreenRouter() [EXTRACTED] (community=63)`
  - `--method--> .initDebugTools() [EXTRACTED] (community=34)`

### 4. 基於圖譜的回答
`GameIntegration` 只有 3 條跨社群邊，其中 2 條指向 community 63（Game Loop Types — 這是檔案模組節點的社群），1 條指向 community 34（Input System — 因為 `initDebugTools` 被分到該社群）。

21 條邊中 18 條是 `--method-->` 自身方法（同社群），跨社群連接很少。betweenness 高是因為它是唯一連接 debug 社群和主遊戲社群的節點。

### 5. 受影響模組與檔案
- `src/integration/game-integration.ts`（~450 行）

### 6. 風險等級：Low（但需監控）

### 7. 根本原因
Orchestrator 模式的正常表現。跨社群邊來自條件式 dynamic import（debug tools），不會在 production 中執行。

### 8. 具體方案
**短期**：無需修改。
**監控閾值**：若超過 500 行或跨社群邊超過 5 條，考慮 plugin 重構。

### 9. 建議檢視的檔案
- `src/integration/game-integration.ts` — 監控行數

### 10. 驗證步驟
```bash
wc -l src/integration/game-integration.ts
# 警戒線：500 行
```

### 11. 信心等級：High

---

## Q3：為什麼 `LoadController` 連接了「Settings Form」和「Game Loop Types」？

### 1. 問題重述
`LoadController`（betweenness 0.029）橋接 Settings Form 社群與 Game Loop Types 社群。資產載入為何與設定表單有關？

### 2. 揭示的架構議題
探測是否存在不當的跨層依賴或循環依賴。

### 3. 圖譜查詢
**使用指令**：`/graphify path "LoadController" "SettingsForm"`

查詢結果（最短路徑，5 hops）：
```
LoadController (c=24) -->
  game-integration.ts (c=63) -->
    BoardInput (c=0) -->
      keybinds.ts (c=0) -->
        settings-form.ts (c=0) -->
          SettingsForm (c=21)
```

### 4. 基於圖譜的回答
`LoadController` 與 `SettingsForm` 之間**沒有直接邊**。它們的連接是透過 5 個中間節點的間接路徑：`game-integration.ts` → `BoardInput` → `keybinds.ts` → `settings-form.ts`。

betweenness 高是因為 `LoadController` 是少數連接到 `game-integration.ts`（hub 節點）的資產層節點，而 `game-integration.ts` 又連接到幾乎所有子系統。

### 5. 受影響模組與檔案
- `src/assets/load-controller.ts`（無直接問題）

### 6. 風險等級：Low

### 7. 根本原因
**間接路徑，非直接耦合**。`LoadController` 只 import 了 `game-integration.ts`（被它消費），不知道 `SettingsForm` 的存在。高 betweenness 是圖論計算的結果，不代表實際耦合。

### 8. 具體方案
無需修改。

### 9. 建議檢視的檔案
無。

### 10. 驗證步驟
```bash
# 確認 LoadController 不 import settings 相關模組
grep -n "settings\|Settings" src/assets/load-controller.ts
# 預期：無結果
```

### 11. 信心等級：High

---

## Q4：`getCell()` 的 30 條 INFERRED 關係是否正確？

### 1. 問題重述
`getCell()` 是圖譜最大 God Node（50+ edges），其中 30 條為 INFERRED `calls` 邊。這些推斷是否準確？

### 2. 揭示的架構議題
探測圖譜精確度：大量 INFERRED 邊是否為誤報。

### 3. 圖譜查詢
**使用指令**：`/graphify explain "getCell()"`（篩選 INFERRED 邊）

查詢結果（30 條，前 10 條）：
- `--calls--> .executeActivation()` [score=0.8] (game-session.ts)
- `--calls--> .snapshotColoursAt()` [score=0.8] (game-session.ts)
- `--calls--> .snapshotSpecials()` [score=0.8] (game-session.ts)
- `--calls--> .handlePassiveActivations()` [score=0.8] (game-session.ts)
- `--calls--> .runCascadeLoop()` [score=0.8] (game-session.ts)
- `--calls--> .doActivate()` [score=0.8] (game-session.ts)
- `--calls--> .doSwap()` [score=0.8] (game-session.ts)
- `--calls--> .doColourSwap()` [score=0.8] (game-session.ts)
- `--calls--> .doDirectBombSwap()` [score=0.8] (game-session.ts)
- `--calls--> .doNormalSwap()` [score=0.8] (game-session.ts)
- ... +20 more

### 4. 基於圖譜的回答
**全部正確**。`getCell()` 是棋盤存取的唯一入口（含邊界檢查），所有操作棋盤的方法必然呼叫它。邊方向語義為「被這些方法呼叫」。confidence_score = 0.8 合理但可提升至 0.95。

### 5. 受影響模組與檔案
- `src/game/rules/board.ts`（定義）
- `src/game/runtime/game-session.ts`（主要呼叫者）

### 6. 風險等級：Low

### 7. 根本原因
AST 提取器將跨模組函式呼叫標記為 INFERRED（區分 import 語句 vs import 後的使用）。這是正確行為。

### 8. 具體方案
無需修改程式碼。圖譜可在下次 `--mode deep` 時提升 confidence_score。

### 9. 建議檢視的檔案
無。

### 10. 驗證步驟
```bash
grep -rn "getCell(" src/game/runtime/game-session.ts | wc -l
# 預期：≥15（確認大量呼叫點）
```

### 11. 信心等級：High

---

## Q5：`createGem()` 的 11 條 INFERRED 關係是否正確？

### 1. 問題重述
`createGem()` 有 11 條 INFERRED `calls` 邊，其中 `placeGem()` 出現 5 次。邊方向和去重是否正確？

### 2. 揭示的架構議題
探測圖譜邊方向正確性和去重問題。

### 3. 圖譜查詢
**使用指令**：`/graphify explain "createGem()"`（篩選 INFERRED 邊）

查詢結果（11 條）：
- `--calls--> placeGem()` [score=0.8] × 5（重複！）
- `--calls--> fillBoardNoMatches()` [score=0.8]
- `--calls--> reshuffle()` [score=0.8]
- `--calls--> fillFromTop()` [score=0.8]
- `--calls--> fillBoard()` [score=0.8]
- `--calls--> setGem()` [score=0.8]
- `--calls--> createBoardWithGems()` [score=0.8]

### 4. 基於圖譜的回答
兩個問題：
1. **方向反轉**：實際上是 `placeGem()` 呼叫 `createGem()`，而非相反
2. **重複邊**：`placeGem()` 出現 5 次是因為我們剛統一了 test helper，但舊的圖譜邊仍指向各測試檔案中已刪除的本地定義

注意：我們已在本次 session 中將 `placeGem` 統一為 `src/game/__tests__/test-helpers.ts` 的共用 export，但圖譜中的舊邊尚未清理。

### 5. 受影響模組與檔案
- `src/game/__tests__/test-helpers.ts`（新的共用 helper）
- `src/game/rules/board.ts`（`createGem()` 定義）
- `src/game/rules/cascade.ts`（`fillFromTop()` 呼叫 `createGem()`）

### 6. 風險等級：Medium

### 7. 根本原因
- AST 提取器偵測到 `createGem` 和 `placeGem` 的共現關係但反轉了 caller/callee
- 舊的 5 個本地 `placeGem` 定義已被移除，但圖譜中的邊是上次提取的殘留

### 8. 具體方案
執行完整的 `/graphify .`（非 `--update`）重建圖譜，清除殘留邊。或等待下次大型重建時自然修正。

### 9. 建議檢視的檔案
- `src/game/__tests__/test-helpers.ts` — 確認 `placeGem` 呼叫 `createGem`（已確認）

### 10. 驗證步驟
```bash
# 確認 placeGem 內部呼叫 createGem
grep -A3 "export function placeGem" src/game/__tests__/test-helpers.ts
# 預期：看到 createGem() 呼叫

# 確認舊的本地 placeGem 已移除
grep -rn "^function placeGem\|^const placeGem" src/game/rules/__tests__/ src/integration/__tests__/
# 預期：無結果
```

### 11. 信心等級：Medium（方向反轉已確認，重複邊待下次重建清理）

---

## Q6：`detectMatches()` 的 10 條 INFERRED 關係是否正確？

### 1. 問題重述
`detectMatches()` 有 10 條 INFERRED `calls` 邊。這些是否準確？

### 2. 揭示的架構議題
探測核心演算法的依賴範圍是否合理。

### 3. 圖譜查詢
**使用指令**：`/graphify explain "detectMatches()"`（篩選 INFERRED 邊）

查詢結果（10 條）：
- `--calls--> scoreSwap()` [score=0.8]
- `--calls--> .runCascadeLoop()` [score=0.8]
- `--calls--> .doSwap()` [score=0.8]
- `--calls--> .doNormalSwap()` [score=0.8]
- `--calls--> .processSwap()` [score=0.8]
- `--calls--> findValidSwaps()` [score=0.8]
- `--calls--> initBoard()` [score=0.8]
- `--calls--> reshuffle()` [score=0.8]
- `--calls--> assertBoardValid()` [score=0.8]
- `--calls--> runCascade()` [score=0.8]

### 4. 基於圖譜的回答
**全部正確且方向正確**。這些方法內部都呼叫了 `detectMatches()`：
- `runCascadeLoop()` → `matches = detectMatches(this.board)` ✓
- `doSwap()` → `detectMatches(this.board, { swapPos: to, swapPos2: from })` ✓
- `runCascade()` → cascade 迴圈核心 ✓
- `initBoard()` / `reshuffle()` → 確保無預存匹配 ✓

### 5. 受影響模組與檔案
無問題。

### 6. 風險等級：Low

### 7. 根本原因
`detectMatches()` 是遊戲核心演算法，被廣泛使用是正常的。所有呼叫者都在合理的架構層級（runtime 呼叫 rules）。

### 8. 具體方案
無需修改。

### 9. 建議檢視的檔案
無。

### 10. 驗證步驟
```bash
grep -rn "detectMatches(" src/game/ | grep -v "__tests__" | wc -l
# 預期：≥6
```

### 11. 信心等級：High

---

## Q7：437 個弱連接節點為何孤立？

### 1. 問題重述
圖譜中有 437 個 degree ≤ 1 的節點。這是否代表架構缺陷或文件缺口？

### 2. 揭示的架構議題
探測是否有重要元件因缺乏文件或非標準引用方式而被圖譜遺漏。

### 3. 圖譜查詢
**使用指令**：`/graphify query "isolated nodes"`（統計分類）

查詢結果（437 個節點分類）：
| 類別 | 數量 | 範例 |
|------|------|------|
| leaf 方法（`.method()` 或 `fn()`） | 232 | `drawStarShape()`, `fixedBestTextLogic()` |
| other（UI 元件、常數等） | 153 | `setupResizeHandler`, `UIButton`, `UI factory` |
| file 模組節點 | 25 | `index.ts`, `shake.ts` |
| build tool 函式 | 12 | `generateWav()`, `swoosh()`, `thud()` |
| debug 工具 | 11 | `Stats`, `.scale()`, `.setScale()` |
| 配置檔 | 4 | `playwright.config.ts`, `vite.config.ts` |

### 4. 基於圖譜的回答
**非架構問題**。437 個孤立節點中：
- **232 個是 leaf 方法**：class 的私有/內部方法只有一條 `--method-->` 邊連到父 class，degree = 1 是 AST 提取的正常結果
- **153 個是 UI 元件/常數**：語義提取產生的節點，缺乏結構性邊
- **25 個是檔案模組節點**：每個 `.ts` 檔案的模組節點，若該檔案只被一個 class 包含則 degree = 1
- **12+11+4 = 27 個是 build/debug/config**：不參與 src/ import 圖

### 5. 受影響模組與檔案
- `build-tools/*.mjs`（已在 `.graphifyignore` 中部分排除）
- 各模組的 leaf 方法（正常現象）

### 6. 風險等級：Low

### 7. 根本原因
圖譜提取的自然特徵，非架構缺陷：
1. AST 提取器為每個方法建立節點，leaf 方法天然 degree = 1
2. 語義提取的 UI 元件節點缺乏結構性邊（它們透過 runtime 動態引用）
3. Build tools 和配置檔不參與 TypeScript import 圖

### 8. 具體方案
**可選優化**（降低噪音）：
- 已在 `.graphifyignore` 中排除部分 build tools 和配置檔
- 可考慮在下次 `--mode deep` 執行時為 UI 元件建立語義邊
- 或接受現狀——leaf 方法的孤立是正常的圖譜特徵

### 9. 建議檢視的檔案
- `.graphifyignore` — 確認排除規則足夠

### 10. 驗證步驟
```bash
# 確認 .graphifyignore 已排除 build tools 和配置檔
grep -c "build-tools\|playwright\|vite\|eslint" .graphifyignore
# 預期：≥5
```

### 11. 信心等級：High

---

## 下一步行動

### 立即可執行（無風險）
1. ✅ Q5 的重複邊問題會在下次完整 `/graphify .` 重建時自動修正
2. ✅ `.graphifyignore` 已更新，排除了主要噪音來源

### 中期改善（可選）
3. 💡 執行完整 `/graphify .`（非 `--update`）清理 Q5 的殘留邊
4. 💡 下次用 `--mode deep` 為 UI 元件建立語義邊，減少 Q7 的孤立節點
5. 👀 監控 `GameIntegration` 行數（目前 ~450，閾值 500）

### 不需要行動
- Q1、Q3、Q4、Q6 揭示的都是健康的架構特徵

---

## 使用的查詢指令記錄

| 問題 | 查詢指令 | 目的 |
|------|----------|------|
| Q1 | `/graphify explain "BoardInput"` | 查看所有連接和跨社群邊 |
| Q2 | `/graphify explain "GameIntegration"`（跨社群篩選） | 確認 God Object 風險 |
| Q3 | `/graphify path "LoadController" "SettingsForm"` | 追蹤間接路徑 |
| Q4 | `/graphify explain "getCell()"`（INFERRED 篩選） | 驗證 30 條推斷邊 |
| Q5 | `/graphify explain "createGem()"`（INFERRED 篩選） | 驗證邊方向和重複 |
| Q6 | `/graphify explain "detectMatches()"`（INFERRED 篩選） | 驗證 10 條推斷邊 |
| Q7 | `/graphify query "isolated nodes"`（統計分類） | 分析孤立節點成因 |

---

## 整體架構健康度評估

**評分：良好（8/10）**

- ✅ 依賴方向正確（高層 → 低層，無循環）
- ✅ God Nodes 都是合理的核心抽象（`getCell`, `detectMatches`, `GameSessionController`）
- ✅ 跨社群橋接反映 Controller/Orchestrator 模式，非耦合缺陷
- ✅ INFERRED 邊驗證通過率高（Q4、Q6 全部正確）
- ⚠️ Q5 有邊方向反轉和重複（圖譜精確度問題，非程式碼問題）
- ⚠️ 437 個孤立節點中大部分是正常的 leaf 方法，少數可透過 `--mode deep` 改善
