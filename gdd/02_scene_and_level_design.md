# 02 · 場景與關卡設計 (Scene & Level Design)

> **Status**: v1.0 (synced 2026-05-08) · **Owner**: match3-level-designer
> **Last updated**: 2026-05-08 · **Phase**: 2 — Systems

---

## 1. 總體結構 (Macro Structure)

### 1.1 世界與關卡總數

| 世界 | 名稱 | 關卡數 | 機制焦點 |
|---|---|---|---|
| W1 | 失落的山嶺花園 | 20 | 核心機制教學 |
| W2 | 水晶之根 | 20 | jelly / lock / 計時模式 |
| W3 | 月下神殿 | 20 | generator blocker / Opal 寶石 / multi-objective |
| W4 | 星塵之塔 | 20–40 | stacked blockers / combo-required / boss |
| — | Endless Mode | ∞ | W4 完成後解鎖 |

v1 最低出貨：**80 關**（每世界 20 關）；stretch：**120 關**（W4 達 40 關）。

### 1.2 每世界節奏

每 5 關為一個小節；每世界 20 關 = 4 小節：

```
第 1 節 (rest)      : 教學 + 輕鬆             (關 1–5)
第 2 節 (climb)     : 引入新組合              (關 6–10)
第 3 節 (climb)     : 複合挑戰                (關 11–15)
第 4 節 (summit)    : 含 1 個 gate + 1 個 boss (關 16–20)
```

**Gate 關**：需要累積指定 ★ 數才能進入（例：W1 最後一個 gate 需 30 ★）
**Boss 關**：每世界最後一關；有獨特視覺與結構

### 1.3 教學節奏 (Teaching Cadence)

| 關卡範圍 | 引入機制 |
|---|---|
| L1 | swap + 3-match + cascade |
| L2 | 4-match (line bomb spawn only) |
| L3 | time-limited objective 首見 (短版) |
| L4 | 5-match 直線 (colour gem spawn) |
| L5 | T-match / L-match (area bomb spawn) |
| L6 | line bomb 啟動（第一次手動觸發） |
| L7 | area bomb 啟動 |
| L8 | colour gem 啟動 |
| L9 | 第一次特殊寶石組合：bomb + line |
| L10 | 第一個 multi-objective (score + moves remaining bonus) |
| L11–15 | 組合其他 special 配對 |
| L16 | Gate |
| L17–19 | 變化應用 |
| L20 | **Boss** — 大型棋盤 + 特殊機制 |
| L21–25 (W2) | jelly 引入 |
| L26 | lock 引入 |
| L27 | 計時模式首見 |
| L28 | jelly + lock 組合 |
| ... | （每 5 關加 1 機制） |

**紀律**：每關新引入 ≤1 個機制；組合出現在新機制後 2 關；stress-test 出現在新機制後 4–5 關。

---

## 2. 關卡類型 (Level Types)

### 2.1 標準關卡 (Standard)

- 佔比 ~75%
- 手數或時間限制
- 單一主要目標
- 難度介於 rest 與 climb

### 2.2 Gate 關卡

- 佔比 ~5%（每世界 1 個）
- 進入需要累積 ★ 數
- 難度：中偏高（win rate 30–50%）
- 作為「停下來複習」的檢核點

### 2.3 Boss 關卡

- 佔比 ~5%（每世界 1 個，W4 額外 1 個 mid-boss）
- 獨特棋盤形狀 / 特殊規則 / 大型目標
- 難度：高（win rate 20–35%）
- 視覺與音樂有獨立強化

#### 2.3.1 Boss 特殊規則 Schema（canonical）

Boss 關卡的 `specialRules` 欄位（見 §9 LevelJson）使用以下已定義的規則 ID：

| Rule ID | 意義 | 參數 |
|---|---|---|
| `immovableCore(x, y, w, h)` | 指定矩形區域的寶石不可消 | 區域左上 (x,y)、尺寸 w×h |
| `coreColourShift(everyNMoves)` | 上述區域每 N 手變色 | N (int) |
| `splitBoard` | 盤面切分為兩個互不相通的半場 | — |
| `timedObjective(seconds)` | 時間模式下的 boss | seconds |
| `gemPoolBias(colour, weight)` | 傾斜特定色生成機率 | colour, weight (float) |
| `spawnPattern(pattern)` | 新寶石從指定來源生成 | pattern ID |

其他 boss 若需要非標準行為，先向 game-designer 申請新 rule ID；v1 不接受未登記的自由文字規則。

### 2.4 Speed 關卡 (計時)

- 佔比 ~10%
- 用時間而非手數
- W2 後登場

### 2.5 Puzzle 關卡 (固定解)

- 佔比 ~5%
- 手數極少（3–6 手），有固定最佳解
- 作為技術展示 / 慢活思考

---

## 3. 目標類型 (Objective Types)

### 3.1 Score Target — 達成分數

- 設定：總分目標；手數限制
- 驗收：達目標即完成；剩餘手數轉分數（末段爆分）
- 星門：★ = 目標分、★★ = 目標 ×1.6、★★★ = 目標 ×2.5（placeholder）

### 3.2 Clear Target — 清除指定元件

- 設定：清除 N 個 jelly / lock / block；手數限制
- 驗收：全部清除即完成
- 星門：以剩餘手數決定 ★ 數

### 3.3 Collect Target — 收集指定顏色寶石

- 設定：蒐集 X 顆某色寶石；手數限制
- 驗收：累計達標
- 星門：以剩餘手數決定

### 3.4 Drop Target — 將指定寶石落到底部

- 設定：從頂端落下 N 顆特殊目標寶石，送到棋盤底端；手數限制
- 驗收：全部落到底端標記格
- 星門：以剩餘手數決定

### 3.5 Multi-Objective — 複合目標

- 設定：上述 2+ 個同時
- W2 以後才出現

---

## 4. Blocker 元件清單

### 4.1 Jelly (遺忘之霧)

- **視覺**：灰色半透明霧罩
- **行為**：覆蓋於格子上；該格寶石參與消除時，jelly 清掉一層
- **堆疊**：最多 3 層 (v1 範圍)
- **引入**：W2 L1 (全棋盤 L21)

