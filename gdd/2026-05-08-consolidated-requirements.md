# 需求整合文件 — 2026-05-08

> **目的**：將 `.kiro/specs/` 中所有規格的 requirements 與現行程式碼實際做法比對，產出統一的需求現況文件。
> **來源規格**：
> 1. `gem-v1-full-implementation/requirements.md` — v1 完整實作需求（FR-1 ~ FR-20, NFR-1 ~ NFR-4, CP-1 ~ CP-10）
> 2. `special-gem-activation/requirements.md` — 特殊寶石啟動整合（需求 1~8）
> 3. `color-gem-staged-blast/requirements.md` — Color Gem 分階段爆破（需求 1~7）
> 4. `level-ui-display-bugs/bugfix.md` — 關卡 UI 顯示修復（Bug 1~3）

---

## 一、核心規則引擎（FR-1）

| 驗收條件 | 現行狀態 | 備註 |
|---|---|---|
| 棋盤支援 6×6 ~ 9×9 可配置空格 | ✅ 已實作 | `createBoard(w, h, empty)` |
| 偵測水平/垂直 3+ 同色連線 | ✅ 已實作 | `match-detect.ts` scanH/scanV |
| 無效交換拒絕 + 抖動動畫 | ✅ 已實作 | `game-integration.ts` doSwap |
| 有效交換消耗一手 | ✅ 已實作 | GameSessionController |
| 重力下落 + 頂端生成 | ✅ 已實作 | `cascade.ts` applyGravity + fillFromTop |
| 連鎖遞迴偵測 | ✅ 已實作 | `cascade.ts` runCascade |
| 連鎖倍率 `min(1.0 + (chain-1)×0.5, 4.0)` | ✅ 已實作 | `scoring.ts` |
| 規則邏輯零瀏覽器依賴 | ✅ 已實作 | `game/rules/` 純 TS |

## 二、特殊寶石生成（FR-2）

| 驗收條件 | 現行狀態 |
|---|---|
| 4 連 → Line Bomb（方向垂直於連線） | ✅ 已實作 |
| 5 連直線 → Colour Gem | ✅ 已實作 |
| T/L 形 → Area Bomb | ✅ 已實作 |
| 十字/≥6 → Area Bomb | ✅ 已實作 |
| 優先序：Colour > Area > Line | ✅ 已實作 |
| 生成位置：swap 時在目標位、cascade 時在中央格 | ✅ 已實作 |
| 每次交換最多生成一顆（swap 觸發時） | ✅ 已實作 |

## 三、特殊寶石啟動（FR-3 + special-gem-activation 需求 1~3）

| 驗收條件 | 現行狀態 |
|---|---|
| Line Bomb (H) 清除整列 | ✅ 已實作 |
| Line Bomb (V) 清除整行 | ✅ 已實作 |
| Area Bomb 清除 3×3 | ✅ 已實作 |
| Colour Gem 交換啟動清除同色 | ✅ 已實作 |
| 被動啟動（自身被消除時觸發） | ✅ 已實作 |
| Colour Gem 被動啟動隨機選色 | ✅ 已實作 |
| 啟動可破壞 Lock / Generator | ✅ 已實作 |
| `processSpecialActivations` 整合至 doSwap | ✅ 已實作 |
| 遞迴處理連鎖被動啟動 | ✅ 已實作 |
| Combo 交換啟動（resolveCombo） | ✅ 已實作 |
| 6 種 Combo 類型完整支援 | ✅ 已實作 |

## 四、Color Gem 分階段爆破（color-gem-staged-blast 需求 1~7）

| 驗收條件 | 現行狀態 |
|---|---|
| 輻射波以 Chebyshev 距離逐格擴散標記 | ✅ 已實作 | `staged-blast.ts` computeStagedPhases |
| 標記視覺效果（發光脈衝） | ✅ 已實作 | `board-animator.ts` Mark phase |
| 蓄力階段 300~500ms | ✅ 已實作 | Brew phase |
| 同步爆破（所有標記寶石同時清除） | ✅ 已實作 | Blast phase |
| 被動觸發特殊寶石處理 | ✅ 已實作 |
| 60 FPS 效能約束 | ✅ 已實作 |
| 與 Combo 系統整合 | ✅ 已實作 |
| 減少動態設定支援 | ✅ 已實作 |

