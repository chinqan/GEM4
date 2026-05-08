# 03 · 技術基礎 (Technical Foundation)

> **Status**: v1.0 (synced 2026-05-08) · **Owners**: match3-technical-artist (渲染/資產) · match3-ux-architect (state/save)
> **Last updated**: 2026-05-08 · **Phase**: 1 — Foundations

---

## 1. 平台與瀏覽器矩陣 (Platform & Browser Matrix)

### 1.1 目標平台

| 平台 | 版本 | 優先級 |
|---|---|---|
| Desktop Chrome | ≥ 最新前兩個穩定版 | **Tier 1** |
| Desktop Edge (Chromium) | ≥ 最新前兩個穩定版 | **Tier 1** |
| Desktop Firefox | ≥ 最新前兩個穩定版 | **Tier 1** |
| Desktop Safari | ≥ 最新前兩個穩定版 | **Tier 1** |
| Tablet (iOS Safari / Android Chrome) | iOS 15+, Chrome 最新 | **Tier 2** (v1.1+) |
| Mobile Phone | — | **Tier 3** (v2) |

### 1.2 最低硬體假設 (Tier 1)

| 資源 | 最低 |
|---|---|
| CPU | 2015+ Intel i5 / AMD Ryzen equivalent |
| GPU | Intel HD Graphics 520+ / 任意 dedicated GPU ≥ 2014 |
| RAM | 4 GB |
| 解析度 | 1200×800 minimum |
| 網路 | 寬頻 (≥5 Mbps)；initial load ≤ 5 MB |

### 1.3 渲染後端

- **主**：WebGPU（PixiJS 8 原生支援）
- **回退**：WebGL 2.0；若無，回 WebGL 1.0 並降級效果
- **偵測與降級**：啟動時偵測 feature；進入設定的 Graphics preset = Low

#### 1.3.1 偵測流程（canonical）

```typescript
async function detectBackend(): Promise<'webgpu' | 'webgl2' | 'webgl1'> {
  // 1. WebGPU first (Safari 18+, Chrome 113+, Edge 113+)
  if ('gpu' in navigator) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) return 'webgpu';
    } catch { /* fall through */ }
  }
  // 2. WebGL 2
  const gl2 = document.createElement('canvas').getContext('webgl2');
  if (gl2) return 'webgl2';
  // 3. WebGL 1 (last resort)
  const gl1 = document.createElement('canvas').getContext('webgl');
  if (gl1) return 'webgl1';
  // 4. 無任一 → 阻擋啟動並顯示相容性頁面
  throw new Error('GPU acceleration required');
}
```

降級對應 graphics preset：
| Backend | 最高 preset | 強制設定 |
|---|---|---|
| WebGPU | High | — |
| WebGL 2 | High | — |
| WebGL 1 | Low | 關 bloom / idle shimmer / chromatic aberration；粒子 cap 100 |

---

## 2. 引擎與相依 (Engine & Dependencies)

### 2.1 核心

```json
{
  "dependencies": {
    "pixi.js": "^8.18.1",
    "@pixi/ui": "^2.3.2",
    "@pixi/layout": "^2.0.1",
    "@pixi/sound": "^6.0.1",
    "howler": "^2.2.4"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "vite": "^6.3.5",
    "vitest": "^3.1.3",
    "@playwright/test": "^1.59.1",
    "eslint": "^9.39.4",
    "fast-check": "^4.7.0",
    "prettier": "^3.8.3",
    "husky": "^9.1.7",
    "tweakpane": "^4.0.5",
    "stats.js": "^0.17.0"
  }
}
```

### 2.2 音訊庫選擇

> **決策已定**：**`howler`**（Safari autoplay 處理最成熟、跨平台最穩）。
>
> `@pixi/sound` 已從 dependencies 移除。完整驗證見 S07 `07_audio_design.md#library-choice`。

### 2.3 不使用 / 禁止

