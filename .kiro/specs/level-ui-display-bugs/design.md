# 關卡 UI 顯示錯誤修復設計

## 概述

本設計文件涵蓋五個關卡 UI 顯示錯誤的修復方案：

1. **最佳紀錄顯示邏輯錯誤**：`setLevelData` 僅以 `bestScore > 0` 判斷顯示，無法區分「從未挑戰」與「挑戰過但得分為 0」
2. **關卡選擇卡片資料寫死**：`showLevelSelect` 使用寫死的目標文字與預設值，未讀取 LevelSpec 與存檔
3. **HUD 目標進度未更新**：遊玩過程中 `hud.setObjective()` 從未被呼叫，且部分 Tracker 缺少 `getSummary()` 實作
4. **關卡完成畫面分數明細不正確**：`doSwap` 流程未將剩餘手數獎勵加入分數即發射 `level.resolved`，導致 `level-complete.ts` 的 `setResult` 反推 baseScore 時計算錯誤
5. **關卡完成畫面始終顯示 WORLD 1**：`showLevelComplete` 中 `worldId` 寫死為 1，未根據關卡實際所屬世界動態計算

修復策略為最小化變更範圍：僅修改受影響的判斷邏輯、資料讀取流程、HUD 更新呼叫點、分數計算時機、以及 worldId 傳遞，不改動現有架構。

## 術語表

- **Bug_Condition (C)**：觸發錯誤的輸入條件——分別為 attempts=0 時的顯示判斷、寫死的關卡資料、缺少的 HUD 更新呼叫、缺少的剩餘手數獎勵加算、以及寫死的 worldId
- **Property (P)**：修復後的預期行為——正確的最佳紀錄文字、動態的目標描述、即時的進度更新、正確的分數明細、正確的世界編號
- **Preservation**：不受修復影響的既有行為——bestScore > 0 的顯示格式、按鈕狀態轉換、分數/手數 HUD 更新、關卡失敗時的分數計算、星級評價邏輯
- **`setLevelData`**：`src/ui/screens/level-select.ts` 中更新關卡選擇卡片顯示資料的方法
- **`showLevelSelect`**：`src/integration/game-integration.ts` 中建立關卡選擇卡片的方法
- **`showLevelComplete`**：`src/integration/game-integration.ts` 中建立關卡完成畫面的方法
- **`ObjectiveTracker.getSummary()`**：`src/game/level/objective.ts` 中取得目標進度（current/total）的介面方法
- **`doSwap`**：`src/integration/game-integration.ts` 中處理交換動畫與連鎖消除的核心流程
- **`remainingMovesBonus`**：`src/game/rules/scoring.ts` 中計算剩餘手數獎勵的函式，公式為 `max(0, moves) × 1000`
- **`setResult`**：`src/ui/screens/level-complete.ts` 中設定關卡完成畫面結果資料的方法
- **`LevelSpec.worldId`**：`src/game/level/level-spec.ts` 中 LevelSpec 介面的 worldId 欄位，表示關卡所屬世界

## 錯誤詳情

### Bug Condition

五個錯誤分別在不同條件下觸發：

**Bug 1**：當 `attempts = 0` 或 `attempts > 0 且 bestScore = 0` 時，`setLevelData` 的 `bestScore > 0` 判斷無法正確區分狀態。

**Bug 2**：當任何關卡的選擇卡片被開啟時，`showLevelSelect` 傳入寫死的 `objectiveText: 'Score 1000 points'`、`moveBudget: 20`、`bestStars: 0`、`bestScore: 0`、`attempts: 0`。

**Bug 3**：當遊玩過程中消除寶石推進目標後，`hud.setObjective()` 從未被呼叫，且 `CollectTracker`、`DropTracker`、`MultiTracker` 缺少 `getSummary()` 實作。

**Bug 4**：當關卡通關且有剩餘手數時，`doSwap` 流程中的關卡結束檢查未將 `remainingMovesBonus` 加入 `rulesEngine.score` 即發射 `level.resolved`，導致 `level-complete.ts` 的 `setResult` 以 `r.score - movesRemaining * 1000` 反推 baseScore 時得到錯誤值（過低或被 `Math.max(0, ...)` 截為 0），且 Total 行顯示的是未含獎勵的分數。