## 五、計分系統（FR-5 + special-gem-activation 需求 4）

| 驗收條件 | 現行狀態 |
|---|---|
| 基礎分：3連=60, 4連=120, 5連=200, T/L=200, 十字/≥6=300 | ✅ 已實作 |
| 連鎖倍率套用 | ✅ 已實作 |
| Cascade 步驟獎勵 +50 | ✅ 已實作 |
| 特殊寶石啟動：60×N×multiplier（Colour +500） | ✅ 已實作 |
| Combo 基礎分（3000~10000） | ✅ 已實作 |
| 剩餘手數獎勵 +1000/手 | ✅ 已實作 |

## 六、關卡系統（FR-6）

| 驗收條件 | 現行狀態 | 備註 |
|---|---|---|
| 80 關跨 4 世界 | ⚠️ 部分 | 關卡 JSON 定義存在但內容為 placeholder |
| 5 種目標類型 | ✅ 已實作 | `objective.ts` |
| 手數/計時模式 | ✅ 已實作 |
| 星級評價 1~3 | ✅ 已實作 |
| Gate 關卡 | ✅ 已實作 |
| Boss 關卡特殊規則 | ⚠️ 架構就緒 | 尚無完整 boss 關卡內容 |

## 七、Blocker 系統（FR-7）

| 驗收條件 | 現行狀態 |
|---|---|
| Jelly（1~3 層） | ✅ 已實作 |
| Lock（不可移動） | ✅ 已實作 |
| Generator（每 N 手生成） | ✅ 已實作 |
| Unstable（倒數爆炸） | ✅ 已實作 |
| Delivery Cell | ✅ 已實作 |
| Blocker × Special 交互矩陣 | ✅ 已實作 |
| 堆疊 blocker | ✅ 已實作 |

## 八、棋盤初始化與重洗（FR-8）

| 驗收條件 | 現行狀態 | 備註 |
|---|---|---|
| 初始無預存消除 + 至少 1 有效交換 | ✅ 已實作 | `initBoard` |
| 顏色池隨進度擴展 | ✅ 已實作 | 由 LevelSpec 控制 |
| 可配置生成權重 | ✅ 已實作 | `pickWeightedColour` |
| 暗示系統（5 秒閒置） | ✅ 已實作 | `hint.ts` |
| 無有效交換自動重洗 | ✅ 已實作 | `reshuffle.ts` |
| 種子化 PRNG（Mulberry32, 4 串流） | ✅ 已實作 | `rng.ts` |

## 九、遊戲流程與狀態機（FR-9）

| 驗收條件 | 現行狀態 |
|---|---|
| 完整狀態機（11 狀態） | ✅ 已實作 |
| 單一 `transition(from, to)` 入口 | ✅ 已實作 |
| ESC 暫停 / visibilitychange 自動暫停 | ✅ 已實作 |
| Tab 返回「繼續？」覆蓋層 | ✅ 已實作 |
| Cascade 必須完成才結算 | ✅ 已實作 |
| 剩餘手數獎勵動畫 | ✅ 已實作 |

## 十、Endless 模式（FR-10）

| 驗收條件 | 現行狀態 |
|---|---|
| L80 完成後解鎖 | ✅ 已實作 |
| 難度 1~15 級遞增 | ✅ 已實作 |
| 漸進式（顏色增加、blocker 引入、棋盤擴大） | ✅ 已實作 |
| 結束條件（3 次重洗、主動退出、120 秒無操作） | ✅ 已實作 |
| 本機排行榜 | ✅ 已實作 |

## 十一、存檔系統（FR-11）

| 驗收條件 | 現行狀態 |
|---|---|
| localStorage `gem.save.v1` | ✅ 已實作 |
| 防抖寫入 500ms + 關鍵事件立即寫入 | ✅ 已實作 |
| 優雅降級（localStorage 滿/封鎖） | ✅ 已實作 |
| 版本遷移支援 | ✅ 已實作 |
| 匯出/匯入 JSON | ✅ 已實作 |

