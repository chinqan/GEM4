---
inclusion: manual
---

# Graphify Action Plan Rules

> 觸發方式：在 chat 中使用 `#graphify-action-plan` 引用此 steering，或由 `graphify.md` 在適當時機指引觸發。

本 steering 定義如何將 `graphify-out/GRAPH_REPORT.md` 中的 Suggested Questions 轉化為可執行的繁體中文行動計畫。

---

## 觸發條件

此規則在以下情境生效：

1. **使用者明確要求**產出行動計畫（如「幫我分析 Suggested Questions」、「產出行動計畫」）
2. **完整的 `/graphify` 執行**（非 `--update`）結束後，若 GRAPH_REPORT.md 包含 Suggested Questions
3. **使用者引用** `#graphify-action-plan` context key

此規則**不**在以下情境觸發：
- `/graphify . --update`（code-only 增量更新）— 除非 Suggested Questions 有顯著變化
- 一般的程式碼修改、bug 修復、功能開發對話
- 單純的 `/graphify query` 或 `/graphify explain` 查詢

---

## Language Rules

產出行動計畫時：

- 使用繁體中文撰寫分析、風險評估、解決方案
- 技術識別符保持原文，不翻譯：
  - file paths、filenames
  - class names、function names、method names
  - API routes、database table names
  - environment variables、package names
- 驗證步驟中的 shell 指令保持英文

---

## Suggested Questions 處理流程

當 `graphify-out/GRAPH_REPORT.md` 包含 `Suggested Questions` 區段時，不可僅列出或重複問題。

必須逐一回答所有 Suggested Questions，並產出解決方案導向的行動計畫。

### 每個 Suggested Question 的分析格式

1. **問題重述**：以繁體中文重新陳述問題
2. **揭示的架構議題**：說明此問題試圖揭露什麼架構或依賴問題
3. **圖譜查詢**：使用以下工具精準定位問題（至少使用一種）：
   - `/graphify query "<question>"` — BFS 廣度搜尋，找出相關節點的鄰域
   - `/graphify query "<question>" --dfs` — DFS 深度追蹤，沿依賴鏈找到根因
   - `/graphify path "A" "B"` — 找出兩個概念之間的最短路徑
   - `/graphify explain "NodeName"` — 取得特定節點的完整連接資訊
4. **基於圖譜的回答**：根據查詢結果回答，引用具體的：
   - 節點 label 和 `source_file`
   - 邊的 `relation` 和 `confidence`（EXTRACTED / INFERRED / AMBIGUOUS）
   - 跨社群的路徑和橋接節點
5. **受影響模組與檔案**：列出具體的檔案路徑
6. **風險等級**：High / Medium / Low
7. **根本原因**：解釋為何出現此現象
8. **具體方案**：提出可執行的解決方案（含程式碼片段或指令）
9. **建議檢視的檔案**：明確列出需要檢查或修改的檔案
10. **驗證步驟**：提供可直接執行的 shell 指令或測試方法
11. **信心等級**：High / Medium / Low

---

## 必要產出

產出或更新以下檔案：

```
graphify-out/GRAPH_ACTION_PLAN.zh-TW.md
```

### 檔案結構要求

1. **優先行動總覽表格**（置頂）— 一眼看出哪些需要行動
2. **逐題分析**（按上述 10 點格式）
3. **下一步行動區塊** — 分為「立即可執行」、「中期改善」、「不需要行動」
4. **整體架構健康度評估** — 量化評分與摘要

---

## 圖譜查詢策略

分析 Suggested Questions 時，根據問題類型選擇查詢方式：

| 問題類型 | 查詢方式 | 範例 |
|----------|----------|------|
| 「為什麼 X 連接了 A 和 B？」（橋接節點） | `/graphify explain "X"` + `/graphify path "A" "B"` | 查看 X 的所有連接，再確認 A→B 的路徑是否經過 X |
| 「X 的 INFERRED 邊是否正確？」（邊驗證） | `/graphify explain "X"` | 列出所有鄰居，篩選 INFERRED 邊逐一驗證 |
| 「什麼連接了這些孤立節點？」（缺失邊） | `/graphify query "isolated nodes"` | BFS 搜尋孤立節點的鄰域，找出可能遺漏的連接 |
| 「A 如何影響 B？」（依賴鏈） | `/graphify path "A" "B"` 或 `/graphify query "A to B" --dfs` | 找最短路徑或深度追蹤依賴鏈 |
| 「這個社群的內聚性為何低？」（社群分析） | `/graphify query "community_name"` | BFS 展開社群內節點，檢查邊密度 |

### 查詢結果的使用原則

- **引用具體邊**：回答中必須引用查詢結果中的 `relation` 和 `confidence` 標籤
- **標記來源**：每個事實性陳述都要附上 `source_file`
- **不捏造邊**：如果圖譜中找不到連接，明確說「圖譜中無此路徑」而非推測
- **記錄查詢**：在行動計畫中記錄使用了哪些查詢指令，方便使用者重現

---

## 與 graphify.md 的協作

`graphify.md`（always inclusion）負責：
- 日常的圖譜導航指引
- 提醒更新圖譜
- 查詢模式建議

本檔案（manual inclusion）負責：
- 深度分析 Suggested Questions
- 產出結構化行動計畫
- 繁體中文報告格式
