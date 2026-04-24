# 需求文件：特殊寶石啟動效果

## 簡介

本功能將規則層（rules layer）已完成的特殊寶石啟動邏輯整合至遊戲整合層（game-integration.ts 的 `doSwap` 函式），使特殊寶石在遊戲中能正確觸發、計分、並播放對應的視覺與音效回饋。目前規則層已實作所有啟動函式（`activateLineBomb`、`activateAreaBomb`、`activateColourGem`、`resolveCombo`、`processSpecialActivations`），但整合層尚未呼叫這些函式，導致特殊寶石在實際遊戲中無法發揮效果。

## 術語表

- **Integration_Layer**：遊戲整合層，即 `game-integration.ts` 中的 `doSwap` 函式及其周邊邏輯，負責串接規則引擎、渲染、音效與輸入系統
- **Rules_Engine**：規則引擎，包含 `special-gems.ts`、`combo-matrix.ts`、`cascade.ts`、`scoring.ts` 等純邏輯模組
- **Line_Bomb**：線型炸彈，分為水平（lineH，清除整列）與垂直（lineV，清除整行）
- **Area_Bomb**：範圍炸彈，清除以自身為中心的 3×3 區域
- **Colour_Gem**：彩色寶石，與普通寶石交換時清除棋盤上所有同色寶石
- **Combo**：組合效果，兩顆特殊寶石互相交換時觸發的強化效果（共 6 種組合）
- **Passive_Activation**：被動啟動，特殊寶石因鄰近格子被清除而自動引爆
- **Cascade**：連鎖消除，寶石因重力下落後形成新的消除
- **Chain**：連鎖數，一次操作中連續消除的次數
- **Multiplier**：連鎖倍率，`min(1.0 + (chain - 1) × 0.5, 4.0)`
- **doSwap**：`game-integration.ts` 中處理玩家交換操作的核心非同步函式

## 需求

### 需求 1：被動啟動整合

**使用者故事：** 身為玩家，我希望當消除動作清除了特殊寶石本身（例如該特殊寶石被納入 match、被 Line/Area Bomb 爆炸範圍清掉、或被 Colour Gem 掃到）時，該特殊寶石能自動引爆，這樣我可以享受連鎖反應帶來的策略深度。（注意：僅「自身被消除」會觸發被動啟動；鄰居格被消除但自身未被清除時不觸發。）

#### 驗收條件

1. WHEN 一組格子被消除（match clear 或 cascade clear），THE Integration_Layer SHALL 呼叫 `processSpecialActivations(board, clearedCells)` 以偵測並執行所有被動啟動
2. WHEN `processSpecialActivations` 回傳的 `triggeredSpecials` 陣列包含一個或多個座標，THE Integration_Layer SHALL 依序對每個被觸發的特殊寶石播放啟動動畫
3. WHEN 一個 Line_Bomb 因被動啟動而引爆，THE Integration_Layer SHALL 將該 Line_Bomb 清除的所有格子納入後續的 Cascade 流程
4. WHEN 一個 Area_Bomb 因被動啟動而引爆，THE Integration_Layer SHALL 將該 Area_Bomb 清除的所有格子納入後續的 Cascade 流程
5. WHEN 被動啟動產生的清除又觸發了其他特殊寶石，THE Integration_Layer SHALL 遞迴處理所有連鎖被動啟動，直到無更多觸發為止

### 需求 2：Colour Gem 交換啟動

**使用者故事：** 身為玩家，我希望將 Colour Gem 與普通寶石交換時，能清除棋盤上所有同色寶石，這樣我可以利用 Colour Gem 進行大範圍清除。

#### 驗收條件

1. WHEN 玩家將 Colour_Gem 與一顆普通寶石交換，THE Integration_Layer SHALL 呼叫 `activateColourGem(board, colourGemPos, targetColour)` 並以被交換寶石的顏色作為 targetColour
2. WHEN Colour_Gem 啟動完成，THE Integration_Layer SHALL 將所有被清除的格子納入後續的 Cascade 流程
3. WHEN 玩家將 Colour_Gem 與普通寶石交換，THE Integration_Layer SHALL 扣除一次手數（moves--）
4. WHEN Colour_Gem 啟動清除了鄰近的 Line_Bomb 或 Area_Bomb，THE Integration_Layer SHALL 觸發這些特殊寶石的被動啟動

### 需求 3：Combo 交換啟動

**使用者故事：** 身為玩家，我希望將兩顆特殊寶石互相交換時，能觸發強化的組合效果，這樣我可以透過策略性地組合特殊寶石獲得更大的清除範圍。

#### 驗收條件

1. WHEN 玩家交換兩顆皆具有特殊屬性的寶石，THE Integration_Layer SHALL 呼叫 `resolveCombo(board, posA, posB)` 來執行組合效果
2. WHEN `resolveCombo` 回傳有效的 ClearResult，THE Integration_Layer SHALL 扣除一次手數並將清除結果納入 Cascade 流程
3. WHEN `resolveCombo` 回傳 null 或空的 clearedCells，THE Integration_Layer SHALL 視為無效交換並還原寶石位置
4. THE Integration_Layer SHALL 支援以下六種 Combo 類型：line×line（十字清除）、bomb×line（3 格寬十字）、bomb×bomb（5×5 清除）、colour×line（全色轉 Line_Bomb）、colour×bomb（全色轉 Area_Bomb）、colour×colour（全棋盤清除）
5. WHEN Combo 觸發後產生的清除波及其他特殊寶石，THE Integration_Layer SHALL 觸發這些寶石的被動啟動

