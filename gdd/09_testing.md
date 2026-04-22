# 09 · 測試 (Testing)

> **Status**: v0.9 (draft) · **Owner**: match3-qa-engineer
> **Last updated**: 2026-04-21 · **Phase**: 4 — QA / Testing
>
> 本章橫切前 8 章，建立驗收門檻與測試策略。

---

## 1. 測試策略總覽 (Strategy Overview)

### 1.1 品質支柱

1. **規則引擎 100% 可驗證** — match detect / cascade / scoring / special-gem 皆為純函式，單元測試必覆蓋
2. **模擬器取代盲目測試** — headless simulator 跑 1,000+ seeds 驗證每關的平衡
3. **瀏覽器矩陣真機測試** — 不只跑 CI，關鍵路徑在 Chrome / Firefox / Safari / Edge 都跑 E2E
4. **效能是一等公民** — FPS、記憶體、bundle size 皆在 CI gate
5. **Playtest 有協議有紀錄** — 觀察 ≠ 解讀，分開寫
6. **Release gates 二元** — 全通過才能出，否則不出

### 1.2 測試層級

```
     ┌─────────────────────────────────────────────────┐
     │ Playtest (人類)                                 │   milestone
     ├─────────────────────────────────────────────────┤
     │ E2E (Playwright) — 關鍵路徑                    │   每 PR
     ├─────────────────────────────────────────────────┤
     │ Simulation (headless) — 關卡平衡驗證            │   nightly
     ├─────────────────────────────────────────────────┤
     │ Integration (Vitest + DOM) — UI ↔ state        │   每 commit
     ├─────────────────────────────────────────────────┤
     │ Unit (Vitest) — rules / scoring / save schema  │   每 commit
     └─────────────────────────────────────────────────┘
```

### 1.3 測試工具鏈

| 工具 | 用途 | 執行頻率 |
|---|---|---|
| **Vitest** | 單元 + 整合 | 每 commit (CI) |
| **Playwright** | E2E 瀏覽器 | 每 PR |
| **Headless simulator (自製)** | 關卡 1,000-seed 模擬 | nightly + 手動 |
| **Chrome DevTools Performance API** | FPS / memory profiling | weekly + milestone |
| **Lighthouse CI** | TTI / bundle size | 每 PR |
| **axe-core** | A11y 自動檢查（DOM 部分） | 每 PR |
| **license-checker** | 相依授權合規 | 每 PR |
| **Playtest session 協議** | 人類可玩性 | 每 milestone |

---

## 2. 測試矩陣 (Test Matrix)

| 測試 | 什麼被測 | 工具 | 執行頻率 | 門檻 |
|---|---|---|---|---|
| Unit: rules engine | match/cascade/scoring/special/combo | Vitest | commit | 100% pass |
| Unit: save schema | serialize / migrate / corrupt recovery | Vitest | commit | 100% pass |
| Unit: RNG | seeded reproducibility | Vitest | commit | 100% pass |
| Unit: i18n | 所有 key 有所有 locale | 自製 script | commit | 100% pass |
| Integration: state machine | 所有合法轉移 | Vitest | commit | 100% pass |
| Integration: UI ↔ rules | HUD 反映 rules state | Vitest + JSDOM | commit | 100% pass |
| Integration: settings 即時生效 | 音量/motion 即時套用 | Vitest | commit | 100% pass |
| Simulation: balance | 每關 1000 seeds，win rate 落在帶 | tsx + rules engine | nightly | 見 §4 |
| E2E: splash → L1 → complete | 關鍵路徑無回歸 | Playwright | PR | 100% pass |
| E2E: settings 保留 | refresh 後仍保存 | Playwright | PR | 100% pass |
| E2E: browser matrix | Chrome/FF/Safari/Edge | Playwright | weekly | 100% pass |
| Performance: FPS | 60 FPS 於 worst-case | Playwright + perf API | weekly + milestone | 見 §5 |
| Performance: memory drift | 30 min 成長 | DevTools | milestone | ≤10 MB |
| Performance: bundle | gzipped total | Vite bundle analyzer | PR | ≤5 MB |
| A11y: axe-core on DOM | WCAG AA issues | axe-core | PR | 0 critical |
| A11y: colour-blind | 寶石辨識 | 手動 | milestone | 全通過 |
| A11y: keyboard | 完整 keyboard 操作 | 手動 + Playwright | milestone | 全通過 |
| A11y: motion reduction | toggle 生效 | 手動 + E2E | milestone | 全通過 |
| Playtest: onboarding | L1–L5 無介入完成率 | 人類 | milestone | ≥90% |
| Playtest: fun & frustration | 主觀評分 | 人類 | milestone | 平均 ≥4.0 / 5 |
| i18n: container fit | UI 容器無 clip | 手動 + screenshot 對照 | milestone | 全通過 |
| Audio: autoplay unlock | 4 瀏覽器 | 手動 + E2E | PR | 100% |
| Audio: LUFS conformance | 所有資產符合響度 | 自製 script | 資產更新 | 100% |
| License: dependency | OSS 授權相容 | license-checker | PR | 0 violation |

