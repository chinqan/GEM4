# 04 · 風格與故事 (Art Style & Narrative)

> **Status**: v1.0 (synced 2026-05-08) · **Owners**: match3-narrative-designer (主) · match3-ui-designer (視覺) · match3-technical-artist (執行性)
> **Last updated**: 2026-05-08 · **Phase**: 1 — Foundations

---

## 1. 創作定位 (Creative Positioning)

對應支柱：**P3 清晰的思考空間**、**P5 尊重玩家時間**。

- **目標感受**：高級、沉穩、具神秘感的寶石世界 — 不過度孩子氣，不陰沉壓抑
- **視覺比喻**：博物館的燈箱展示櫃 × 古籍插畫 × 遊戲化版 Bejeweled
- **反例**：Candy Crush 的糖果誇張風、Bejeweled Blitz 的霓虹電競感

---

## 2. 世界觀 Bible

### 2.1 前提 (Premise)

> **《Gem》** 世界中，寶石不是礦物，而是古老沉睡女神 **「Lumina」** 夢中結晶的記憶。每顆寶石都是她遺忘的一個情感 — 愛、怒、靜、思、憂、希望、力量。
>
> 當女神沉睡過深，這些記憶將消逝成灰。玩家是被託付重任的 **守夢人 (Dreamwarden)**，透過匹配與連鎖寶石，將散落的記憶重新編織，幫助女神從噩夢中甦醒。

### 2.2 調性 (Tone)

選擇 **ONE**: `mystical / cozy / adventurous / playful`

→ **Mystical**（神秘感）為主調，輔以 **warmth**（人情暖意）。不走黑暗奇幻，不走電競。

### 2.3 視覺錨點 (Visual Anchors)

- **場景**：漂浮於雲海之上的古老遺跡（世界 1）、水晶溶洞（世界 2）、月光下的海底神殿（世界 3）、星塵之塔（世界 4）
- **調色基調**：深紫 × 深藍背景，寶石採真實飽和色；點綴金色光暈
- **時代感**：奇幻 × 古典，無現代科技
- **光線**：高對比局部光源（寶石自體發光），背景低飽和

### 2.4 核心力量 (Core Forces) — 最多 3 個

1. **Lumina** — 沉睡女神，玩家服務的對象，不直接登場，僅透過間接線索（夢中低語、記憶碎片）呈現
2. **The Forgotten** — 灰色的遺忘之霧，是關卡中的 blocker 設計靈感來源（第 2 世界後登場）
3. **The Dreamwarden** — 玩家角色，無性別、無臉（設計上），可以被任何玩家代入

---

## 3. 寶石原型 (Gem Archetypes)

7 種顏色，每種對應女神的一種情感記憶。色盲友善的形狀設計由 UI Designer 保證。

| 色系 | 情感 | 切割形狀 | 神話一句話 | 對應色碼 |
|---|---|---|---|---|
| **紅 (Ruby)** | 愛 (Love) | 淚滴型 (Teardrop) | 「山脈心跳凝結的烈焰」 | `#E53935` |
| **綠 (Emerald)** | 思 (Thought) | 方切型 (Square-cut) | 「森林千年深處的低語」 | `#43A047` |
| **藍 (Sapphire)** | 靜 (Calm) | 橢圓切型 (Oval-cut) | 「月海最深處的寧靜」 | `#1E88E5` |
| **黃 (Topaz)** | 希望 (Hope) | 星切型 (Sun-cut) | 「黎明第一道日光的回聲」 | `#FDD835` |
| **紫 (Amethyst)** | 憂 (Sorrow) | 馬眼型 (Marquise-cut) | 「雨夜流淌的記憶」 | `#8E24AA` |
| **白 (Diamond)** | 力 (Power) | 圓形明亮切 (Round Brilliant) | 「時間凝結的起點」 | `#ECEFF1` |
| **橙 (Opal)** | 怒 (Anger) | 三角切 (Trillion-cut) | 「火山誕生時的吶喊」 — 世界 3+ 引入 | `#FB8C00` |

