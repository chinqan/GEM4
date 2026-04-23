# 實作任務清單：Gem v1 完整實作

## 第一階段：專案基礎建設

- [x] 1. 專案初始化與工具鏈設定
  - [x] 1.1 初始化 npm 專案，安裝核心依賴（pixi.js ^8.6.6、@pixi/ui、@pixi/layout、@pixi/sound、howler）
  - [x] 1.2 安裝開發依賴（typescript、vite、vitest、playwright、eslint、prettier、husky、tweakpane、stats.js）
  - [x] 1.3 設定 tsconfig.json（strict mode、path aliases）
  - [x] 1.4 設定 vite.config.ts（dev server、production build、環境變數）
  - [x] 1.5 設定 eslint.config.mjs + prettier + husky pre-commit hook
  - [x] 1.6 建立 src/ 目錄結構（依 GDD 03§3 專案結構）
  - [x] 1.7 建立 index.html + src/index.ts entry point
  - [x] 1.8 驗證 `npm run dev` 可啟動、`npm run build` 可建置

- [x] 2. 共用型別定義
  - [x] 2.1 建立 src/types/index.ts：GemColour、SpecialGemType、BlockerKind、ComboType、MatchShape、CellPos
  - [x] 2.2 建立 MatchDescriptor、ObjectiveDelta、ColumnDrop 介面
  - [x] 2.3 建立 LevelResult、EndlessResult、RunState、EndlessRunState 介面

## 第二階段：純規則引擎（game/rules/）

- [x] 3. 棋盤核心（board.ts）
  - [x] 3.1 實作 Cell、Gem、BlockerState、Board 型別
  - [x] 3.2 實作 createBoard(width, height, empty) 純函式
  - [x] 3.3 實作 getCell、setCell、isValidPos、getNeighbors 純函式
  - [x] 3.4 實作 cloneBoard 深拷貝函式
  - [x] 3.5 撰寫單元測試：棋盤建立、邊界檢查、空格處理
  - [x] 3.6 撰寫 CP-1 property test：棋盤有效性不變式

- [x] 4. RNG 系統（rng.ts）
  - [x] 4.1 實作 Mulberry32 類別（next、int、pick、serialize、deserialize）
  - [x] 4.2 實作 createRngStreams(seed)：從 64-bit 種子建立 4 個串流
  - [x] 4.3 撰寫單元測試：確定性、分佈均勻性、序列化還原
  - [x] 4.4 撰寫 CP-8 property test：相同種子產生相同序列

- [x] 5. 消除偵測（match-detect.ts）
  - [x] 5.1 實作水平掃描：找連續同色 ≥3 的區段
  - [x] 5.2 實作垂直掃描：找連續同色 ≥3 的區段
  - [x] 5.3 實作形狀合併：T/L/十字形偵測
  - [x] 5.4 實作形狀分類：straight3/4/5、T、L、cross
  - [x] 5.5 實作特殊寶石決定：優先序 Colour > Area > Line
  - [x] 5.6 實作生成位置決定（swap 觸發 vs cascade 觸發）
  - [x] 5.7 撰寫單元測試：所有形狀、邊界情況、重疊處理
  - [x] 5.8 撰寫 CP-6 property test：特殊寶石優先序確定性

- [x] 6. 特殊寶石（special-gems.ts）
  - [x] 6.1 實作 Line Bomb 啟動邏輯（H 清列、V 清行）
  - [x] 6.2 實作 Area Bomb 啟動邏輯（3×3 裁切邊界）
  - [x] 6.3 實作 Colour Gem 啟動邏輯（清除目標色所有寶石）
  - [x] 6.4 實作被動啟動邏輯（Line/Area 被鄰近消除觸發；Colour 不觸發）
  - [x] 6.5 實作啟動順序排序（左上到右下確保確定性）
  - [x] 6.6 撰寫單元測試：各類啟動效果、被動觸發、邊界裁切

- [x] 7. 組合矩陣（combo-matrix.ts）
  - [x] 7.1 實作 comboKey 正規化（A×B = B×A）
  - [x] 7.2 實作 6 種組合效果：line.line、bomb.line、bomb.bomb、colour.line、colour.bomb、colour.colour
  - [x] 7.3 實作組合觸發位置（兩顆 Special 的中點格）
  - [x] 7.4 撰寫單元測試：所有組合對效果正確性
  - [x] 7.5 撰寫 CP-9 property test：組合對稱性

