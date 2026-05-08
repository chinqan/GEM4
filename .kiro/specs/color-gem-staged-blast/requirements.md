# 需求文件：Color Gem 分階段爆破

## 簡介

本功能將 Color Gem（顏色寶石）的特殊啟動效果從「立即清除」改為三階段視覺序列：標記（Mark）→ 蓄力（Brew）→ 爆破（Blast）。當 Color Gem 觸發時，輻射波向外擴散並標記所有同色目標寶石，接著進入短暫蓄力階段，最後所有被標記的寶石同時爆炸清除。此增強旨在提升 Color Gem 啟動的戲劇性與視覺可讀性，讓玩家能清楚看到即將被清除的範圍。

## 詞彙表

- **Color_Gem**：顏色寶石（又稱彩虹寶石），啟動時清除棋盤上所有指定顏色的寶石
- **Board_Animator**：棋盤動畫控制器，負責將遊戲邏輯結果轉譯為視覺動畫序列
- **Radiation_Timeline**：輻射時間軸系統，控制特殊寶石啟動時波紋向外擴散的動畫排程
- **CELL_RADIATION_SPEED_MS**：每格輻射速度常數，目前為 20ms/格
- **Target_Gem**：目標寶石，與 Color Gem 啟動時指定顏色相同的寶石
- **Mark_Phase**：標記階段，輻射波到達目標寶石時將其視覺標記而非立即清除
- **Brew_Phase**：蓄力階段，所有被標記的寶石進入可見的蓄力/充能狀態
- **Blast_Phase**：爆破階段，所有被標記的寶石同時爆炸並被清除
- **Chebyshev_Distance**：切比雪夫距離，用於計算輻射波到達各格子的時間

## 需求

### 需求 1：輻射波標記目標寶石

**使用者故事：** 身為玩家，我希望 Color Gem 啟動時能看到輻射波逐格擴散並標記同色寶石，以便我能預覽即將被清除的範圍。

#### 驗收條件

1. WHEN Color_Gem 啟動, THE Radiation_Timeline SHALL 以 Color_Gem 位置為中心向外輻射，每格延遲為 CELL_RADIATION_SPEED_MS（20ms）
2. WHEN 輻射波到達一個 Target_Gem, THE Board_Animator SHALL 對該寶石播放標記視覺效果（高亮/轉換動畫）而非立即執行縮小清除動畫
3. WHEN 輻射波到達一個非目標顏色的寶石, THE Board_Animator SHALL 不對該寶石施加任何標記效果
4. THE Mark_Phase SHALL 使用 Chebyshev_Distance 計算每個 Target_Gem 相對於 Color_Gem 的輻射到達時間
5. WHEN 輻射波到達最遠的 Target_Gem, THE Mark_Phase SHALL 結束並轉入 Brew_Phase

### 需求 2：標記視覺效果

**使用者故事：** 身為玩家，我希望被標記的寶石有明確的視覺變化，以便我能清楚辨識哪些寶石即將被清除。

#### 驗收條件

1. WHEN 一個 Target_Gem 被標記, THE Board_Animator SHALL 對該寶石施加發光脈衝效果，使其與未標記寶石有明顯視覺區別
2. WHILE Target_Gem 處於被標記狀態, THE Board_Animator SHALL 持續顯示標記視覺效果直到 Blast_Phase 開始
3. THE Board_Animator SHALL 確保標記效果在所有 7 種寶石顏色上皆清晰可辨
4. WHILE 使用者啟用減少動態設定, THE Board_Animator SHALL 以靜態高亮（如邊框或色調變化）取代動態脈衝效果

### 需求 3：蓄力階段

**使用者故事：** 身為玩家，我希望在標記完成後有短暫的蓄力停頓，以便我能感受到爆破前的張力。

#### 驗收條件

1. WHEN Mark_Phase 結束, THE Board_Animator SHALL 進入 Brew_Phase 並持續一段固定時長
2. WHILE Brew_Phase 進行中, THE Board_Animator SHALL 對所有被標記的 Target_Gem 播放蓄力動畫（如震動、亮度遞增、或粒子聚集效果）
3. THE Brew_Phase SHALL 持續 300ms 至 500ms 之間的固定時長（可透過設計常數調整）
4. WHEN Brew_Phase 結束, THE Board_Animator SHALL 立即轉入 Blast_Phase

### 需求 4：同步爆破階段

**使用者故事：** 身為玩家，我希望所有被標記的寶石在蓄力結束後同時爆炸，以便獲得強烈的視覺衝擊感。

#### 驗收條件

1. WHEN Blast_Phase 開始, THE Board_Animator SHALL 對所有被標記的 Target_Gem 同時執行爆破清除動畫
2. THE Blast_Phase SHALL 使用現有的 shrinkCell 清除動畫搭配增強的粒子爆破效果
3. WHEN Blast_Phase 完成, THE Board_Animator SHALL 觸發分數彈出顯示與音效
4. THE Blast_Phase SHALL 在所有被標記寶石的清除動畫完成後結束，總時長等同現有 MATCH_CLEAR_DURATION_MS（200ms）

### 需求 5：被動觸發的特殊寶石處理

**使用者故事：** 身為玩家，我希望被 Color Gem 標記的特殊寶石在爆破階段正確觸發其自身效果，以便連鎖反應正常運作。

#### 驗收條件

1. WHEN Blast_Phase 清除一個帶有 Line Bomb 或 Area Bomb 的 Target_Gem, THE Radiation_Timeline SHALL 在該寶石爆破時觸發其被動啟動效果
2. WHEN 被動啟動的特殊寶石觸發, THE Board_Animator SHALL 從該寶石位置開始新的輻射波
3. THE Board_Animator SHALL 確保被動觸發的時序與現有 processSpecialActivations 邏輯一致

### 需求 6：時序與效能約束

**使用者故事：** 身為玩家，我希望分階段爆破流程流暢且不拖慢遊戲節奏，以便遊戲體驗保持緊湊。

#### 驗收條件

1. THE Board_Animator SHALL 確保完整的三階段序列（Mark + Brew + Blast）總時長不超過現有 Color Gem 啟動時長加上 Brew_Phase 時長
2. THE Board_Animator SHALL 在 60 FPS 下維持每幀渲染時間不超過 25ms
3. WHILE 被動觸發的特殊寶石為連鎖中的一環, THE Board_Animator SHALL 套用 PASSIVE_ACTIVATION_DURATION_SCALE 折扣以避免長連鎖拖慢節奏
4. IF 棋盤上無任何 Target_Gem 存在, THEN THE Board_Animator SHALL 跳過 Mark_Phase 與 Brew_Phase，僅清除 Color_Gem 自身

### 需求 7：與 Combo 系統的整合

**使用者故事：** 身為玩家，我希望 Color Gem 與其他特殊寶石組合時也能展現分階段爆破效果，以便組合啟動同樣具有戲劇性。

#### 驗收條件

1. WHEN Color_Gem 與 Line Bomb 組合啟動（colour.line）, THE Board_Animator SHALL 對所有同色寶石先執行 Mark_Phase 再轉換為 Line Bomb 並爆破
2. WHEN Color_Gem 與 Area Bomb 組合啟動（colour.bomb）, THE Board_Animator SHALL 對所有同色寶石先執行 Mark_Phase 再轉換為 Area Bomb 並爆破
3. WHEN 兩顆 Color_Gem 組合啟動（colour.colour）, THE Board_Animator SHALL 對全棋盤所有寶石執行 Mark_Phase 後進入 Brew_Phase 再同步爆破