---

## 3. Unit Test Suite (規則引擎)

### 3.1 match-detection.test.ts

```typescript
describe('match detection', () => {
  it('detects horizontal 3-match', () => { ... });
  it('detects vertical 3-match', () => { ... });
  it('detects 4-match as line bomb candidate', () => { ... });
  it('detects 5-straight as colour gem candidate', () => { ... });
  it('detects T-match as area bomb candidate', () => { ... });
  it('detects L-match as area bomb candidate', () => { ... });
  it('handles overlapping 4+T (tie-break: T wins)', () => { ... });
  it('handles overlapping 5-line + T (tie-break: colour gem wins)', () => { ... });
  it('ignores diagonal lines', () => { ... });
  it('ignores cells marked as empty', () => { ... });
  it('returns empty match list for stable board', () => { ... });
  it('ignores matches through locked cells', () => { ... });
  it('deterministic output for same board', () => { ... });
});
```

### 3.2 cascade.test.ts

```typescript
describe('cascade resolution', () => {
  it('drops gems under gravity column-by-column', () => { ... });
  it('respects empty cells (does not fall through)', () => { ... });
  it('spawns from top with seeded RNG', () => { ... });
  it('produces same cascade for same seed and board', () => { ... });
  it('continues until board is stable', () => { ... });
  it('increments chain counter per cascade step', () => { ... });
  it('caps chain at safety limit 50', () => { ... });
  it('emits events in deterministic order', () => { ... });
});
```

### 3.3 scoring.test.ts

```typescript
describe('scoring', () => {
  it('base 3-match = 60 points', () => { ... });
  it('base 4-match = 120 points', () => { ... });
  it('base 5-match = 200 points', () => { ... });
  it('chain multiplier applied to base', () => { ... });
  it('cascade bonus adds 50 per cascade step', () => { ... });
  it('moves-remaining bonus applied at level complete', () => { ... });
  it('combo score is per combo-matrix table', () => { ... });
  it('no overflow at extreme chains (5 digit score typical)', () => { ... });
});
```

### 3.4 special-gems.test.ts

```typescript
describe('special gem generation', () => {
  it('4-match creates line bomb at swap position', () => { ... });
  it('5-straight creates colour gem', () => { ... });
  it('T-shape creates area bomb', () => { ... });
  it('L-shape creates area bomb', () => { ... });
  it('priority: bigger pattern wins', () => { ... });
});

describe('special gem activation', () => {
  it('line bomb clears whole row', () => { ... });
  it('line bomb (vertical) clears whole column', () => { ... });
  it('area bomb clears 3×3', () => { ... });
  it('area bomb at edge clears only valid cells', () => { ... });
  it('colour gem swapped with regular clears all of that colour', () => { ... });
  it('colour gem isolated (no swap) does nothing until triggered', () => { ... });
});
```

### 3.5 combo-matrix.test.ts

```typescript
describe('special + special combos', () => {
  it('bomb + bomb = 5×5 clear', () => { ... });
  it('bomb + line = 3-wide cross clear', () => { ... });
  it('bomb + colour = all of one colour turn to bombs + activate', () => { ... });
  it('line + line = full row AND column clear', () => { ... });
  it('line + colour = all of one colour turn to line bombs', () => { ... });
  it('colour + colour = full board clear', () => { ... });
  it('colour + colour gives deterministic clear order', () => { ... });
});
```

### 3.6 rng.test.ts

```typescript
describe('seedable PRNG', () => {
  it('same seed produces same sequence', () => { ... });
  it('different seeds produce different sequences', () => { ... });
  it('serializable state (snapshot/restore)', () => { ... });
  it('uniform distribution across bucket', () => { ... });
});
```