- [x] 8. Cascade 引擎（cascade.ts）
  - [x] 8.1 實作重力下落：每欄從底部往上掃，寶石向下填入空格
  - [x] 8.2 實作頂端補充：以 RNG cascadeFill 串流生成新寶石
  - [x] 8.3 實作遞迴消除迴圈（cascade → match-detect → 消除 → 重複）
  - [x] 8.4 實作 chain 計數與 cascade step 追蹤
  - [x] 8.5 實作安全上限（50 sub-steps）
  - [x] 8.6 撰寫單元測試：簡單掉落、多層 cascade、安全上限觸發
  - [x] 8.7 撰寫 CP-5 property test：cascade 完成保證

- [x] 9. 計分引擎（scoring.ts）
  - [x] 9.1 實作 chainMultiplier(chain) 公式
  - [x] 9.2 實作 matchScore(shape, chain, cascadeStep)
  - [x] 9.3 實作 specialActivationScore(clearedCount, chain, isColour)
  - [x] 9.4 實作 comboScore(type, chain)
  - [x] 9.5 實作 remainingMovesBonus(moves)
  - [x] 9.6 撰寫單元測試：所有計分情境、GDD §6.8 校驗範例
  - [x] 9.7 撰寫 CP-2 property test：分數單調性
  - [x] 9.8 撰寫 CP-3 property test：連鎖倍率邊界 [1.0, 4.0]

## 第三階段：關卡邏輯（game/level/）

- [x] 10. 關卡規格與載入（level-spec.ts）
  - [x] 10.1 實作 LevelSpec 型別定義（與 GDD 02§9 對齊）
  - [x] 10.2 實作 loadLevel(id) 函式：從 JSON 載入並驗證
  - [x] 10.3 建立前 5 關的 JSON 規格檔（L1–L5）
  - [x] 10.4 建立 L6–L20 的 JSON 規格檔（World 1 完整）
  - [x] 10.5 建立 L21–L40 的 JSON 規格檔（World 2）
  - [x] 10.6 建立 L41–L60 的 JSON 規格檔（World 3）
  - [x] 10.7 建立 L61–L80 的 JSON 規格檔（World 4）

- [x] 11. 目標系統（objective.ts）
  - [x] 11.1 實作 Score 目標追蹤與完成判定
  - [x] 11.2 實作 Clear 目標追蹤（blocker 清除計數）
  - [x] 11.3 實作 Collect 目標追蹤（顏色寶石收集計數）
  - [x] 11.4 實作 Drop 目標追蹤（delivery cell 到達計數）
  - [x] 11.5 實作 Multi 目標追蹤（複合目標）
  - [x] 11.6 實作星級評價計算（依 basis 與門檻）
  - [x] 11.7 撰寫單元測試：所有目標類型、邊界情況

- [x] 12. Blocker 系統（blocker.ts）
  - [x] 12.1 實作 Jelly 行為：消除時減層、多層堆疊
  - [x] 12.2 實作 Lock 行為：不可移動/消除、特殊寶石破鎖
  - [x] 12.3 實作 Generator 行為：每 N 手生成 blocker、4-鄰空格選擇
  - [x] 12.4 實作 Unstable 行為：倒數、爆炸效果、罰分
  - [x] 12.5 實作 Blocker × Special 交互矩陣（GDD 02§4.6 完整矩陣）
  - [x] 12.6 實作堆疊 blocker 處理（lock + jelly 共存）
  - [x] 12.7 撰寫單元測試：所有 blocker 行為、交互矩陣逐格驗證
  - [x] 12.8 撰寫 CP-10 property test：blocker 層級完整性
  - [x] 12.9 撰寫 CP-4 property test：手數計數一致性

## 第四階段：遊戲執行層（game/runtime/）

- [x] 13. 棋盤初始化與重洗
  - [x] 13.1 實作 initBoard(spec, rng)：依關卡規格生成初始棋盤（保證無預存消除 + 至少 1 有效交換）
  - [x] 13.2 實作 findValidSwaps(board)：掃描所有有效交換
  - [x] 13.3 實作 reshuffle(board, rng)：重洗棋盤（保留特殊寶石與 blocker）
  - [x] 13.4 撰寫單元測試與 CP-1 property test 整合

- [x] 14. 暗示系統（hint.ts）
  - [x] 14.1 實作 findHint(board)：找一組有效交換作為暗示
  - [x] 14.2 實作暗示計時器（閒置 hintDelayMs 後觸發）
  - [x] 14.3 emit hint.shown 事件

