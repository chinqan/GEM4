# GDD vs 程式碼實作差異分析 — 2026-05-14

> 本文件從程式碼角度回推 GDD 完整度，分三個面向列出差異。

---

## 面向一：GDD 有規格但程式尚未實作

| # | GDD 規格 | 來源章節 | 說明 |
|---|---|---|---|
| 1 | **Service Worker 離線快取** | 03§10.3, 06§6.2 | GDD 明確要求 SW 快取核心 bundle + 已載入 world bundle，程式碼中完全無 SW 實作 |
| 2 | **Headless Simulator** | 09§4 | GDD 規劃 `tests/simulation/` 含 random/greedy policy，程式碼中無此模組 |
| 3 | **成就系統 (Achievements)** | 08§5 | GDD 定義了 Progression/Mastery/Combo/Endurance 等成就類型，程式碼中無任何 achievement 相關邏輯 |
| 4 | **Ambience Bus（環境音匯流排）** | 07§4.6, 07§5 | GDD 定義了 Ambience bus + per-world 預設音量，程式碼 `buses.ts` 僅有 master/music/sfx 三條 bus |
| 5 | **Per-World 環境音** | 07§4.6 | 每世界獨立環境氛圍音（風聲、水滴、星塵粒子等），程式碼無此實作 |
| 6 | **垂直層疊音樂 4 stem** | 07§4.2 | GDD 要求每世界音樂匯出 L0~L3 四層 stem 依 intensity 疊加，程式碼 `adaptive-music.ts` 架構存在但無實際音樂資產串接 |
| 7 | **Ducking 機制** | 07§4.4 | Stinger 觸發時 Music bus -6dB，程式碼中無 ducking 實作 |
| 8 | **Boss 關特殊規則執行** | 02§2.3.1 | `specialRules` 欄位已宣告（如 `immovableCore`, `splitBoard`, `coreColourShift`），但遊戲邏輯中無對應的執行程式碼 |
| 9 | **分割盤面 (Split Board)** | 02§5.2 | W4 某些關卡宣告 `splitBoard`，但 board 模型不支援雙盤面 |
| 10 | **Lumi 角色 / Flavour Copy 顯示** | 04§5.2, 04§6 | GDD 定義了連鎖讚美、失敗鼓勵、大連鎖慶祝文案，程式碼中無 flavour copy 顯示邏輯 |
| 11 | **Loading / World-Map Hover 提示** | 04§6.4, 08§10.4 | 15 條 loading 提示文案，程式碼中無顯示機制 |
| 12 | **字型 Subset 工具鏈** | 08§7.1 | GDD 規劃 `pyftsubset` 工具鏈將思源字型 18MB→1.2MB，程式碼中無此 build step |
| 13 | **自訂字型載入** | 04§8, 05§2.2 | GDD 指定 Cinzel/Inter/JetBrains Mono/思源黑體/思源宋體，settings-form 有 CSS 引用但無字型檔 self-host |
| 14 | **iOS 低電量節流策略** | 07§4.7 | 偵測低電量後降層、mute ambience、壓縮 stinger，程式碼無此邏輯 |
| 15 | **Tooltip 元件** | 05§3.9 | GDD 定義了 hover 200ms 後顯示的 tooltip，程式碼中無此 UI 元件 |
| 16 | **World Entry/Exit 文案** | 04§4.2, 08§10.5 | 每世界進入/完成時的敘事文案，程式碼中無顯示 |
| 17 | **World 完成動畫** | 05§5.3 | 全畫面黃金粒子雨 1.5s + 世界解鎖動畫，程式碼中無此特殊動畫 |
| 18 | **Daily Seed Challenge** | 01§6.7 | 標記為 v1.1 defer，但 GDD 已登記 OQ-28 |
| 19 | **Visual Regression Testing** | 09§12 | GDD 建議 v1 加入 Playwright 截圖對照，目前未實作 |
| 20 | **LUFS 自動分析** | 07§10.3, 09§2 | CI 中應有音訊響度檢查，目前無此 script |
| 21 | **i18n 驗證 script** | 09§3.9 | `npm run validate:i18n` 檢查缺 key/長度超標，程式碼中無此 script |
| 22 | **Render Scale 設定** | 05§9.9 | Settings 中 50%/75%/100% render scale 選項，程式碼 settings-form 中無此控制項 |
| 23 | **Confirm before using hint** | 08§4 | Gameplay 設定中的「使用提示前確認」toggle，程式碼中無此設定 |
| 24 | **Auto-activate special gems** | 08§4 | Gameplay 設定中的「鄰近消除自動啟動特殊寶石」toggle，程式碼中無此邏輯 |
| 25 | **Swap mode 選擇** | 08§4 | Drag-swap vs Tap-tap-swap 設定切換，程式碼中兩種模式都支援但無設定 UI 切換 |
| 26 | **記憶體壓力偵測** | 06§6.4 | 偵測 `performance.memory` 過高時限制粒子，程式碼中無此邏輯 |
| 27 | **瀏覽器重新整理後狀態恢復** | 06§6.5 | 下次開啟回到上次 AppState + 「繼續？」選項，程式碼中無此恢復邏輯 |
| 28 | **多頁籤 timestamp 競態處理** | 06§6.6 | localStorage 寫入競態透過 timestamp 解決，程式碼 `edge-cases.ts` 有架構但未完整 |