- 任何 Framework（React / Vue / Svelte）— UI 全由 `@pixi/ui` 或 DOM overlay 處理
- 任何 3D 引擎 / Three.js
- 任何 ECS 重框架（bitecs, ape-ecs）— match-3 不需要，用簡單 class 即可
- 任何 AI 生成素材管線（法律/倫理風險，見 `08_additional_specs.md`）

---

## 3. 專案結構 (Project Structure)

```
gem/
├── public/                      # 靜態資產（favicon, preload html）
├── src/
│   ├── index.ts                 # Entry point
│   ├── app.ts                   # Application bootstrap, PixiJS init
│   │
│   ├── game/                    # 純邏輯，不依賴 Pixi
│   │   ├── rules/
│   │   │   ├── board.ts         # Board state 型別與純函式操作
│   │   │   ├── match-detect.ts  # 消除偵測（3/4/5/T/L）
│   │   │   ├── cascade.ts       # 重力掉落與遞迴消除
│   │   │   ├── scoring.ts       # 計分 + chain 倍率
│   │   │   ├── special-gems.ts  # 特殊寶石生成與啟動邏輯
│   │   │   ├── combo-matrix.ts  # 特殊寶石組合矩陣
│   │   │   ├── rng.ts           # 可種子化的 PRNG
│   │   │   └── __tests__/
│   │   ├── level/
│   │   │   ├── level-spec.ts    # 關卡規格型別
│   │   │   ├── objective.ts     # 目標邏輯（score/clear/collect/drop）
│   │   │   ├── blocker.ts       # jelly/lock/generator 行為
│   │   │   └── levels/          # 逐關 JSON/TS 規格
│   │   └── runtime/
│   │       ├── game-loop.ts     # state + advance hooks
│   │       ├── hint.ts          # 暗示系統
│   │       └── reshuffle.ts     # 無解時重洗
│   │
│   ├── rendering/               # Pixi 專用
│   │   ├── app-layers.ts        # Container 階層
│   │   ├── viewport.ts          # 縮放與 letterboxing
│   │   ├── board-renderer.ts    # 寶石繪製（ParticleContainer-based）
│   │   ├── gem-sprites.ts       # Gem sprite factory + idle shimmer
│   │   ├── special-overlay.ts
│   │   ├── particles.ts         # 粒子系統（Pool-based）
│   │   ├── filters.ts           # BlurFilter / Bloom / Shockwave 組合
│   │   └── design-tokens.ts     # 色 / 尺寸 / 透明度常數
│   │
│   ├── ui/                      # 遊戲內 UI
│   │   ├── theme.ts             # @pixi/ui Theme
│   │   ├── factory.ts           # 按鈕 / 進度條 / 星星等工廠
│   │   ├── screens/
│   │   │   ├── splash.ts
│   │   │   ├── menu.ts
│   │   │   ├── world-map.ts
│   │   │   ├── level-select.ts
│   │   │   ├── game-hud.ts
│   │   │   ├── pause.ts
│   │   │   ├── level-complete.ts
│   │   │   ├── level-fail.ts
│   │   │   └── credits.ts
│   │   └── juice/
│   │       ├── shake.ts
│   │       ├── toast.ts
│   │       └── score-popup.ts
│   │
│   ├── ui-dom/                  # DOM overlay（設定表單、credit）
│   │   ├── settings/
│   │   └── overlay.ts
│   │
│   ├── audio/                   # 音訊
│   │   ├── audio-system.ts      # Howler 包裝 + autoplay unlock
│   │   ├── sfx-catalog.ts       # 事件 → 檔案映射
│   │   ├── adaptive-music.ts    # 垂直層疊 + intensity 計算
│   │   └── buses.ts
│   │
│   ├── state/                   # 全域應用狀態
│   │   ├── app-state.ts         # AppState 聯集型
│   │   ├── state-machine.ts     # 合法轉移表
│   │   ├── save-state.ts        # SaveState 型與 IO
│   │   ├── migrations.ts        # 版本遷移函式
│   │   └── events.ts            # 全域事件 bus（輕量）
│   │
│   ├── input/
│   │   ├── input-system.ts      # 統一滑鼠/觸控/鍵盤
│   │   ├── keybinds.ts          # 可配置快捷鍵
│   │   └── board-input.ts       # 棋盤 drag/tap
│   │
│   ├── i18n/                    # 本地化
│   │   ├── translator.ts
│   │   └── locales/
│   │       ├── zh-TW.json
│   │       └── en.json
│   │
│   ├── telemetry/               # 事件記錄（本機，未來雲端）
│   │   └── events.ts
│   │
│   ├── debug/                   # dev-only（vite env dev）
│   │   ├── stats.ts
│   │   └── tweakpane.ts
│   │
│   └── types/                   # 共用型別宣告
│       ├── stats.js.d.ts
│       └── index.ts
│
├── assets/                      # 原始資產（送 atlas 前）
│   ├── gems/                    # SVG / PNG 原檔
│   ├── ui/
│   ├── particles/
│   ├── worlds/
│   ├── audio/
│   └── fonts/
│
├── build-tools/
│   ├── pack-atlases.mjs         # TexturePacker CLI wrapper 或 free packer
│   └── validate-budgets.mjs     # CI 驗算 atlas / bundle 預算
│
├── tests/
│   ├── unit/                    # Vitest (matches src/**/__tests__/)
│   ├── simulation/              # Headless simulator 腳本
│   └── e2e/                     # Playwright
│
├── docs/
│   ├── gdd/                     # 本 GDD
│   └── workflow/
│
├── .claude/                     # skills + agents
├── vite.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── package.json
└── README.md
```