### 4.2 Lock (固化記憶)

- **視覺**：寶石外圍鎖鍊
- **行為**：寶石被鎖住不可移動、不可消除；需被特殊寶石或鄰近消除打破鎖
- **引入**：W2 L6 (全棋盤 L26)

### 4.3 Generator (霧源)

- **視覺**：暗色裂縫，會噴發
- **行為**：每 N 手產生 1 個 jelly 或 lock 於鄰近空格
- **引入**：W3 (L41+)

### 4.4 Unstable (不穩定寶石)

- **視覺**：顫動、偶爾閃爍；剩 ≤2 手時紅色脈動警示
- **行為**：Spawn 時帶有 **6 手倒數計時**（每手玩家動作 −1，不受 cascade 影響）；倒數為 0 時爆炸
- **爆炸效果**：
  - 自身與 3×3 範圍內清除（不計分）
  - 玩家本關得分 **−300** 罰分（不低於 0）
  - 若該關卡 star 公式基於剩餘手數，**不影響星門**；若基於分數，罰分直接反映於星門
- **可被消除**：可被正常 match 消除、可被 Special / Combo 清除；一旦被消除，計時重置不再爆炸
- **引入**：W3 後段（L55+） / W4（stacked 出現）

### 4.5 Delivery Cell (送達格)

- **視覺**：棋盤底端特定格有發光標記
- **行為**：drop 目標寶石落到此格即達成
- **引入**：W1 L16 gate

### 4.6 Blocker × Special 交互矩陣 (canonical)

下表規範每種 Special / Combo 對各 Blocker 的行為。實作時單元測試逐格驗證。

| Special / Combo ↓ \ Blocker → | Jelly (多層) | Lock | Generator | Unstable | Delivery Cell |
|---|---|---|---|---|---|
| **Line Bomb** (單向) | 經過的每格 −1 層 | **破鎖**（同時清空該格寶石） | **摧毀**（路徑經過時） | 清除並取消爆炸計時 | 穿過，不影響 |
| **Area Bomb** (3×3) | 範圍內每格 −1 層 | 範圍內 **破鎖** | 範圍內 **摧毀** | 清除並取消爆炸 | 穿過，不影響 |
| **Colour Gem** (目標色) | 每個該色 cell −1 層 | **無法鎖定 locked cell 的顏色**（Colour Gem 不針對 locked） | 不適用（Generator 非彩色寶石） | 若顏色匹配則清除；若非匹配則不動 | 穿過，不影響 |
| **Bomb × Bomb** (5×5) | 每格 −1 層 | 範圍內破鎖 | 範圍內摧毀 | 清除 | 穿過 |
| **Line × Line** (十字) | 每格 −1 層 | 十字路徑破鎖 | 十字路徑摧毀 | 清除 | 穿過 |
| **Bomb × Line** (3 格寬十字) | 每格 −1 層 | 範圍內破鎖 | 範圍內摧毀 | 清除 | 穿過 |
| **Colour × Line** (全色→Line Bomb) | 後續 Line Bomb 各自依上述規則 −1 層 | 各 Line Bomb 破鎖 | 各 Line Bomb 摧毀 | 若顏色匹配先轉換再啟動；否則依 Line Bomb 規則清除 | 穿過 |
| **Colour × Area** (全色→Area Bomb) | 同上，以 Area Bomb 為單位 | 各 Area Bomb 破鎖 | 各 Area Bomb 摧毀 | 同 Colour × Line | 穿過 |
| **Colour × Colour** (全棋盤清除) | 所有 jelly −1 層（單次事件） | 全盤 locks 破鎖 | 全盤 generators 摧毀 | 全盤 unstable 清除 | 不影響 |

#### Jelly 多層行為細則

- **一個 clear event 對一格的 jelly 只扣 1 層**，即使多個 overlap（如 Line × Line 的交會點被算 2 次 clear）也只扣 1。
- Generator 在同一 tick 內產生的新 jelly 不會立即參與當前 cascade。

#### Lock 細則

- Lock 的「寶石無法移動、無法參與 match」為核心限制。
- 被 Line Bomb / Area Bomb / Combo 的爆炸路徑覆蓋時，視為 **直接命中** → 同時清除 lock 結構 + 內部寶石。
- 普通 match 的 **passive activation**（鄰近消除造成 Special 啟動）**不破鎖**；必須是 Special 本身的清除路徑經過該 locked cell。

#### Generator 細則

- 每 N 手（依關卡設定，預設 3 手）在「自身 4-鄰」空格中擇一生成 blocker（類型由關卡 spec 指定）。
- 若 4-鄰無空格，該次 generate 略過，不累計。
- Generator 本身被清除後 respawn 不發生；新 generator 只由 level 設計預置。

#### Unstable 細則

- 倒數只受「玩家手數」計數，不受 cascade 或 passive 清除影響。
- 若 Unstable 被 Special 清除而爆炸倒數尚未歸零，視為正常清除，無罰分。

---

## 5. 盤面規格 (Board Specification)

### 5.1 標準盤面

- **預設**：8×8
- **最小**：6×6（前幾關簡化教學用）
- **最大**：9×9（Boss / 特殊關）

### 5.2 盤面變形

- **空格 (empty cell)** — 某些格永久無寶石（製造走廊）
- **不規則邊界** — 盤面可以非矩形（十字、圓形、對稱圖案）
- **分割盤面** — W4 某些 boss 關：兩個小盤面並列，寶石不互通

### 5.3 寶石生成規則

- 顏色池：前 3 關 3 色 → L4 起 4 色 → L10 起 5 色 → L30 起 6 色 → L41 起加 Opal (橙) = 7 色
- Spawn 權重：預設均等；某些關卡可指定 bias（例：某顏色低權重以增加目標難度）
- **初始盤面保證**：
  1. 無預存的 match（無任何 3+連）
  2. 至少有 1 組有效 swap（保證可下手）

---

## 6. 星門設計 (Star Thresholds)

