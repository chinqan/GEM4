# Implementation Plan: Color Gem 分階段爆破（Mark → Brew → Blast）

## 概覽

將 Color Gem 啟動動畫從「輻射波到達即清除」改為三階段序列：Mark（標記）→ Brew（蓄力）→ Blast（爆破）。實作僅修改動畫排程層（`BoardAnimator`）與新增動畫工廠函式，不改變遊戲邏輯層。

## Tasks

- [x] 1. 新增設計常數與純函式
  - [x] 1.1 在 `src/rendering/design-tokens.ts` 新增 Color Gem 分階段爆破常數
    - 新增 `BREW_PHASE_DURATION_MS = 400`
    - 新增 `MARK_PULSE_CYCLE_MS = 300`
    - 新增 `MARK_GLOW_ALPHA_MIN = 0.4`、`MARK_GLOW_ALPHA_MAX = 1.0`
    - 新增 `BREW_SHAKE_AMPLITUDE = 2.5`
    - 新增 `BREW_BRIGHTNESS_MAX = 1.4`
    - 新增 `BLAST_PARTICLE_MULTIPLIER = 2.5`
    - _Requirements: 3.3, 2.1_

  - [x] 1.2 建立 `src/rendering/staged-blast.ts` 並實作 `computeStagedPhases` 純函式
    - 定義 `StagedTimelinePhases` 介面（markSchedule, markEndTime, brewStartTime, brewEndTime, blastStartTime, passiveSchedule）
    - 實作 `computeStagedPhases(source, targets, passiveEvents)` 函式
    - 使用 Chebyshev 距離計算每個目標的 markArriveAt
    - markEndTime = max(所有目標的 arriveAt)
    - brewStartTime = markEndTime, brewEndTime = brewStartTime + BREW_PHASE_DURATION_MS
    - blastStartTime = brewEndTime
    - 被動觸發排程從 blastStartTime 開始
    - _Requirements: 1.1, 1.4, 1.5, 3.1, 3.4, 4.1_

  - [ ]* 1.3 撰寫 `computeStagedPhases` 屬性測試
    - **Property 1: 輻射到達時間正確性** — 任意 source 與 target，markArriveAt = chebyshev(source, target) × CELL_RADIATION_SPEED_MS
    - **Property 3: 階段轉換時序** — Mark/Brew/Blast 三階段無間隙無重疊
    - **Property 4: 爆破同步性** — 所有目標的 blast 排程時間皆等於 blastStartTime
    - **Property 8: 總時長上界** — 總時長 ≤ 現有輻射時長 + BREW_PHASE_DURATION_MS
    - **Validates: Requirements 1.1, 1.4, 1.5, 3.1, 3.4, 4.1, 6.1**

  - [ ]* 1.4 撰寫 `computeStagedPhases` 單元測試
    - 測試空目標集合回傳零時長
    - 測試單一目標的時序計算
    - 測試多目標（不同距離）的 markEndTime 為最大距離
    - 測試被動觸發排程從 blastStartTime 開始
    - _Requirements: 1.4, 1.5, 6.4_

- [x] 2. 建立動畫工廠函式
  - [x] 2.1 在 `src/rendering/animations.ts` 新增 `createMarkEffect` 動畫工廠
    - 接受 `MarkEffectConfig`（sprite, duration, colour, reducedMotion）
    - 正常模式：發光脈衝動畫（alpha 在 MARK_GLOW_ALPHA_MIN ~ MAX 之間循環）
    - 減少動態模式：靜態邊框高亮（固定 alpha + 色調變化）
    - 動畫持續到外部呼叫 complete() 或 duration 到期
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.2 在 `src/rendering/animations.ts` 新增 `createBrewAnimation` 動畫工廠
    - 接受 `BrewAnimationConfig`（sprite, duration）
    - 實作震動效果（BREW_SHAKE_AMPLITUDE 振幅的正弦波）
    - 實作亮度遞增（從 1.0 線性增至 BREW_BRIGHTNESS_MAX）
    - 減少動態模式：僅亮度變化，不震動
    - _Requirements: 3.2_

  - [x] 2.3 在 `src/rendering/animations.ts` 新增 `createEnhancedBlastAnimation` 動畫工廠
    - 接受 `EnhancedBlastConfig`（sprite, colour, particleMultiplier）
    - 複用現有 `createMatchClearAnimation` 的縮放/淡出邏輯
    - 增加粒子爆破效果（數量 × BLAST_PARTICLE_MULTIPLIER）
    - _Requirements: 4.2_

  - [ ]* 2.4 撰寫動畫工廠單元測試
    - 測試 `createMarkEffect` 回傳有效 Animation 物件（有 update/complete 方法）
    - 測試 `createMarkEffect` 在 reducedMotion=true 時不產生脈衝
    - 測試 `createBrewAnimation` 的震動振幅不超過 BREW_SHAKE_AMPLITUDE
    - 測試 `createEnhancedBlastAnimation` 完成後 sprite.visible = false
    - _Requirements: 2.1, 2.4, 3.2, 4.2_

