# 01 · 遊戲概述 (Game Overview)

> **Status**: v1.0 (synced 2026-05-08) · **Owner**: match3-game-designer · **Last updated**: 2026-05-08
> **Phase**: 1 — Foundations · 本章是下游所有章節的設計支柱來源。

---

## 1. High Concept

**《Gem》** 是一款在瀏覽器上執行、以 **PixiJS 2D** 驅動的 **寶石消除三消益智遊戲**。玩家交換相鄰寶石以構成三連以上的直線，消除並引發連鎖掉落，目標是在限定手數或時間內達成關卡目標。

> 一句話描述：*「Bejeweled 的經典節奏，現代瀏覽器中的絲滑再現，配上色彩真實、切割細緻的寶石美學。」*

---

## 2. Target Audience & Platform

### 受眾 (Audience Personas)

| Persona | 描述 | 預期玩法 |
|---|---|---|
| **Casual Puzzler** (主) | 30–55 歲，一般 PC 或筆電族，喜愛短時間放鬆益智遊戲 | 每次 5–15 分鐘，斷點式遊玩 |
| **Puzzle Enthusiast** | 25–40 歲，追求 3-star 全破與高分 | 每次 30+ 分鐘，挑戰 endless 與 gate 關 |
| **Passing Visitor** | 在等待/通勤的隨機玩家 | 一關就走，需要快速上手 |

### 平台

| 平台 | 優先級 | 備註 |
|---|---|---|
| Desktop Chrome / Edge / Firefox / Safari (latest stable) | **主** (v1) | 最低解析度 1200×800 |
| Tablet (iPad / Android tablet) | 次 (v1.1+) | 觸控模式已納入 input 設計 |
| Mobile (手機) | 後續 (v2) | stretch goal；目前不做 UI 重排 |

### 技術目標

- 引擎：PixiJS 8（WebGPU 優先，WebGL 回退）
- 目標 FPS：60（celebrations 短暫可降至 45）
- 初始 bundle：≤ 5 MB gzipped
- TTI：≤ 3 秒（寬頻）

---

## 3. Design Pillars

以下 **5 根設計支柱** 是本遊戲的非協商體驗，所有下游設計決策必須能對應至少一根支柱；不對應的功能原則上不實作。

### P1 · 入手即上手 (Instantly Learnable)

新玩家在 **不讀任何文字** 的情況下，第一關能完成；前 5 關覆蓋所有核心機制。關卡本身即教學。

### P2 · 連鎖即爽感 (The Cascade Is the Reward)

當玩家觸發 4+ 連鎖、特殊寶石、或大型 combo 時，**視覺、音效、分數反饋** 的強度必須明確升級 — 讓「意外的大連鎖」成為每場關卡最被記住的瞬間。

### P3 · 清晰的思考空間 (Clear Thinking Space)

棋盤永遠可讀：寶石形狀 / 顏色 / 特殊狀態有明確的階層。玩家卡住時，系統主動提供暗示（hint）或在無解時重洗，但不強制。

### P4 · 掌握感 (Mastery Rewarded)

★★★ 分數門檻難但可達；不靠運氣靠決策。Endless 模式、大 combo、特殊寶石組合（bomb+line、colour+colour）等高階玩法有明顯的回饋與識別度。

### P5 · 尊重時間 (Respects the Player's Time)

關卡長度 2–5 分鐘；任何時候可暫停、關掉瀏覽器；所有進度自動存檔；**沒有硬性廣告、沒有心機重試門檻、沒有體力系統**（v1 不走免費增值）。

---

## 4. Core Gameplay Loop

### 4.1 Moment-to-Moment (0–30 秒)

```
[觀察棋盤]
   │
   ▼
[選擇要交換的寶石] ─── tap / drag
   │
   ▼
[交換合法?] ── 否 ──▶ [抖動 + 撤回 + 無效音效]
   │ 是
   ▼
[偵測消除] ──▶ [消除動畫 + 粒子 + 分數 +得分音效]
   │
   ▼
[重力掉落] ──▶ [新寶石由頂端補入]
   │
   ▼
[仍有消除?] ── 是 ──▶ [連鎖 +1，遞迴]
   │ 否
   ▼
[回到觀察]
```

**Feedback channels (每步必備一個)**：