### 6.1 公式（proposed · canonical）

設 `B` = 基礎目標（依 level spec 的 `stars.basis` 決定）：

| Basis | B 定義 | ★ | ★★ | ★★★ |
|---|---|---|---|---|
| `score` | 該關卡分數目標 | `B × 1.0` | `B × 1.6` | `B × 2.5` |
| `movesRemaining` | 預期剩餘手數（通常 = 手數預算 × 0.5） | 0 | `B × 0.25` | `B × 0.5` |
| `timeRemaining` | 預期剩餘時間秒數 | 0 | `B × 0.25` | `B × 0.5` |

**收斂方式**：比率 `×1.0 / ×1.6 / ×2.5` 本身以 headless-sim 在 L1–L5 校準後凍結；per-level 絕對值於 sim 跑 1000 seeds 後寫回關卡 JSON（見 §7）。

### 6.2 3-star 可達性

**紀律**：

- 3-star 不得依賴「剛好遇到對的棋盤」，應仰賴玩家**找出大連鎖 / 特殊組合**的能力
- 3-star 的期望達成率（好玩家）：focus 關卡 25–35%，教學關卡 50–70%，boss 關卡 15–25%
- 任何 3-star 達成率 <10% 的關卡需重新設計

---

## 7. 關卡規格 — 前 20 關（World 1）

> 本節為手工規格的完整範例。全部 80+ 關的詳細規格在 `docs/gdd/levels/`（未來分檔）。此處示範最前 10 關與 boss。

### L1 — 初次相遇

```markdown
## Intent
**Player fantasy**: 第一次感受到「交換 → 消除 → 下落 → 得分」的快感
**Teaching goal**: swap, 3-match, cascade
**Pacing role**: rest

## Constraints
**Move budget**: 15
**Board**: 6×6
**Gem colours**: R / G / B (3 色)

## Objective
**Primary**: Score 2000
**Star thresholds**: 2000 / 3200 / 5000 (proposed; derived from §6.1 formula, see §7.5)

## Starting Board (pre-seeded with obvious 4-match chance)
```
. R G B R G
B R R G B R
G B G R G B
R G B G R G
B R G B G R
G B R G B R
```

## Expected solution
- 底部第 5 行有明顯的垂直 4 連機會（G）
- 玩家即使隨便亂試也會意外觸發連鎖

## Tuning notes
- v0.9 placeholder 分數；實際值依模擬器校準
- 若 90% 玩家第 1 次嘗試即通過 → 合格
```

### L2 — 第一次光柱

```markdown
## Intent
**Teaching goal**: 4-match 自動生成 Line Bomb
**Pacing role**: rest

## Constraints
**Move budget**: 18
**Board**: 6×6
**Gem colours**: R / G / B / Y (4 色)

## Objective
**Primary**: Score 3500
**Star thresholds**: 3500 / 5600 / 8750 (proposed; derived from §6.1 formula, see §7.5)

## Starting Board
- 預置一個明顯的 4 連機會於頂部
- 不額外介紹 line bomb 如何啟動（啟動在 L6）

## Success criterion
- 90% 玩家完成；50% 玩家看到 Line Bomb 被生成
```

### L3 — 一點點時間感

```markdown
## Intent
**Teaching goal**: 計時目標首見（但寬鬆）
**Pacing role**: rest

## Constraints
**Time budget**: 120 seconds
**Board**: 6×6
**Gem colours**: R / G / B / Y (4 色)

## Objective
**Primary**: Score 3000
**Star thresholds**: 3000 / 4800 / 7500 (proposed; derived from §6.1 formula, see §7.5)

## Notes
- 時間目標長到幾乎沒壓力；僅讓玩家知道「計時也是一種模式」
```

### L4 — 彩虹的前兆

```markdown
## Intent
**Teaching goal**: 5-match 直線 → Colour Gem
**Pacing role**: climb

## Constraints
**Move budget**: 20
**Board**: 7×7
**Gem colours**: R / G / B / Y

## Objective
**Primary**: Score 5000; bonus objective: "創造 1 顆 Colour Gem"
**Star thresholds**: 5000 / 8000 / 12500 (proposed; derived from §6.1 formula, see §7.5)

## Starting Board
- 預置一個明顯的 5 連一色機會

## Notes
- 看到 Colour Gem 生成即為通關；未必要啟動它
```

### L5 — T 字的震撼

```markdown
## Intent
**Teaching goal**: T / L-match → Area Bomb
**Pacing role**: climb

## Constraints
**Move budget**: 22
**Board**: 7×7
**Gem colours**: R / G / B / Y

## Objective
**Primary**: Score 6000; bonus: "創造 1 顆 Area Bomb"
**Star thresholds**: 6000 / 10000 / 16000

## Notes
- 預置一個 T 形 4+4 疊的機會
```

### L6 — Line Bomb 啟動

```markdown
## Intent
**Player fantasy**: 親手引爆 Line Bomb，第一次感受「一整列消失」的爽感
**Teaching goal**: 主動啟動 Line Bomb（透過 swap 將其與相鄰寶石交換）
**Pacing role**: climb

## Constraints
**Move budget**: 20
**Board**: 7×7
**Gem colours**: R / G / B / Y

## Objective
**Primary**: Collect 15 Red gems（收集目標）
**Star thresholds**: 15 顆完成 / 剩 6 手 / 剩 10 手 (以剩餘手數計星)

## Starting Board
- 預置一組明顯的 4 連紅色機會於中上段（玩家首次 swap 即生成 Line Bomb）
- 紅寶石佈滿盤面（weight bias 紅 +50%）
- 無 jelly / lock / 其他 blocker（W1 原則）

## Expected solution
- 玩家第一手生成 Line Bomb
- 第二到第三手將 Line Bomb 交換到紅寶石密集列 → 一次清除 5–7 顆紅
- 配合 cascade 可望 15 顆目標於 10 手內達成

## Success criterion
- ≥80% 玩家於第一次嘗試通關
- ≥60% 玩家生成並主動啟動 Line Bomb（透過遙測 `special.activated` 事件驗證）
```