### 模組邊界鐵律

| 層 | 可依賴 | 不得依賴 |
|---|---|---|
| `game/rules/` | 純 TypeScript | Pixi / DOM / audio / i18n |
| `game/level/` | `game/rules` | Pixi / DOM |
| `game/runtime/` | `game/rules` + `game/level` + `state/events` | Pixi / DOM（透過 event bus 通訊） |
| `rendering/` | `game/*` + Pixi | DOM / audio |
| `ui/` | `rendering` + `game/*` (唯讀) + `@pixi/ui` | DOM（除了 DOM overlay） |
| `audio/` | `game/runtime/events` | Pixi / DOM |
| `state/` | `game/*`（型別） | Pixi / audio / DOM |

**核心原則**：`game/rules` 必須完全純粹、可不依賴瀏覽器測試 → 單元測試能直接跑。

---

## 4. Rendering Architecture

### 4.1 Layer 階層

```
Stage (root)
├── Background Layer          — 世界背景、視差、大氣層（依 World）
├── Board Layer
│   ├── Cell Layer            — 棋盤格線（僅 debug 時可視）
│   ├── Gem Layer             — ParticleContainer: 64 gems 批次渲染
│   ├── Glow Layer            — BlurFilter 應用於此層，非每顆 gem
│   ├── Special Overlay Layer — 特殊寶石動畫（逐幀）
│   └── Selection Ring Layer  — 選取 + hover 環
├── Particle Layer            — Pool-based 粒子效果（match, chain, celebrate）
├── FX Layer                  — Shockwave / Chromatic aberration (chain ≥3)
├── HUD Layer                 — 分數、進度、目標 chip
├── UI Layer                  — 其他浮動 UI（pause、modal...）
├── DOM Overlay (HTML)        — 設定表單、credits scroll
└── Debug Layer               — stats、tweakpane（dev 模式）
```

### 4.2 Filter Stack

- **BlurFilter** 僅在 `Glow Layer` + `FX Layer` 使用；不使用於個別物件
- **Shockwave** 僅於 special-gem 啟動時短暫注入
- **ColorMatrix** 用於 chain ≥3 的 saturation pulse（300ms）
- **Bloom** 屬於 `Glow Layer` 的延伸，屬於 Medium+ preset 才開

### 4.3 Graphics Presets

| Preset | Glow | Bloom | Idle Shimmer | 粒子上限 | 目標 FPS |
|---|---|---|---|---|---|
| **Low** | off | off | off | 100 | 30 (cap) |
| **Medium** | on (quality 1) | off | off | 300 | 60 |
| **High** (預設) | on (quality 2) | on | on | 500 | 60 |

