# 圖譜行動計畫 — GEM4

> 產出日期：2026-05-07
> 基於：graphify-out/GRAPH_REPORT.md (1295 nodes, 2381 edges, 152 communities)

---

## 優先行動總覽

| # | 問題摘要 | 風險 | 行動 | 信心 |
|---|----------|------|------|------|
| 1 | `BoardInput` 跨社群橋接 | Low | 不需行動（正常架構） | High |
| 2 | `BoardRenderer` 跨 4 社群橋接 | Medium | 檢視耦合度，考慮介面抽象 | Medium |
| 3 | `GameIntegration` 跨社群橋接 | Low | 不需行動（設計如此） | High |
| 4 | `getCell()` 30 條 INFERRED 邊 | Low | 大部分正確，少數可移除 | High |
| 5 | `createGem()` 11 條 INFERRED 邊 | Low | 全部正確 | High |
| 6 | `detectMatches()` 10 條 INFERRED 邊 | Low | 全部正確 | High |
| 7 | 170 個孤立節點 | Low | 不需行動（工具函式/配置檔） | High |

---

## 逐題分析

### Q1: 為什麼 `BoardInput` 連接了「Board Input Controller」和「Game Loop & Integration」？

**揭示的架構議題**：輸入控制器是否過度耦合遊戲邏輯？

**圖譜查詢**：`/graphify explain "BoardInput"`

**基於圖譜的回答**：

`BoardInput`（degree=20）的所有邊都是 EXTRACTED，來源為 `src/input/board-input.ts`。它連接到：
- `keybinds.ts`（imports）
- `input-system.ts`（imports）
- `game-integration.ts`（imports — 被 GameIntegration 使用）

跨社群的橋接是因為 `GameIntegration` import 了 `BoardInput`，這是正常的組合模式：GameIntegration 作為頂層協調器，組合輸入、渲染、遊戲邏輯。

**受影響模組**：
- `src/input/board-input.ts`
- `src/integration/game-integration.ts`

**風險等級**：Low

**根本原因**：`BoardInput` 是純輸入處理器，透過回呼（`onSelectionChange`、`trySwap`）與外部溝通，不直接依賴遊戲邏輯。橋接是因為 `GameIntegration` 組合了它。

**具體方案**：不需行動。這是正確的依賴方向（Integration → Input），符合 GDD §3 的 Module Boundary Rules。

**驗證步驟**：
```bash
grep -n "import.*BoardInput" src/integration/game-integration.ts
```

**信心等級**：High

---

### Q2: 為什麼 `BoardRenderer` 連接了「Board Renderer」、「Synth SFX Engine」、「Blocker Mechanics」、「Game Loop & Integration」？

**揭示的架構議題**：渲染器是否承擔了過多職責？為何與音效引擎有關聯？

**圖譜查詢**：`/graphify explain "BoardRenderer"`

**基於圖譜的回答**：

`BoardRenderer`（degree=26）的邊全部是 EXTRACTED。跨社群連接來自：
- `board-animator.ts`（imports BoardRenderer）— 動畫器需要操作渲染器的 sprites
- `game-integration.ts`（imports BoardRenderer）— 頂層協調器組合渲染器

與「Synth SFX Engine」的連接是**間接的**：`board-animator.ts` 同時 import 了 `BoardRenderer` 和 `synth-sfx.ts`（播放音效），因此在社群偵測中被歸為橋接。BoardRenderer 本身不直接呼叫音效。

**受影響模組**：
- `src/rendering/board-renderer.ts`
- `src/rendering/board-animator.ts`
- `src/integration/game-integration.ts`

**風險等級**：Medium

**根本原因**：`BoardAnimator` 同時依賴渲染（BoardRenderer）和音效（synth-sfx），使得 BoardRenderer 在圖譜中間接連接到音效社群。這不是 BoardRenderer 的問題，而是 BoardAnimator 的職責範圍較廣。

**具體方案**：
1. **短期**：不需修改，目前架構可接受
2. **中期改善**：考慮將 BoardAnimator 的音效觸發抽離為獨立的 `AnimationSfxBridge`，讓動畫器只負責視覺，音效由橋接層處理