**設計備註**：此版本移除先前 v0.9 草案的 jelly 目標（與 W1 「無 blocker」原則衝突），改以 Collect 目標達成同樣教學效果。Finding F-01 / PH-06 於 2026-04-22 關閉。

### L7 — Area Bomb 啟動

```markdown
Collect 10 同色寶石；Area Bomb 是最高效手段
Board 8×8
Moves 22
```

### L8 — Colour Gem 啟動

```markdown
Collect 15 同色寶石；Colour Gem 一次能解
Board 8×8
Moves 20
```

### L9 — 第一次組合 (Bomb + Line)

```markdown
Score 12000
Board 8×8
Moves 25
Pre-seeded 機會讓玩家創造並組合這兩種 special
```

### L10 — 第一次 Multi-Objective

```markdown
Score 10000 + Collect 20 紅寶石
Board 8×8
Moves 25
```

### ... (L11–L15 略，每關一個微變化)

### L16 — Gate: 星門守護

- 需累積 ≥30 ★ 才可進入
- 結構：7×7，但盤面中央有 5 個空格組成十字
- 目標：Score 18000 + Drop 3 顆特殊寶石到底部 delivery cell
- Moves 25
- 本關介紹 Drop 目標與 Delivery Cell

### L17–L19 — 變化與複習

- 各引入一種微型變化：盤面形狀、顏色偏差、特殊 starting position

### L20 — Boss: 花園的守護者

```markdown
## Intent
**Pacing role**: summit / boss
**Player fantasy**: 綜合前 19 關學到的一切

## Constraints
**Move budget**: 30
**Board**: 9×9 (central 3×3 是「守護者」圖案，該區不可消除但每 5 手變色)
**Gem colours**: R / G / B / Y / P (5 色)

## Objective
**Primary**: 達成 Score 30000 AND 消除 「守護者」 區外所有 jelly (預置 15 個)
**Star thresholds**: 30000 / 45000 / 65000

## Special rules
- 中央守護者每 5 手變顏色（W1 保留的神秘元素）
- 完成後觸發 World 完成動畫

## Tuning notes
- 目標 win rate (第 1 次嘗試): 25–35%
- 目標 3-star 率 (最終): 15–25%
```

### L21+（W2 起）大綱規格

> 為控制本章篇幅，W2–W4 各關採用「表格 + 簡短規格」而非完整手工文件。完整的分檔關卡規格於 `docs/gdd/levels/world-N/LXX.md`。

#### W2（L21–L40）— 水晶之根

| Level | 新引入 | 目標類型 | Board | Moves / Time | Pacing |
|---|---|---|---|---|---|
| L21 | Jelly (1 層) | Clear 6 jelly | 8×8 | 20 moves | rest |
| L22 | — | Clear 8 jelly | 8×8 | 20 moves | rest |
| L23 | — | Score + Clear | 8×8 | 22 moves | climb |
| L24 | — | Collect | 8×8 | 20 moves | rest |
| L25 | Gate | ★ ≥ 8 累積 / Score | 8×8 | 25 moves | summit-mini |
| L26 | Lock | Clear 4 locks | 8×8 | 22 moves | climb |
| L27 | 首見正式計時 | Score 15000 | 8×8 | 90 sec | climb |
| L28 | Jelly + Lock 同框 | Clear both | 8×8 | 22 moves | climb |
| L29 | — | Multi (score + collect) | 8×8 | 24 moves | climb |
| L30 | Gate (W2 中段) | Multi | 8×8 | 28 moves | summit-mini |
| L31–L34 | 組合應用 | 各式 | 8×8 | — | rest / climb |
| L35 | 2 層 jelly | Clear 12 jelly (≤3 格為 2 層) | 8×8 | 25 moves | climb |
| L36–L38 | 變化應用 | — | 8×8 | — | climb |
| L39 | Gate (W2 尾段) | Multi | 8×8 | 30 moves | summit |
| L40 | **Boss W2** — 霧之源泉 | Multi: Score 40k + Clear 20 jelly (含 3 層) | 9×9 | 35 moves | boss |

#### W3（L41–L60）— 月下神殿

| Level | 新引入 | 目標類型 | Board | Moves / Time | Pacing |
|---|---|---|---|---|---|
| L41 | **Opal (橙色)** 加入色池（第 7 色） | Collect | 8×8 | 22 moves | rest |
| L42 | — | Score | 8×8 | 22 moves | rest |
| L43 | Multi-objective 正式化 | Score + Collect × 2 色 | 8×8 | 25 moves | climb |
| L44 | — | Drop (2 顆到 delivery) | 8×8 | 22 moves | climb |
| L45 | Gate | Multi | 8×8 | 26 moves | summit-mini |
| L46 | **Generator** (產生 jelly, every 3 手) | Clear jelly + 毀 generator | 8×8 | 24 moves | climb |
| L47 | — | Score 下壓 generator 速率 | 8×8 | 100 sec | climb |
| L48 | Generator × Lock 組合 | Clear both | 8×8 | 26 moves | climb |
| L49 | — | Multi | 8×8 | 28 moves | climb |
| L50 | Gate (W3 中段) | Multi | 8×8 | 30 moves | summit-mini |
| L51–L54 | 組合應用 | — | 8×8 / 9×9 | — | rest / climb |
| L55 | **Unstable** 引入 | Collect + 避 unstable 爆 | 8×8 | 24 moves | climb |
| L56–L58 | Unstable 複合 | 各式 | 8×8 | — | climb |
| L59 | Gate | Multi | 8×8 | 32 moves | summit |
| L60 | **Boss W3** — 月蝕之環 | Multi: Score 55k + Drop 5 顆 + 清全部 jelly (含 Generator) | 9×9 | 38 moves | boss |

#### W4（L61–L80）— 星塵之塔