### 3.7 board-seeding.test.ts

```typescript
describe('initial board seeding', () => {
  it('produces reproducible board from seed', () => { ... });
  it('guarantees no pre-made matches at init', () => { ... });
  it('guarantees at least one valid move at init', () => { ... });
  it('honours level spec (colour set, weights)', () => { ... });
  it('places pre-seeded gems correctly', () => { ... });
  it('places blockers correctly', () => { ... });
});
```

### 3.8 save-migration.test.ts

```typescript
describe('save state', () => {
  it('default save is valid', () => { ... });
  it('serialized save round-trips', () => { ... });
  it('unknown version saves to escrow, returns default', () => { ... });
  it('corrupt JSON returns default without throw', () => { ... });
  it('partial save merges with defaults', () => { ... });
  it('version 1 → future migration path hooked (no-op currently)', () => { ... });
});
```

### 3.9 i18n-validation.ts (script)

```typescript
// npm run validate:i18n
// 1. Load 所有 locale JSON
// 2. 對比 key set
// 3. 偵測缺 key、多 key
// 4. 偵測 ICU 變數插值不一致
// 5. 偵測長度超出 budget (08§1.4)
```

---

## 4. Headless Simulator

### 4.1 目的

在無 Pixi 環境下執行規則引擎，對每個關卡以多個 seed 自動打到結束，產生統計表。

### 4.2 架構

```
tests/simulation/
├── run.ts               # 主入口 `npm run simulate`
├── policy/
│   ├── random.ts        # 隨機選可行 swap
│   └── greedy.ts        # 優先選 4+ match，其次隨機
├── stats.ts             # 統計收集
└── report.ts            # 產出報告 (JSON + markdown)
```

### 4.3 執行參數

```bash
# 預設：對所有關卡各跑 1000 個 seed
npm run simulate

# 指定關卡
npm run simulate -- --level 7

# 指定策略
npm run simulate -- --policy greedy --seeds 500

# 存報告
npm run simulate -- --out docs/sim-reports/2026-04-21.md
```

### 4.4 收集指標

每關：

- Win rate
- Median moves remaining at win
- Median score
- Star distribution (0★/1★/2★/3★)
- Chain count distribution (max chain per run histogram)
- Special spawn counts by type
- Reshuffle events count
- Any hanging seed (>5s compute)

### 4.5 驗收門檻

| 關卡類型 | Win rate (random policy) | Win rate (greedy policy) |
|---|---|---|
| 教學 (L1–L5) | 60–90% | 90–100% |
| 標準 rest | 40–70% | 75–90% |
| 標準 climb | 25–50% | 55–80% |
| Gate | 15–40% | 35–60% |
| Boss | 10–30% | 25–50% |

- 任何關卡 greedy 勝率 <15% → 可能過難，回報 level-designer
- 任何關卡 random 勝率 >90% → 可能過鬆，回報 level-designer
- 任何 seed hang → 視為 bug，回報 engine

### 4.6 Simulator 本身的測試

Simulator 作為測試工具，本體也需單元測試：

```typescript
describe('simulator', () => {
  it('random policy picks a legal swap if one exists', () => { ... });
  it('greedy policy prefers 4-match over 3-match', () => { ... });
  it('terminates on outOfMoves / outOfTime', () => { ... });
  it('terminates on objectiveMet', () => { ... });
  it('never exceeds 10000 simulated steps per run (safety cap)', () => { ... });
});
```

---

## 5. 效能測試 (Performance)

### 5.1 FPS 測試

**Harness**：Playwright 啟動瀏覽器 → 載入遊戲 → 啟用 stats overlay → 執行預定義腳本 → 收集 FPS。

**腳本**：
1. 載入 L20 (World 1 boss；複雜盤面)
2. 自動執行 5 次大連鎖交換（預先錄製）
3. 達到 level complete（含粒子慶祝）
4. 記錄整段的 FPS 與 frame time histogram

**驗收**：
- Sustained FPS median ≥ 55
- 99p frame ≤ 25ms
- 無 frame > 50ms (stutter) 連續出現 ≥3 次

### 5.2 Memory Drift 測試

**腳本**：
1. 重複：載入關卡 → 完成 → 回地圖 → 下一關
2. 每 5 關抓 heap snapshot
3. 跑 30 分鐘

**驗收**：
- 30 min 後 heap 成長 ≤ 10 MB
- 無持續成長曲線（應為平穩）

