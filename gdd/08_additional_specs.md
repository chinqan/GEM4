# 08 · 其他規格與設定 (Additional Specs)

> **Status**: v1.0 (synced 2026-05-08) · **Owner**: match3-game-designer (召集) + 全 agents 各補
> **Last updated**: 2026-05-08 · **Phase**: 3 — Polish Systems

> 本章收納前 7 章未完整歸類的規格。目的：讓前 7 章乾淨聚焦，同時確保沒有任何跨章節規格被遺忘。

---

## 1. 本地化 (i18n)

### 1.1 語言支援

| Locale | 狀態 | 備註 |
|---|---|---|
| `zh-TW` | **v1 必出** | 預設中文 |
| `en` | **v1 必出** | 預設英文 |
| `zh-CN` | v1.1 | 與 zh-TW 共用大部分結構但文案差異 |
| `ja` | v1.2 | 日文字型需確認大小 |
| `ko` | v1.2 | 同上 |

### 1.2 字串管理策略

- 格式：JSON 每 locale 一個檔 (`src/i18n/locales/{locale}.json`)
- Key 命名：`section.purpose[.variant]`
- 變數插值：ICU 格式 (`{{count}}`, `{{playerName}}`)
- Pluralization：ICU plural rules
- 數字、日期：`Intl.NumberFormat` / `Intl.DateTimeFormat` 根據 locale 自動

### 1.3 載入策略（canonical）

- **初始載入**：依瀏覽器 `navigator.language` 偵測 → 載入對應 locale JSON（單檔，約 40–80 KB per locale）
- **策略**：**全量載入**當前 locale + 常駐快取；**不按需載入**（理由：locale JSON 相對小，避免首次切畫面時 flash）
- **切換語言**：動態載入新 locale → 等待完成 → 一次性 swap（無需 reload 整個遊戲；但 canvas 內已渲染的字串需要經 `i18n.changed` event 重繪）
- **Fallback chain**：`{requested} → en → zh-TW`（確保未翻譯 key 有後備）
- **Bundle 預算**：每 locale JSON ≤ 100 KB gzipped；5 locale × 100 KB = 500 KB 額外（納入 per-locale lazy，非 initial bundle）

### 1.4 字串長度預算

| 用途 | 中文字元上限 | 英文字元上限 |
|---|---|---|
| 按鈕文字 | 6 | 12 |
| Chip label | 8 | 16 |
| Toast | 30 | 60 |
| Modal title | 12 | 24 |
| Modal body | 100 | 200 |
| World name | 10 | 24 |
| Level name | 14 | 28 |
| Flavour line (關卡完成) | 12 | 24 |
| Flavour line (chain stinger) | 6 | 14 |

### 1.5 翻譯工作流

- Source 語言：zh-TW（中文為第一語言）
- 產出 `.json` → 交翻譯
- 翻譯回來後執行 `npm run validate:i18n`（檢查缺 key、變數插值一致性、長度超標警告）

---

## 2. 遙測 (Telemetry / Analytics)

### 2.1 v1 範圍

- **僅本機**（saveState.telemetry）
- 無雲端上傳
- 不追蹤 PII

### 2.2 事件清單

| Event | Payload | 用途 |
|---|---|---|
| `app.loaded` | `{ duration_ms, user_agent }` | 啟動性能 |
| `session.start` | `{ timestamp, session_count }` | 回流分析（本機） |
| `session.end` | `{ duration_ms }` | 平均 session 長度 |
| `level.started` | `{ level_id, world_id, seed }` | — |
| `level.completed` | `{ level_id, stars, score, moves_remaining, duration_ms, chain_max, specials_spawned }` | 難度校準 |
| `level.failed` | `{ level_id, reason, score, duration_ms }` | 失敗分析 |
| `level.abandoned` | `{ level_id, progress_ratio, duration_ms }` | Abandonment triage |
| `match.landed` | (aggregate per level) `{ count_by_size }` | — |
| `chain.escalated` | (aggregate per level) `{ max_chain, count_by_tier }` | — |
| `special.spawned` | (aggregate per level) `{ count_by_type }` | — |
| `special.activated` | (aggregate) | — |
| `combo.triggered` | (aggregate) `{ count_by_type }` | 判斷 combo 是否達成頻率 |
| `reshuffle.triggered` | `{ level_id, triggered_count }` | 若頻繁 = 設計問題 |
| `hint.shown` | `{ level_id, idle_seconds }` | 玩家卡住頻率 |
| `settings.changed` | `{ key, from, to }` | 使用偏好分析 |
| `tutorial.step_completed` | `{ step_name }` | Onboarding 漏斗 |
| `error.caught` | `{ type, message, stack[trimmed] }` | Crash 統計 |