- [x] 3. Checkpoint — 確認所有測試通過
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. 實作 `playColourGemStagedTimeline` 方法
  - [x] 4.1 在 `src/rendering/board-animator.ts` 新增 `playColourGemStagedTimeline` 私有方法
    - 方法簽名：`private async playColourGemStagedTimeline(source, targets, passiveEvents, colourByPos, chain)`
    - 呼叫 `computeStagedPhases` 取得時序排程
    - 無目標快速路徑：targets.length === 0 時僅 shrinkCell(source) 並 return
    - Mark Phase：依 markSchedule 排程 `createMarkEffect` 動畫
    - Brew Phase：在 brewStartTime 對所有已標記寶石排程 `createBrewAnimation`
    - Blast Phase：在 blastStartTime 對所有已標記寶石排程 `createEnhancedBlastAnimation`
    - 被動觸發：在 blastStartTime 從特殊寶石位置啟動新輻射波（呼叫現有 scheduleEvent）
    - 分數彈出：在 Blast 完成後顯示
    - 使用現有 `runTimeline` 執行排程
    - _Requirements: 1.1, 1.2, 1.5, 3.1, 3.2, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 6.4_

  - [ ]* 4.2 撰寫 `playColourGemStagedTimeline` 屬性測試
    - **Property 5: 標記動畫持續性** — 每個目標的標記效果持續時間 = (markEndTime - markArriveAt) + BREW_PHASE_DURATION_MS
    - **Property 6: 被動觸發在爆破時刻啟動** — 帶有特殊屬性的目標寶石，其被動輻射波從 blastStartTime 開始
    - **Validates: Requirements 2.2, 5.1, 5.2**

  - [ ]* 4.3 撰寫被動觸發時序屬性測試
    - **Property 9: 被動觸發時長折扣** — 被動觸發的啟動動畫時長 = 基礎時長 × PASSIVE_ACTIVATION_DURATION_SCALE (0.7)
    - **Validates: Requirements 6.3**

- [x] 5. 攔截 Colour Gem 事件並整合至 `playRadiationTimeline`
  - [x] 5.1 修改 `src/rendering/board-animator.ts` 中的 `playRadiationTimeline` 方法
    - 在 `scheduleEvent` 函式內偵測 `event.type === 'colour'`
    - 當偵測到 colour 類型時，委派給 `playColourGemStagedTimeline`
    - 非 colour 類型維持原有邏輯不變
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 5.2 撰寫標記選擇性屬性測試
    - **Property 2: 標記選擇性** — 輻射波僅對目標顏色寶石施加標記效果，非目標顏色不產生標記任務
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 5.3 撰寫清除集合等價性屬性測試
    - **Property 7: 清除集合等價性** — 分階段爆破最終清除的格子集合與現有立即清除路徑完全相同
    - **Validates: Requirements 5.3**

- [x] 6. Checkpoint — 確認所有測試通過
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Combo 系統整合
  - [x] 7.1 實作 `colour.line` 組合的分階段爆破路徑
    - 在 `animateSwap` 的 combo 分支中偵測 colour + line 組合
    - Mark Phase 標記所有同色寶石
    - Blast Phase 將目標轉換為 Line Bomb 並觸發各自輻射波
    - _Requirements: 7.1_

  - [x] 7.2 實作 `colour.bomb` 組合的分階段爆破路徑
    - 在 `animateSwap` 的 combo 分支中偵測 colour + area 組合
    - Mark Phase 標記所有同色寶石
    - Blast Phase 將目標轉換為 Area Bomb 並觸發各自輻射波
    - _Requirements: 7.2_

  - [x] 7.3 實作 `colour.colour` 組合的分階段爆破路徑
    - 偵測兩顆 Color Gem 組合
    - Mark Phase 標記全棋盤所有非空格子
    - Brew Phase 全盤蓄力
    - Blast Phase 全盤同步爆破
    - _Requirements: 7.3_

  - [ ]* 7.4 撰寫 Combo 標記集合屬性測試
    - **Property 10: Combo 標記階段覆蓋** — colour.line / colour.bomb 的 Mark Phase 標記集合 = 所有同色寶石位置（不含組合寶石自身）
    - **Property 11: colour.colour 全盤標記** — Mark Phase 標記集合 = 全棋盤所有非空格子
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 8. 減少動態（Reduced Motion）無障礙支援
  - [x] 8.1 整合 `detectPrefersReducedMotion` 至分階段爆破流程
    - 在 `playColourGemStagedTimeline` 中讀取 reduced motion 設定
    - 將 `reducedMotion` 旗標傳遞給 `createMarkEffect`
    - Brew Phase 在 reduced motion 下僅使用亮度變化（不震動）
    - _Requirements: 2.4_

- [x] 9. 效能驗證與最終整合
  - [ ]* 9.1 撰寫整合測試
    - 測試完整 swap → colour gem activation → staged blast → gravity → cascade 流程
    - 測試 colour.line / colour.bomb / colour.colour combo 路徑的端到端動畫序列
    - 測試無目標快速路徑正確跳過 Mark + Brew
    - 測試被動觸發的特殊寶石正確啟動新輻射波
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2_

  - [x] 9.2 確認效能約束
    - 驗證完整三階段序列總時長 ≤ 現有 Color Gem 啟動時長 + BREW_PHASE_DURATION_MS
    - 確認 `BREW_PHASE_DURATION_MS` 值在 300-500ms 範圍內
    - 確認被動觸發套用 `PASSIVE_ACTIVATION_DURATION_SCALE` 折扣
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 10. Final checkpoint — 確認所有測試通過
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- 標記 `*` 的子任務為選擇性任務，可跳過以加速 MVP 開發
- 每個任務皆引用具體需求條款以確保可追溯性
- Checkpoint 確保增量驗證
- 屬性測試驗證通用正確性屬性（使用 fast-check 框架）
- 單元測試驗證具體範例與邊界情況
- 此實作僅修改動畫層，不影響遊戲邏輯的確定性測試