- [x] 15. 遊戲迴圈與指令處理（game-loop.ts）
  - [x] 15.1 實作 CommandQueue（FIFO、深度上限 8）
  - [x] 15.2 實作 RulesEngine.advance()：drain 指令、執行規則步、emit 事件
  - [x] 15.3 實作 swap 指令處理：驗證 → moves-- → match-detect → cascade
  - [x] 15.4 實作 resolving 狀態管理（resolving 期間拒絕 swap）
  - [x] 15.5 實作 end-of-level 時序（cascade 完成後才結算）
  - [x] 15.6 實作 intensity 計算公式
  - [x] 15.7 實作固定時間步迴圈（60Hz 累加器、250ms 上限）
  - [x] 15.8 撰寫確定性 CI 測試（固定種子 + 100 指令 → 3 次 bit-exact）

## 第五階段：事件與狀態管理

- [x] 16. Event Bus（events.ts）
  - [x] 16.1 實作 EventBusImpl（emit、on、once）
  - [x] 16.2 實作事件物件池化
  - [x] 16.3 定義完整 GameEvent 聯集型別
  - [x] 16.4 撰寫單元測試

- [x] 17. 狀態機（state-machine.ts）
  - [x] 17.1 實作 AppState 聯集型別
  - [x] 17.2 實作 transition(from, to) 函式與合法轉換表
  - [x] 17.3 實作不變式檢查（pause.previous、settings.returnTo）
  - [x] 17.4 撰寫單元測試
  - [x] 17.5 撰寫 CP-7 property test：狀態機轉換合法性

- [x] 18. 存檔系統（save-state.ts + migrations.ts）
  - [x] 18.1 實作 SaveState 型別與 defaultSaveState()
  - [x] 18.2 實作 SaveManager（load、save、debounce、flush）
  - [x] 18.3 實作 migrate() 版本遷移函式
  - [x] 18.4 實作 export/import JSON 功能
  - [x] 18.5 實作 reset 功能（二次確認）
  - [x] 18.6 撰寫單元測試：讀寫、遷移、降級、escrow

## 第六階段：渲染層

- [x] 19. PixiJS 初始化（app.ts）
  - [x] 19.1 實作 Application bootstrap：偵測 WebGPU/WebGL 後端
  - [x] 19.2 實作 canvas 建立與 resize 處理
  - [x] 19.3 實作圖層階層建立（app-layers.ts）

- [x] 20. Viewport 與縮放（viewport.ts）
  - [x] 20.1 實作 calculateViewport 函式（letterbox 縮放）
  - [x] 20.2 實作 resize 事件監聽與重新計算

- [x] 21. 寶石渲染（gem-sprites.ts + board-renderer.ts）
  - [x] 21.1 實作 GemSpriteFactory：依顏色與特殊類型建立 sprite
  - [x] 21.2 實作 BoardRenderer：同步 Board 狀態到 Pixi 顯示
  - [x] 21.3 實作寶石選取視覺（脈衝 + 發光環）
  - [x] 21.4 實作 idle shimmer 動畫（High preset）

- [x] 22. 動畫系統
  - [x] 22.1 實作 swap 動畫（200ms）
  - [x] 22.2 實作 invalid shake 動畫（240ms、4px 橫向）
  - [x] 22.3 實作 match 消除動畫（200ms 縮放至 0）
  - [x] 22.4 實作 cascade 掉落動畫（120ms/行）
  - [x] 22.5 實作特殊寶石 spawn 震波（600ms）
  - [x] 22.6 實作特殊寶石啟動效果（800ms）
  - [x] 22.7 實作 chain ≥3 飽和脈衝（300ms ColorMatrix）

- [x] 23. 粒子系統（particles.ts）
  - [x] 23.1 實作 ParticlePool（物件池、上限依 preset）
  - [x] 23.2 實作 match 爆破粒子（彩色 ×8）
  - [x] 23.3 實作 chain 大型光效粒子
  - [x] 23.4 實作 special spawn 環形衝擊波

- [x] 24. 特效層（filters.ts）
  - [x] 24.1 實作 BlurFilter 套用於 Glow Layer
  - [x] 24.2 實作 Bloom 效果（Medium+ preset）
  - [x] 24.3 實作 Shockwave 效果（special 啟動時）
  - [x] 24.4 實作 ColorMatrix 飽和脈衝（chain ≥3）

