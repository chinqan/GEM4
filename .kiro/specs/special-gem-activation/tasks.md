# 實作計畫：特殊寶石啟動效果

## 概覽

將規則層已完成的特殊寶石啟動邏輯整合至 `game-integration.ts` 的 `doSwap` 函式。主要修改集中在 `doSwap` 內部，新增三條分支路徑（Combo → Colour Gem → 普通消除），並在每次消除步驟後呼叫被動啟動處理，同時整合計分、動畫與音效。

## Tasks

- [x] 1. 新增 combo 音效支援與匯出函式
  - [x] 1.1 在 `src/audio/synth-sfx.ts` 的 `SFX_FILES` 中註冊 `combo: '/assets/sfx/combo.wav'`，並新增 `playCombo()` 匯出函式
    - 使用 `play('combo', 0.7, 1.0)` 播放
    - _Requirements: 6.2_

- [x] 2. 重構 doSwap 加入 try/finally 與交換類型偵測
  - [x] 2.1 在 `src/integration/game-integration.ts` 的 `doSwap` 函式中，將整個函式體包裹在 `try { ... } catch (err) { console.error(...); boardRenderer.sync(board); } finally { isProcessing = false; }` 結構中
    - 移除函式末尾現有的 `isProcessing = false` 賦值
    - _Requirements: 8.4_
  - [x] 2.2 在 `doSwap` 的動態 import 區塊中，新增匯入 `resolveCombo`（from `combo-matrix`）、`activateColourGem` 與 `processSpecialActivations`（from `special-gems`）、`specialActivationScore` 與 `comboScore`（from `scoring`）、`comboKey`（from `combo-matrix`）、`createSpecialActivationEffect`（from `animations`）、`playCombo`（from `synth-sfx`）
    - _Requirements: 8.1_
  - [x] 2.3 在資料層交換寶石之後、現有 `detectMatches` 呼叫之前，加入交換類型偵測邏輯：(1) 若 `cellFrom.gem.special && cellTo.gem.special` → Combo 路徑、(2) 若其中一顆 `special === 'colour'` 且另一顆有 `colour !== null` → Colour Gem 路徑、(3) 否則 → 普通消除路徑（現有邏輯）
    - 使用 if/else if/else 分支結構
    - _Requirements: 8.1_

- [x] 3. 實作 Combo 交換路徑
  - [x] 3.1 在 Combo 分支中：呼叫 `resolveCombo(board, from, to)`，若回傳 `null` 或 `clearedCells.length === 0` 則還原交換（與現有無效交換邏輯相同）並 return
    - _Requirements: 3.1, 3.3_
  - [x] 3.2 Combo 有效時：扣除手數 `rulesEngine.movesRemaining--`，使用 `comboKey` 取得 ComboType，呼叫 `comboScore(comboType, chain)` 計分並累加至 `rulesEngine.score`
    - chain 初始值為 1（Combo 本身算第一次消除）
    - _Requirements: 4.3, 7.1_
  - [x] 3.3 播放 Combo 動畫與音效：呼叫 `playCombo()` 播放 combo.wav，對 `comboResult.clearedCells` 播放消除動畫（複用現有 `createMatchClearAnimation`），在清除區域中心顯示加分飛字（複用 `createScorePopup`）
    - _Requirements: 5.5, 5.6, 6.2_
  - [x] 3.4 Combo 清除後呼叫 `processSpecialActivations(board, comboResult.clearedCells)` 處理被動啟動，對 `triggeredSpecials` 中的每個位置播放 `createSpecialActivationEffect` 動畫與 `playMatchSfx` 音效，並以 `specialActivationScore` 計分
    - _Requirements: 1.1, 1.2, 3.5, 4.4, 5.1, 6.1_
  - [x] 3.5 Combo 路徑完成後，清除格子、執行 `applyGravity` + `fillFromTop`、播放掉落動畫，然後進入現有的 cascade 循環（`detectMatches` → 消除 → 掉落 → 重複）
    - 在 cascade 循環的每一步消除後也呼叫 `processSpecialActivations`
    - _Requirements: 3.2, 1.3, 1.4, 1.5_