| 動作 | 視覺 | 音效 | 粒子 |
|---|---|---|---|
| 選擇寶石 | 脈衝 + 發光環 | `gem.pick` | — |
| 無效交換 | 橫向震動 4px | `swap.invalid` | — |
| 有效消除 | 縮放至 0 | `match.base` | 彩色爆破 ×8 |
| 連鎖 ≥3 | 畫面飽和脈衝 | `chain.stinger` | 大型光效 |
| 特殊寶石生成 | 放大 + 震波 | `special.spawn` | 環形衝擊波 |

### 4.2 Session Loop (5–30 分鐘)

```
[世界地圖] ──▶ [選關卡] ──▶ [看目標/手數] ──▶ [遊玩]
                                                    │
                                     ┌──────────────┼──────────────┐
                                     ▼              ▼              ▼
                                [完成]         [失敗]         [中途離開]
                                     │              │              │
                                     ▼              ▼              ▼
                          [★評價 + 爆分]    [鼓勵 + 重試]   [自動存檔]
                                     │              │
                                     ▼              ▼
                          [下一關 / 返回]      [再一次 / 退出]
```

### 4.3 Meta Loop (數小時–數週)

```
[完成世界 N] ──▶ [世界完成動畫] ──▶ [解鎖世界 N+1]
                                          │
                                          ▼
                              [視覺主題 + 音樂換裝] ──▶ [新機制引入]
                                          │
                                          ▼
                          [Endless 模式] + [3-star 收集追蹤]
```

- 收集類進度：每關 ★ 數、全世界 ★ 總數、累積連鎖紀錄、累積特殊寶石觸發數
- 長期勾子：達成 「全 ★」「全 World 3-star」 「連續 10 關 3-star」
- Endless 模式：世界 4 完成後解鎖；高分排行榜（本機；v1 不做線上）

---

## 5. Key Features

### 5.1 Core Features (v1 必出)

| Feature | 說明 | 來源支柱 |
|---|---|---|
| **標準三消** | 3 連以上同色消除，支援橫/直 | P1 |
| **連鎖掉落** | 自動補位與遞迴消除 | P2 |
| **特殊寶石（4 種）** | 見下節 5.2 | P2, P4 |
| **特殊寶石組合（10+ 種）** | bomb × bomb, colour × line 等 | P4 |
| **多種目標類型** | 分數目標 / 清除目標 / 收集目標 | 全 |
| **手數模式** | 多數關卡 | P5 |
| **計時模式** | 特定章節 | P4 |
| **關卡系統** | 80–120 關跨 4 個世界 | 全 |
| **★ 評價** | 每關 1–3 星 | P4 |
| **暗示系統** | 閒置 5 秒後提示可行解 | P3 |
| **重洗** | 無解時自動觸發 | P3 |
| **完整設定** | 音量、色盲、減少動態、語言 | P5, P3 |
| **本機存檔** | localStorage + 版本遷移 | P5 |

### 5.2 Special Gems — 完整規格

#### 觸發與生成位置

| 觸發形狀 | 生成寶石 | Spawn 位置（swap 觸發） | Spawn 位置（cascade 觸發） |
|---|---|---|---|
| 4 連橫 / 縱 | **Line Bomb** (方向 = 原連線方向) | 玩家交換後到達該連線的寶石位置 | 該 4 連的中央格 |
| 5 連直線 | **Colour Gem** | 玩家交換後到達該連線的寶石位置 | 該 5 連的中央格 |
| T 形 5–6 連 | **Area Bomb** | T 形交會點（雙臂共用的那格） | 同左 |
| L 形 5–6 連 | **Area Bomb** | L 形轉角點（雙臂共用的那格） | 同左 |
| 5 連十字 / 6 格其他形狀 | **Area Bomb** | 形狀幾何中心格 | 同左 |
| T / L / cross ≥7 格 | **Colour Gem** | 形狀幾何中心格 | 同左 |

#### 生成動畫

消除觸發特殊寶石時，成員寶石**不在原地消失**，而是以聚合移動方式飛向定位點：

- 定位點以外的所有成員寶石同時向定位點飛去（ease-in 加速），**越遠越快**，確保精準同時抵達。
- 定位點的寶石原地等待（不移動）。
- 全員抵達後同時縮小消失，隨即在定位點生成特殊寶石，並播放震波特效。
- 整個聚合過程共 300 ms（長於一般消除的 200 ms，給玩家清楚感知飛行過程），連鎖中亦適用相同邏輯。