| Level | 新引入 | 目標類型 | Board | Moves / Time | Pacing |
|---|---|---|---|---|---|
| L61 | Stacked blockers (lock + jelly 共存於同 cell) | Clear both 層 | 8×8 | 24 moves | rest |
| L62 | — | Multi | 8×8 | 26 moves | climb |
| L63 | Combo-required（無 Special × Special 達不到目標分） | Score (hard) | 8×8 | 22 moves | climb |
| L64 | — | Multi | 8×8 | 26 moves | climb |
| L65 | Gate | Multi | 9×9 | 30 moves | summit-mini |
| L66 | 分割盤面 | Multi (兩盤並行) | 6×6 + 6×6 | 28 moves | climb |
| L67 | — | Score | 9×9 | 28 moves | climb |
| L68 | Generator + Unstable 同場 | Multi | 9×9 | 30 moves | climb |
| L69 | — | Multi | 9×9 | 32 moves | climb |
| L70 | **Mid-Boss W4** — 雙塔 | Multi (分割盤面，雙重目標) | 7×7 + 7×7 | 35 moves | boss |
| L71–L74 | 終局機制複合 | — | 9×9 | — | climb |
| L75 | Gate | Multi | 9×9 | 32 moves | summit-mini |
| L76–L78 | Stress test | — | 9×9 | — | climb |
| L79 | 最終 Gate | Multi (★ ≥ 150 累積 + 完成 L78) | 9×9 | 34 moves | summit |
| L80 | **Final Boss — 沉睡女神** | Multi: Score 90k + 清全盤所有 blocker + Drop 10 顆記憶碎片 | 9×9（中央 3×3 為「女神」不可消，每 5 手變色） | 40 moves | boss |

W1-W4 共 80 關為 v1 最低出貨；stretch L81–L100 可留待 v1.1 作 post-launch 補充。

---

### 7.5 Per-Level Parameter Table (canonical · all 80 levels)

> 星門數值由 §6.1 公式導出：`score` basis `B` = 分數目標；`movesRem` / `timeRem` basis `B` = 手數 / 秒數預算。標註 `proposed`，以 headless-sim 1000 seeds × greedy AI 校準後轉 `frozen`。
>
> Pacing 代碼：`r` = rest · `c` = climb · `s` = summit / gate · `B` = boss

#### World 1 — 失落的山嶺花園

| # | Name (zh) | Pacing | Objective | Budget | Basis | ★ | ★★ | ★★★ | Board |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 初次相遇 | r | Score 2000 | 15 moves | score | 2,000 | 3,200 | 5,000 | 6×6 |
| 2 | 第一次光柱 | r | Score 3500 | 18 moves | score | 3,500 | 5,600 | 8,750 | 6×6 |
| 3 | 一點點時間感 | r | Score 3000 | 120 s | score | 3,000 | 4,800 | 7,500 | 6×6 |
| 4 | 彩虹的前兆 | c | Score 5000 + spawn 1 Colour | 20 moves | score | 5,000 | 8,000 | 12,500 | 7×7 |
| 5 | T 字的震撼 | c | Score 6000 + spawn 1 Area | 22 moves | score | 6,000 | 9,600 | 15,000 | 7×7 |
| 6 | 光柱初試 | c | Collect 15 Red | 20 moves | movesRem | 0 | 5 | 10 | 7×7 |
| 7 | 爆裂試煉 | c | Collect 10 Green | 22 moves | movesRem | 0 | 5 | 11 | 8×8 |
| 8 | 彩虹試煉 | c | Collect 15 Blue | 20 moves | movesRem | 0 | 5 | 10 | 8×8 |
| 9 | 初次組合 | c | Score 12000 | 25 moves | score | 12,000 | 19,200 | 30,000 | 8×8 |
| 10 | 雙重目標 | c | Multi (Score 10k + Collect 20 Red) | 25 moves | score | 10,000 | 16,000 | 25,000 | 8×8 |
| 11 | 色彩交會 | r | Score 9000 | 22 moves | score | 9,000 | 14,400 | 22,500 | 8×8 |
| 12 | 短手挑戰 | c | Score 11000 | 20 moves | score | 11,000 | 17,600 | 27,500 | 8×8 |
| 13 | 特殊接力 | c | Collect 20 Yellow | 24 moves | movesRem | 0 | 6 | 12 | 8×8 |
| 14 | 時間壓力 | c | Score 8000 | 100 s | timeRem | 0 | 25 | 50 | 8×8 |
| 15 | 組合複習 | c | Multi (Score 15k + 2 Combos) | 28 moves | score | 15,000 | 24,000 | 37,500 | 8×8 |
| 16 | Gate: 星門守護 | s | Multi (Score 18k + Drop 3) | 25 moves | score | 18,000 | 28,800 | 45,000 | 7×7 + cross empty |
| 17 | 盤面變化 | c | Score 14000 | 25 moves | score | 14,000 | 22,400 | 35,000 | 8×8 |
| 18 | 顏色偏差 | c | Collect 25 Red | 26 moves | movesRem | 0 | 6 | 13 | 8×8 |
| 19 | 最後測試 | c | Multi (Score 20k + Collect 15 Purple) | 28 moves | score | 20,000 | 32,000 | 50,000 | 8×8 |
| 20 | Boss: 花園守護者 | B | Multi (Score 30k + Clear zone 15) | 30 moves | score | 30,000 | 48,000 | 75,000 | 9×9 core immovable |

#### World 2 — 水晶之根