- [x] 4. 實作 Colour Gem 交換路徑
  - [x] 4.1 在 Colour Gem 分支中：辨識哪顆是 Colour Gem、哪顆是普通寶石，取得 `targetColour`，扣除手數 `rulesEngine.movesRemaining--`
    - _Requirements: 2.1, 2.3, 7.1_
  - [x] 4.2 呼叫 `activateColourGem(board, colourGemPos, targetColour)`，以 `specialActivationScore(clearedCells.length, chain, true)` 計分並累加至 `rulesEngine.score`
    - _Requirements: 2.1, 4.2_
  - [x] 4.3 播放 Colour Gem 啟動動畫與音效：在 Colour Gem 位置呼叫 `createSpecialActivationEffect`，對所有被清除的格子播放消除動畫，呼叫 `playMatchSfx` 播放音效，顯示加分飛字
    - _Requirements: 5.1, 5.4, 5.6, 6.1_
  - [x] 4.4 Colour Gem 清除後呼叫 `processSpecialActivations` 處理被動啟動（Colour Gem 清除可能波及鄰近的 Line/Area Bomb），對被動啟動結果計分並播放動畫
    - _Requirements: 1.1, 2.2, 2.4, 4.4_
  - [x] 4.5 Colour Gem 路徑完成後，執行 `applyGravity` + `fillFromTop`、播放掉落動畫，進入 cascade 循環
    - 在 cascade 循環的每一步消除後也呼叫 `processSpecialActivations`
    - _Requirements: 2.2, 1.3, 1.4, 1.5_

- [x] 5. 增強普通消除路徑：加入被動啟動處理
  - [x] 5.1 在現有消除-cascade 循環中，於清除 matched cells 並生成特殊寶石之後、`applyGravity` 之前，呼叫 `processSpecialActivations(board, clearedCells)`
    - _Requirements: 1.1_
  - [x] 5.2 若 `processSpecialActivations` 回傳的 `triggeredSpecials.length > 0`，對每個被觸發的特殊寶石播放 `createSpecialActivationEffect` 動畫與 `playMatchSfx` 音效
    - _Requirements: 1.2, 5.1, 6.1, 6.3_
  - [x] 5.3 以 `specialActivationScore` 計算被動啟動產生的額外分數（使用當前 chain 值），累加至 `rulesEngine.score`
    - 被動啟動不扣手數
    - _Requirements: 4.1, 4.4, 7.2_
  - [x] 5.4 將被動啟動額外清除的格子合併至 clearedCells，確保後續 `applyGravity` 和 `fillFromTop` 能正確處理所有空格
    - _Requirements: 1.3, 1.4, 1.5_

- [x] 6. Checkpoint — 確認所有路徑基本功能正常
  - 確保所有測試通過，若有疑問請詢問使用者。

- [x]* 7. 撰寫屬性測試：計分公式驗證
  - [x]* 7.1 撰寫 Property 4 的屬性測試：特殊寶石啟動計分公式
    - **Property 4: 特殊寶石啟動計分公式**
    - 使用 `fast-check` 生成隨機 (N: 1~100, chain: 1~20) 組合
    - 驗證 `specialActivationScore(N, chain, false)` === `Math.round(60 * N * min(1.0 + (chain-1)*0.5, 4.0))`
    - 驗證 `specialActivationScore(N, chain, true)` === `Math.round((60 * N + 500) * min(1.0 + (chain-1)*0.5, 4.0))`
    - 測試檔案：`src/integration/__tests__/special-activation.property.test.ts`
    - **Validates: Requirements 4.1, 4.2**
  - [x]* 7.2 撰寫 Property 5 的屬性測試：Combo 計分公式
    - **Property 5: Combo 計分公式**
    - 使用 `fast-check` 生成隨機 (ComboType, chain: 1~20) 組合
    - 驗證 `comboScore(type, chain)` === `Math.round(COMBO_BASE[type] * min(1.0 + (chain-1)*0.5, 4.0))`
    - 測試檔案：`src/integration/__tests__/special-activation.property.test.ts`
    - **Validates: Requirements 4.3**
  - [x]* 7.3 撰寫 Property 7 的屬性測試：手數計算正確性
    - **Property 7: 手數計算正確性**
    - 使用 `fast-check` 生成隨機棋盤與交換操作
    - 驗證有效交換（普通消除、Colour Gem、Combo）恰好扣 1 手
    - 驗證無效交換不扣手數
    - 驗證被動啟動不扣手數
    - 測試檔案：`src/integration/__tests__/special-activation.property.test.ts`
    - **Validates: Requirements 7.1, 7.2, 7.3, 2.3**