#### Overlap 優先序（tie-break）

多個圖案同時成立時：`Colour Gem > Area Bomb > Line Bomb`。同級內：**更大的直線贏過更小的**；**T/L 贏過純 4 連**。單次 swap 僅生成一顆特殊寶石（最高優先者）。

#### 啟動效果

| 寶石 | 啟動效果 | 可否穿過 Lock | 可否被 cascade 觸發 |
|---|---|---|---|
| Line Bomb (H) | 清除整列 8 格 | 是（破鎖） | 是（自身被消時爆） |
| Line Bomb (V) | 清除整行 8 格 | 是（破鎖） | 是 |
| Area Bomb | 清除以自身為中心的 3×3（邊緣自動裁切） | 是（破鎖） | 是 |
| Colour Gem (swap 啟動) | 清除棋盤上所有「與被交換對象同色」的寶石 | 否（Colour Gem 無法鎖定 locked cell 的顏色） | 否（獨立存在時不自爆；必經交換或 combo） |

#### Passive activation（自身被消除觸發）

- Line Bomb / Area Bomb：**會**。當該 Special 自身被消除時（例如被其他炸彈的爆炸範圍波及、或被 Colour Gem 清除），啟動它的效果，並計入 chain。僅鄰居被消除而自身未被消除時**不會**觸發。
- Colour Gem：**不會**。必經玩家交換或與其他 Special 組 combo 才啟動。

### 5.3 Special Combos — 完整矩陣

兩顆 Special 透過交換互擊，視為一個 **combo**（非普通 chain）。6 個唯一對（A×B = B×A）。

| A \ B | Line Bomb | Area Bomb | Colour Gem |
|---|---|---|---|
| **Line Bomb** | **十字**：同時清該列 + 該行 | **3 格寬十字**：中央列 ±1 + 中央行 ±1 | **全色 → Line Bomb**：全盤所有該色轉為隨機方向 Line Bomb 並依序啟動 |
| **Area Bomb** | （見上格） | **5×5 大爆炸** | **全色 → Area Bomb**：全盤所有該色轉為 Area Bomb 並依序啟動 |
| **Colour Gem** | （見上格） | （見上格） | **全棋盤清除**（王牌） |

Combo 觸發位置：兩顆 Special 的中點格為視效原點；清除範圍以該中點為基準。

### 5.4 Out of Scope (v1 不做)

以下功能明列為 v1 **不實作**，避免 scope 蔓延：

- 多人對戰 / 線上排行榜
- 體力系統 / 等待機制
- 道具 / 付費加成
- 每日任務 / 每週活動
- 角色養成 / 裝備系統
- 分支劇情 / 對話選擇
- 雲端存檔
- 廣告

---

## 6. Scoring Economy & Rule Ledger (canonical)

> 本節是計分、特殊寶石、Move-counting、反挫敗立場、Cascade 時序意圖的 **單一真相來源**。下游章節（02/06/07/09）皆引用此表；數字以 `proposed` 狀態入帳，待 headless-sim 與 playtest 收斂後轉 `frozen`。登記於 `docs/gdd/registries/numbers.md`。

### 6.1 Base Scores

| 事件 | 基礎分數 | 備註 |
|---|---|---|
| 3-match | 60 | 基準 |
| 4-match (橫 / 縱) | 120 | 並生成 Line Bomb |
| 5-straight | 200 | 並生成 Colour Gem |
| T-match / L-match（5–6 格） | 200 | 並生成 Area Bomb |
| 5-cross / 6 格其他形狀 | 300 | 並生成 Area Bomb |
| T / L / cross ≥7 格 | 400 | 並生成 Colour Gem |
| Cascade step bonus | +50 / step | 每個 cascade sub-step 額外加分 |
| Remaining moves bonus | 1000 / 剩餘手數 | 關卡完成時一次性加分 |

### 6.2 Chain Multiplier

```
multiplier(chain) = min(1.0 + (chain - 1) × 0.5, 4.0)
```

| Chain | Multiplier |
|---|---|
| 1 | ×1.0 |
| 2 | ×1.5 |
| 3 | ×2.0 |
| 4 | ×2.5 |
| 5 | ×3.0 |
| 6 | ×3.5 |
| ≥7 | ×4.0（cap） |

計算：`該次消除得分 = base × multiplier(當前 chain) + cascade step bonus`。

### 6.3 Special Gem 啟動分數