### 2.3 雲端上傳（v1.x 未來）

當升級到雲端：

- 使用 Cloudflare Workers + D1 做 minimal backend
- 批次上傳（每 session 結束或每 10 關）
- 玩家可 opt-out（預設 opt-in，需明確 toggle）
- GDPR / CCPA 合規：存同意時間戳

---

## 3. Accessibility 全域規格

> 各章已涵蓋 accessibility 的分項；本節做交叉索引與額外補充。

### 3.1 Checklist 整合

- 色盲模式：[05§7.1]
- WCAG AA 對比：[05§7.1]
- Motion reduction：[05§7.2, 06§6.1, 07§9]
- 鍵盤導航：[03§8.2]
- Hold-to-confirm：[03§8.2, 05§7.3]
- 音效視覺替代：[07§9.1]
- 獨立音量控制：[07§5, §9]
- 字型回退 / i18n：[05§8, 08§1]

### 3.2 額外補充

- **螢幕閱讀器支援**：canvas 遊戲 screen-reader 支援極難；v1 **不承諾**；DOM 的 settings 與 credits 必須支援
- **字體大小調整**：v1 不開放玩家自訂字體大小；UI 已以最易讀比例設計
- **文字描述**：所有 IconButton 必帶 `aria-label`（DOM）/ `accessibleName`（Pixi）
- **Epilepsy-safe**：`prefers-reduced-motion` 必遵；全畫面 strobe 禁用（亮度變化 ≤10%/200ms）

---

## 4. 設定系統完整分類

### Audio

- Master volume (0–100)
- Music volume (0–100)
- SFX volume (0–100)
- Ambience volume (0–100)
- Mute (toggle)

### Graphics

- Preset (Low / Medium / High)
- Reduce motion (toggle)
- Render scale (50% / 75% / 100% — advanced)

### Accessibility

- Colour-blind mode (off / deuteranopia / protanopia / tritanopia)
- High-contrast UI (toggle)
- Hold-to-confirm on action buttons (toggle)

### Gameplay

- Hint delay (3s / 5s / 10s / off)
- Auto-activate special gems on adjacent match (toggle)
- Confirm before using hint (toggle)
- Tap-tap-swap vs Drag-swap (選擇)

### Language

- Auto-detect (預設) / manual select (zh-TW / en / ...)

### Data

- Reset progress (with double-confirm)
- Export save (download JSON)
- Import save (paste JSON)

### Keybinds (Advanced)

- 可綁快捷鍵：方向上/下/左/右, 確認, 取消, 暫停, 靜音, 重試

---

## 5. 成就 / Meta 進度

### 5.1 v1 範圍（本機）

| 類型 | 名稱範例 | 觸發 |
|---|---|---|
| Progression | 首次完成 L1 | L1 complete |
| Progression | 完成 World 1 | L20 complete |
| Mastery | 全 ★ 某世界 | 該世界所有關卡 3-star |
| Combo | 首次 5 連鎖 | chain ≥5 |
| Combo | 首次 colour × colour | combo trigger |
| Endurance | 累計遊玩 10 小時 | totalPlayMs |
| Exploration | 用過每一種特殊寶石 | specialSpawnedCount by type |

### 5.2 UI

- 主選單 / 設定中「成就」入口
- 顯示：圖示 + 名稱 + 描述 + 進度條
- 達成時：右上 toast「成就解鎖」+ `achievement.unlock` stinger

### 5.3 v1.x 雲端整合

