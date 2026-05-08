# 05 · UI/UX 設計

> **Status**: v1.0 (synced 2026-05-08) · **Owners**: match3-ui-designer (視覺) · match3-ux-architect (結構/IA)
> **Last updated**: 2026-05-08 · **Phase**: 2 — Systems

---

## 1. 設計原則 (Principles)

1. **Canvas 為本，DOM 為輔** — 所有遊戲內 UI 在 PixiJS canvas 上以 `@pixi/ui` + `@pixi/layout` 實作；僅「表單為重」的畫面（設定、信用）使用 DOM overlay
2. **System before screens** — 所有 design tokens、component library 必須先完成，再畫個別畫面
3. **零結構決策延遲** — 本章交付給 Tech Artist 時，無任何「這個 spacing 多少」的待問項
4. **Accessibility is baseline** — 色盲模式、motion reduction、鍵盤操作、WCAG AA 對比皆為必交付
5. **Juice is not optional** — 每個互動都有至少一個即時反饋 channel
6. **Respect i18n** — 所有 UI 容器在預設字串長度 ±30% 仍不破版

---

## 2. Design Tokens

### 2.1 色彩系統

#### 主要色 (Core)

| Token | Hex | 用途 |
|---|---|---|
| `bg.deep` | `#0B1026` | 主選單背景、splash |
| `bg.panel` | `#1A2040` | 面板、卡片背景 |
| `bg.board` | `#14183A` | 棋盤底色 |
| `bg.overlay` | `rgba(11,16,38,0.85)` | modal 背景遮罩 |

#### 強調色 (依 World 動態)

| World | Accent | Secondary |
|---|---|---|
| W1 (山嶺) | `#F6C453` (蜂蜜金) | `#8C6A2F` |
| W2 (水晶) | `#64B5F6` (晨藍) | `#1E5A96` |
| W3 (月光) | `#E1BEE7` (月紫) | `#7B3FA0` |
| W4 (星塵) | `#FFD54F` (星金) | `#A87D00` |
| 預設（主選單） | W1 accent | — |

#### 寶石色（見 `04_art_style_and_narrative.md#gem-archetypes`）

#### 狀態色

| Token | Hex |
|---|---|
| `state.success` | `#66BB6A` |
| `state.warning` | `#FFA726` |
| `state.danger` | `#EF5350` |
| `state.info` | `#42A5F5` |

#### 文字色

| Token | Hex | 用途 |
|---|---|---|
| `text.primary` | `#FFFFFF` | 主文字 |
| `text.secondary` | `#D5D9E8` | 次要文字 |
| `text.muted` | `#8C93AD` | 輔助說明 |
| `text.inverse` | `#0B1026` | 在亮色背景上 |
| `text.accent` | 依 World accent | 強調 |

### 2.2 字型 (Typography)

> 字型檔來源見 `04_art_style_and_narrative.md#typography`。

| Style | Font | Size | Weight | Line Height | 用途 |
|---|---|---|---|---|---|
| `display` | Cinzel + 思源宋體 H | 64 | 800 | 72 | Logo, 章節標題 |
| `title` | Cinzel + 思源宋體 | 40 | 700 | 48 | 主選單標題 |
| `subtitle` | Inter + 思源黑體 | 24 | 600 | 32 | 區段標題 |
| `body` | Inter + 思源黑體 | 16 | 400 | 24 | 內文 |
| `caption` | Inter + 思源黑體 | 13 | 500 | 18 | 提示、footer |
| `hud.score` | JetBrains Mono + 思源宋體（數字） | 32 | 700 | 36 | 分數 HUD |
| `hud.stat` | JetBrains Mono | 20 | 600 | 24 | HUD 輔助數字 |
| `button.primary` | Inter + 思源黑體 | 18 | 700 | 24 | CTA |
| `button.secondary` | Inter + 思源黑體 | 16 | 500 | 20 | 次要按鈕 |

### 2.3 間距系統 (Spacing)

基礎 8px；尺規：`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`

### 2.4 圓角 (Radius)