### 5.3 Bundle Size

`build-tools/validate-budgets.mjs`：

```javascript
const budgets = {
  'dist/index.html': 50 * 1024,
  'dist/assets/*.js': 500 * 1024,      // gzipped
  'dist/atlases/gems.*.png': 3 * 1024 * 1024,
  // ...
  'dist/**/*': 5 * 1024 * 1024,        // total gzipped
};
```

CI 於 PR 時執行，超過閾值 fail。

### 5.4 Lighthouse CI

對 preview build 跑 Lighthouse：

| 指標 | 門檻 |
|---|---|
| Performance | ≥ 85 |
| Accessibility | ≥ 90 |
| Best Practices | ≥ 90 |
| SEO | ≥ 80 (不核心但值得看) |

### 5.5 GPU Profiling (手動里程碑)

每 milestone：

- Chrome DevTools Performance tab
- 記錄：GPU time per frame at worst-case
- 記錄：draw call 數
- 紀錄到 `docs/perf-reports/{date}.md`

---

## 6. Playwright E2E

### 6.1 測試清單

```
e2e/
├── happy-path.spec.ts          # splash → menu → L1 → complete
├── settings-persist.spec.ts    # 改設定 → reload → 仍生效
├── pause-resume.spec.ts        # 暫停 → 恢復 → 狀態保留
├── keyboard-nav.spec.ts        # 全鍵盤 L1 完成
├── fail-retry.spec.ts          # 失敗 → retry → 再成功
├── world-switch.spec.ts        # World 1 → 完成 → World 2 解鎖
├── audio-unlock.spec.ts        # splash tap → audio 啟動
└── colourblind-mode.spec.ts    # 切換色盲模式 → 寶石 tint 改變
```

### 6.2 瀏覽器矩陣

```typescript
// playwright.config.ts
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  { name: 'edge',     use: { ...devices['Desktop Edge'], channel: 'msedge' } },
]
```

### 6.3 CI 執行

- PR：chromium + webkit（最重要兩大引擎，加快）
- Nightly：全矩陣（4 個）

---

## 7. Accessibility Testing

### 7.1 自動化

- **axe-core**：跑 DOM settings 畫面與 credits；0 critical 才 pass
- **Playwright + @axe-core/playwright**：集成於 E2E

### 7.2 手動

每 milestone：

- **Colour-blind simulator** (Chrome extension)：確認 4 種模式下寶石可辨
- **Keyboard only**：完成 L1–L5 無滑鼠
- **Screen magnifier at 200%**：HUD 不破
- **Reduced motion**：視覺幅度符合預期

---

## 8. Playtest Protocol

### 8.1 招募與同意

- 找 5–8 位測試者，橫跨受眾 personas（見 01§2）
- 每人簽測試同意書（錄影 / 錄音 / 匿名化資料）
- 報酬：USD 40 / session（proposed，canonical 見 `08_additional_specs.md#84-playtest-預算proposed`）

### 8.2 單次 session (60 min)

```
Part A — Briefing (5 min)
  · 解釋流程，不解釋遊戲
  · 請他們「think aloud」

Part B — First Session (20 min, 不介入)
  · 觀察並記錄：
    - Hesitations (停頓 >5s 的位置)
    - 情緒表現 (笑、皺眉、嘆氣)
    - 誤解 (「我以為這顆寶石會…」)

Part C — Probing (10 min)
  · 問：「你在做什麼？」「你覺得這顆特殊寶石是做什麼的？」

Part D — Continued Play (15 min)
  · 繼續觀察

Part E — Debrief (10 min)
  · 最喜歡的瞬間？
  · 最挫折的瞬間？
  · 有什麼不懂的？
  · 會再玩嗎？
```

### 8.3 紀錄格式

```markdown
## Playtest Session — [Tester ID] — [Date]

### Observations (what happened)
- Tester hesitated 8s at L4 start before first move
- Said "I don't know what this one does" when seeing colour gem (L4 end)
- Completed L1–L3 with no prompts; L4 required 3 tries
- Laughed at chain ≥4 visual
- Frustrated sigh at L5 end (5-match T)

### Interpretations (what I think it means)
- L4 might need a better pre-seeded hint for colour gem spawn
- L5 T-match is too subtle in its spawn cue
- Chain visuals are resonant — keep

### Proposed Actions
- Level-designer: revise L5 pre-seed to make T more obvious
- UI-designer: strengthen colour gem spawn visual
- Keep chain-escalate visuals as-is
```