| # | Name (zh) | Pacing | Objective | Budget | Basis | ★ | ★★ | ★★★ | Board |
|---|---|---|---|---|---|---|---|---|---|
| 21 | 初見迷霧 | r | Clear 6 jelly | 20 moves | movesRem | 0 | 5 | 10 | 8×8 |
| 22 | 深入霧林 | r | Clear 8 jelly | 20 moves | movesRem | 0 | 5 | 10 | 8×8 |
| 23 | 雙重目標 | c | Multi (Score 12k + Clear 10 jelly) | 22 moves | score | 12,000 | 19,200 | 30,000 | 8×8 |
| 24 | 水晶之憶 | r | Collect 15 Blue | 20 moves | movesRem | 0 | 5 | 10 | 8×8 |
| 25 | Gate: 霧之門檻 | s | Multi (★ ≥ 8) | 25 moves | score | 18,000 | 28,800 | 45,000 | 8×8 |
| 26 | 初逢封鎖 | c | Clear 4 locks | 22 moves | movesRem | 0 | 5 | 11 | 8×8 |
| 27 | 時計首戰 | c | Score 15000 | 90 s | timeRem | 0 | 22 | 45 | 8×8 |
| 28 | 霧鎖同行 | c | Clear 6 jelly + 3 locks | 22 moves | movesRem | 0 | 5 | 11 | 8×8 |
| 29 | 紅霧雙殺 | c | Multi (Score 14k + Collect 15 Red) | 24 moves | score | 14,000 | 22,400 | 35,000 | 8×8 |
| 30 | Gate: 水晶之核 | s | Multi (Score 22k + Clear 12 jelly) | 28 moves | score | 22,000 | 35,200 | 55,000 | 8×8 |
| 31 | 密度壓力 | c | Score 18000 | 22 moves | score | 18,000 | 28,800 | 45,000 | 8×8 |
| 32 | 鎖鏈追擊 | c | Clear 6 locks | 24 moves | movesRem | 0 | 6 | 12 | 8×8 |
| 33 | 時光霧夢 | c | Clear 10 jelly | 80 s | timeRem | 0 | 20 | 40 | 8×8 |
| 34 | 洞穴迷宮 | c | Multi (Score 16k + Clear 8 jelly) | 26 moves | score | 16,000 | 25,600 | 40,000 | 8×8 |
| 35 | 雙層霧 | c | Clear 12 jelly (3 cells 2-layer) | 25 moves | movesRem | 0 | 6 | 12 | 8×8 |
| 36 | 速擊霧 | c | Score 20000 | 110 s | timeRem | 0 | 27 | 55 | 8×8 |
| 37 | 紫霧之心 | c | Collect 20 Purple | 26 moves | movesRem | 0 | 6 | 13 | 8×8 |
| 38 | 鎖陣之舞 | c | Clear 8 locks | 26 moves | movesRem | 0 | 6 | 13 | 8×8 |
| 39 | Gate: 深淵階梯 | s | Multi | 30 moves | score | 26,000 | 41,600 | 65,000 | 8×8 |
| 40 | Boss: 霧之源泉 | B | Multi (Score 40k + Clear 20 jelly incl. 3-layer) | 35 moves | score | 40,000 | 64,000 | 100,000 | 9×9 |

#### World 3 — 月下神殿

| # | Name (zh) | Pacing | Objective | Budget | Basis | ★ | ★★ | ★★★ | Board |
|---|---|---|---|---|---|---|---|---|---|
| 41 | 橙光初現 | r | Collect 10 Opal | 22 moves | movesRem | 0 | 5 | 11 | 8×8 |
| 42 | 七彩棋盤 | r | Score 18000 | 22 moves | score | 18,000 | 28,800 | 45,000 | 8×8 |
| 43 | 三重目標 | c | Multi (Score 20k + Collect 10 Opal + 10 Blue) | 25 moves | score | 20,000 | 32,000 | 50,000 | 8×8 |
| 44 | 送達之夢 | c | Drop 2 target gems | 22 moves | movesRem | 0 | 5 | 11 | 8×8 |
| 45 | Gate: 月門 | s | Multi | 26 moves | score | 24,000 | 38,400 | 60,000 | 8×8 |
| 46 | 霧源初現 | c | Multi (Clear 10 jelly + Destroy 2 generators) | 24 moves | movesRem | 0 | 6 | 12 | 8×8 |
| 47 | 霧源對抗 | c | Score 22000 | 100 s | timeRem | 0 | 25 | 50 | 8×8 |
| 48 | 源與鎖 | c | Multi (Clear 10 jelly + 4 locks) | 26 moves | movesRem | 0 | 6 | 13 | 8×8 |
| 49 | 中盤壓力 | c | Score 28000 | 28 moves | score | 28,000 | 44,800 | 70,000 | 8×8 |
| 50 | Gate: 半程水月 | s | Multi | 30 moves | score | 32,000 | 51,200 | 80,000 | 8×8 |
| 51 | 橙光風暴 | c | Collect 25 Opal | 26 moves | movesRem | 0 | 6 | 13 | 8×8 |
| 52 | 色偏挑戰 | c | Score 26000 | 120 s | timeRem | 0 | 30 | 60 | 8×8 |
| 53 | 鎖源雙煞 | c | Multi (Clear 8 locks + 3 generators) | 28 moves | movesRem | 0 | 7 | 14 | 9×9 |
| 54 | 雙重送達 | c | Drop 4 target gems | 26 moves | movesRem | 0 | 6 | 13 | 9×9 |
| 55 | 不穩之始 | c | Multi (Collect 20 Red + 避 unstable 爆) | 24 moves | movesRem | 0 | 6 | 12 | 8×8 |
| 56 | 不穩擴散 | c | Score 30000 | 28 moves | score | 30,000 | 48,000 | 75,000 | 8×8 |
| 57 | 三重威脅 | c | Multi (Clear jelly + locks + 避 unstable) | 28 moves | movesRem | 0 | 7 | 14 | 9×9 |
| 58 | 月光破曉 | c | Score 34000 | 110 s | timeRem | 0 | 27 | 55 | 9×9 |
| 59 | Gate: 聖殿之門 | s | Multi | 32 moves | score | 38,000 | 60,800 | 95,000 | 9×9 |
| 60 | Boss: 月蝕之環 | B | Multi (Score 55k + Drop 5 + Clear all jelly/Gen) | 38 moves | score | 55,000 | 88,000 | 137,500 | 9×9 |

#### World 4 — 星塵之塔