| 啟動事件 | 分數 |
|---|---|
| Line Bomb 啟動（清除 N 格） | `60 × N` × multiplier |
| Area Bomb 啟動（清除 N 格） | `60 × N` × multiplier |
| Colour Gem 啟動（清除 N 格） | `60 × N + 500` × multiplier |

### 6.4 Combo 分數（兩顆 Special 互擊）

| Combo | 基礎分 | 備註 |
|---|---|---|
| Line × Line | 3,000 | 十字清除 |
| Line × Area | 4,000 | 3 格寬十字 |
| Area × Area | 5,000 | 5×5 清除 |
| Colour × Line | 6,000 | 全色→Line Bomb 連鎖 |
| Colour × Area | 7,000 | 全色→Area Bomb 連鎖 |
| Colour × Colour | 10,000 | 全棋盤清除（王牌） |

Combo 觸發時 chain 計為當前 chain + 1 起跳，後續 cascade 正常累加。

### 6.5 Move-Counting Table

| 事件 | `moves--` | 理由 |
|---|---|---|
| Invalid swap（無消除結果） | 否 | 未提交；輸入被拒 |
| Valid swap | **是**（於 commit，非 resolving 開始時） | 意圖落盤 |
| Swap into pre-placed Special | **是** | swap 即是那一手；啟動是後果 |
| 直接 tap-activate Special（若 UI 開放） | **是** | 直接意圖 |
| Cascade-triggered Special（被鄰近消除引爆） | 否 | 已計過的那一手的後果 |
| Hint 使用 | 否 | 提示非行動 |
| Reshuffle 自動（無解） | 否 | 系統救援 |
| Reshuffle 手動（v1 不開放玩家主動觸發） | N/A | v1 無此按鈕 |

### 6.6 Cascade ↔ End-Condition Timing Intent

執行細節見 `06_game_flow.md#end-of-level-timing`；本表為設計意圖。

| 觸發情境 | 行為 |
|---|---|
| `outOfMoves` 且 resolving 未進行 | 立即結算；若未達目標 → levelFail |
| `outOfMoves` 且 resolving 進行中 | **等 cascade 完成**再結算；若 cascade 讓 objective 達成 → win |
| `outOfTime` 且 resolving 未進行 | 同上 |
| `outOfTime` 且 resolving 進行中 | 顯示計時器凍結於 0；**cascade 允許完成**；再結算 |
| `objectiveMet` 於 resolving 中 | 讓 cascade 完成；播 remaining-moves-bonus 動畫（逐手 120ms）；進 levelComplete |

核心原則：**player 已提交的那一手所產生的 cascade 必完整解算**，時間 / 手數耗盡不得截斷。

### 6.7 Anti-Frustration Stance（設計立場）

| 機制 | 決定 | 理由 |
|---|---|---|
| Pity system（連敗後難度偷降） | **don't** | 違反支柱 P4 Mastery Rewarded；會模糊掉玩家的技術成長訊號 |
| RNG bias（乾旱後偏向生 Special） | **don't** | 同上；玩家發現偏向後信任崩壞 |
| Fail-streak star softening | **don't** | 星星是誠實的回饋管道，不降價 |
| Lucky-board on fresh entry | **don't**（但保留公平基線） | 僅保留「無預存消除 + 至少一組有效 swap」兩項初盤保證（見 02§5.3），這屬公平而非 pity |
| Daily-seed challenge（相同盤面挑戰） | **defer to v1.1**（已於 OQ-28 登記） | 非 pity；相反是公平競爭場 |

立場總結：Gem 不靠偷偷放水維持留存；靠**關卡設計節奏**（rest/climb/summit）與**無障礙 / 尊重時間**（P5）來減少挫敗，而非靠隱形補償。

### 6.8 Scoring 範例（校驗用）

**範例 A**：單純 3-match，chain 1：
- `60 × 1.0 = 60`

**範例 B**：4-match swap 後觸發 3-match cascade：
- Chain 1：`120 × 1.0 = 120`
- Chain 2：`60 × 1.5 + 50 (cascade bonus) = 140`
- 總計 260

**範例 C**：Colour × Colour 王牌：
- Combo 基礎：`10,000 × 2.0 (chain ≥2 起跳) = 20,000`
- 後續清空觸發 cascade 若無新 match，止於此

（校驗用範例，實際數字由 `scoring.ts` 單元測試覆蓋。）