## 十二、輸入系統（FR-12）

| 驗收條件 | 現行狀態 |
|---|---|
| 統一指標抽象（滑鼠/觸控/觸控筆） | ✅ 已實作 |
| 點擊-點擊 + 拖曳交換 | ✅ 已實作 |
| 完整鍵盤導航 | ✅ 已實作 |
| Tab/Shift+Tab 焦點循環 | ✅ 已實作 |
| 可配置快捷鍵 | ✅ 已實作 |

## 十三、渲染與視覺回饋（FR-13 + special-gem-activation 需求 5）

| 驗收條件 | 現行狀態 |
|---|---|
| PixiJS 8 WebGPU/WebGL 回退 | ✅ 已實作 |
| 圖層階層完整 | ✅ 已實作 |
| 3 種圖形預設 | ✅ 已實作 |
| 關鍵動畫時序（選取 80ms、交換 200ms 等） | ✅ 已實作 |
| 連鎖 ≥3 飽和脈衝 | ✅ 已實作 |
| 特殊寶石生成震波 600ms | ✅ 已實作 |
| 特殊寶石啟動效果 800ms | ✅ 已實作 |
| 粒子系統物件池 | ✅ 已實作 |
| 啟動視覺效果（createSpecialActivationEffect） | ✅ 已實作 |

## 十四、音訊系統（FR-14 + special-gem-activation 需求 6）

| 驗收條件 | 現行狀態 |
|---|---|
| Howler.js 音訊庫 | ✅ 已實作 |
| Splash 手勢解鎖 autoplay | ✅ 已實作 |
| SFX 對應遊戲事件 | ✅ 已實作 |
| 自適應音樂（intensity 驅動層疊） | ✅ 已實作 |
| 音量控制 + 全域靜音 | ✅ 已實作 |
| 暫停/tab 隱藏時暫停音訊 | ✅ 已實作 |
| 特殊寶石啟動音效 | ✅ 已實作 |
| Combo 專屬音效 | ✅ 已實作 |

## 十五、設定與無障礙（FR-15）

| 驗收條件 | 現行狀態 |
|---|---|
| 音訊滑桿 + 靜音 | ✅ 已實作 |
| 圖形預設 + 減少動態 | ✅ 已實作 |
| 色盲模式（3 種） | ✅ 已實作 |
| 高對比 / 長按確認 | ✅ 已實作 |
| 暗示延遲 / 自動啟動特殊寶石 | ✅ 已實作 |
| 語言切換（zh-TW / en） | ✅ 已實作 |
| DOM overlay 渲染 | ✅ 已實作 |
| 首次啟動偵測 prefers-reduced-motion | ✅ 已實作 |

## 十六、UI 畫面（FR-16）

| 驗收條件 | 現行狀態 |
|---|---|
| Splash 畫面 | ✅ 已實作 |
| 主選單 | ✅ 已實作 |
| 世界地圖 | ✅ 已實作 |
| 關卡選擇卡片 | ✅ 已實作 |
| 遊戲 HUD | ✅ 已實作 |
| 關卡完成 | ✅ 已實作 |
| 關卡失敗 | ✅ 已實作 |
| 暫停覆蓋層 | ✅ 已實作 |
| 製作人員畫面 | ✅ 已實作 |

## 十七、關卡 UI 顯示修復（level-ui-display-bugs）

| Bug | 現行狀態 |
|---|---|
| Bug 1：最佳紀錄依 attempts 正確顯示 | ✅ 已修復 |
| Bug 2：關卡選擇卡片讀取實際目標 | ✅ 已修復 |
| Bug 3：HUD 目標進度即時更新 | ✅ 已修復 |

## 十八、手數計算正確性（special-gem-activation 需求 7）

| 驗收條件 | 現行狀態 |
|---|---|
| 有效交換扣一手 | ✅ 已實作 |
| Cascade 被動啟動不扣手數 | ✅ 已實作 |
| 無效交換不扣手數 | ✅ 已實作 |
| Colour Gem / Combo 在 commit 時扣除 | ✅ 已實作 |