```typescript
// 可選的未來重構方向
interface AnimationEvents {
  onMatchCleared(count: number, chain: number): void;
  onComboTriggered(): void;
  onInvalidSwap(): void;
}
```

**驗證步驟**：
```bash
grep -n "import.*synth-sfx\|import.*playMatch\|import.*playCombo" src/rendering/board-animator.ts
```

**信心等級**：Medium

---

### Q3: 為什麼 `GameIntegration` 連接了「Game Integration Layer」和「Game Loop & Integration」？

**揭示的架構議題**：GameIntegration 是否是 God Object？

**圖譜查詢**：`/graphify explain "GameIntegration"`

**基於圖譜的回答**：

`GameIntegration`（degree=22）的邊全部是 EXTRACTED，全部是 method 和 contains 關係。它有 19 個方法，涵蓋：
- 狀態機管理（`loadStateMachine`, `transitionTo`, `onStateChanged`）
- 關卡生命週期（`startLevel`, `teardownGameSession`, `emitLevelResolved`）
- UI 更新（`updateHud`, `updateSplashProgress`）
- 除錯工具（`initDebugTools`）

**受影響模組**：`src/integration/game-integration.ts`

**風險等級**：Low

**根本原因**：`GameIntegration` 是設計上的頂層協調器（Orchestrator Pattern），負責組合所有子系統。它的高 degree 是因為方法多，不是因為不當耦合。每個方法都委派給對應的子系統。

**具體方案**：不需行動。這是 GDD §3 定義的 Game Integration Orchestrator 模式。

**信心等級**：High

---

### Q4: `getCell()` 的 30 條 INFERRED 邊是否正確？

**揭示的架構議題**：AST 推斷的呼叫關係是否準確？

**圖譜查詢**：`/graphify explain "getCell()"`

**基於圖譜的回答**：

`getCell()`（degree=50）有 30 條 INFERRED 邊，全部是 `calls` 關係，指向：
- `game-session.ts` 的方法（`.executeActivation()`, `.snapshotColoursAt()`, `.runCascadeLoop()` 等）
- `game-loop.ts` 的方法（`.processSwap()`, `.processMatches()` 等）
- `reshuffle.ts` 的函式（`placeBLockers()`）

**驗證結果**：

這些 INFERRED 邊的方向是**反向的**。實際上是 `game-session.ts` 的方法呼叫 `getCell()`，而非 `getCell()` 呼叫它們。AST 提取器在推斷跨檔案呼叫時，將「被呼叫者」和「呼叫者」的方向搞反了。

然而，這不影響圖譜的導航價值——邊的存在仍然正確表達了「這些模組之間有依賴關係」。

**受影響模組**：
- `src/game/rules/board.ts`（定義 `getCell`）
- `src/game/runtime/game-session.ts`（呼叫 `getCell`）
- `src/game/runtime/game-loop.ts`（呼叫 `getCell`）

**風險等級**：Low

**根本原因**：AST 提取器對跨檔案的 `calls` 關係使用啟發式推斷，方向可能不精確。

**具體方案**：不需修改程式碼。若要修正圖譜精確度，可在下次完整 `/graphify` 時改善提取邏輯。

**驗證步驟**：
```bash
grep -n "getCell" src/game/runtime/game-session.ts | head -5
```

**信心等級**：High

---

### Q5: `createGem()` 的 11 條 INFERRED 邊是否正確？

**揭示的架構議題**：寶石建立函式的依賴關係是否被正確追蹤？

**圖譜查詢**：`/graphify explain "createGem()"`

**基於圖譜的回答**：

11 條 INFERRED 邊全部是 `calls` 關係：
- `placeGem()`（4 次，來自不同測試檔案）
- `fillBoardNoMatches()`, `reshuffle()`, `fillFromTop()`, `fillBoard()`
- `setGem()`, `createBoardWithGems()`

**驗證結果**：全部正確。`createGem()` 確實被這些函式呼叫來建立新的寶石物件。

**風險等級**：Low

**具體方案**：不需行動。

**信心等級**：High

---