---

## 5. Asset Pipeline

### 5.1 Atlas 規劃

| Atlas | 尺寸上限 | 內容 | 載入時機 |
|---|---|---|---|
| `gems.atlas` | 2048×2048 | 7 色 × 基礎 + 4 種特殊 × 8 幀 + 選取環 | Splash preload |
| `ui.atlas` | 1024×1024 | 按鈕、icon、9-slice chrome、星星 | Splash preload |
| `particles.atlas` | 512×512 | spark, dust, star, shockwave, celebrate | Splash preload |
| `world-{N}.atlas` | 2048×2048 | 背景 tile、前景道具、World 主題元素 | World 進入前 lazy |
| `fonts.atlas` | 2048×1024 | BitmapFont glyphs（數字 + 基本 CJK 子集） | Splash preload |

### 5.2 檔案規格

| 類型 | 原始格式 | 匯出格式 | 尺寸 | 壓縮 |
|---|---|---|---|---|
| 寶石 | SVG | PNG 128×128 | 128×128 | PNG 無損 |
| UI icon | SVG | PNG 64×64 | 64×64 | PNG 無損 |
| 粒子 | PNG | PNG 32–64 | ≤64 | PNG 無損；pre-multiplied alpha |
| 背景 | PSD/PNG | JPG or PNG | ≤1920×1080 | JPG q85（無透明）/ PNG（有透明） |

### 5.3 Manifest 與 Loader

```typescript
// assets/manifest.json (build-generated)
{
  "bundles": {
    "core": {
      "gems": { "atlas": "atlases/gems.a3f9.json", "texture": "atlases/gems.a3f9.png" },
      "ui":   { "atlas": "atlases/ui.b2c7.json",   "texture": "atlases/ui.b2c7.png" },
      "particles": { ... },
      "fonts": { ... }
    },
    "world-1": { ... },
    "world-2": { ... },
    "audio-core": { "core-sfx": "audio/core.ogg.json" }
  }
}
```

Loader 使用 `@pixi/assets` 的 bundle API：
- Splash 進主選單前預載 `core`
- 世界地圖進關卡前預載 `world-{N}`
- 音訊資產與圖像並行預載，但不阻塞 splash 顯示

### 5.4 Cache-Busting

- Atlas 檔名含內容 hash（`gems.a3f9.atlas.png`）
- `manifest.json` 也含 build hash
- `index.html` 的 script tag 使用 Vite 自動 hashed filename

---

## 6. Save State Schema

### 6.1 儲存位置

`localStorage` key = `gem.save.v1`（版本號含在 key 中，方便 migration）

### 6.2 型別定義

```typescript
interface SaveState {
  version: 1;
  profile: {
    createdAt: number;    // epoch ms
    lastSeenAt: number;
    totalPlayMs: number;
  };
  progress: {
    maxUnlockedLevelId: number;
    currentWorldId: number;
    levelRecords: Record<number, LevelRecord>;
    endlessBest: {
      highScore: number;
      longestChain: number;
      gamesPlayed: number;
    };
  };
  settings: {
    audio: {
      masterVol: number;     // 0..1
      musicVol: number;
      sfxVol: number;
      muted: boolean;
    };
    graphics: {
      preset: 'low' | 'medium' | 'high';
      reduceMotion: boolean;
    };
    accessibility: {
      colourBlindMode: 'off' | 'deuteranopia' | 'protanopia' | 'tritanopia';
      highContrast: boolean;
      holdToConfirm: boolean;
    };
    gameplay: {
      hintDelayMs: number;        // 0 = disabled
      autoActivateSpecial: boolean;
      confirmPowerup: boolean;
    };
    language: string;              // BCP-47
    keybinds: Record<string, string>;
  };
  tutorial: {
    completedSteps: string[];
    skippedAll: boolean;
  };
  telemetry: {
    sessionCount: number;
    lastSessionAt: number;
  };
}

interface LevelRecord {
  starsEarned: 0 | 1 | 2 | 3;
  bestScore: number;
  bestMovesRemaining: number;  // -1 if not applicable
  attempts: number;
  firstClearedAt: number;      // epoch ms, 0 if not cleared
  bestChain: number;
}
```