### 8.4 驗收（milestone 級）

- 完成率 L1–L5 無介入：≥90%
- 平均「好玩」評分：≥4.0 / 5
- 「會再玩」比例：≥70%
- 不報告 S0/S1 bug

---

## 9. Bug Severity

### 9.1 定義

| 等級 | 定義 | 例 |
|---|---|---|
| **S0 (Blocker)** | 崩潰、存檔壞、soft-lock | splash 永遠不進 menu、save 資料消失 |
| **S1 (Critical)** | 破壞核心玩法、<30 FPS、A11y fail | 消除不產生分數、L5 無法通關 |
| **S2 (Major)** | 煩但可玩、視覺/音訊回歸 | 某 World 音樂不播、star reveal 動畫斷 |
| **S3 (Minor)** | 邊緣視覺瑕疵、copy typo | 某 tooltip 文字偏移 2px |
| **S4 (Trivial)** | 美中不足 | 想加更多粒子在 chain 7+ |

### 9.2 Issue Template

```markdown
**Severity**: S[0–4]
**Platform**: Chrome 121 / Firefox 115 / Safari 17 / Edge 121
**OS**: macOS 14 / Windows 11 / ...
**Build**: commit SHA / build version
**Reproduction**:
  1. ...
  2. ...
**Expected**: ...
**Actual**: ...
**Screenshot / Video**: ...
**Save file (if relevant)**: attach
```

### 9.3 Triage 節奏

- 內容期 (content-heavy)：每日 triage
- 預發期 (pre-launch 2 週)：每日晨會 triage
- 平日：每週 1 次

---

## 10. Release Gates (硬性門檻)

v1.0 出貨前必須 **全部** 通過：

- [ ] 所有 unit tests green (CI)
- [ ] 所有 integration tests green
- [ ] E2E happy-path 於 Chrome + Firefox + Safari + Edge 全 pass
- [ ] **0 open S0 / S1 bugs**
- [ ] Headless simulator：所有 shipping 關卡 win rate 落在設計帶
- [ ] 效能：desktop sustained ≥55 FPS at worst case, 30-min memory drift ≤10 MB
- [ ] Bundle：initial ≤5 MB gzipped, 總音訊 ≤8 MB
- [ ] A11y：axe-core 0 critical；色盲 + 鍵盤 + motion-reduction 手動通過
- [ ] Save schema v1 migration 通過（即便 v1 沒有前版本，需走過程）
- [ ] i18n：所有 shipping locales key 完整、container fit 通過
- [ ] Audio：autoplay unlock 4 瀏覽器全通；LUFS 合規
- [ ] License：所有 dependency 授權合規；credits 列完整
- [ ] Playtest：L1–L5 無介入完成率 ≥90%；平均評分 ≥4.0
- [ ] Telemetry：本機事件寫入無錯；saveState.telemetry 正確累計

---

## 11. CI / CD Pipeline

### 11.1 PR 階段

```yaml
on: pull_request
jobs:
  - type-check
  - lint
  - unit-test (Vitest)
  - integration-test (Vitest + JSDOM)
  - build
  - bundle-size-check
  - e2e (Chromium + WebKit)
  - lighthouse-ci (preview deploy)
  - license-check
```

- 任一 fail → block merge

### 11.2 Nightly

```yaml
on: schedule (02:00 UTC)
jobs:
  - full e2e matrix (Chromium, Firefox, WebKit, Edge)
  - headless simulator (all levels, 1000 seeds each)
  - simulation-report 產出 → PR comment / Slack
```

### 11.3 Release

- 手動觸發
- 執行完整 release gates 檢查
- Green 才允許 publish

---

## 12. Open Questions

| # | 問題 | 備註 |
|---|---|---|
| 1 | Simulator policy 是否再加 pro policy (optimal solver)? | v1 不需要；v1.x 以優化平衡可考慮 |
| 2 | Visual regression testing 是否加入？ | 建議 v1 加（Playwright 截圖對照）；工具鏈待選 |
| 3 | Load testing 是否需要？ | v1 無後端，不需；未來雲端再議 |
| 4 | 是否導入 Sentry 收錯誤？ | v1 僅本機 console；未來雲端再評 |
| 5 | Playtest 報酬預算 | 待定 |

---

## Changelog

- **2026-04-21** · v0.9 · 初稿（owner: match3-qa-engineer）