### 特殊寶石視覺語彙

| 特殊寶石 | 視覺 | 動態 |
|---|---|---|
| **Line Bomb (光柱)** | 原寶石色 + 環狀光軌（橫紋或縱紋指示方向） | 8 格循環光流 |
| **Area Bomb (爆裂)** | 深色晶體 + 內部橙紅脈動 | 4 格呼吸循環 |
| **Colour Gem (彩虹)** | 多面體球體，折射七彩 | 8 格旋轉 |

---

## 4. 世界與章節 (Worlds / Chapters)

### 4.1 總體敘事弧

```
[序幕: Lumina 沉睡太深]
    ↓
[World 1] 失落的山嶺花園 — 玩家發現並拾起第一顆寶石
    ↓
[World 2] 水晶之根 — 發現遺忘之霧，寶石開始被覆蓋
    ↓
[World 3] 月下水下神殿 — 守夢人學會連鎖爆發以驅散霧氣
    ↓
[World 4] 星塵之塔 — 接近女神，最終挑戰與甦醒
    ↓
[Endless] 女神醒後的夢境花園 — 無盡挑戰，紀錄為榮耀
```

### 4.2 各世界框架

#### World 1 — 失落的山嶺花園 (The Lost Mountain Garden)

- **設定**：漂浮於雲海上的石頭花園遺跡，黃昏金光
- **情緒**：寧靜、發現、初次接觸寶石的驚奇
- **進入文案** (≤2 句)：「雲海之上，一片靜默的花園。寶石的低語喚醒了你。」
- **完成文案**：「第一段記憶甦醒。女神輕輕翻身。」
- **視覺標誌**：米金暖光、石造台階、紫藤花
- **音樂基調**：輕柔、hope-filled、木管主導
- **機制引入**：swap、3-match、cascade、4-match (line bomb)、5-line (colour gem)
- **關卡數量**：20 關

#### World 2 — 水晶之根 (The Crystal Roots)

- **設定**：深地底的水晶洞穴，藍紫色調
- **情緒**：好奇轉為警覺，首次遇上遺忘之霧
- **進入文案**：「越往深處，越有影子。但寶石仍在這裡。」
- **完成文案**：「霧試圖阻擋，但你學會了如何穿透。」
- **視覺標誌**：冷藍紫色、懸浮水晶、逐漸出現的灰色瘤 (jelly blocker 視覺)
- **音樂基調**：較深沉、低音提琴主導、有一絲緊迫
- **機制引入**：jelly (遺忘之霧)、T/L match (area bomb)、lock (固化記憶)、計時模式
- **關卡數量**：20 關

#### World 3 — 月下神殿 (The Moonlit Sanctum)

- **設定**：海底的月光神殿，冷色 + 月白
- **情緒**：神聖、集中、開始理解大連鎖的必要
- **進入文案**：「月光能穿透水，也能穿透霧。」
- **完成文案**：「女神在夢中微笑了。」
- **視覺標誌**：冷銀月光、水的波紋、月光石質感、橙 (Opal) 寶石首次登場
- **音樂基調**：合唱 + 銀鈴、莊嚴、節奏較快
- **機制引入**：generator blocker (霧會自動生成)、multi-objective、Opal (橙色) 寶石
- **關卡數量**：20 關

#### World 4 — 星塵之塔 (The Stardust Tower)

- **設定**：通往天空的古塔，星塵環繞
- **情緒**：史詩、決定性、挑戰巔峰
- **進入文案**：「星辰降下階梯。終點就在那裡。」
- **完成文案**：「光從女神的眼睛溢出 — 世界重新有了顏色。」
- **視覺標誌**：星空、金色鎏光、更豐富的粒子效果
- **音樂基調**：完整管弦、推進感強、boss 關有變奏
- **機制引入**：stacked blockers、combo-required 關卡、boss 關卡
- **關卡數量**：20–40 關（含 boss 與 gate）