### 6.3 Write 策略

- **Debounced** 500ms（避免連鎖時高頻寫入）
- **關鍵事件立即寫入**：關卡完成、設定變更、tutorial 進度
- **Write 失敗降級**：若 localStorage 滿 / 被 block，顯示 toast「無法儲存進度」，遊戲繼續但警告玩家

### 6.4 Migration 策略

```typescript
// state/migrations.ts
export function migrate(unknown: unknown): SaveState {
  if (!isObject(unknown)) return defaultSaveState();

  const v = (unknown as { version?: unknown }).version;

  if (v === undefined) return defaultSaveState();
  if (v === 1) return unknown as SaveState;

  // Future:
  // if (v === 2) return migrateV2ToV3(unknown);

  // Unknown version (likely newer save from another build): don't destroy.
  console.warn(`Unknown save version ${v}; keeping in escrow, starting fresh.`);
  localStorage.setItem(`gem.save.v1.escrow.${Date.now()}`, JSON.stringify(unknown));
  return defaultSaveState();
}
```

### 6.5 Reset / Export / Import

- **Reset**：清除 localStorage key，回預設；需二次確認
- **Export**：下載 JSON 檔
- **Import**：貼上 JSON；失敗保留現狀，顯示錯誤

---

## 7. State Machine

> **canonical 定義於 `06_game_flow.md#21-狀態列舉` (§2.1)**。本章不重複型別，僅列出執行面契約。

**不變式**：
- 任何 `kind` 的出現必有對應的 render handler
- `transition(from, to)` 函式是唯一更改 state 的入口；直接賦值被 lint 禁止
- State 轉換於 Rules step 內 emit；渲染與音訊透過 event bus 訂閱，不直接讀 state

> 先前版本在此處重複了 `AppState` 型別定義；2026-04-22 改為指向 06§2.1 以避免兩處飄離（F-05 closed）。

---

## 8. Input System

### 8.1 統一抽象

```typescript
interface PointerEvent {
  x: number; y: number;
  pointerId: number;
  type: 'down' | 'up' | 'move' | 'cancel';
  source: 'mouse' | 'touch' | 'pen';
}
```

- 同時處理 mouse / touch / pen，內部不分開
- 棋盤互動支援 tap-tap-swap 與 drag-swap 兩種模式（設定可選）

### 8.2 鍵盤導航（A11y 必備）

| Key | 行為 |
|---|---|
| 方向鍵 | 移動棋盤選取游標 |
| 空白鍵 / Enter | 選取 / 確認交換 |
| ESC | 暫停（遊戲中）/ 返回（其他畫面） |
| Tab / Shift+Tab | UI focus 循環 |
| M | 靜音切換 |
| P | 暫停 / 繼續 |

### 8.3 Keybinds 可配置

儲存於 `settings.keybinds`；設定畫面提供 press-to-bind UI。

---

## 9. Performance Budgets (Hard Limits)

### 9.1 Runtime

| 指標 | Desktop | Tablet (v1.1) |
|---|---|---|
| 目標 FPS | 60 | 60（必要時降 30） |
| 99th percentile frame | ≤ 25ms | ≤ 40ms |
| Draw calls / frame (all-up) | ≤ 80 | ≤ 50 |
| 粒子（同時） | ≤ 500 | ≤ 200 |
| 紋理記憶體 (VRAM) | ≤ 80 MB | ≤ 40 MB |
| 遊戲邏輯 CPU / frame | ≤ 4 ms | ≤ 6 ms |
| GC 壓力 | **零** 在 hot path（強制 pool 化） |

### 9.2 Bundle