---

## 面向二：程式已實作但 GDD 未提及

| # | 程式實作 | 檔案位置 | 說明 |
|---|---|---|---|
| 1 | **BoardInteraction 類別** | `src/input/board-interaction.ts` | 獨立的棋盤互動封裝層，GDD 僅描述 `board-input.ts`，未提及此中間層 |
| 2 | **StagedBlast 純函式模組** | `src/rendering/staged-blast.ts` | Color Gem 三階段爆破的純計算模組（Mark→Brew→Blast timeline），GDD 描述了視覺效果但未規劃獨立模組 |
| 3 | **GraphicsPool 物件池** | `src/rendering/graphics-pool.ts` | 預分配 Graphics 物件池避免 per-frame allocation，GDD 僅提「pool 化」概念未具體規劃此類別 |
| 4 | **ScreenRouter 獨立模組** | `src/integration/screen-router.ts` | 從 GameIntegration 抽出的畫面導航路由器，GDD 未規劃此分離 |
| 5 | **GameSessionController** | `src/game/runtime/game-session.ts` | 54K 行的純邏輯 session 控制器，GDD 的 `game-loop.ts` 規劃較簡單，實際拆分為 GameLoop + GameSession 雙層 |
| 6 | **BoardAnimator 獨立模組** | `src/rendering/board-animator.ts` | 63K 行的動畫編排器，GDD 未規劃此獨立模組（原設計動畫邏輯在 board-renderer 內） |
| 7 | **Jelly SFX 合成音** | `src/audio/jelly-sfx.ts` | Web Audio API oscillator 合成的果凍音效，作為 WAV 交付前的 fallback，GDD 未提及合成音方案 |
| 8 | **SFX Player 統一介面** | `src/audio/sfx-player.ts` | 統一的音效播放便捷函式層，GDD 僅規劃 SfxCatalog，未提及此額外封裝 |
| 9 | **Test Mode 選擇子選單** | `src/ui/screens/test-mode-select.ts` | 開發用測試場景選擇 UI，GDD 無此規劃 |
| 10 | **4 個測試關卡** | `src/game/level/levels/test-mode.ts` | 自由遊玩、果凍測試、炸彈測試、無解重洗測試，GDD 無此規劃 |
| 11 | **PM2 部署腳本** | `ecosystem.config.cjs`, `run_pm2.sh` | PM2 進程管理部署，GDD 僅提靜態站部署 |
| 12 | **Performance Validation 工具** | `build-tools/perf-validation.mjs` | FPS/memory/draw call 驗證腳本，GDD 提到概念但未規劃獨立工具 |
| 13 | **Production Validation 工具** | `build-tools/validate-production.mjs` | 生產環境驗證，GDD 未提及 |
| 14 | **Atlas Packing 工具** | `build-tools/pack-atlases.mjs` | 使用 free-tex-packer-core + sharp 的自製 atlas 打包，GDD 提到 TexturePacker CLI wrapper 但實際用了不同方案 |
| 15 | **Particle Atlas 分離** | `public/assets/atlases/particle-atlas.*` | 粒子獨立 atlas，GDD 規劃 `particles.atlas` 512×512 但未提及與 game-atlas 分離的具體做法 |
| 16 | **DOM Overlay 設定系統** | `src/ui-dom/settings/` | 完整的 DOM 設定表單含 CSS-in-JS 樣式，GDD 提到 DOM overlay 但未詳細規劃實作架構 |
| 17 | **Delivery Items 機制** | `src/game/rules/cascade.ts` | `collectDeliveryItems` + `deliveryItems` 初始位置，GDD 僅提 delivery cell 但未提獨立物件掉落 |
| 18 | **Edge Cases 模組** | `src/state/edge-cases.ts` | 獨立的邊界情況處理模組（tab visibility、beforeunload、storage 降級），GDD 描述行為但未規劃獨立模組 |