| Token | Value |
|---|---|
| `radius.pill` | 999 |
| `radius.lg` | 20 (modal) |
| `radius.md` | 16 (panel) |
| `radius.sm` | 12 (button) |
| `radius.xs` | 8 (inline chip) |

### 2.5 陰影 / Elevation

Canvas-rendered shadow（利用 BlurFilter + 色塊）：

| Token | X | Y | Blur | Alpha |
|---|---|---|---|---|
| `elev.z1` (button) | 0 | 2 | 6 | 0.25 |
| `elev.z2` (panel) | 0 | 4 | 12 | 0.30 |
| `elev.z3` (modal) | 0 | 8 | 24 | 0.35 |
| `elev.z4` (tooltip) | 0 | 2 | 8 | 0.20 |

### 2.6 Motion (動態)

| Token | Duration | Easing |
|---|---|---|
| `motion.quick` | 120ms | ease-out |
| `motion.base` | 240ms | ease-in-out |
| `motion.slow` | 400ms | ease-out-back |
| `motion.celebrate` | 800ms | ease-out-elastic |
| `motion.transition` | 600ms | ease-in-out |

Motion reduction 開啟時的公式（canonical）：

```
duration_reduced(d) = {
  d               if d ≤ 120ms
  120ms           if 120 < d ≤ 240ms
  d × 0.4 (min 120ms, max 240ms)  if d > 240ms
}
```

同時：
- `celebrate` 粒子數量 × 0.5（cap 至 preset 允許值）
- Screen shake **關閉**
- Chromatic aberration **關閉**
- `chain ≥ 3` 的 saturation pulse 幅度 × 0.3
- 背景視差（main menu）**關閉**
- Idle shimmer 保留（低幅度，不違反 reduced motion 準則）

---

## 3. Component Library

每個 component 列出：**變體 · 狀態 · 尺寸 · Token 使用**。

### 3.1 Button

```
變體: primary · secondary · danger · ghost
狀態: default · hover · pressed · disabled · loading
尺寸: sm (32h) · md (44h) · lg (56h)
```

- Primary: 填色=World accent, 文字=`text.inverse`, 描邊=`elev.z1` drop shadow
- Secondary: 透明填色, 描邊 2px `text.primary`, 文字=`text.primary`
- Danger: 填色=`state.danger`, 文字=white
- Ghost: 無填色, 文字=`text.secondary`, hover 顯示底色

### 3.2 IconButton

- 圓形，44×44 (md) / 56×56 (lg)
- Icon from `ui.atlas`
- 同 Button 的所有狀態

### 3.3 ProgressBar

```
變體: score · objective · time · loading
高度: sm (6) · md (12) · lg (20)
```

- 填色依 context（score = accent gold, objective = 當前 World accent, time = 剩餘 >30% 綠/≤30% 黃/≤10% 紅, loading = info）
- 可選刻度標記（milestone marker）

### 3.4 StarDisplay

```
變體: record (小) · reveal (大) · world-total (合計)
狀態: empty · filled · unlocking-animation
```

- 單星 vs 三星橫向排列
- Unlock 動畫：縮放 0 → 1.3 → 1.0 + 粒子爆破 + stars.grant stinger

### 3.5 ScoreCounter

- Monospace，數字跳動從舊值到新值
- 動畫時長取決於差值：`max(300ms, |delta| / 20 ms)`，最高 1200ms
- 大幅跳增時附帶數字放大脈衝

### 3.6 GemIcon (非遊戲內，UI 用)

- 小型 (32) / 中型 (64) / 大型 (128)
- 支援：無狀態 / selected / disabled (灰階)

### 3.7 Modal

```
結構:
  ┌ chrome ─────────────────────┐
  │ title                      X│
  ├─────────────────────────────┤
  │ body                        │
  │                             │
  ├─────────────────────────────┤
  │                  [secondary][primary]
  └─────────────────────────────┘

尺寸: sm (400w) · md (560w) · lg (720w)
進出場動畫: scale 0.92 → 1.0, alpha 0 → 1, 240ms
```

### 3.8 Toast