| 項目 | 上限 |
|---|---|
| Initial JS (gzipped) | ≤ 500 KB |
| Initial CSS | ≤ 50 KB |
| Initial atlas (core) | ≤ 3 MB |
| Initial audio (core SFX) | ≤ 1 MB |
| Per-world bundle (on-demand) | ≤ 2 MB |
| 總起始 (core + index) | **≤ 5 MB gzipped** |

### 9.3 Memory

- 30 分鐘連續遊玩記憶體成長 ≤ 10 MB
- Level 切換不得累積（每次切關 heap snapshot 差 ≤ 2 MB）

### 9.4 CI Gate

`build-tools/validate-budgets.mjs` 於每次 PR 執行，超過即 fail。

---

## 10. Build & Deployment

### 10.1 Dev 工具鏈

| 工具 | 用途 |
|---|---|
| Vite | Dev server + production build |
| Vitest | Unit / integration tests |
| Playwright | E2E 瀏覽器測試 |
| ESLint + typescript-eslint | Lint |
| Prettier | 格式化 |
| Husky | Git hook（pre-commit: lint + type-check） |
| Tweakpane (dev only) | 遊戲內 live tuning |

### 10.2 Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ci": "vitest run --coverage",
    "test:e2e": "playwright test",
    "simulate": "tsx tests/simulation/run.ts",
    "lint": "eslint . --max-warnings=0",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit",
    "atlas:pack": "node build-tools/pack-atlases.mjs",
    "budgets:validate": "node build-tools/validate-budgets.mjs",
    "prepare": "husky"
  }
}
```

### 10.3 部署

- **Target**：靜態站 (CloudFlare Pages / Netlify / Vercel / GitHub Pages)
- **無後端**：v1 完全 client-side；遙測 v1 也僅本機
- **HTTPS required**（WebGPU 與 Service Worker 前置條件）
- **CDN cache**：immutable 對 hashed 資產；`index.html` 不 cache

### 10.4 環境變數

```bash
# .env.production
VITE_TELEMETRY_ENDPOINT=   # v1 空值（本機 only）
VITE_BUILD_VERSION=        # CI 填入 git SHA
VITE_ENABLE_DEVTOOLS=false
```

---

## 11. Observability (本機)

### 11.1 Dev HUD (Tweakpane, dev 模式)

- FPS / frame time
- Draw call 數
- 粒子數
- Active gems / specials
- 當前 AppState / intensity
- Clock scale（pause / slow-mo / frame-step）

### 11.2 Stats.js（Cmd+Shift+S 切換）

- FPS
- Memory (heap)
- Frame time

### 11.3 Telemetry Events (本機，v1)

> 清單見 `08_additional_specs.md#telemetry`。

---

## 12. Security & Privacy

### 12.1 資料儲存

- v1 **僅本機儲存**；無任何個人資料上傳
- localStorage 不含 PII

### 12.2 第三方資源

- 所有 CDN 資源必須 HTTPS + SRI hash
- 字型 self-host，不從 Google Fonts 動態拉取

### 12.3 瀏覽器權限

- 不要求任何 permission（無相機、麥克風、位置、通知）
- 唯一「請求」是音訊 autoplay unlock，透過使用者手勢完成

---

## 13. Runtime Architecture (canonical, owned by `match3-runtime-architect`)

> 本節規範 **執行層**：規則純函式與渲染/音訊/狀態之間的協調契約。規則邏輯見 `game/rules/`；本節定義「規則如何與世界互動」。

### 13.1 Typed Event Bus