- [x] 25. Design Tokens（design-tokens.ts）
  - [x] 25.1 定義 7 色寶石的色彩常數
  - [x] 25.2 定義格子尺寸、間距、透明度常數
  - [x] 25.3 定義 3 種圖形預設參數

## 第七階段：音訊

- [x] 26. 音訊系統（audio-system.ts）
  - [x] 26.1 實作 Howler 包裝與 autoplay unlock
  - [x] 26.2 實作 SFX 事件映射（sfx-catalog.ts）
  - [x] 26.3 實作音量控制（master/music/sfx）與靜音切換
  - [x] 26.4 實作暫停/恢復音訊

- [x] 27. 自適應音樂（adaptive-music.ts）
  - [x] 27.1 實作垂直層疊系統（3-4 層音軌）
  - [x] 27.2 實作 intensity 驅動的層音量控制
  - [x] 27.3 實作層間平滑過渡（lerp）

## 第八階段：輸入系統

- [x] 28. 輸入處理（input-system.ts + board-input.ts）
  - [x] 28.1 實作統一指標抽象（mouse/touch/pen）
  - [x] 28.2 實作 tap-tap-swap 模式
  - [x] 28.3 實作 drag-swap 模式
  - [x] 28.4 實作棋盤座標轉換（螢幕座標 → 格子座標）

- [x] 29. 鍵盤導航（keybinds.ts）
  - [x] 29.1 實作方向鍵棋盤游標移動
  - [x] 29.2 實作 Space/Enter 選取與交換
  - [x] 29.3 實作 ESC 暫停、M 靜音、P 暫停/繼續
  - [x] 29.4 實作 Tab/Shift+Tab UI 焦點循環
  - [x] 29.5 實作可配置快捷鍵與 press-to-bind UI

## 第九階段：UI 畫面

- [x] 30. UI 基礎（theme.ts + factory.ts）
  - [x] 30.1 實作 @pixi/ui Theme 設定
  - [x] 30.2 實作按鈕工廠（含 hover/press 狀態）
  - [x] 30.3 實作進度條、星星評價、目標 chip 元件

- [x] 31. 各畫面實作
  - [x] 31.1 Splash 畫面：載入進度條、使用者手勢提示
  - [x] 31.2 主選單：Play、Endless（條件顯示）、Settings、Credits
  - [x] 31.3 世界地圖：關卡節點、星數、鎖定狀態、世界切換
  - [x] 31.4 關卡選擇卡片：目標、預算、最佳紀錄
  - [x] 31.5 遊戲 HUD：分數、手數/時間、目標進度、暫停按鈕
  - [x] 31.6 暫停覆蓋層：繼續、重新開始、設定、退出
  - [x] 31.7 關卡完成畫面：星星動畫、分數明細、下一關/重玩/返回
  - [x] 31.8 關卡失敗畫面：鼓勵訊息、重試/退出
  - [x] 31.9 Credits 畫面：捲動內容

- [x] 32. Juice 效果（ui/juice/）
  - [x] 32.1 實作 shake 效果（畫面震動）
  - [x] 32.2 實作 toast 通知
  - [x] 32.3 實作 score-popup 飛字效果

## 第十階段：設定與無障礙

- [x] 33. 設定畫面（ui-dom/settings/）
  - [x] 33.1 實作 DOM overlay 設定表單
  - [x] 33.2 實作音訊設定（master/music/sfx 滑桿 + 靜音）
  - [x] 33.3 實作圖形設定（preset 選擇 + 減少動態）
  - [x] 33.4 實作無障礙設定（色盲模式、高對比、長按確認）
  - [x] 33.5 實作遊玩設定（暗示延遲、自動啟動特殊寶石）
  - [x] 33.6 實作語言切換
  - [x] 33.7 實作快捷鍵配置

- [x] 34. 無障礙功能
  - [x] 34.1 實作色盲模式（deuteranopia/protanopia/tritanopia 色彩調整）
  - [x] 34.2 實作 reduce motion（停用非必要動畫）
  - [x] 34.3 實作高對比模式
  - [x] 34.4 實作首次啟動 prefers-reduced-motion 自動偵測

## 第十一階段：國際化

- [x] 35. i18n 系統
  - [x] 35.1 實作 Translator 類別（load、t、參數替換）
  - [x] 35.2 建立 zh-TW.json locale 檔案（所有 UI 文字）
  - [x] 35.3 建立 en.json locale 檔案
  - [x] 35.4 實作語言自動偵測（navigator.language）
  - [x] 35.5 整合所有 UI 畫面使用 Translator