- [x]* 8. 撰寫屬性測試：偵測與整合驗證
  - [x]* 8.1 撰寫 Property 8 的屬性測試：交換類型偵測優先順序
    - **Property 8: 交換類型偵測優先順序**
    - 使用 `fast-check` 生成各種寶石組合（普通、lineH、lineV、area、colour）
    - 驗證偵測函式在所有組合下回傳正確的交換類型
    - 測試檔案：`src/integration/__tests__/special-activation.property.test.ts`
    - **Validates: Requirements 8.1**
  - [x]* 8.2 撰寫 Property 1 的屬性測試：被動啟動整合
    - **Property 1: 被動啟動整合**
    - 使用 `fast-check` 生成隨機棋盤，放置特殊寶石於清除區域鄰近
    - 驗證 `processSpecialActivations` 回傳的 `clearedCells` 包含所有被連鎖引爆的格子
    - 測試檔案：`src/integration/__tests__/special-activation.property.test.ts`
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.5**
  - [x]* 8.3 撰寫 Property 2 的屬性測試：Colour Gem 交換偵測與啟動
    - **Property 2: Colour Gem 交換偵測與啟動**
    - 使用 `fast-check` 生成含 Colour Gem 的隨機棋盤
    - 驗證 `activateColourGem` 以正確的 `targetColour` 被呼叫，且所有同色寶石被清除
    - 測試檔案：`src/integration/__tests__/special-activation.property.test.ts`
    - **Validates: Requirements 2.1, 2.2**
  - [x]* 8.4 撰寫 Property 3 的屬性測試：Combo 交換偵測與 Cascade
    - **Property 3: Combo 交換偵測與 Cascade**
    - 使用 `fast-check` 生成含兩顆相鄰特殊寶石的棋盤
    - 驗證 `resolveCombo` 被呼叫且有效結果進入 cascade 流程
    - 測試檔案：`src/integration/__tests__/special-activation.property.test.ts`
    - **Validates: Requirements 3.1, 3.2, 3.5**
  - [x]* 8.5 撰寫 Property 6 的屬性測試：分數累加正確性
    - **Property 6: 分數累加正確性**
    - 使用 `fast-check` 生成含多種啟動的棋盤
    - 驗證最終 `rulesEngine.score` 等於所有個別計分事件的總和
    - 測試檔案：`src/integration/__tests__/special-activation.property.test.ts`
    - **Validates: Requirements 4.4, 4.5**

- [x]* 9. 撰寫單元測試：各路徑範例測試
  - [x]* 9.1 撰寫 Combo 路徑的 6 種 Combo 類型範例測試（line×line、bomb×line、bomb×bomb、colour×line、colour×bomb、colour×colour）
    - 測試檔案：`src/integration/__tests__/special-activation.test.ts`
    - _Requirements: 3.4_
  - [x]* 9.2 撰寫 Colour Gem 路徑的完整流程範例測試
    - 測試檔案：`src/integration/__tests__/special-activation.test.ts`
    - _Requirements: 2.1, 2.2_
  - [x]* 9.3 撰寫無效交換還原行為測試（resolveCombo 回傳 null）
    - 測試檔案：`src/integration/__tests__/special-activation.test.ts`
    - _Requirements: 3.3_
  - [x]* 9.4 撰寫 doSwap 錯誤恢復測試（拋出例外時 isProcessing 重設為 false）
    - 測試檔案：`src/integration/__tests__/special-activation.test.ts`
    - _Requirements: 8.4_

- [x] 10. 最終 Checkpoint — 確認所有測試通過
  - 確保所有測試通過，若有疑問請詢問使用者。

## 備註

- 標記 `*` 的任務為選擇性任務，可跳過以加速 MVP 開發
- 每個任務都參照了具體的需求編號，確保可追溯性
- Checkpoint 確保增量驗證
- 屬性測試驗證通用正確性屬性（使用 fast-check）
- 單元測試驗證特定場景與邊界情況
- 所有修改集中在 `game-integration.ts`（主要）與 `synth-sfx.ts`（音效），最小化影響範圍