- 頂部中央 / 底部中央位置
- 高度 56, 最大寬 480
- 自動 3 秒後消失，或手動 ×
- 變體：info / success / warning / danger

### 3.9 Tooltip

- Hover 200ms 後顯示
- 箭頭指向目標
- Max width 240
- 僅 desktop；touch 環境不顯示（用長按 chip 替代）

### 3.10 LevelNode

```
狀態: locked · current · unlocked · completed (依 star 分 1/2/3)
尺寸: 64×64
```

- Locked: 鎖 icon + 灰階
- Current: 脈動光環 + 彈跳 idle
- Unlocked: 無 star
- Completed-1star / 2star / 3star: 依 star 數上方顯示星星

### 3.11 ObjectiveChip

- HUD 用，顯示目標 icon + 計數（例：🍧 6/15）
- 隨完成進度填色：由灰 → World accent
- 完成時短暫縮放慶祝動畫

### 3.12 Panel / Card

- 圓角 `radius.md`
- 底色 `bg.panel`
- 內邊距 `spacing.24`
- 可帶 header / body / footer

---

## 4. Screen Specs

### 4.1 Splash

```
[背景: 深紫漸層 + 星點]
        ┌──────────────────┐
        │                  │
        │   [GEM LOGO]     │     ← Cinzel display, 金色
        │                  │
        │   (載入動畫)      │     ← 橫條 ProgressBar, accent W1
        │                  │
        │   Tap to Begin   │     ← caption, 脈動
        │                  │
        └──────────────────┘
             version 1.0.0
```

- Tap 後：音訊 unlock、預載 core bundle、transition → Main Menu

### 4.2 Main Menu

```
[背景: 世界 1 風格插圖，輕微視差]

    GEM                    ← 大 logo
    ─────                   ← 金色分隔線

    [ PLAY ]               ← primary button, 大型
    [ Endless Mode ]       ← secondary, locked 則灰階
    [ Settings ]
    [ Credits ]

                            ← 右下：version
```

- Reduce motion 時背景視差關閉

### 4.3 World Map

```
┌──────────────────────────────────────────────────────┐
│  [← back]   W1: 失落的山嶺花園           [⚙ gear]    │
├──────────────────────────────────────────────────────┤
│                                                      │
│   ┌─ scroll area ─────────────────────────────────┐  │
│   │                                                │  │
│   │    (01) ──── (02)                             │  │
│   │              │                                 │  │
│   │    (03)      │                                 │  │
│   │       \      │                                 │  │
│   │        (04) ─(05) ──── (06)                    │  │
│   │                           │                    │  │
│   │                          (07)                  │  │
│   │                           │                    │  │
│   │  ... (共 20 關)                                │  │
│   │                                                │  │
│   │                                         (20★★★)│  │
│   └────────────────────────────────────────────────┘  │
│                                                      │
│   [← W0]                                    [W2 →]   │
│                                                      │
│   ★ 累積: 34/60                                      │
└──────────────────────────────────────────────────────┘
```

- Level node 之間用曲線連接（有機曲線 token）
- 當前可玩關：脈動
- 完成關：依星數上方顯示 star
- 左右切換世界（已解鎖才可）
- 底部顯示該世界 ★ 收集進度

### 4.4 Level Select Card (Modal Overlay on World Map)

```
        ┌──────────────────────────────┐
        │ W1 · Level 07                │
        │                              │
        │ 目標: 消除 10 顆紅寶石         │
        │                              │
        │ 手數: 22                     │
        │ 過往最佳: ★★ · 12450 分         │
        │ 嘗試次數: 3                   │
        │                              │
        │         [Cancel] [ PLAY ]    │
        └──────────────────────────────┘
```

### 4.5 Game Screen