## 第十二階段：Endless 模式

- [x] 36. Endless 模式實作
  - [x] 36.1 實作難度升階系統（1–15 級，每 5000 分升級）
  - [x] 36.2 實作漸進式參數調整（顏色數、blocker 生成、棋盤大小）
  - [x] 36.3 實作結束條件（3 次重洗用盡、玩家退出、120 秒無操作）
  - [x] 36.4 實作本機排行榜（高分/最長連鎖/最多特殊 各前 10）
  - [x] 36.5 實作 endlessEnd 畫面與紀錄比對

## 第十三階段：邊界情況與穩健性

- [x] 37. 邊界情況處理
  - [x] 37.1 實作 tab 切出/切入處理（visibilitychange → 自動暫停 + 繼續覆蓋層）
  - [x] 37.2 實作 beforeunload 確認（遊玩中關閉頁籤）
  - [x] 37.3 實作 localStorage 滿/封鎖降級（toast 警告）
  - [x] 37.4 實作瀏覽器重新整理後的狀態恢復
  - [x] 37.5 實作多頁籤 localStorage 競態處理（timestamp 解決）

## 第十四階段：資產與載入

- [x] 38. 資產管線
  - [x] 38.1 建立 placeholder 寶石圖像（7 色 × 基礎 + 4 種特殊）
  - [x] 38.2 建立 placeholder UI 圖像（按鈕、icon、星星）
  - [x] 38.3 建立 placeholder 粒子圖像
  - [x] 38.4 建立 placeholder 世界背景（4 個世界）
  - [x] 38.5 設定 atlas 打包腳本（build-tools/pack-atlases.mjs）
  - [x] 38.6 建立 manifest.json 與 bundle 定義

- [x] 39. 資源載入（LoadController）
  - [x] 39.1 實作 bundle 載入系統（core、world-N、audio）
  - [x] 39.2 實作 Splash 預載流程（core bundle）
  - [x] 39.3 實作世界 bundle lazy loading
  - [x] 39.4 實作載入失敗重試策略（2 次指數回退）
  - [x] 39.5 實作 cache-busting（content hash 檔名）

## 第十五階段：效能與品質

- [x] 40. 效能驗證
  - [x] 40.1 實作 build-tools/validate-budgets.mjs（bundle 大小 CI gate）
  - [x] 40.2 驗證 60 FPS 目標（worst-case ≥55）
  - [x] 40.3 驗證 draw calls ≤80/幀
  - [x] 40.4 驗證 30 分鐘記憶體漂移 ≤10MB
  - [x] 40.5 驗證初始 bundle ≤5MB gzipped

- [x] 41. E2E 測試（Playwright）
  - [x] 41.1 撰寫首次啟動到完成 L1 的完整流程測試
  - [x] 41.2 撰寫特殊寶石生成與啟動測試
  - [x] 41.3 撰寫暫停/繼續/重試流程測試
  - [x] 41.4 撰寫設定變更持久化測試
  - [x] 41.5 撰寫 Chrome/Firefox/Safari/Edge 相容性測試

- [x] 42. Debug 工具（dev only）
  - [x] 42.1 實作 Tweakpane 面板（FPS、draw calls、粒子數、AppState、intensity）
  - [x] 42.2 實作 Stats.js 整合（Cmd+Shift+S 切換）
  - [x] 42.3 實作 clock scale 控制（pause/slow-mo/frame-step）

## 第十六階段：整合與收尾

- [x] 43. 完整流程整合
  - [x] 43.1 整合所有子系統：rules + rendering + audio + input + state + UI
  - [x] 43.2 驗證完整遊玩流程：splash → menu → worldMap → game → complete/fail → 下一關
  - [x] 43.3 驗證 Endless 模式完整流程
  - [x] 43.4 驗證所有設定功能
  - [x] 43.5 驗證存檔/讀檔/匯出/匯入/重置

- [x] 44. 遙測系統（telemetry/events.ts）
  - [x] 44.1 實作本機遙測事件記錄
  - [x] 44.2 實作 tutorial step tracker
  - [x] 44.3 實作 1Hz 節流 flush

- [x] 45. 部署準備
  - [x] 45.1 設定 .env.production 環境變數
  - [x] 45.2 驗證 production build 輸出
  - [x] 45.3 設定靜態站部署（CloudFlare Pages / Netlify / Vercel）
  - [x] 45.4 驗證 HTTPS + CDN cache 策略
  - [x] 45.5 最終跨瀏覽器驗證