### 需求 4：特殊寶石啟動計分

**使用者故事：** 身為玩家，我希望特殊寶石啟動時能獲得對應的分數獎勵，這樣我的策略操作能反映在分數上。

#### 驗收條件

1. WHEN Line_Bomb 或 Area_Bomb 啟動並清除 N 個格子，THE Integration_Layer SHALL 計算分數為 `60 × N × multiplier(chain)`
2. WHEN Colour_Gem 啟動並清除 N 個格子，THE Integration_Layer SHALL 計算分數為 `(60 × N + 500) × multiplier(chain)`
3. WHEN 兩顆特殊寶石觸發 Combo，THE Integration_Layer SHALL 依 Combo 類型計算基礎分數（line×line: 3000、bomb×line: 4000、bomb×bomb: 5000、colour×line: 6000、colour×bomb: 7000、colour×colour: 10000）並乘以 multiplier
4. WHEN 被動啟動的特殊寶石產生清除，THE Integration_Layer SHALL 使用當前 Chain 值計算 multiplier 進行計分
5. THE Integration_Layer SHALL 將所有特殊寶石啟動的分數累加至 `rulesEngine.score`

### 需求 5：啟動視覺效果

**使用者故事：** 身為玩家，我希望特殊寶石啟動時有明確的視覺回饋，這樣我能清楚看到每次啟動的效果範圍。

#### 驗收條件

1. WHEN 任何特殊寶石啟動，THE Integration_Layer SHALL 呼叫 `createSpecialActivationEffect(x, y, colour, fxLayer)` 在該寶石位置播放 800ms 的擴展爆發動畫
2. WHEN Line_Bomb 啟動，THE Integration_Layer SHALL 對被清除的整列或整行格子播放消除動畫
3. WHEN Area_Bomb 啟動，THE Integration_Layer SHALL 對被清除的 3×3 區域格子播放消除動畫
4. WHEN Colour_Gem 啟動，THE Integration_Layer SHALL 對所有被清除的同色寶石播放消除動畫
5. WHEN Combo 觸發，THE Integration_Layer SHALL 播放 Combo 專屬的啟動動畫，並顯示 Combo 類型的加分飛字
6. WHEN 特殊寶石啟動產生分數，THE Integration_Layer SHALL 在啟動位置顯示加分飛字（score popup）

### 需求 6：啟動音效回饋

**使用者故事：** 身為玩家，我希望特殊寶石啟動時有對應的音效，這樣我能透過聽覺感受到啟動的衝擊力。

#### 驗收條件

1. WHEN 任何特殊寶石啟動（Line_Bomb、Area_Bomb 或 Colour_Gem），THE Integration_Layer SHALL 播放對應的啟動音效
2. WHEN Combo 觸發，THE Integration_Layer SHALL 播放 Combo 專屬音效（combo.wav）
3. WHEN 被動啟動產生連鎖引爆，THE Integration_Layer SHALL 對每個被觸發的特殊寶石依序播放啟動音效，音效之間保持適當的時間間隔

### 需求 7：手數計算正確性

**使用者故事：** 身為玩家，我希望手數計算遵循 GDD 規範，這樣我能準確掌握剩餘操作次數。

#### 驗收條件

1. WHEN 玩家執行有效交換（產生消除、Colour_Gem 啟動或 Combo 觸發），THE Integration_Layer SHALL 扣除恰好一次手數
2. WHEN Cascade 過程中特殊寶石因被動啟動而引爆，THE Integration_Layer SHALL 不扣除額外手數
3. WHEN 玩家執行無效交換（無消除結果且非特殊寶石互動），THE Integration_Layer SHALL 不扣除手數
4. WHEN 交換涉及 Colour_Gem 或兩顆特殊寶石，THE Integration_Layer SHALL 在啟動效果執行前扣除手數（commit 時扣除，非 resolving 結束時）

### 需求 8：doSwap 流程整合

**使用者故事：** 身為開發者，我希望 doSwap 函式能正確處理所有特殊寶石交互場景，這樣遊戲流程完整且無遺漏。

#### 驗收條件

1. WHEN doSwap 接收到一組交換座標，THE Integration_Layer SHALL 依序檢查：(a) 是否為兩顆特殊寶石的 Combo、(b) 是否涉及 Colour_Gem 與普通寶石、(c) 是否為普通消除
2. WHEN doSwap 進入 resolving 狀態，THE Integration_Layer SHALL 拒絕所有新的交換輸入，直到當前 resolving 完成
3. WHEN doSwap 的消除-掉落-cascade 循環結束，THE Integration_Layer SHALL 更新 HUD 顯示（分數與剩餘手數）
4. IF doSwap 執行過程中發生非預期錯誤，THEN THE Integration_Layer SHALL 將 `isProcessing` 旗標重設為 false，確保遊戲不會卡死