```
┌──────────────────────────────────────────────────────┐
│ [⏸]   SCORE 03, 450     [⚙]                   ★★☆    │  ← HUD 頂部
├──────────────────────────────────────────────────────┤
│                                                      │
│ [Obj: 消除紅寶石 6/10] [Moves: 12]                   │  ← HUD chips
│                                                      │
│                                                      │
│         ┌──────────────────────────┐                │
│         │                          │                │
│         │                          │                │
│         │       BOARD 8×8          │                │
│         │                          │                │
│         │                          │                │
│         │                          │                │
│         └──────────────────────────┘                │
│                                                      │
│                                                      │
│                                                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**HUD 元件**：

- **左上**：Pause button
- **中上**：ScoreCounter
- **右上**：Settings gear + Star display (當前進度)
- **上中靠左**：ObjectiveChip (主目標)
- **上中靠右**：MovesChip / TimerChip
- **右下（floating）**：Hint button（玩家主動求提示）

**Board**：

- 自動置中
- 縮放以適應高度（高度 = `viewport.height × 0.7` 為目標）
- 寶石間距 = 8px

### 4.6 Pause Modal

```
                    ┌─────────────────┐
                    │    PAUSED       │
                    │                 │
                    │ [ Resume ]      │
                    │ [ Restart ]     │
                    │ [ Settings ]    │
                    │ [ Quit to Map ] │
                    │                 │
                    └─────────────────┘