---

## 7. Competitive Positioning

| 對手 | 我們的相同點 | 我們的差異 |
|---|---|---|
| **Bejeweled (classic)** | 經典三消節奏 | 現代 web 技術、更強連鎖視聽反饋、章節敘事 |
| **Candy Crush Saga** | 章節 + 目標 + ★ 系統 | **無體力、無付費、無社群壓力**；更尊重時間 |
| **Puzzle & Dragons** | 連鎖機制 | 無轉珠、無 RPG 層；純粹的匹配體驗 |
| **Match-3 on mobile (generic)** | 同類玩法 | 無廣告、桌面優先、在瀏覽器中即玩即走 |

### Unique Selling Points

1. **零摩擦** — 開啟網頁即玩，無登入、無等待、無廣告
2. **大連鎖專屬視聽** — 連鎖達到某個閾值後，反饋明顯升級（非線性），讓「會連鎖」的玩家得到真正的榮耀
3. **尊重成人玩家** — 無兒童感配色、無幼稚音效；色調走「真實寶石」路線
4. **可及性優先** — 色盲模式、減少動態、鍵盤導航皆為 v1 必備

---

## 8. Success Metrics

### 8.1 玩家體驗指標 (Experience KPIs)

| 指標 | 目標 (v1 playtest) | 驗證方式 |
|---|---|---|
| 新玩家 L1–L5 完成率 (無介入) | ≥ 90% | 觀察式遊玩測試 |
| 前 10 分鐘留存率 | ≥ 70% | 遙測 |
| 30 天回流率 (有留下 bookmark 者) | ≥ 25%（proposed；v1 發行後校準） | 遙測 |
| 連鎖 ≥4 達成率 (全 session 玩家中) | ≥ 80% | 遙測 |
| 玩家自評「好玩」 (1–5 分) | ≥ 4.0 | Playtest 問卷 |
| Abandon rate 單關 | ≤ 20% (標準關), ≤ 35% (gate 關) | 遙測 |

### 8.2 技術 KPIs

| 指標 | 目標 | 驗證 |
|---|---|---|
| 桌機持續 FPS (worst-case) | ≥ 55 | 效能測試 harness |
| 30 min 記憶體漂移 | ≤ 10 MB | Chrome DevTools |
| 初始 bundle (gzipped) | ≤ 5 MB | CI size check |
| TTI (cold, 寬頻) | ≤ 3 秒 | Lighthouse |
| 瀏覽器相容率 (Chrome/FF/Safari/Edge latest) | 100% happy path | Playwright E2E |

### 8.3 設計 KPIs

| 指標 | 目標 |
|---|---|
| 核心機制單元測試覆蓋 | 100% (規則引擎) |
| Headless simulator 驗證 win rate 符合設計意圖的關卡比例 | ≥ 90% |
| A11y：色盲 / 減少動態 / 鍵盤操作 | 全通過 |

---

## 9. Scope Summary

- **全長**：80–120 關跨 4 個世界 + Endless 模式
- **特殊機制數量**：4 種特殊寶石 × 10 種組合
- **美術資產量**：7 色基礎寶石 + 4 種特殊寶石 + 4 個世界背景 + UI 套件
- **音訊資產量**：≤ 8 MB（音樂 4 首 × 世界 + SFX 約 60 事件）
- **目標開發週期**：9 個月（1 位全職）/ 5 個月（3 人團隊）— proposed，依實際人力彈性
- **首發語言**：繁中 + 英文；計畫：簡中 / 日文 / 韓文

---

## 10. Known Risks & Open Questions

| 項目 | 類型 | 備註 |
|---|---|---|
| 難度曲線是否合理 | Design | 依 headless simulator 與 playtest 校準；v0.9 為 placeholder |
| 瀏覽器音訊 autoplay 政策變動 | Tech | 音訊 agent 已設計 unlock 流程 |
| 手機觸控精度 | UX | v1 不保證；v1.1 再做觸控模式 |
| 主題是否有吸引力 | Narrative | 尚待 S04 鎖定 |
| 是否要做雲端存檔 | Scope | v1 明確不做 |
| Endless 模式的止損機制 | Design | 已於 `02§10.2` canonical：無解+重洗 3 次 ∕ 主動結束 ∕ 120 秒無輸入。closed |

---

## Changelog

- **2026-04-21** · v0.9 · 初稿（owner: match3-game-designer）