#### Endless Mode — 甦醒的夢境花園

- **設定**：World 1 的花園，但現在充滿女神醒後的生機（不同光色、花盛開）
- **情緒**：放鬆、紀錄挑戰、長期回玩
- **機制**：無手數限制，但難度遞增（每 50 分上升 1 難度階）
- **目標**：紀錄個人最高分、最長連鎖、最多 special spawn

---

## 5. 角色 (Characters)

### 5.1 主角 — 守夢人 (The Dreamwarden)

- **角色定位**：玩家代入，無臉、無性別、無臺詞
- **視覺呈現**：不直接登場；在 UI 的「遊戲圖示」或「主選單 banner」以剪影呈現（兜帽袍影，手持搖籃型燈籠）
- **用途**：代表玩家自身、品牌 identity

### 5.2 Optional Character — Lumi (星辰低語)

> **v1 決策：保留為選項**；若時程允許，在 World 2 解鎖，擔任「連鎖讚美 / 關卡過場」的敘事者

- **角色定位**：半透明的星光小精靈，從 World 2 的水晶洞穴跟隨玩家
- **視覺**：拳頭大小的光球，有雙長耳狀羽翼
- **語聲**：不帶性別、溫柔、≤15 字一句
- **聲調特徵**：鼓勵不誇張、偶有俏皮
- **永不說**：「加油！」「你做到了！」這類廉價鼓勵；也不使用驚嘆號氾濫的語言

**範例台詞 (全部 ≤5 條，≤15 字)**：

| 場景 | 台詞 |
|---|---|
| 連鎖 ≥4 | 「記憶在共鳴。」 |
| 使用 Colour Gem | 「一整面…都亮了。」 |
| 關卡 3 ★ | 「女神微笑著。」 |
| World 完成 | 「我們更近了一步。」 |
| 失敗鼓勵 | 「再來。夢還有時間。」 |

---

## 6. Flavour Copy 字庫

總長度上限 **≤500 字**。所有 copy 需支援 i18n (`zh-TW`, `en` 為 v1 必出)。

### 6.1 關卡完成讚美 (隨機播放，10–15 句)

| zh-TW | en |
|---|---|
| 漂亮的連鎖 | Beautiful chain |
| 記憶重回光明 | Memory restored |
| 女神微微點頭 | The goddess nods |
| 一顆星點亮了 | A star awakens |
| 優雅的解 | Elegant |
| 就是這樣 | Exactly so |
| 夢在回應你 | The dream responds |
| 光找到了路 | The light found its way |
| 完美的一步 | A perfect move |
| 寶石讚許著你 | The gems approve |
| 你看到了路 | You saw the path |
| 每一顆都重要 | Every gem counts |

### 6.2 失敗鼓勵 (5–8 句)

| zh-TW | en |
|---|---|
| 夢還在繼續 | The dream goes on |
| 明天的光同樣溫暖 | Tomorrow's light is just as warm |
| 再來一次 | Once more |
| 女神不會忘記你 | The goddess remembers you |
| 每個守夢人都跌倒過 | Every warden has stumbled |
| 路還長 | The path continues |

### 6.3 大連鎖慶祝 (5–8 句；覆蓋 4-chain 以上)

| zh-TW | en | 觸發時機 |
|---|---|---|
| 連鎖！ | Chain! | chain 2 |
| 爆發！ | Burst! | chain 3 |
| 絢爛！ | Brilliant! | chain 4 |
| 震撼！ | Magnificent! | chain 5 |
| 難以置信！ | Incredible! | chain 6 |
| 記憶之潮！ | Tide of Memory! | chain ≥7 |
| 女神的呼吸！ | The Goddess Breathes! | chain ≥8 (極罕見) |

### 6.4 Loading / World-Map Hover 提示 (15–20 條)

> 節選，全文在 `08_additional_specs.md#flavour-copy-library`