```

- 背景：blur 當前遊戲 + 40% alpha 黑色遮罩
- 所有按鈕 md size, 垂直堆疊

### 4.7 Level Complete Modal

```
┌──────────────────────────────────────┐
│             WORLD 1                  │
│             Level 07                  │
│                                      │
│         ★   ★   ☆                    │  ← 逐星點亮，600ms/star
│                                      │
│   Score             14,560           │
│     +5 remaining moves × 200 each    │
│   Total             15,560           │
│                                      │
│   Best chain        5                 │
│   Specials spawned  3                 │
│                                      │
│       [Map]  [Replay]  [Next]        │
└──────────────────────────────────────┘
```

- 背景：粒子慶祝 + 淡入 modal
- 剩餘手數/時間轉分數：動畫 120ms/手（max 2s）
- Star reveal 序列可被 tap 跳過（skip）

### 4.8 Level Fail Modal

```
┌──────────────────────────────────────┐
│         明天的光同樣溫暖              │  ← narrative flavour, 隨機
│                                      │
│         (無星，無分數嘲諷)             │
│                                      │
│       [Map]           [Retry]        │
└──────────────────────────────────────┘
```

- 溫和，不嘲諷
- 預設焦點在 Retry

### 4.9 Settings (DOM Overlay)

- DOM 表單（HTML + 輕量 CSS），non-modal-blocking 的 overlay 上
- 表單區塊：Audio / Graphics / Accessibility / Gameplay / Language / Data
- 使用原生 HTML control（slider, select, toggle, keybind box）
- 應用「Cancel / Save」模式：Cancel 還原到開啟前的設定
- Exception: 某些設定（音量）即時生效（fs 規則見 `06_game_flow.md`）

### 4.10 Credits

- 可滾動面板
- 列出：製作團隊、字型來源、音樂授權、特別感謝

---

## 5. Juice / Feedback Catalog

### 5.1 按鈕

| 狀態 | 視覺 | 音效 | 時長 |
|---|---|---|---|
| Hover | 填色 +8% 明度；上移 2px | — (desktop 可選 ui.hover) | 120ms |
| Press | Scale 0.94；填色 +4% 暗度 | `ui.click.soft` / `.strong` | 120ms |
| Release | Scale 恢復；動作觸發 | — | 120ms |
| Disabled | Desat + alpha 0.5 | — | — |

### 5.2 寶石互動

| 動作 | 視覺 | 音效 | 粒子 |
|---|---|---|---|
| Select | Scale 1→1.15 + pulse ring | `gem.pick` | — |
| Drag | 跟手指/游標 + alpha 0.9 | — | — |
| Release-valid | Snap 到目標格 + swap 動畫 | `swap.valid` | — |
| Release-invalid | Shake 回原位 | `swap.invalid` | — |
| Match-land | Scale 1→1.3→0 (200ms) | `match.base` (pitch shift by chain) | 8 粒子彩色爆破 |
| Chain escalate (≥2) | 畫面 saturation +10% 脈動 (300ms) | `chain.tierN` | 額外 30 粒子 |
| Special spawn | Radial shockwave (600ms) + 目標格 scale 1→1.4→1 | `special.spawn.*` | 環形 24 粒子 |
| Special activate | 對應清除動畫 (依種類) | `special.activate.*` | 特定粒子群 |
| Special+Special combo | 強化 2x 的視效 + combo stinger | `combo.xxx` | 大量粒子 |

### 5.3 成就/慶祝

| 事件 | 視覺 | 音效 |
|---|---|---|
| Level complete | Star 逐個亮起 + 粒子 + 分數換取動畫 | `level.complete` + `stars.grant1/2/3` |
| World complete | 全畫面黃金粒子雨 (1.5s) + 世界解鎖動畫 | `world.complete` |
| Personal best | 螢幕上方 toast "Personal Best!" | `ui.toast` 高音 |
| Endless milestone (+5000 分) | Difficulty ↑ 通知 | `endless.tier` |

### 5.4 Error / 反饋

| 事件 | 視覺 | 音效 |
|---|---|---|
| No valid moves (reshuffle) | 棋盤 fade out → fade in + 「重洗中」文字 | `ui.reshuffle` |
| Settings save fail | Toast danger "無法儲存設定" | `ui.toast.danger` |
| 資產載入失敗 | Modal + 重試按鈕 | — |

---

## 6. HUD 資訊架構

### 6.1 HUD 元素優先級

1. **Score** — 永遠可見，中上
2. **Primary Objective** — 永遠可見，左上
3. **Moves / Time** — 永遠可見，右上
4. **Chain Counter** — 僅 chain ≥2 時短暫顯示
5. **Hint button** — 右下，淡化直到 5 秒閒置
6. **Pause button** — 左上，永遠可見
7. **Settings gear** — 右上角，永遠可見

### 6.2 HUD 間距與防撞

- HUD 安全區：離 viewport 邊 ≥16px
- 棋盤佔用垂直 70% 空間；HUD 佔 15%（頂）+ 15%（底）

---

## 7. Accessibility Checklist

### 7.1 視覺

- [x] 7 色寶石 + 特殊寶石皆有獨特形狀可辨識
- [x] 色盲模式（deutan/protan/tritan）提供替代調色
- [x] WCAG AA 文字對比（body ≥4.5:1, large ≥3:1）
- [x] 高對比模式（可選，背景更深、邊框更明顯）
- [x] 最小互動區 44×44

### 7.2 動態

- [x] `prefers-reduced-motion` 自動偵測並套用
- [x] Motion Reduction 模式：無 shake、無 chromatic aberration、celebrate 粒子減半
- [x] 全畫面 strobe 禁用（最大亮度變化 ≤10% 每 200ms）

### 7.3 輸入

- [x] 完整鍵盤導航（方向鍵、Enter、ESC、Tab）
- [x] 可重綁快捷鍵
- [x] Hold-to-confirm 選項（防誤觸）

### 7.4 音訊

- [x] 每個關鍵音效有視覺替代
- [x] 獨立音量控制（Master / Music / SFX / Ambience）
- [x] 全靜音可單鍵切換（M）

### 7.5 語言與文字

- [x] 所有 copy 經 i18n；無硬編碼字串
- [x] 支援 CJK + Latin，字型回退設定完整
- [x] UI 容器在 +30% 文字長度時仍不破版

---

## 8. i18n 與字串規範

- 字串 key 結構：`section.purpose` (e.g., `menu.button.play`, `hud.objective.collect`)
- 所有 copy 寫入 `src/i18n/locales/*.json`
- 變數插值：`{{score}}`、`{{playerName}}`
- Pluralization 使用 ICU message 格式
- 數字格式化：使用 `Intl.NumberFormat` 以 locale 顯示（例：`1,000` vs `1.000`）

### 字型回退鏈（範例）

```css
--font-body: 'Inter', '思源黑體', 'Noto Sans CJK TC', sans-serif;
--font-display: 'Cinzel', '思源宋體', 'Noto Serif CJK TC', serif;
```

---

## 9. Wireframes — 文字版 canonical

> 文字 wireframe 為 **v1.0 凍結前的正式交付物**，可被 QA 與 tech-artist 直接消化。Figma 版本為後續美術探索使用的補充（OQ-21 / PH-10），不影響 freeze 判斷 — 文字版即為合約。
>
> 以下尺寸皆以設計基準 1440×900 viewport；實際 render 以 viewport 自動縮放（見 §6.2）。

### 9.1 Splash (1440×900)

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║                                                                  ║
║                                                                  ║
║                   ┌──────────────────────┐                       ║
║                   │                      │                       ║
║                   │       G E M          │ ← display / Cinzel 64 ║
║                   │    ─────────         │   gold accent         ║
║                   │                      │                       ║
║                   └──────────────────────┘                       ║
║                                                                  ║
║              ┌─────────────────────────────┐                    ║
║              │  ████████████░░░░░░░░░░░░  │ ← ProgressBar md     ║
║              └─────────────────────────────┘   loading accent    ║
║                                                                  ║
║                    Tap to Begin                ← caption, pulse  ║
║                                                                  ║
║                                                                  ║
║                                              v1.0.0              ║
╚══════════════════════════════════════════════════════════════════╝
```

互動：首次 pointer down → (1) audio unlock (2) 核心 bundle 完成後 → transition Main Menu

### 9.2 Main Menu (1440×900)

```
╔══════════════════════════════════════════════════════════════════╗
║        ░░░ W1 風格插圖 + 輕微視差 (reduce-motion 時關閉) ░░░     ║
║                                                                  ║
║                                                                  ║
║                        G E M                                     ║
║                       ─────                                      ║
║                                                                  ║
║                                                                  ║
║                  ┌──────────────────┐                            ║
║                  │      PLAY        │ ← primary lg, accent W1    ║
║                  └──────────────────┘                            ║
║                                                                  ║
║                  ┌──────────────────┐                            ║
║                  │  Endless Mode    │ ← secondary md, locked 時灰 ║
║                  └──────────────────┘                            ║
║                                                                  ║
║                  ┌──────────────────┐                            ║
║                  │    Settings      │                            ║
║                  └──────────────────┘                            ║
║                                                                  ║
║                  ┌──────────────────┐                            ║
║                  │     Credits      │                            ║
║                  └──────────────────┘                            ║
║                                                                  ║
║                                         v1.0.0   build sha       ║
╚══════════════════════════════════════════════════════════════════╝
```

### 9.3 World Map (1440×900)

```
╔══════════════════════════════════════════════════════════════════╗
║ ⟨ Back │   W1 · 失落的山嶺花園   ★ 34 / 60  │ ⚙ Settings         ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║                    World 背景視差 (依 reduce-motion)             ║
║                                                                  ║
║     ┌────────── scroll area (縱向滾動) ───────────────────┐      ║
║     │                                                    │      ║
║     │        ★★★                                         │      ║
║     │        ◉─────────◉                                 │      ║
║     │       01         02                                │      ║
║     │                  │                                 │      ║
║     │                  │  ★☆☆                            │      ║
║     │        ★☆☆      ◉                                 │      ║
║     │        ◉─────────┤                                 │      ║
║     │       03         │                                 │      ║
║     │                  │                                 │      ║
║     │                  ◉─────────◉─────────◉             │      ║
║     │                  05        06        07            │      ║
║     │         ╳────────╳────────╳──── (未解鎖)            │      ║
║     │        08       09       10                        │      ║
║     │                                                    │      ║
║     │         ... 連線曲線至 L20 boss ...                 │      ║
║     │                                                    │      ║
║     │                                        ♛ (L20 ★★★) │      ║
║     └────────────────────────────────────────────────────┘      ║
║                                                                  ║
║   ⟨ W0 (locked)                             W2 → (gate)         ║
╚══════════════════════════════════════════════════════════════════╝
```

Level node 狀態：完成 `★★★`｜未完成 `◉`（脈動若為當前可玩）｜未解鎖 `╳`｜Boss `♛`｜Gate `◈`

### 9.4 Level Select Card (modal over world map)

```
             ╔══════════════════════════════════════╗
             ║                                      ║
             ║          W1 · Level 07               ║
             ║          光柱初試                     ║
             ║                                      ║
             ║   ┌──────────────────────────┐       ║
             ║   │ 🎯 消除 15 顆紅寶石       │       ║
             ║   └──────────────────────────┘       ║
             ║                                      ║
             ║   手數:  20                          ║
             ║   過往最佳:  ★★ · 12,450 分           ║
             ║   嘗試次數:  3                       ║
             ║                                      ║
             ║        [ Cancel ]     [ PLAY ]       ║
             ║                                      ║
             ╚══════════════════════════════════════╝
```

### 9.5 Game Screen (1440×900)

```
╔══════════════════════════════════════════════════════════════════╗
║ [⏸]        SCORE    03,450              ★ ★ ☆        [⚙]        ║← HUD top
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ┌─ Objective ────────┐     ┌─ Moves ──┐                         ║
║  │ 🔴 6 / 15           │     │    12    │                         ║
║  └────────────────────┘     └──────────┘                         ║
║                                                                  ║
║                                                                  ║
║                 ┌───────────────────────┐                        ║
║                 │                       │                        ║
║                 │                       │                        ║
║                 │     BOARD 8×8         │  (72% viewport height) ║
║                 │                       │                        ║
║                 │                       │                        ║
║                 │                       │                        ║
║                 └───────────────────────┘                        ║
║                                                                  ║
║                                                    ┌────┐        ║
║                                                    │ 💡 │← Hint   ║
║                                                    └────┘  float ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

連鎖 ≥2 時：畫面頂部中央浮現 `Chain 2!` toast (160×48, alpha 0→1→0 共 600ms)。

### 9.6 Pause Modal

```
         ╔════════════════════════════╗
         ║                            ║
         ║         PAUSED             ║← display, 40
         ║                            ║
         ║   ┌──────────────────┐     ║
         ║   │     Resume       │     ║← primary
         ║   └──────────────────┘     ║
         ║   ┌──────────────────┐     ║
         ║   │     Restart      │     ║
         ║   └──────────────────┘     ║
         ║   ┌──────────────────┐     ║
         ║   │     Settings     │     ║
         ║   └──────────────────┘     ║
         ║   ┌──────────────────┐     ║
         ║   │   Quit to Map    │     ║← danger
         ║   └──────────────────┘     ║
         ║                            ║
         ╚════════════════════════════╝
  背景：遊戲畫面 blur(8px) + 40% 黑色遮罩
```

### 9.7 Level Complete Modal

```
  ╔════════════════════════════════════════════════╗
  ║                                                ║
  ║                 WORLD 1                        ║
  ║                Level 07                        ║
  ║                                                ║
  ║            ★    ★    ☆                         ║← 依序亮起，600ms/顆
  ║                                                ║
  ║   Score                          14,560        ║
  ║   + 5 remaining moves × 200          +1,000    ║← 120ms/手動畫
  ║   ────────────────────────────────────         ║
  ║   Total                          15,560        ║
  ║                                                ║
  ║   Best chain                          5        ║
  ║   Specials spawned                    3        ║
  ║                                                ║
  ║        [ Map ]    [ Replay ]    [ Next ]       ║← primary = Next
  ║                                                ║
  ╚════════════════════════════════════════════════╝
  背景：金色粒子爆發 (celebrate preset)
```

### 9.8 Level Fail Modal

```
      ╔══════════════════════════════════════╗
      ║                                      ║
      ║       明天的光同樣溫暖                  ║← flavour line (隨機)
      ║                                      ║
      ║                                      ║
      ║                                      ║
      ║                                      ║
      ║                                      ║
      ║       [ Map ]         [ Retry ]      ║← primary = Retry
      ║                                      ║
      ╚══════════════════════════════════════╝
  背景：遊戲畫面褪色 40% → 10% saturation
  不顯示分數嘲諷、不顯示「你還差一點」
```

### 9.9 Settings (DOM overlay)

```
┌──────────────────────────────────────────────────────────────┐
│  Settings                                              [ ✕ ] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ▼ Audio                                                     │
│      Master Volume       ───●────────────  80%               │
│      Music Volume        ─────●──────────  80%               │
│      SFX Volume          ───────●────────  90%               │
│      Ambience Volume     ─●──────────────  40%               │
│      Mute                [ ○ ]                               │
│                                                              │
│  ▼ Graphics                                                  │
│      Preset              ( ○ Low  ○ Medium  ● High )         │
│      Reduce Motion       [ ○ ]                               │
│      Render Scale        ( ○ 50%  ○ 75%  ● 100% )           │
│                                                              │
│  ▼ Accessibility                                             │
│      Colour-blind Mode   [ Off         ▼ ]                   │
│      High-contrast UI    [ ○ ]                               │
│      Hold-to-confirm     [ ○ ]                               │
│                                                              │
│  ▼ Gameplay                                                  │
│      Hint delay          [ 5s        ▼ ]                     │
│      Auto-activate sp.   [ ○ ]                               │
│      Swap mode           ( ● Drag  ○ Tap-Tap )               │
│                                                              │
│  ▼ Language              [ Auto (zh-TW) ▼ ]                  │
│                                                              │
│  ▼ Data                                                      │
│      [ Reset Progress ]  [ Export Save ]  [ Import Save ]    │
│                                                              │
│  ▼ Keybinds (advanced)   [ Expand ▾ ]                        │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                  [ Cancel ]  [ Save ]        │
└──────────────────────────────────────────────────────────────┘
```

Cancel 還原到開啟前；Save 立即生效（render preset 於下一關卡生效，其餘即時）。

### 9.10 Credits (DOM overlay, scroll)

```
┌──────────────────────────────────────────────┐
│  Credits                              [ ✕ ]  │
├──────────────────────────────────────────────┤
│                                              │
│              G E M                           │
│          ─────────────                       │
│                                              │
│          Design & Code                       │
│            [team name]                       │
│                                              │
│          Art                                 │
│            [art credits]                     │
│                                              │
│          Music                               │
│            [music credits]                   │
│                                              │
│          Sound Design                        │
│            [SFX credits]                     │
│                                              │
│          Fonts                               │
│            Cinzel (OFL)                      │
│            Inter (OFL)                       │
│            Source Han Sans (OFL)             │
│            Source Han Serif (OFL)            │
│            JetBrains Mono (OFL)              │
│            Ma Shan Zheng (OFL)               │
│                                              │
│          Special Thanks                      │
│            [list]                            │
│                                              │
│                                              │
│         © 2026  Licensed MIT (code)          │
│           Assets All Rights Reserved         │
│                                              │
└──────────────────────────────────────────────┘
```

### 9.11 交付狀態

| 項目 | 狀態 |
|---|---|
| 文字 wireframe（本節） | **canonical** — 可供開發與 QA 消化 |
| Figma 視覺探索稿 | deferred to post-MVP iteration（OQ-21） |
| 手繪 thumbnail（Splash / World Map / Final Boss） | optional；narrative-designer 產出時納入 credits |

`docs/gdd/wireframes/` 目錄保留給後續高保真設計稿，v1.0 freeze 不阻擋於此。

---

## 10. Open Questions

| # | 問題 | 備註 |
|---|---|---|
| 1 | Figma 是否為設計 SSOT？ | 是，但要同步 token JSON 導出 |
| 2 | 是否採用 component 熱重載（dev）？ | 有助於 UI 迭代；技術可行 |
| 3 | Tooltip 在 touch 的替代設計 | 暫定長按 chip；待 v1.1+ 觸控 |
| 4 | Settings 形式是 DOM 還是 Pixi @pixi/ui？ | v0.9 暫定 DOM（因表單複雜） |
| 5 | Motion reduction 的具體時長減幅公式 | v0.9 簡化為「>240ms 縮至 100ms」；之後細化 |

---

## Changelog

- **2026-04-21** · v0.9 · 初稿（owners: match3-ui-designer + match3-ux-architect）