## 十九、doSwap 流程整合（special-gem-activation 需求 8）

| 驗收條件 | 現行狀態 |
|---|---|
| 依序檢查 Combo → Colour Gem → 普通消除 | ✅ 已實作 |
| resolving 期間拒絕新輸入 | ✅ 已實作 |
| 循環結束更新 HUD | ✅ 已實作 |
| 錯誤時重設 isProcessing | ✅ 已實作 |

## 二十、效能與技術需求（FR-18）

| 驗收條件 | 現行狀態 | 備註 |
|---|---|---|
| 60 FPS（最差 ≥55） | ✅ 達標 | 依 CI 測試 |
| 99p 幀時間 ≤25ms | ✅ 達標 |
| Draw calls ≤80 | ✅ 達標 |
| 初始 bundle ≤5MB | ✅ 達標 |
| TTI ≤3 秒 | ✅ 達標 |
| 30 分鐘記憶體漂移 ≤10MB | ⚠️ 待驗證 | 需 milestone 手動測試 |

## 二十一、確定性與 RNG（FR-19）

| 驗收條件 | 現行狀態 |
|---|---|
| Mulberry32 PRNG, 64-bit seed → 4 串流 | ✅ 已實作 |
| boardInit/cascadeFill/misc bit-exact | ✅ 已實作 |
| juice 串流可 desync | ✅ 已實作 |
| CI 確定性測試 | ✅ 已實作 |
| Cascade 安全上限 50 | ✅ 已實作 |

## 二十二、國際化（FR-20）

| 驗收條件 | 現行狀態 |
|---|---|
| zh-TW + en | ✅ 已實作 |
| 自動偵測 navigator.language | ✅ 已實作 |
| 所有 UI 文字外部化 | ✅ 已實作 |
| 語言設定持久化 | ✅ 已實作 |

## 二十三、非功能需求

| 需求 | 現行狀態 |
|---|---|
| NFR-1 模組邊界（rules 零依賴 Pixi/DOM） | ✅ 遵守 |
| NFR-2 建置（Vite + Vitest + Playwright + ESLint） | ✅ 已配置 |
| NFR-3 安全（無 PII、HTTPS、自託管字型） | ✅ 遵守 |
| NFR-4 離線支援（Service Worker） | ⚠️ 架構就緒 | SW 尚未完整配置 |

## 二十四、正確性屬性

| 屬性 | 現行狀態 | 測試覆蓋 |
|---|---|---|
| CP-1 棋盤有效性不變式 | ✅ | property test（有已知邊界 case） |
| CP-2 分數單調性 | ✅ | unit test |
| CP-3 連鎖倍率邊界 [1.0, 4.0] | ✅ | unit test |
| CP-4 手數計數一致性 | ✅ | unit + integration test |
| CP-5 Cascade 完成保證 | ✅ | property test |
| CP-6 特殊寶石優先序確定性 | ✅ | property test |
| CP-7 狀態機轉換合法性 | ✅ | property test |
| CP-8 RNG 確定性 | ✅ | unit test |
| CP-9 組合對稱性 | ✅ | unit test |
| CP-10 Blocker 層級完整性 | ✅ | unit test |

---

## 總結

### 已完成（可視為 v1 feature-complete）
- 核心規則引擎（match/cascade/scoring/special/combo）
- 特殊寶石完整生命週期（生成→啟動→被動→Combo）
- Color Gem 分階段爆破視覺增強
- 狀態機與遊戲流程
- 存檔系統
- 輸入系統
- 渲染管線
- 音訊系統
- UI 全畫面
- 設定與無障礙
- 國際化（zh-TW / en）
- Endless 模式
- 關卡 UI bug 修復

### 待完善
- 80 關完整內容（關卡 JSON 需充實）
- Boss 關卡獨特機制
- Service Worker 離線快取
- 30 分鐘記憶體漂移驗證
- Headless simulator 完整實作
- Playtest 資料收集

---

*本文件由 `.kiro/specs/` 中 4 份規格整合而成，與 `src/` 程式碼比對後產出。*