- 待上雲分析建置後再評估；v1 全部本機

---

## 6. Endless Mode 詳細規格

### 6.1 解鎖條件

- 完成 World 4 最後一關 (L80) 並得 ≥1 ★

### 6.2 難度階層 (difficulty 1–15)

| 難度 | 顏色數 | Blocker 頻率 | Board 組態 |
|---|---|---|---|
| 1 | 4 | none | 7×7 |
| 3 | 5 | 低 (jelly 每 10 手 1 生) | 8×8 |
| 5 | 6 | 中 | 8×8 |
| 7 | 6 | 中 + lock | 8×8 |
| 10 | 7 | 高 + generator | 8×8 |
| 15 | 7 | 極高 + stacked blocker | 9×9 with empty cells |

### 6.3 難度升階觸發

- 每累積 5,000 分 → 升 1 階
- 升階時：半秒 flash + intensity pulse

### 6.4 止損

- 若 reshuffle 用盡（最多 3 次） + 無有效移動 → game over
- 或玩家主動結束

### 6.5 排行榜（本機）

- 最高分 (top 10)
- 最長連鎖 (top 10)
- 最多 special spawned (top 10)

---

## 7. 資產 / 授權 (Legal & Assets)

### 7.1 字型授權

| 字型 | 授權 | 來源 |
|---|---|---|
| Cinzel | OFL | Google Fonts |
| Inter | OFL | Google Fonts |
| JetBrains Mono | OFL | JetBrains |
| 思源黑體 (Source Han Sans) | OFL | Adobe / Google |
| 思源宋體 (Source Han Serif) | OFL | Adobe / Google |

- 必須 self-host（不動態 fetch）
- 字型 subset 工具鏈（canonical）：
  - **工具**：`pyftsubset`（來自 `fonttools` PyPI 套件）
  - **glyph 提取**：
    1. 從 `src/i18n/locales/*.json` 聚合所有字元
    2. 加入 GDD 預設固定字元集（數字、基本標點、UI 保留字）
    3. 產出 `build-tools/font-glyphs.txt`
  - **執行**：
    ```bash
    pyftsubset SourceHanSans-Regular.otf \
      --text-file=build-tools/font-glyphs.txt \
      --output-file=public/fonts/zh-tw.woff2 \
      --flavor=woff2 --with-zopfli
    ```
  - **預期結果**：思源黑體 18 MB → ≤ 1.2 MB（含全部遊戲使用中文 + Latin 基本）
  - **CI**：`npm run fonts:subset` 於 lang JSON 變更時重跑；提交 diff 至 repo

### 7.2 音樂/音效來源

- 所有資產來源必須列於 credits
- 絕不使用來源不明的免費音色
- 商用：委託或購買 royalty-free license

### 7.3 圖像來源

- 寶石、UI icon、背景：全部原創或委託
- 不使用 AI 生成素材未經人手修飾後直接上線（見下節）

### 7.4 AI 使用政策

- **程式碼**：AI 可協助，最終 review 為人
- **設計稿**：可用 AI 作為 ideation 工具，但出貨素材需原創或委託
- **文案**：Flavour copy 由 narrative designer 最終拍板
- **聲音**：不使用 AI 生成語音 / 音效作為正式出貨

### 7.5 開源授權

- 本專案授權：**MIT License**（程式碼）。資產（art / audio / copy）採 `All Rights Reserved` 直至原作者另行宣告 — 見 `LICENSE` 與 `ASSETS-LICENSE.md`。
- `package.json` 的 `"license"` 欄位值 = `"MIT"`；repo root 有 `LICENSE` 檔明示
- 所有 dependencies 授權相容性檢查（`license-checker` tool）；CI 拒絕 GPL 家族與未宣告授權的 package

---

## 8. 效能與品質預算全表

> 來自 03§9 + 07§7.4 的彙整。

### 8.1 Bundle

| 項目 | 上限 |
|---|---|
| Initial JS (gzipped) | 500 KB |
| Initial CSS | 50 KB |
| Core atlas | 3 MB |
| Core audio | 1 MB |
| **Initial total (gzipped)** | **5 MB** |
| Per-world bundle | 2 MB |
| Total audio | 8 MB |