| # | Name (zh) | Pacing | Objective | Budget | Basis | ★ | ★★ | ★★★ | Board |
|---|---|---|---|---|---|---|---|---|---|
| 61 | 塔基 | r | Clear 5 stacked cells | 24 moves | movesRem | 0 | 6 | 12 | 8×8 |
| 62 | 雙塔攀登 | c | Multi (Score 30k + Clear) | 26 moves | score | 30,000 | 48,000 | 75,000 | 8×8 |
| 63 | 必 Combo | c | Score 40000 (combo-required) | 22 moves | score | 40,000 | 64,000 | 100,000 | 8×8 |
| 64 | 星光節拍 | c | Multi (Collect 20 White + Score 25k) | 26 moves | score | 25,000 | 40,000 | 62,500 | 8×8 |
| 65 | Gate: 半塔 | s | Multi | 30 moves | score | 45,000 | 72,000 | 112,500 | 9×9 |
| 66 | 分割星辰 | c | Multi (雙盤面各達目標) | 28 moves | score | 30,000 | 48,000 | 75,000 | 6×6 + 6×6 |
| 67 | 開放之廳 | c | Score 50000 | 28 moves | score | 50,000 | 80,000 | 125,000 | 9×9 |
| 68 | 雙重災難 | c | Multi (Clear generators + 避 unstable) | 30 moves | movesRem | 0 | 7 | 15 | 9×9 |
| 69 | 漸進風暴 | c | Score 60000 | 32 moves | score | 60,000 | 96,000 | 150,000 | 9×9 |
| 70 | Mid-Boss: 雙塔 | B | Multi (分割盤面雙重目標) | 35 moves | score | 70,000 | 112,000 | 175,000 | 7×7 + 7×7 |
| 71 | 雙塔之後 | c | Score 60000 | 28 moves | score | 60,000 | 96,000 | 150,000 | 9×9 |
| 72 | 高塔壓力 | c | Collect 30 White | 30 moves | movesRem | 0 | 7 | 15 | 9×9 |
| 73 | 終局之霧 | c | Multi (Clear 15 jelly + Score 50k) | 30 moves | score | 50,000 | 80,000 | 125,000 | 9×9 |
| 74 | 時間決戰 | c | Score 55000 | 140 s | timeRem | 0 | 35 | 70 | 9×9 |
| 75 | Gate: 終關之門 | s | Multi (★ ≥ 120) | 32 moves | score | 70,000 | 112,000 | 175,000 | 9×9 |
| 76 | 壓力山大 | c | Multi (Clear stacked + locks) | 32 moves | movesRem | 0 | 8 | 16 | 9×9 |
| 77 | 最後準備 | c | Score 75000 | 30 moves | score | 75,000 | 120,000 | 187,500 | 9×9 |
| 78 | 光的終章 | c | Multi (Drop 8 + Score 50k) | 32 moves | score | 50,000 | 80,000 | 125,000 | 9×9 |
| 79 | 最終 Gate | s | Multi (★ ≥ 150) | 34 moves | score | 80,000 | 128,000 | 200,000 | 9×9 |
| 80 | Final Boss: 沉睡女神 | B | Multi (Score 90k + Clear all blockers + Drop 10 memory) | 40 moves | score | 90,000 | 144,000 | 225,000 | 9×9 core shifting |

### 7.6 備註 — 關卡 JSON 分檔

本表為「單檔總覽」canonical；完整的每關 JSON（含 pre-seeded 初盤、spawn weight 覆寫、specialRules 列表）依本表值展開於 `docs/gdd/levels/world-N/L{NN}.json`。L1–L20 的 JSON 已隨 §7 narrative specs 可推導；L21–L80 的 JSON 於 v1.0 freeze 前由 level-designer 批次產出（使用本表為契約）。

---

## 8. Headless Simulator 驗證計畫

對本章設計的 80 關，每關以 1000 個種子跑 headless simulator（見 `09_testing.md#headless-simulator`）。

### 驗收門檻

| 關卡類型 | Win rate (dumb AI) |
|---|---|
| 教學關 (L1–L5) | 85–100% |
| 標準 rest | 60–80% |
| 標準 climb | 45–65% |
| Gate | 25–45% |
| Boss | 15–35% |

Win rate 在門檻外 → 回 level-designer 調整 move budget / score target / blocker count 而不是直接改 star threshold。

---

## 9. 關卡規格 JSON 格式

為便於編輯與模擬器消化：

```typescript
interface LevelJson {
  id: number;
  worldId: number;
  name: { 'zh-TW': string; en: string };
  displayName?: string;
  board: {
    width: number;
    height: number;
    empty: Array<[number, number]>;
    deliveryCells?: Array<[number, number]>;
    preSeeded?: Array<{ x: number; y: number; gem: GemType }>;
  };
  gems: {
    colours: GemColour[];        // 啟用的顏色
    weights?: Partial<Record<GemColour, number>>;
  };
  constraints: {
    moveBudget?: number;
    timeBudget?: number;         // seconds
  };
  objective: Objective;
  stars: {
    one: number;
    two: number;
    three: number;
    basis: 'score' | 'movesRemaining' | 'timeRemaining';
  };
  blockers?: BlockerPlacement[];
  specialRules?: string[];       // 自由文字，給後處理器看
  rngSeedForPreview?: number;    // 讓編輯時可視
}
```

### 9.1 型別定義（canonical）

以下型別登記於 `docs/gdd/registries/types.md`，各處引用必須指向此處。

