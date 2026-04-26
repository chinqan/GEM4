# 錯誤修復需求文件

## 簡介

本文件涵蓋關卡 UI 顯示的三個相關錯誤，影響玩家在關卡選擇畫面與遊玩過程中的資訊呈現：
1. 當嘗試次數為 0 時，最佳紀錄顯示為「—」而非表示尚未挑戰
2. 關卡選擇卡片的目標文字為寫死的 "Score 1000 points"，未讀取實際關卡規格
3. 遊玩過程中 HUD 的目標進度從未被更新，玩家無法看到目標達成狀態

## 錯誤分析

### 目前行為（缺陷）

**Bug 1：最佳紀錄在嘗試次數為 0 時顯示不正確**

1.1 WHEN 玩家尚未挑戰某關卡（attempts = 0 且 bestScore = 0）THEN 系統顯示「過往最佳: —」，無法區分「從未挑戰」與「挑戰過但得分為 0」

1.2 WHEN 玩家挑戰過某關卡但得分恰好為 0（attempts > 0 且 bestScore = 0）THEN 系統同樣顯示「過往最佳: —」，未正確顯示實際最佳分數 0

**Bug 2：關卡選擇卡片目標文字為寫死值**

1.3 WHEN 玩家開啟任何關卡的選擇卡片 THEN 系統顯示寫死的目標文字 "Score 1000 points"，而非該關卡實際的目標描述

1.4 WHEN 關卡的目標類型為 collect、clear、drop 或 multi THEN 系統仍顯示 "Score 1000 points"，與實際目標完全不符

1.5 WHEN 關卡選擇卡片顯示時 THEN 手數預算（moveBudget）為寫死的 20、最佳星數為 0、最佳分數為 0、嘗試次數為 0，未讀取存檔紀錄與關卡規格

**Bug 3：遊玩時 HUD 目標進度未更新**

1.6 WHEN 玩家在遊玩過程中消除寶石並推進目標 THEN HUD 的目標進度 chip 始終顯示初始值（0/1），未反映實際進度

1.7 WHEN RulesEngine 更新 ObjectiveTracker 的進度後 THEN 系統未發射 `objective.progressed` 事件，也未呼叫 `hud.setObjective()` 來更新顯示

### 預期行為（正確）

**Bug 1：最佳紀錄應根據嘗試次數正確顯示**

2.1 WHEN 玩家尚未挑戰某關卡（attempts = 0）THEN 系統 SHALL 顯示「過往最佳: 尚未挑戰」以明確表示該關卡從未被遊玩

2.2 WHEN 玩家挑戰過某關卡且最佳分數為 0（attempts > 0 且 bestScore = 0）THEN 系統 SHALL 顯示「過往最佳: 0 分」以正確反映實際最佳分數

2.3 WHEN 玩家挑戰過某關卡且最佳分數大於 0（attempts > 0 且 bestScore > 0）THEN 系統 SHALL 顯示「過往最佳: {bestScore} 分」（與現有行為一致）

**Bug 2：關卡選擇卡片應顯示實際目標與存檔資料**

2.4 WHEN 玩家開啟關卡選擇卡片 THEN 系統 SHALL 從 LevelSpec 讀取該關卡的 objective 並產生對應的目標描述文字

2.5 WHEN 關卡目標類型為 score THEN 系統 SHALL 顯示「達成 {target} 分」

2.6 WHEN 關卡目標類型為 collect THEN 系統 SHALL 顯示收集目標的描述（例如「收集 15 個紅色寶石」）

2.7 WHEN 關卡目標類型為 clear THEN 系統 SHALL 顯示清除目標的描述（例如「清除 15 個果凍」）

2.8 WHEN 關卡目標類型為 drop THEN 系統 SHALL 顯示掉落目標的描述（例如「掉落 3 個寶石」）

2.9 WHEN 關卡目標類型為 multi THEN 系統 SHALL 顯示所有子目標的描述

2.10 WHEN 玩家開啟關卡選擇卡片 THEN 系統 SHALL 從存檔（SaveState）讀取該關卡的 bestStars、bestScore、attempts，並從 LevelSpec 讀取 moveBudget 或 timeBudget

**Bug 3：遊玩時 HUD 應即時顯示目標進度**

2.11 WHEN 玩家在遊玩過程中的每次消除動作完成後 THEN 系統 SHALL 從 ObjectiveTracker 取得最新的 summary（current/total）並更新 HUD 的目標進度顯示

2.12 WHEN 目標進度更新時 THEN 系統 SHALL 透過事件匯流排發射 `objective.progressed` 事件，並由整合層監聽該事件以呼叫 `hud.setObjective(current, total)`

### 不變行為（迴歸防護）

3.1 WHEN 玩家挑戰過某關卡且最佳分數大於 0 THEN 系統 SHALL CONTINUE TO 顯示「過往最佳: {bestScore} 分」格式的最佳紀錄

3.2 WHEN 關卡選擇卡片的 Play 與 Cancel 按鈕被點擊 THEN 系統 SHALL CONTINUE TO 正確觸發對應的狀態轉換（進入遊戲或返回世界地圖）

3.3 WHEN 關卡選擇卡片顯示時 THEN 系統 SHALL CONTINUE TO 正確顯示世界與關卡編號標題（例如「W1 · Level 01」）

3.4 WHEN 遊玩過程中分數更新時 THEN 系統 SHALL CONTINUE TO 正確更新 HUD 的分數顯示

3.5 WHEN 遊玩過程中手數消耗時 THEN 系統 SHALL CONTINUE TO 正確更新 HUD 的手數顯示

3.6 WHEN 關卡結束（通過或失敗）THEN 系統 SHALL CONTINUE TO 正確發射 `level.resolved` 事件並顯示結果畫面

3.7 WHEN 非 score 類型目標的關卡被選擇 THEN 系統 SHALL CONTINUE TO 正確顯示手數或時間預算