### Q6: `detectMatches()` 的 10 條 INFERRED 邊是否正確？

**揭示的架構議題**：消除偵測的呼叫鏈是否完整？

**圖譜查詢**：`/graphify explain "detectMatches()"`

**基於圖譜的回答**：

10 條 INFERRED 邊：
- `scoreSwap()` — ✅ 正確，scoreSwap 呼叫 detectMatches 來評估交換價值
- `.runCascadeLoop()` — ✅ 正確，cascade 迴圈中偵測新 match
- `.doSwap()`, `.doNormalSwap()`, `.processSwap()` — ✅ 正確，交換處理流程
- `findValidSwaps()` — ✅ 正確，尋找有效交換時需偵測 match
- `initBoard()`, `reshuffle()` — ✅ 正確，初始化/重洗時確認無預存 match
- `assertBoardValid()` — ✅ 正確，測試輔助函式
- `runCascade()` — ✅ 正確，cascade 核心邏輯

**風險等級**：Low

**具體方案**：不需行動。所有 INFERRED 邊都正確反映了實際的呼叫關係。

**信心等級**：High

---

### Q7: 什麼連接了 170 個孤立節點到系統其餘部分？

**揭示的架構議題**：是否有未被追蹤的重要依賴？

**圖譜查詢**：`/graphify query "isolated nodes"`

**基於圖譜的回答**：

170 個孤立節點（degree ≤ 1）主要是：
- **配置檔**：`playwright.config.ts`, `vite.config.ts`, `eslint.config.mjs`
- **SFX 生成腳本的內部函式**：`generateWav()`, `swoosh()`, `thud()`, `dropImpact()`
- **build-tools 的工具函式**：`collectFiles()`, `formatBytes()`
- **測試 mock 物件**：`MockGraphics`, `MockContainer`, `MockHowl`

**風險等級**：Low

**根本原因**：這些節點是：
1. 獨立的配置檔（不被其他模組 import）
2. build-tools 中的內部函式（只在腳本內使用）
3. 測試中的 mock 物件（只在測試檔案內定義和使用）

它們不需要與主系統有邊連接。

**具體方案**：不需行動。可考慮在 `.graphifyignore` 中排除 `playwright.config.ts`、`vite.config.ts` 等配置檔以減少噪音。

**信心等級**：High

---

## 下一步行動

### 立即可執行

無。目前架構健康，所有 Suggested Questions 揭示的都是正常的架構模式。

### 中期改善

1. **BoardAnimator 音效解耦**（Q2）：考慮將 `board-animator.ts` 中的 `playMatchSfx`/`playCombo`/`playInvalid` 呼叫抽離為事件驅動模式，讓動畫器只發出事件，由 AudioSystem 的 EventBus 監聽處理。這會：
   - 降低 BoardAnimator 的跨社群耦合
   - 讓音效觸發邏輯集中在 AudioSystem
   - 使 BoardAnimator 更容易測試（不需 mock 音效模組）

2. **圖譜精確度**（Q4）：INFERRED 邊的方向有時是反的（被呼叫者→呼叫者）。下次完整重建圖譜時可改善。

### 不需要行動

- Q1（BoardInput 橋接）— 正常的 Integration→Input 依賴
- Q3（GameIntegration 高 degree）— 設計上的 Orchestrator
- Q5（createGem INFERRED 邊）— 全部正確
- Q6（detectMatches INFERRED 邊）— 全部正確
- Q7（孤立節點）— 配置檔和工具函式，不需連接

---

## 整體架構健康度評估

| 指標 | 值 | 評價 |
|------|-----|------|
| God Nodes（degree > 20） | 10 個 | 正常，都是核心抽象 |
| INFERRED 邊比例 | 10%（238/2381） | 健康，大部分是 EXTRACTED |
| INFERRED 平均信心 | 0.81 | 良好 |
| 孤立節點 | 170/1295（13%） | 可接受，多為配置/工具 |
| 社群數 | 152 | 模組化程度高 |

**總評：8/10** — 架構清晰、模組邊界明確、依賴方向正確。唯一可改善的是 BoardAnimator 的音效耦合，但這是低優先級的重構。