### 8.2 Runtime

| 指標 | Desktop | Tablet (v1.1) |
|---|---|---|
| Sustained FPS | 60 | 60/30 |
| 99p frame time | 25ms | 40ms |
| Memory 30min 成長 | ≤10MB | ≤20MB |
| VRAM | ≤80MB | ≤40MB |

### 8.3 Load

| 指標 | 上限 |
|---|---|
| TTI（寬頻 cold） | 3s |
| Splash → Menu (warm) | 1s |
| Level load | 500ms |

### 8.4 Playtest 預算（proposed）

| 項目 | 預設值 | 備註 |
|---|---|---|
| 單次測試 session 長度 | 60 分鐘 | 見 09§8.2 |
| 每位測試者報酬 | USD 40 / session | proposed — 以台灣地區為基準；歐美可調至 USD 60–80 |
| 每 milestone 招募人數 | 5–8 人 | 跨 personas |
| Milestone 數（到 v1.0） | 3 | Onboarding playtest、Mid-game playtest、Release candidate playtest |
| **總預算（proposed, to v1.0）** | **USD 600–960** | 3 milestone × 5–8 人 × USD 40 |

此為 proposed baseline；實際預算由專案主決定。若預算受限可：
- 改用 unmoderated remote 測試平台（UserTesting / Maze，~50% 成本）
- 縮至 3 人 / milestone（降解析度）
- 志願者社群（GameDev Stack、本地社群）非付費

---

## 9. 術語表 (Glossary)

| 術語 | 定義 |
|---|---|
| **Match** | 三顆以上同色寶石在一直線 |
| **Cascade** | 消除後上方寶石下落與新寶石補入，可能再產生 match |
| **Chain** | 一次 swap 引發的連續 cascade 次數 |
| **Combo** | 兩個特殊寶石相互觸發的大效果（不是一般 chain） |
| **Blocker** | 限制寶石移動/消除的元件（jelly, lock, generator, unstable） |
| **Delivery Cell** | Drop 目標的底部標記格 |
| **Seed (RNG)** | 可復現的隨機序列起點，用於測試與 replay |
| **Intensity** | 0–1 值，音樂系統接收的遊戲強度信號 |
| **Gate 關** | 需累積 ★ 才能解鎖的關卡 |
| **Boss 關** | 每世界最後一關，有獨特規則 |
| **Reshuffle** | 無有效移動時棋盤洗牌 |
| **Rules Engine** | `game/rules/` 內的純函式邏輯，與 Pixi / DOM 無關 |
| **Save Schema** | localStorage 內 SaveState 的型別契約 |
| **World** | 關卡章節（本遊戲有 4 個） |
| **Dreamwarden** | 玩家角色稱呼（敘事框架） |

---

## 10. Flavour Copy Library (完整)

> 摘自 `04_art_style_and_narrative.md`；本節為完整字庫，供 i18n 工作流使用。

### 10.1 關卡完成讚美 (12 句，隨機播放)

```json
[
  { "zh-TW": "漂亮的連鎖", "en": "Beautiful chain" },
  { "zh-TW": "記憶重回光明", "en": "Memory restored" },
  { "zh-TW": "女神微微點頭", "en": "The goddess nods" },
  { "zh-TW": "一顆星點亮了", "en": "A star awakens" },
  { "zh-TW": "優雅的解", "en": "Elegant" },
  { "zh-TW": "就是這樣", "en": "Exactly so" },
  { "zh-TW": "夢在回應你", "en": "The dream responds" },
  { "zh-TW": "光找到了路", "en": "The light found its way" },
  { "zh-TW": "完美的一步", "en": "A perfect move" },
  { "zh-TW": "寶石讚許著你", "en": "The gems approve" },
  { "zh-TW": "你看到了路", "en": "You saw the path" },
  { "zh-TW": "每一顆都重要", "en": "Every gem counts" }
]
```

### 10.2 失敗鼓勵 (6 句)