```typescript
// src/state/events.ts

export type GameEvent =
  | { kind: 'app.loaded';            ts: number; durationMs: number }
  | { kind: 'level.started';         levelId: number; seed: bigint }
  | { kind: 'command.applied';       command: Command; tick: number }
  | { kind: 'swap.invalid';          from: [number, number]; to: [number, number] }
  | { kind: 'match.landed';          matches: MatchDescriptor[]; chain: number }
  | { kind: 'cascade.stepBegan';     step: number; drops: ColumnDrop[] }
  | { kind: 'cascade.stepEnded';     step: number }
  | { kind: 'chain.escalated';       from: number; to: number }
  | { kind: 'special.spawned';       at: [number, number]; type: SpecialGemType }
  | { kind: 'special.activated';     at: [number, number]; type: SpecialGemType }
  | { kind: 'combo.triggered';       type: ComboType; originCells: [number,number][] }
  | { kind: 'objective.progressed';  delta: ObjectiveDelta }
  | { kind: 'level.resolved';        result: LevelResult }
  | { kind: 'reshuffle.triggered';   reason: 'noMoves' | 'manual' }
  | { kind: 'hint.shown';            cells: [number, number][] }
  | { kind: 'intensity.updated';     value: number }   // 0..1
  | { kind: 'visibility.resumed';    awayMs: number }
  ;

export type Unsubscribe = () => void;

export interface EventBus {
  emit(event: GameEvent): void;
  on<K extends GameEvent['kind']>(
    kind: K,
    handler: (e: Extract<GameEvent, { kind: K }>) => void
  ): Unsubscribe;
  once<K extends GameEvent['kind']>(
    kind: K,
    handler: (e: Extract<GameEvent, { kind: K }>) => void
  ): Unsubscribe;
}
```

- Event 物件 **pool 化**；handler 不得在同步呼叫結束後保留 event reference。
- Emission 順序於單一 tick 內是 deterministic。
- Bus 同步：event 在同一 tick 內依 emit 順序派送。

### 13.2 Command Queue

```typescript
export type Command =
  | { kind: 'swap';              from: [number, number]; to: [number, number] }
  | { kind: 'activateSpecial';   at: [number, number] }
  | { kind: 'advanceResolving' } // engine-internal，resolving 期間每 tick 一個
  | { kind: 'requestHint' }
  | { kind: 'requestReshuffle' }
  | { kind: 'pause' }
  | { kind: 'resume' };
```

- `kind: 'swap'` 於 `phase: resolving` 期間被拒；`pause` / `requestHint` 永遠接受。
- Drain 順序：FIFO, single-threaded。
- Queue 深度 hard cap = 8（防輸入洪水）。

### 13.3 Fixed-Timestep Game Loop

```
每個 rAF tick：

1. Input step        — OS 事件 → Command queue
2. Rules step (60 Hz 累加器):
     while (accumulated >= 16.667ms):
       - drain 1 Command
       - if resolving: advance 1 cascade sub-step
       - emit events (pool 化，同步消費)
       - accumulated -= 16.667
3. Audio step        — poll intensity；更新 layer gain
4. Render step       — 讀當前 rules snapshot；ticks 間插值
5. Telemetry step    — 1 Hz，flush 累計計數器
```

- Tab 背景化時 rAF 受瀏覽器 throttle；回前景時累加器 clamp 上限 250ms，避免 catch-up 暴衝；同時 emit `visibility.resumed`。

### 13.4 RNG 規格

| 項 | 規格 |
|---|---|
| 演算法 | **Mulberry32**（32-bit state；可序列化；過 TestU01 SmallCrush） |
| 種子 | `level.seed: bigint` (64-bit)；在關卡開始時拆成 4 個 Mulberry32 stream |
| 分流 | `rng.boardInit` / `rng.cascadeFill` / `rng.juice` / `rng.misc` |
| 序列化 | 每 stream 的 32-bit state 存入 SaveState（replay 專用） |
| Determinism 範圍 | `boardInit`, `cascadeFill`, `misc` 必 bit-exact；`juice` 可 desync |

### 13.5 Cascade Timing Model

- 每個 cascade sub-step = 一個 resolve tick。
- Sub-step 時長 = `max(120ms × maxColumnDropDistance, 200ms)`。
- 多欄同時掉落 **並行動畫**；sub-step 結束於最長欄完成動畫之時。
- `ColumnDrop` 型別：`{ column: number; distance: number }`（`column` 為 0-indexed 欄號；`distance` 為該欄總下落格數）。`cascade.stepBegan` 事件的 `drops: ColumnDrop[]` 描述本 step 所有掉落欄。
- `cascade.stepEnded` event 於動畫完成時 emit（非純規則結束時）。
- 規則層產 sub-step 是 synchronous（瞬間）；渲染層透過 animation complete 回調掌握節奏。
- Safety cap：單次玩家 command 最多 50 sub-steps；超過則 emit `bug.cascadeOverrun` 並終止。