---

## 面向三：程式做法與 GDD 規格不同

| # | GDD 規格 | 程式實作 | 差異說明 |
|---|---|---|---|
| 1 | **音訊庫：Howler.js 唯一** | Howler.js + Web Audio API 合成 | GDD 選定 Howler.js 為唯一音訊庫，程式額外使用 Web Audio API oscillator 合成果凍音效（`jelly-sfx.ts`） |
| 2 | **Bus 架構：4 條 bus** | 3 條 bus (master/music/sfx) | GDD 定義 Master→Music/SFX/Ambience 四層，程式僅實作 master/music/sfx 三條，無 Ambience bus |
| 3 | **SFX Bus 子分類** | 無子分類 | GDD 定義 SFX 下分 Gameplay/UI/Stinger 三子 bus，程式碼中 SFX 為單一 bus |
| 4 | **Voice cap 32 全系統** | 無全域 voice cap | GDD 規定全系統最多 32 voices，程式碼中 per-event 有 voiceCap 但無全域上限 |
| 5 | **星門數值** | 部分不一致 | GDD §6.1 公式 `movesRemaining` basis ★=0/★★=B×0.25/★★★=B×0.5，程式碼中某些關卡的星門數值與公式不完全吻合（如 L1 的 ★★=3200 vs 公式推導的 3200 吻合，但 L6 的 ★★=5 vs 公式 moveBudget×0.5×0.25=2.5 不同） |
| 6 | **專案結構：`tests/` 目錄** | `src/**/__tests__/` + `e2e/` | GDD 規劃 `tests/unit/` + `tests/simulation/` + `tests/e2e/`，實際測試放在各模組的 `__tests__/` 子目錄 + 根目錄 `e2e/` |
| 7 | **專案結構：`assets/` 原始資產** | `public/assets/` | GDD 規劃 `assets/` 為原始資產（送 atlas 前），實際原始資產直接放在 `public/assets/` |
| 8 | **專案結構：`docs/gdd/`** | `gdd/` | GDD 規劃文件在 `docs/gdd/`，實際放在根目錄 `gdd/` |
| 9 | **Cascade step bonus** | 未實作 +50/step | GDD 01§6.1 規定每個 cascade sub-step 額外 +50 分，`scoring.ts` 中無此邏輯（僅有 chain multiplier） |
| 10 | **Remaining moves bonus** | 1000/手 → 200/手 | GDD 01§6.1 規定剩餘手數獎勵 +1000/手，程式碼 `scoring.ts` 中 `remainingMovesBonus` 為 200/手 |
| 11 | **特殊寶石生成聚合動畫 300ms** | 實作為 GEM_CONVERGE_DURATION_MS | GDD 規定成員寶石飛向定位點 300ms，程式碼中有 `GEM_CONVERGE_DURATION_MS` 常數但具體值可能不同 |
| 12 | **Hint 視覺：底版白色呼吸閃爍** | 選取環高亮 | GDD 06§3.4 規定 hint 為「底版白色輕微呼吸閃爍 alpha 0.04→0.22，週期 900ms」，程式碼 hint 實作為選取環高亮方式 |
| 13 | **Colour Gem 被動啟動** | 支援被動啟動 | GDD 01§5.2 明確規定 Colour Gem「不會」被動啟動（必經交換或 combo），但程式碼 `special-gems.ts` 中 `processSpecialActivations` 可能包含 Colour Gem 被動觸發 |
| 14 | **Intensity 公式** | 簡化版 | GDD 06§3.5 定義了含 urgencyKick 的四項加權公式，程式碼中 intensity 計算可能為簡化版本 |
| 15 | **Settings Cancel/Save 模式** | 即時生效 + Close | GDD 05§4.9 規定 Cancel 還原到開啟前、Save 才生效，程式碼 settings-form 中音量等設定即時生效，無 Cancel/Save 雙按鈕模式 |
| 16 | **Level Select 為 Modal** | 獨立畫面 | GDD 05§4.4 規定 Level Select 為 World Map 上的 modal overlay，程式碼中 `level-select.ts` 為獨立全畫面 |
| 17 | **World Map 曲線連接** | 簡化實作 | GDD 05§4.3 規定 level node 之間用有機曲線連接，程式碼中 world-map 可能為簡化版 |
| 18 | **beforeunload 確認** | 有架構但行為不同 | GDD 06§5.3 規定遊玩中關閉頁籤顯示原生確認，程式碼 `edge-cases.ts` 有 `setupBeforeUnload` 但可能未完整串接 |
| 19 | **Atlas 命名含 hash** | 固定命名 | GDD 03§5.4 規定 atlas 檔名含內容 hash（如 `gems.a3f9.atlas.png`），實際為固定名 `game-atlas.png` |
| 20 | **OGG + MP3 雙格式** | 僅 WAV | GDD 07§7.3 規定匯出 OGG Vorbis + MP3 備援，實際音效資產為 WAV 格式（未壓縮） |
| 21 | **Combo 觸發位置** | 以第一顆 special 為原點 | GDD 01§5.3 規定 combo 視效原點為「兩顆 Special 的中點格」，程式碼中可能以其中一顆為原點 |
| 22 | **T/L ≥7 格生成 Colour Gem** | 僅 5-straight 生成 | GDD 01§5.2 規定 T/L/cross ≥7 格生成 Colour Gem（而非 Area Bomb），程式碼 `match-detect.ts` 中此規則可能未完整實作 |

---

## 總結

| 面向 | 數量 | 嚴重程度 |
|---|---|---|
| GDD 有但未實作 | 28 項 | 多數為 polish/v1.1 項目，核心遊玩已完整 |
| 程式有但 GDD 無 | 18 項 | 多為架構優化與開發工具，合理的工程決策 |
| 做法與 GDD 不同 | 22 項 | 部分為有意的簡化，部分需確認是否為 bug |

### 優先處理建議

**高優先（影響遊玩體驗）：**
- #9 Cascade step bonus 未實作（影響計分）
- #10 Remaining moves bonus 數值不同（1000 vs 200，影響星門平衡）
- #8 Boss 特殊規則未執行（L20/L80 的 immovableCore 無效果）

**中優先（影響完整度）：**
- 面向一 #1 Service Worker（離線體驗）
- 面向一 #4-7 音訊系統缺 Ambience bus 與 ducking
- 面向三 #20 音效格式未壓縮（WAV vs OGG/MP3，影響 bundle 大小）

**低優先（polish/v1.1）：**
- 成就系統、Lumi 角色、flavour copy、字型 subset 等