```json
[
  { "zh-TW": "夢還在繼續", "en": "The dream goes on" },
  { "zh-TW": "明天的光同樣溫暖", "en": "Tomorrow's light is just as warm" },
  { "zh-TW": "再來一次", "en": "Once more" },
  { "zh-TW": "女神不會忘記你", "en": "The goddess remembers you" },
  { "zh-TW": "每個守夢人都跌倒過", "en": "Every warden has stumbled" },
  { "zh-TW": "路還長", "en": "The path continues" }
]
```

### 10.3 大連鎖慶祝 (7 句，依 chain 階層)

```json
[
  { "chain": 2, "zh-TW": "連鎖！", "en": "Chain!" },
  { "chain": 3, "zh-TW": "爆發！", "en": "Burst!" },
  { "chain": 4, "zh-TW": "絢爛！", "en": "Brilliant!" },
  { "chain": 5, "zh-TW": "震撼！", "en": "Magnificent!" },
  { "chain": 6, "zh-TW": "難以置信！", "en": "Incredible!" },
  { "chain": 7, "zh-TW": "記憶之潮！", "en": "Tide of Memory!" },
  { "chain": 8, "zh-TW": "女神的呼吸！", "en": "The Goddess Breathes!" }
]
```

### 10.4 Loading / World Hover 提示 (15 句)

```json
[
  "每顆寶石都是一段沉睡的記憶。",
  "連鎖越深，女神的夢越明亮。",
  "遺忘之霧無法被理解，只能被穿透。",
  "星塵之塔的頂端是寂靜而溫暖的。",
  "Lumi 不說話時，也在聽。",
  "大爆發需要一點耐心。",
  "彩虹寶石能把整片顏色帶回夢裡。",
  "四連與五連，是兩種不同的祝福。",
  "月下神殿的回聲會告訴你該做什麼。",
  "女神的夢境之海沒有終點。",
  "守夢人不必強迫自己每次都完美。",
  "記憶有時沉默，但不會離開。",
  "色彩是情感的語言。",
  "一個優雅的解，比一個爆發更美。",
  "再會很近的。"
]
```

### 10.5 World Entry / Exit 字串 (每 World 2 句)

```json
{
  "world.1.enter": "雲海之上，一片靜默的花園。寶石的低語喚醒了你。",
  "world.1.exit":  "第一段記憶甦醒。女神輕輕翻身。",
  "world.2.enter": "越往深處，越有影子。但寶石仍在這裡。",
  "world.2.exit":  "霧試圖阻擋，但你學會了如何穿透。",
  "world.3.enter": "月光能穿透水，也能穿透霧。",
  "world.3.exit":  "女神在夢中微笑了。",
  "world.4.enter": "星辰降下階梯。終點就在那裡。",
  "world.4.exit":  "光從女神的眼睛溢出 — 世界重新有了顏色。"
}
```

---

## 11. Data Schema 附錄

### 11.1 Level JSON 範例

```json
{
  "id": 1,
  "worldId": 1,
  "name": { "zh-TW": "初次相遇", "en": "First Encounter" },
  "board": { "width": 6, "height": 6, "empty": [] },
  "gems": { "colours": ["R", "G", "B"] },
  "constraints": { "moveBudget": 15 },
  "objective": { "type": "score", "target": 2000 },
  "stars": { "basis": "score", "one": 2000, "two": 3500, "three": 5500 }
}
```

### 11.2 SaveState 預設值

見 `03_technical_foundation.md#save-state-schema`。

---

## 12. Open Questions

| # | 問題 | 影響 |
|---|---|---|
| 1 | 開源授權 (本專案 LICENSE) | 08§7.5 |
| 2 | 雲端遙測上線時程 | 08§2.3 |
| 3 | 成就系統上線範圍（v1 全本機 vs 部分雲端） | 08§5 |
| 4 | 字型 subset 工具鏈確認（減少字型體積） | 08§7.1 |
| 5 | 是否做 QR code 分享分數（截圖） | Later |

---

## Changelog

- **2026-04-21** · v0.9 · 初稿（召集: match3-game-designer；貢獻: 全 agents）