- 「每顆寶石都是一段沉睡的記憶。」
- 「連鎖越深，女神的夢越明亮。」
- 「遺忘之霧無法被理解，只能被穿透。」
- 「星塵之塔的頂端是寂靜而溫暖的。」
- 「Lumi 不說話時，也在聽。」

---

## 7. 視覺設計規範給下游 (Visual Spec for S05 & S07)

> 本節內容將在 S05 被完整展開為 design tokens；此處為 S04 的視覺指令摘要。

### 7.1 色調原則

- 背景永遠比寶石暗 2 階以上（讓寶石自體發光感）
- 每個 World 有獨立的 **Accent 色**，影響 UI 點綴：

| World | Accent Colour | 用途 |
|---|---|---|
| W1 | `#F6C453` (蜂蜜金) | 進度條、按鈕 hover |
| W2 | `#64B5F6` (晨藍) | 進度條、按鈕 hover |
| W3 | `#E1BEE7` (月紫) | 進度條、按鈕 hover |
| W4 | `#FFD54F` (星金) | 進度條、按鈕 hover |

### 7.2 形狀語彙

- **寶石形狀** — 7 種獨特切割，確保色盲可辨認
- **UI 形狀** — 圓角矩形為主（圓角 12），重要按鈕帶金色描邊
- **背景元素** — 有機曲線（藤蔓、水流、光軌），不走銳利幾何

### 7.3 動態原則 (給 Technical Artist 與 UI Designer)

- 寶石永遠有 **idle shimmer**（graphics preset `low` 時關閉）
- 按鈕永遠有 **press scale down + colour shift**（無 press 反饋的按鈕 = bug）
- 大連鎖觸發 **全畫面 saturation pulse +10%** + **輕微 chromatic aberration**（motion-reduction 模式關閉）

---

## 8. 文字字型規格 (Typography)

| 用途 | 中文字型 | 英文字型 | 授權 |
|---|---|---|---|
| Display / Logo | 思源宋體 Heavy | Cinzel 800 | 皆為 OFL 開源 |
| UI Body | 思源黑體 Regular | Inter 400 | 皆為 OFL 開源 |
| Score HUD (monospace) | 思源宋體 (數字) | JetBrains Mono 700 | OFL |
| 章節書法 (World 標題) | Ma Shan Zheng（Google Fonts OFL，楷書筆觸）；fallback: 思源宋體 Heavy | Ma Shan Zheng | OFL |

- 所有字型需支援 CJK + Latin + 基本特殊符號
- 字型總大小 **≤1.5 MB** 壓縮後

---

## 9. 授權與來源 (Licenses & Sources)

> 所有資產來源清單維護在 `08_additional_specs.md#legal-assets`。

| 資產類別 | 來源策略 |
|---|---|
| 字型 | 全部使用 OFL 授權開源字型 |
| 音樂 | 委託作曲 或 CC-BY 授權；禁用未授權素材 |
| SFX | 自製 或 CC-BY；禁用未授權素材 |
| 寶石圖案 | 委託繪師 或 team 自製；禁用 AI 生成未修飾素材 |
| 背景插畫 | 委託繪師 |

---

## 10. Open Questions

| # | 問題 | 影響章節 | 備註 |
|---|---|---|---|
| 1 | Lumi 角色是否出現在 v1？ | 04, 05, 07 | 尚待資源評估；若不出則保留故事但減少 UI 角色呈現 |
| 2 | World 4 boss 關的視覺語彙？ | 04, 02 | S02 尚未設計 boss 結構 |
| 3 | Endless 模式的視覺變體 | 04 | 目前只規劃 1 套 skin |
| 4 | 繁簡中英以外語言優先度 | 04, 08 | 依市場評估 |

---

## Changelog

- **2026-04-21** · v0.9 · 初稿（owner: match3-narrative-designer；視覺審查: match3-ui-designer；執行性審查: match3-technical-artist）