**Bug 5**：當任何關卡完成時，`showLevelComplete` 方法中 `worldId` 寫死為 `1`，且 `onNext` 和 `onMap` 回呼也寫死導航至 `worldId: 1`，導致所有關卡完成畫面都顯示「WORLD 1」且返回地圖時總是回到第一世界。

**形式化規格：**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { context: 'levelSelect' | 'gameplay' | 'levelComplete', data: LevelSelectData | GameState | LevelResult }
  OUTPUT: boolean

  IF input.context = 'levelSelect' THEN
    // Bug 1: 最佳紀錄顯示條件
    IF input.data.attempts = 0 AND input.data.bestScore = 0 THEN
      RETURN TRUE  // 應顯示「尚未挑戰」但顯示「—」
    END IF
    IF input.data.attempts > 0 AND input.data.bestScore = 0 THEN
      RETURN TRUE  // 應顯示「0 分」但顯示「—」
    END IF
    // Bug 2: 寫死的關卡資料
    IF input.data.objectiveText = 'Score 1000 points' (hardcoded) THEN
      RETURN TRUE
    END IF
  END IF

  IF input.context = 'gameplay' THEN
    // Bug 3: HUD 目標進度未更新
    IF objectiveTrackerUpdated(input) AND NOT hudSetObjectiveCalled(input) THEN
      RETURN TRUE
    END IF
    // Bug 4: 關卡通關時分數未含剩餘手數獎勵
    IF levelCleared(input) AND input.data.movesRemaining > 0
       AND NOT remainingMovesBonusAddedToScore(input) THEN
      RETURN TRUE
    END IF
  END IF

  IF input.context = 'levelComplete' THEN
    // Bug 5: worldId 寫死為 1
    IF input.data.actualWorldId != 1 AND displayedWorldId = 1 THEN
      RETURN TRUE
    END IF
    // Bug 5 也影響 worldId = 1 的情況（onNext/onMap 導航寫死）
    // 但對 world 1 的關卡而言，顯示結果恰好正確
  END IF

  RETURN FALSE