### 13.6 End-of-Level Timing（執行面）

實作 01§6.6 的設計意圖：

```
檢測 outOfMoves / outOfTime:
  if (!resolvingInFlight) → 立即 emit level.resolved
  else                    → 等 resolving 完成 → emit level.resolved

檢測 objectiveMet during resolving:
  → 讓 cascade 跑完
  → 若為 moves 模式，播 remaining-moves bonus 動畫（120ms/手）
  → emit level.resolved { cleared: true }
```

### 13.7 Move Counting 執行

實作 01§6.5。執行要點：
- `moves--` 於 `command.applied` (kind: 'swap') 且該 swap 合法時 fire。
- Invalid swap：不 fire `moves--`；emit `swap.invalid`；**無** `command.applied`。
- `activateSpecial` 指令：依 01§6.5 決定是否 `moves--`（v1 預設：玩家直接 tap 啟動時計）。
- Cascade-triggered special：**不** `moves--`（已計過的那手之後果）。

### 13.8 Resource Loading Orchestration

```typescript
export type BundleId =
  | 'core'
  | 'world-1' | 'world-2' | 'world-3' | 'world-4'
  | 'audio-core' | `audio-world-${1|2|3|4}`;

export interface LoadController {
  loadBundle(id: BundleId, priority: 'immediate' | 'background'): Promise<void>;
  cancel(id: BundleId): void;      // idempotent
  onBundleReady(id: BundleId, cb: () => void): Unsubscribe;
}
```

- World-switch cancel：進 W2 而 W1 仍在載 → 立即 cancel W1 非關鍵子資源。
- 若當前 world bundle 未載完而關卡欲啟動 → render 顯示 spinner（不阻塞 main thread）。
- Retry 策略：2 次指數回退（500ms, 2000ms），再失敗才顯示 toast。

### 13.9 Pause / Visibility Contract

| 觸發 | Rules tick | Audio | Render | Timer (time mode) |
|---|---|---|---|---|
| User pause (ESC) | 凍結 | suspended | last frame | 凍結 |
| `visibilitychange: hidden` | 凍結 | suspended | 凍結 | 凍結 |
| `visibilitychange: visible` | 凍結；emit `visibility.resumed` → 顯示「繼續？」覆蓋 | 保持 suspended 直到玩家確認 | 凍結 | 凍結 |
| Settings overlay during game | 凍結 | music suspended；SFX 可選 mute | last frame 暗化 | 凍結 |

### 13.10 Determinism CI Test

```
INPUT: fixed seed S0, fixed 100-command sequence C[]
EXPECT: 連續 3 次 cold-run 產生相同 event log (bit-exact)
SCOPE: GameEvent kind + non-juice payload
```

此測試每次 commit 必跑；若曾經 green 後轉 red，**rules 或 runtime 有不該有的 non-determinism**（通常是漏種子的 Math.random、時間依賴、Set/Map iter 順序）。

---

## 14. Open Questions

| # | 問題 | 影響 | 預計解答時程 |
|---|---|---|---|
| 1 | `@pixi/sound` vs Howler 終選 | S07, S03 | S07 v1.0 前 |
| 2 | WebGPU feature detection 與降級策略細節 | S03 | v1.0 前 |
| 3 | 本地化字串載入策略（全量 vs 按需） | S03, 08 | v1.0 前 |
| 4 | CI budget gate 的具體閾值 | S03, 09 | v1.0 前 |
| 5 | Analytics 未來上雲的 endpoint 契約 | S08 | v1.x |

---

## Changelog

- **2026-05-08** · v1.0 · 同步現行程式碼：音訊庫決策確認為 Howler.js、更新 dependencies 版本號
- **2026-04-21** · v0.9 · 初稿（owners: match3-technical-artist + match3-ux-architect）