```typescript
// 基礎色代號
export type GemColour =
  | 'R' // Ruby    — 愛
  | 'G' // Emerald — 思
  | 'B' // Sapphire— 靜
  | 'Y' // Topaz   — 希望
  | 'P' // Amethyst— 憂
  | 'W' // Diamond — 力
  | 'O' // Opal    — 怒 (W3+ 才啟用)
  ;

// 特殊寶石類型
export type SpecialGemType = 'lineH' | 'lineV' | 'area' | 'colour';

// 寶石完整型：基礎色 + (可選) 特殊 + (可選) 鎖定狀態
export interface GemType {
  colour: GemColour | null;       // null 僅用於 Colour Gem（無色），其餘皆有色
  special?: SpecialGemType;       // 未指定則為普通寶石
  locked?: boolean;               // Lock blocker 施加
}

// 目標（discriminated union，五種對應 02§3）
export type Objective =
  | { type: 'score';   target: number }
  | { type: 'clear';   target: Array<{ blocker: BlockerKind; count: number }> }
  | { type: 'collect'; target: Array<{ colour: GemColour; count: number }> }
  | { type: 'drop';    target: { count: number } }  // 送達 delivery cell 的總數
  | { type: 'multi';   objectives: Exclude<Objective, { type: 'multi' }>[] };

// Blocker 種類
export type BlockerKind = 'jelly' | 'lock' | 'generator' | 'unstable';

// 關卡 JSON 中的 blocker 預置
export interface BlockerPlacement {
  type: BlockerKind;
  at: [number, number];          // (x, y) 棋盤座標
  layers?: number;               // 僅 jelly 使用（1..3）
  generatorSpec?: {              // 僅 generator 使用
    spawnKind: BlockerKind;      // 生成什麼
    everyNMoves: number;         // 預設 3
  };
  unstableSpec?: {               // 僅 unstable 使用
    countdown: number;           // 預設 6
  };
}

// Objective 進度差分（運行期使用；供 event bus 使用）
export interface ObjectiveDelta {
  type: Objective['type'];
  progress: number;              // 0..1
  completedSubObjectives?: number;
}

// Combo 類型（6 個唯一對，對稱消除）
export type ComboType =
  | 'line.line'
  | 'bomb.line'
  | 'bomb.bomb'
  | 'colour.line'
  | 'colour.bomb'
  | 'colour.colour';

// 單次消除描述（rules 引擎輸出給 event bus）
export interface MatchDescriptor {
  cells: Array<[number, number]>;
  shape: 'straight3' | 'straight4' | 'straight5' | 'T' | 'L' | 'cross';
  colour: GemColour;
  spawnsSpecial?: SpecialGemType;
  spawnAt?: [number, number];    // 僅當 spawnsSpecial 時使用
}
```

### 9.2 範例：L6（更新版，無 jelly）

```json
{
  "id": 6,
  "worldId": 1,
  "name": { "zh-TW": "光柱初試", "en": "First Beam" },
  "board": { "width": 7, "height": 7, "empty": [] },
  "gems": {
    "colours": ["R", "G", "B", "Y"],
    "weights": { "R": 1.5, "G": 1.0, "B": 1.0, "Y": 1.0 }
  },
  "constraints": { "moveBudget": 20 },
  "objective": { "type": "collect", "target": [{ "colour": "R", "count": 15 }] },
  "stars": { "basis": "movesRemaining", "one": 0, "two": 6, "three": 10 }
}
```

---

## 10. Endless Mode Spec

### 10.1 結構

- 無手數 / 時間限制
- 每累積 **5,000 分** 提升 1 難度等級
- 上限 15 級（之後保持不升）

### 10.1.1 難度升階公式

```
difficulty(score) = min(floor(score / 5000) + 1, 15)
```

| 難度 | 觸發分數 | 顏色數 | Blocker 生成 | Board |
|---|---|---|---|---|
| 1 | 0 | 4 | none | 7×7 |
| 2 | 5,000 | 5 | none | 7×7 |
| 3 | 10,000 | 5 | Jelly 每 10 手 1 個 | 8×8 |
| 4 | 15,000 | 5 | Jelly 每 8 手 | 8×8 |
| 5 | 20,000 | 6 | Jelly 每 8 手 | 8×8 |
| 6 | 25,000 | 6 | Jelly 每 6 手 | 8×8 |
| 7 | 30,000 | 6 | + Lock 每 10 手 | 8×8 |
| 8 | 35,000 | 6 | Lock 每 8 手 | 8×8 |
| 9 | 40,000 | 7 | Lock 每 6 手 | 8×8 |
| 10 | 45,000 | 7 | + Generator | 8×8 |
| 11 | 50,000 | 7 | Generator 每 4 手 | 8×8 |
| 12 | 55,000 | 7 | + Unstable 每 8 手 | 9×9 |
| 13 | 60,000 | 7 | Stacked (jelly on lock) | 9×9 |
| 14 | 65,000 | 7 | 全面加速 | 9×9 with empty cells |
| 15 | 70,000+ | 7 | 最高密度（cap） | 9×9 with empty cells |

升階時：`difficulty.tier` event fire → 畫面 flash 300ms + intensity +0.1 脈衝 + `endless.tier` stinger（見 07§3.6）。

### 10.2 止損（canonical）

觸發任一即判局結束：
1. **無有效 swap** 且 **reshuffle 已用 3 次**（每輪 Endless 最多 3 次）
2. 玩家主動按「結束」按鈕
3. 連續 120 秒無任何輸入 → 顯示「要結束本輪嗎？」dialog

結束後：
- 顯示 `endlessEnd` 畫面（見 06§2.1）
- 比對 3 榜（最高分 / 最長連鎖 / 最多 special spawn）；破紀錄 → PB toast + stinger
- Session 紀錄寫入 `saveState.progress.endlessBest`

### 10.3 排行榜

- 本機前 10 名（高分、最長連鎖、特殊 spawn 次數三榜）

---

## 11. Open Questions

| # | 問題 | 備註 |
|---|---|---|
| 1 | ~~L6 的 jelly 佔位改為「用 Line Bomb 消除 N 顆指定色」~~ | **closed 2026-04-22** — 改為 Collect 15 Red gems (§7 L6) |
| 2 | W2–W4 詳細關卡規格分檔 | milestone 級表格已於 §7 補齊；per-level 完整 spec（pre-seeded 盤面等）分檔至 `docs/gdd/levels/world-N/LXX.md`（v1.0 freeze 前產出） |
| 3 | Boss 關的特殊規則是否共用格式 | `specialRules: string[]` 目前為自由文字；boss 共用格式將於 v1.0 freeze 前定型 |
| 4 | Endless 難度升階公式實作細節 | 交由 game-designer & level-designer 共議；§10 已有 difficulty 1–15 概念表 |
| 5 | 是否開放玩家社群關卡編輯器 | v1 不做 |

---

## Changelog

- **2026-04-21** · v0.9 · 初稿（owner: match3-level-designer）