END FUNCTION
```

### 範例

- **Bug 1a**：玩家從未挑戰 Level 01（attempts=0, bestScore=0）→ 顯示「過往最佳: —」，預期「過往最佳: 尚未挑戰」
- **Bug 1b**：玩家挑戰過 Level 03 但得分為 0（attempts=2, bestScore=0）→ 顯示「過往最佳: —」，預期「過往最佳: 0 分」
- **Bug 2a**：玩家開啟 Level 05（collect 類型目標）→ 顯示「目標: Score 1000 points」，預期「目標: 收集 15 個紅色寶石」
- **Bug 2b**：玩家開啟 Level 02（moveBudget=30, bestScore=500, attempts=3）→ 顯示 moveBudget=20, bestScore=0，預期 moveBudget=30, bestScore=500
- **Bug 3a**：玩家消除 3 顆紅色寶石（collect 目標 15 顆）→ HUD 顯示 0/1，預期 3/15
- **Bug 3b**：玩家達成 500 分（score 目標 1000 分）→ HUD 顯示 0/1，預期 500/1000
- **Bug 4a**：玩家通關 Level 01，基礎分數 5000，剩餘 3 手 → `level.resolved` 發射 score=5000（未含獎勵）→ `setResult` 計算 baseScore = 5000 - 3×1000 = 2000，但實際基礎分數為 5000；Total 顯示 5000，但正確 Total 應為 5000 + 3000 = 8000
- **Bug 4b**：玩家通關 Level 05，基礎分數 800，剩餘 5 手 → `setResult` 計算 baseScore = 800 - 5×1000 = -4200，被 `Math.max(0, ...)` 截為 0；Score 行顯示 0，Bonus 行顯示 +5,000，Total 顯示 800，三行數字完全不一致
- **Bug 4c**：玩家通關但剩餘 0 手 → 無獎勵，`doSwap` 的 score 恰好正確（bonus = 0），此情境不受影響
- **Bug 5a**：玩家通關 World 2 的 Level 25 → 完成畫面顯示「WORLD 1」，預期「WORLD 2」
- **Bug 5b**：玩家通關 World 3 的 Level 45，點擊 Map 按鈕 → 導航至 World 1 地圖，預期導航至 World 3 地圖
- **Bug 5c**：玩家通關 World 1 的 Level 05 → 完成畫面顯示「WORLD 1」，恰好正確（但仍是寫死值而非動態計算）

## 預期行為

### 不變行為（Preservation Requirements）

**不受影響的行為：**
- 當 `attempts > 0` 且 `bestScore > 0` 時，最佳紀錄顯示格式「過往最佳: {bestScore} 分」不變
- 關卡選擇卡片的 Play / Cancel 按鈕點擊行為與狀態轉換不變
- 世界與關卡編號標題格式（`W{worldId} · Level {levelId}`）不變
- 遊玩過程中 HUD 的分數顯示（`hud.setScore`）不變
- 遊玩過程中 HUD 的手數顯示（`hud.setMoves`）不變
- 關卡結束時 `level.resolved` 事件發射與結果畫面不變
- 手數/時間預算的顯示邏輯不變
- 關卡失敗時（`cleared = false`）的分數計算不變（失敗時無剩餘手數獎勵）
- 星級評價（`calculateStars`）的計算邏輯不變（修復後 score 已含獎勵，stars 計算基於修正後的 score）
- 關卡完成畫面的 Replay 按鈕行為不變（重玩當前關卡）
- 關卡完成畫面的 Best chain 與 Specials spawned 統計顯示不變
- `RulesEngine.checkEndOfLevel()` 中的獎勵加算邏輯不變（game-loop 路徑本身正確）

**範圍：**
所有不涉及 `bestScore` 顯示判斷、關卡資料讀取、HUD 目標進度更新、`doSwap` 關卡結束分數計算、或 `showLevelComplete` worldId 傳遞的輸入路徑，應完全不受此修復影響。

## 假設根因分析

### Bug 1：`setLevelData` 中的條件判斷不完整

**根因**：`level-select.ts` 第 167-170 行使用 `if (d.bestScore > 0)` 作為唯一判斷條件。當 `bestScore = 0` 時，無論 `attempts` 為何值，都進入 else 分支顯示「—」。缺少對 `attempts` 的檢查。

```typescript
// 目前的錯誤邏輯
if (d.bestScore > 0) {
  bestText.text = `過往最佳: ${d.bestScore.toLocaleString()} 分`;
} else {
  bestText.text = '過往最佳: —';
}
```

### Bug 2：`showLevelSelect` 中的寫死資料

**根因**：`game-integration.ts` 的 `showLevelSelect` 方法直接傳入寫死的物件字面值，未呼叫 `loadLevel()` 讀取 LevelSpec，也未透過 `SaveManager` 讀取存檔紀錄。此外，缺少將 `Objective` 型別轉換為中文描述文字的工具函式。

### Bug 3：HUD 目標進度更新的缺失

**根因**：多重因素導致此問題：
1. `doSwap` 流程中的 cascade 迴圈結尾只呼叫 `hud.setScore` 和 `hud.setMoves`，從未呼叫 `hud.setObjective`
2. HUD 建立時未設定初始目標值（`setObjective` 未被呼叫，chip 顯示預設的 0/1）
3. `CollectTracker`、`DropTracker`、`MultiTracker` 未實作 `getSummary()` 方法，即使呼叫也會在執行時報錯
4. `RulesEngine` 更新 tracker 後未發射 `objective.progressed` 事件

### Bug 4：`doSwap` 關卡結束時未加算剩餘手數獎勵

**根因**：`game-integration.ts` 的 `doSwap` 流程（約第 1583 行）在偵測到關卡結束時，直接以 `rulesEngine.score` 發射 `level.resolved` 事件，但未先加上 `remainingMovesBonus(mvRem)`。相比之下，`RulesEngine.checkEndOfLevel()`（`game-loop.ts`）在發射事件前會執行 `this.score += bonus`。

這導致 `level-complete.ts` 的 `setResult` 方法收到的 `r.score` 不含獎勵，但 `setResult` 假設 `r.score` 已含獎勵並嘗試反推：

```typescript
// level-complete.ts setResult 中的錯誤計算
const baseScore = r.score - r.movesRemaining * 1000;  // 減去從未加上的獎勵
scoreValue.text = Math.max(0, baseScore).toLocaleString();  // 結果過低或為 0
totalValue.text = r.score.toLocaleString();  // 顯示未含獎勵的分數
```

具體影響：
- **Score 行**：顯示 `score - movesRemaining × 1000`，由於 bonus 未加入，結果比實際 baseScore 低了 `movesRemaining × 1000`（即整整少了一倍獎勵），且可能被 `Math.max(0, ...)` 截為 0
- **Bonus 行**：顯示 `+movesRemaining × 1000`，數值本身正確但這筆獎勵從未被加入 score
- **Total 行**：顯示 `r.score`（未含獎勵），與 Score + Bonus 不等

### Bug 5：`showLevelComplete` 中 worldId 寫死為 1

**根因**：`game-integration.ts` 的 `showLevelComplete` 方法中，`worldId` 參數直接寫死為 `1`：

```typescript
const screen = createLevelCompleteScreen({
  width,
  height,
  result,
  worldId: 1,  // 寫死
  onNext: () => this.transitionTo({ kind: 'worldMap', worldId: 1 }),  // 寫死
  onMap: () => this.transitionTo({ kind: 'worldMap', worldId: 1 }),   // 寫死
});
```

`LevelResult` 介面包含 `levelId`，而 `LevelSpec` 介面包含 `worldId` 欄位。可透過 `loadLevel(result.levelId)` 取得 `spec.worldId` 來獲取正確的世界編號。

此外，`showLevelFail` 方法也有相同的 `worldId: 1` 寫死問題（`onMap` 回呼），應一併修復。

## 正確性屬性

Property 1: Bug Condition - 最佳紀錄根據嘗試次數正確顯示

_For any_ `LevelSelectData` 輸入，其中 `attempts = 0`，修復後的 `setLevelData` SHALL 將 bestText 設為「過往最佳: 尚未挑戰」；其中 `attempts > 0` 且 `bestScore = 0`，SHALL 設為「過往最佳: 0 分」；其中 `attempts > 0` 且 `bestScore > 0`，SHALL 設為「過往最佳: {bestScore} 分」。

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Bug Condition - 目標描述文字根據 Objective 類型正確產生

_For any_ `Objective` 輸入，修復後的目標文字產生函式 SHALL 根據 objective.type 回傳對應的中文描述：score → 「達成 {target} 分」、collect → 「收集 {count} 個{colour}寶石」、clear → 「清除 {count} 個{blocker}」、drop → 「送達 {count} 個寶石」、multi → 所有子目標描述的組合。

**Validates: Requirements 2.4, 2.5, 2.6, 2.7, 2.8, 2.9**

Property 3: Bug Condition - HUD 目標進度在每次消除後更新

_For any_ 遊戲狀態，在 doSwap 的 cascade 迴圈結束後，修復後的程式碼 SHALL 從 `rulesEngine.tracker.getSummary()` 取得 `{current, total}` 並呼叫 `hud.setObjective(current, total)`，使 HUD 顯示與 tracker 狀態一致。

**Validates: Requirements 2.11, 2.12**

Property 4: Preservation - 既有顯示行為不變

_For any_ 輸入，其中 bug condition 不成立（`attempts > 0` 且 `bestScore > 0` 的最佳紀錄顯示、按鈕狀態轉換、分數/手數 HUD 更新、關卡失敗時的分數、星級評價邏輯），修復後的程式碼 SHALL 產生與修復前完全相同的結果，保留所有既有功能。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12**

Property 5: Bug Condition - 關卡完成畫面分數明細正確

_For any_ `LevelResult` 輸入，其中 `cleared = true` 且 `movesRemaining > 0`，修復後的 `doSwap` 流程 SHALL 在發射 `level.resolved` 前將 `remainingMovesBonus(movesRemaining)` 加入 `rulesEngine.score`，使得 `setResult` 中 Score 行顯示基礎分數（不含獎勵）、Bonus 行顯示 `movesRemaining × 1000`、Total 行顯示基礎分數 + 獎勵，且 Score + Bonus = Total。

**Validates: Requirements 2.13, 2.14**

Property 6: Bug Condition - 關卡完成畫面顯示正確世界編號

_For any_ 關卡完成事件，修復後的 `showLevelComplete` SHALL 從 `LevelSpec` 取得該關卡的 `worldId` 並傳入 `createLevelCompleteScreen`，使畫面顯示正確的「WORLD {worldId}」，且 Map/Next 按鈕導航至正確的世界地圖。

**Validates: Requirements 2.15**

## 修復實作

### 所需變更

假設根因分析正確：

**檔案**：`src/ui/screens/level-select.ts`

**函式**：`setLevelData`

**具體變更**：
1. **修改最佳紀錄判斷邏輯**：將 `if (d.bestScore > 0)` 改為三段式判斷：
   - `if (d.attempts === 0)` → `bestText.text = '過往最佳: 尚未挑戰'`
   - `else if (d.bestScore === 0)` → `bestText.text = '過往最佳: 0 分'`
   - `else` → `bestText.text = '過往最佳: ${d.bestScore.toLocaleString()} 分'`（不變）

---

**檔案**：`src/integration/game-integration.ts`

**函式**：`showLevelSelect`

**具體變更**：
2. **讀取 LevelSpec**：呼叫 `loadLevel(levelId)` 取得關卡規格，從中讀取 `spec.objective` 和 `spec.constraints`
3. **讀取存檔紀錄**：透過 `SaveManager.load()` 取得 `save.levels[levelId]`，讀取 `bestStars`、`highScore`（對應 bestScore）、`attempts`
4. **產生目標描述文字**：新增工具函式 `formatObjectiveText(objective: Objective): string`，根據 objective.type 產生對應的中文描述，使用 i18n 翻譯鍵（`objective.score`、`objective.collect`、`objective.clear`、`objective.drop`）
5. **傳入動態資料**：將寫死的物件替換為從 LevelSpec 和存檔讀取的實際值

---

**檔案**：`src/game/level/objective.ts`

**類別**：`CollectTracker`、`DropTracker`、`MultiTracker`

**具體變更**：
6. **補齊 `getSummary()` 實作**：
   - `CollectTracker.getSummary()`：加總所有 colour 的 collected/target
   - `DropTracker.getSummary()`：回傳 `{ current: dropped, total: target }`
   - `MultiTracker.getSummary()`：加總所有子 tracker 的 current/total

---

**檔案**：`src/integration/game-integration.ts`

**函式**：`startLevel`（HUD 建立區段）與 `doSwap`（cascade 迴圈結尾）

**具體變更**：
7. **設定初始目標值**：在 HUD 建立後，呼叫 `hud.setObjective(0, total)` 設定初始進度（total 從 `rulesEngine.tracker.getSummary().total` 取得）
8. **在 cascade 迴圈結尾更新目標**：在現有的 `hud.setScore` / `hud.setMoves` 呼叫旁，加入 `const summary = rulesEngine.tracker.getSummary(); hud.setObjective(summary.current, summary.total);`
9. **在 combo 路徑與特殊寶石啟動路徑也加入目標更新**：確保所有導致 tracker 變化的路徑都會更新 HUD

---

**檔案**：`src/integration/game-integration.ts`

**函式**：`doSwap`（關卡結束檢查區段，約第 1583 行）

**具體變更**：
10. **在發射 `level.resolved` 前加算剩餘手數獎勵**：當 `cleared = true` 時，在發射事件前加入：
    ```typescript
    if (cleared) {
      const { remainingMovesBonus } = await import('../game/rules/scoring');
      rulesEngine.score += remainingMovesBonus(mvRem);
    }
    ```
    這與 `RulesEngine.checkEndOfLevel()` 的行為一致，確保 `level.resolved` 事件中的 `score` 已包含剩餘手數獎勵。

---

**檔案**：`src/integration/game-integration.ts`

**函式**：`showLevelComplete`、`showLevelFail`

**具體變更**：
11. **動態取得 worldId**：透過 `loadLevel(result.levelId)` 取得 `spec.worldId`，取代寫死的 `1`：
    ```typescript
    const { loadLevel } = await import('../game/level/level-spec');
    const spec = loadLevel(result?.levelId ?? 1);
    const wId = spec?.worldId ?? 1;
    ```
12. **傳入動態 worldId**：將 `worldId: 1` 替換為 `worldId: wId`
13. **修正導航回呼**：將 `onNext` 和 `onMap` 中的 `worldId: 1` 替換為 `worldId: wId`
14. **一併修復 `showLevelFail`**：`showLevelFail` 的 `onMap` 回呼也寫死 `worldId: 1`，應同樣使用動態 worldId

## 測試策略

### 驗證方法

測試策略分兩階段：先在未修復的程式碼上產生反例以確認根因，再驗證修復後的正確性與既有行為的保留。

### 探索性 Bug Condition 檢查

**目標**：在實作修復前，產生反例以確認根因分析。若反例與預期不符，需重新假設根因。

**測試計畫**：撰寫單元測試驗證各 bug condition 在未修復程式碼上的表現。

**測試案例**：
1. **最佳紀錄 attempts=0 測試**：建立 `LevelSelectData` 其中 `attempts=0, bestScore=0`，呼叫 `setLevelData`，驗證 bestText 顯示「—」而非「尚未挑戰」（未修復程式碼上會失敗）
2. **最佳紀錄 bestScore=0 測試**：建立 `LevelSelectData` 其中 `attempts=3, bestScore=0`，驗證 bestText 顯示「—」而非「0 分」（未修復程式碼上會失敗）
3. **寫死目標文字測試**：呼叫 `showLevelSelect` 並檢查傳入的 objectiveText 是否為寫死值（未修復程式碼上會失敗）
4. **HUD 目標更新測試**：模擬 swap 後檢查 `hud.setObjective` 是否被呼叫（未修復程式碼上會失敗）
5. **分數明細測試**：模擬通關（cleared=true, movesRemaining=3, score=5000），檢查 `level.resolved` 事件中的 score 是否為 5000（未含獎勵）而非 8000（含獎勵）（未修復程式碼上會失敗）
6. **worldId 測試**：模擬 World 2 關卡完成，檢查 `createLevelCompleteScreen` 收到的 worldId 是否為 1（寫死）而非 2（未修復程式碼上會失敗）

**預期反例**：
- bestText 在 attempts=0 時顯示「—」而非「尚未挑戰」
- objectiveText 始終為 'Score 1000 points'
- `hud.setObjective` 在 doSwap 流程中從未被呼叫
- `level.resolved` 事件中的 score 未包含 `remainingMovesBonus`，導致 `setResult` 的 baseScore 計算錯誤
- `showLevelComplete` 始終傳入 `worldId: 1`，無論關卡實際所屬世界

### Fix Checking

**目標**：驗證所有觸發 bug condition 的輸入，修復後的函式都產生預期行為。

**虛擬碼：**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedFunction(input)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation Checking

**目標**：驗證所有不觸發 bug condition 的輸入，修復後的函式與原始函式產生相同結果。

**虛擬碼：**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**測試方法**：建議使用 property-based testing 進行 preservation checking，因為：
- 自動產生大量測試案例覆蓋輸入空間
- 捕捉手動測試可能遺漏的邊界案例
- 對非 bug 輸入的行為不變提供強保證

**測試計畫**：先在未修復程式碼上觀察非 bug 輸入的行為，再撰寫 property-based test 確保修復後行為一致。

**測試案例**：
1. **bestScore > 0 保留測試**：觀察未修復程式碼對 `attempts > 0, bestScore > 0` 的顯示，驗證修復後格式不變
2. **按鈕行為保留測試**：驗證 Play/Cancel 按鈕的 onClick 回呼在修復後仍正確觸發
3. **分數/手數 HUD 保留測試**：驗證 `hud.setScore` 和 `hud.setMoves` 在修復後仍在相同時機被呼叫
4. **標題格式保留測試**：驗證 `W{worldId} · Level {levelId}` 格式在修復後不變
5. **關卡失敗分數保留測試**：驗證 `cleared = false` 時 `level.resolved` 的 score 不受獎勵加算影響（失敗時不加獎勵）
6. **星級評價保留測試**：驗證 `calculateStars` 的輸入參數在修復後仍正確（score 已含獎勵，movesRemaining 不變）
7. **Replay 按鈕保留測試**：驗證關卡完成畫面的 Replay 按鈕仍導航至正確的 levelId
8. **統計顯示保留測試**：驗證 Best chain 與 Specials spawned 在修復後仍正確顯示

### 單元測試

- 測試 `setLevelData` 在 attempts=0、attempts>0 且 bestScore=0、attempts>0 且 bestScore>0 三種情境的 bestText 輸出
- 測試 `formatObjectiveText` 對所有 Objective 類型（score、collect、clear、drop、multi）的輸出
- 測試 `CollectTracker.getSummary()`、`DropTracker.getSummary()`、`MultiTracker.getSummary()` 的正確性
- 測試邊界案例：bestScore 為負數、attempts 為極大值、空的 multi objectives
- 測試 `doSwap` 關卡結束時 `rulesEngine.score` 在 `level.resolved` 發射前已包含 `remainingMovesBonus`
- 測試 `doSwap` 關卡失敗時（`cleared = false`）`rulesEngine.score` 不加算獎勵
- 測試 `setResult` 在收到含獎勵的 score 後，Score/Bonus/Total 三行數字一致（Score + Bonus = Total）
- 測試 `showLevelComplete` 傳入的 worldId 與 `loadLevel(levelId).worldId` 一致
- 測試 `showLevelComplete` 的 onMap/onNext 回呼導航至正確的 worldId
- 測試邊界案例：movesRemaining=0（無獎勵）、movesRemaining=Infinity（endless 模式）、levelId 不存在時 worldId 回退為 1

### Property-Based Tests

- 產生隨機 `LevelSelectData`（隨機 attempts 與 bestScore），驗證 bestText 輸出符合三段式規則
- 產生隨機 `Objective`（隨機類型與參數），驗證 `formatObjectiveText` 輸出非空且包含正確的數值
- 產生隨機 tracker 狀態，驗證 `getSummary()` 的 current ≤ total 且 current ≥ 0
- 產生隨機 `LevelResult`（隨機 score、movesRemaining、cleared），驗證：當 cleared=true 時 `level.resolved` 的 score = baseScore + remainingMovesBonus(movesRemaining)；當 cleared=false 時 score = baseScore
- 產生隨機 `LevelResult` 並呼叫 `setResult`，驗證 Score + Bonus = Total 恆成立
- 產生隨機 levelId（涵蓋所有世界），驗證 `showLevelComplete` 傳入的 worldId 與 `loadLevel(levelId).worldId` 一致

### 整合測試

- 測試 `showLevelSelect` 完整流程：從 loadLevel 到 SaveManager 到卡片顯示
- 測試 `startLevel` + `doSwap` 流程中 HUD 目標進度的更新時機
- 測試關卡結束時 `level.resolved` 事件仍正確發射
- 測試 `doSwap` 通關流程完整分數計算：基礎分數累積 → 獎勵加算 → `level.resolved` 發射 → `setResult` 顯示，驗證端到端數值一致性
- 測試不同世界的關卡完成流程：World 1/2/3/4 的關卡通關後，完成畫面顯示正確世界編號且導航回正確世界地圖
- 測試關卡失敗流程：失敗畫面的 Map 按鈕導航至正確世界地圖（而非寫死的 World 1）
