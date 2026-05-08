# 音效對照表：遊戲事件 ↔ AudioLib 候選素材

> **用途**：評估 AudioLib 中哪些音效可替代目前的 placeholder / 合成音效
> **建立日期**：2026-05-08
> **來源庫**：`/Users/chinqan-mac/audioplay/public/AudioLib`（1878 個檔案）

---

## 評估標準

- ✅ 高度適合：音效特性直接匹配遊戲事件
- 🟡 可考慮：需要後製（裁切/調音/混音）但方向正確
- ⚠️ 備選：風格偏離但無更好選擇時可用

---

## 一、板面互動 (Board Interaction)

| 遊戲事件 | 用途 | 候選 1 | 候選 2 | 候選 3 | 備註 |
|---|---|---|---|---|---|
| `gem.pick` | 選取寶石 | ✅ `Royal Kingdom/gem_open_1.wav` (326ms) | 🟡 `Royal Kingdom/gem_close_1.wav` (364ms) | 🟡 `Disney/sfx_coreGame_cards_field_cardFlip 01.wav` (332ms) | gem_open 最直覺；cardFlip 系列有多變體可做 pitch variance |
| `gem.hover` | 滑鼠 hover | 🟡 `Royal Kingdom/flower_tap_state_1.wav` (660ms) — 需裁短 | 🟡 `Disney/sfx_global_ui_button_tap.wav` (86ms) | — | hover 需極短極輕的音效，button_tap 86ms 很適合降音量使用 |
| `swap.valid` | 合法交換 | ✅ `Royal Kingdom/lily_move_1.wav` (560ms) | 🟡 `Disney/sfx_coreGame_cards_deck_draw_01~04.wav` (361-421ms) | 🟡 `AudioClip/Swing.wav` (746ms) | lily_move 有滑動感；deck_draw 有翻牌的俐落感 |
| `swap.invalid` | 非法交換 | ✅ `Royal Kingdom/impossible_move.wav` (155ms) | ✅ `Royal Kingdom/chain_wrong_move_1.wav` (728ms) | 🟡 `AudioClip/Unavailable.wav` (933ms) | impossible_move 短促明確；chain_wrong_move 更有「卡住」感 |

---

## 二、消除 (Match)

| 遊戲事件 | 用途 | 候選 1 | 候選 2 | 候選 3 | 備註 |
|---|---|---|---|---|---|
| `match.base` | 基礎消除 | ✅ `Royal Kingdom/match_explode_1~6.wav` (152-276ms) | 🟡 `Disney/tile_puzzle_on_match_land.wav` (1225ms) | 🟡 `Royal Kingdom/crystal_hit_1.wav` (357ms) | match_explode 有 6 個變體，完美對應 pitch 遞進需求 |
| `match.special` | 特殊寶石消除 | ✅ `Royal Kingdom/crystal_destroy_1.wav` (812ms) | 🟡 `Royal Kingdom/crystal_ray_destroy_1.wav` (1107ms) | 🟡 `AudioClip/DiamondSound.wav` (312ms) | crystal 系列有寶石碎裂質感 |
| `cascade.loop` | 連鎖上升音 | 🟡 `Royal Kingdom/mace_loop.wav` (1750ms) | 🟡 `Disney/sfx_coreGame_level_rolling_carpet_loop.wav` (2335ms) | 🟡 `Royal Kingdom/ice_block_loop.wav` (2581ms) | 需要可 loop 的上升感音效；可能需後製加速 |

---

## 三、連鎖階層 (Chain Tiers)

| 遊戲事件 | 用途 | 候選 1 | 候選 2 | 候選 3 | 備註 |
|---|---|---|---|---|---|
| `chain.tier1` | chain=2 軟短 | 🟡 `Disney/sfx_coreGame_cards_tap_matchGliss_01.wav` (1432ms) | 🟡 `Royal Kingdom/booster_reveal.wav` (263ms) | — | matchGliss 系列有遞進音階，01 最輕 |
| `chain.tier2` | chain=3-4 明亮 | 🟡 `Disney/sfx_coreGame_cards_tap_matchGliss_05.wav` (1386ms) | 🟡 `Royal Kingdom/gong_tap.wav` (1311ms) | — | matchGliss 中段；gong 有金屬明亮感 |
| `chain.tier3` | chain=5+ 史詩 | 🟡 `Disney/sfx_coreGame_cards_tap_matchGliss_10.wav` (1861ms) | 🟡 `Royal Kingdom/gong_stage_complete_1.wav` (3125ms) | 🟡 `AudioClip/ChainsBurst.wav` (1520ms) | ChainsBurst 名稱直接對應！gong_stage_complete 有史詩感 |
| `chain.wow` | chain≥8 慶祝 | ✅ `AudioClip/ChainsBurst.wav` (1520ms) | 🟡 `Royal Kingdom/kingdom_completed.wav` (4676ms) — 需裁切 | 🟡 `Disney/sfx_coreGame_level_endScreen_heading_epic.wav` (3600ms) | ChainsBurst 是最佳選擇；kingdom_completed 太長但氣勢足 |

---

## 四、特殊寶石 (Special Gems)

| 遊戲事件 | 用途 | 候選 1 | 候選 2 | 候選 3 | 備註 |
|---|---|---|---|---|---|
| `special.spawn` | 特殊寶石生成 | ✅ `Royal Kingdom/dynamite_creation.wav` (799ms) | ✅ `Royal Kingdom/electro_ball_creation.wav` (1471ms) | 🟡 `AudioClip/HeroSpawn.wav` (1600ms) | dynamite_creation 有「凝聚成形」感；可依類型細分 |
| `special.spawn.bomb` | Area Bomb 生成 | ✅ `Royal Kingdom/dynamite_creation.wav` (799ms) | — | — | 炸藥生成 = 炸彈生成，完美匹配 |
| `special.spawn.line` | Line Bomb 生成 | ✅ `Royal Kingdom/electro_ball_creation.wav` (1471ms) | — | — | 電球有線性能量感 |
| `special.spawn.colour` | Colour Gem 生成 | 🟡 `AudioClip/PrismPop.wav` (2273ms) | 🟡 `AudioClip/MagicAura.wav` (1310ms) | — | 稜鏡/魔法光環 = 全色寶石 |
| `special.activate.bomb` | Area Bomb 爆炸 | ✅ `Royal Kingdom/dynamite_explode.wav` (1533ms) | ✅ `Royal Kingdom/bomb_explode.wav` (1835ms) | 🟡 `Royal Kingdom/attack_snowman_bomb_explode_board.wav` (1028ms) | 多個爆炸音可選，dynamite 最乾淨 |
| `special.activate.line` | Line Bomb 啟動 | ✅ `Royal Kingdom/electro_ball_explode.wav` (1193ms) | 🟡 `Royal Kingdom/electro_ball_ray_1~3.wav` (701-851ms) | 🟡 `AudioClip/WhipOfLightning.wav` (1176ms) | electro_ball_ray 有方向性 whoosh 感 |
| `special.activate.colour` | Colour Gem 啟動 | 🟡 `AudioClip/MagicAura.wav` (1310ms) | 🟡 `AudioClip/PrismPop.wav` (2273ms) | 🟡 `Royal Kingdom/electro_ball_electro_ball_combo.wav` (3918ms) | 需要「掃過全場」的旋律感 |

---

## 五、組合 (Combos)

| 遊戲事件 | 用途 | 候選 1 | 候選 2 | 備註 |
|---|---|---|---|---|
| `combo.blast` (通用) | 組合觸發 | ✅ `Royal Kingdom/dynamite_dynamite_combo.wav` (3464ms) | ✅ `Royal Kingdom/electro_ball_electro_ball_combo.wav` (3918ms) | 庫中有明確的 combo 音效！ |
| `combo.bomb.bomb` | Bomb×Bomb | ✅ `Royal Kingdom/dynamite_dynamite_combo.wav` (3464ms) | — | 名稱完美對應 |
| `combo.line.line` | Line×Line 十字 | ✅ `Royal Kingdom/electro_ball_electro_ball_combo.wav` (3918ms) | — | 電球×電球 = 十字線 |
| `combo.bomb.colour` | Bomb×Colour | 🟡 `Royal Kingdom/attack_cannon_projectile_explode.wav` (3167ms) | — | 大範圍爆炸 |
| `combo.colour.colour` | Colour×Colour 王牌 | 🟡 `AudioClip/ActiveSkillActivated.wav` (2600ms) | 🟡 `Royal Kingdom/kingdom_completed.wav` (4676ms) | 需要最史詩的音效 |

---

## 六、狀態 / 進程

| 遊戲事件 | 用途 | 候選 1 | 候選 2 | 候選 3 | 備註 |
|---|---|---|---|---|---|
| `level.start` | 關卡開始 | 🟡 `Royal Kingdom/level_start_game_board_enter.wav` (270ms) | 🟡 `Royal Kingdom/attack_prelevel_swords.wav` (811ms) | 🟡 `Disney/curtains_transition_open.wav` (722ms) | level_start_game_board_enter 名稱直接對應 |
| `level.complete` | 過關 | ✅ `Royal Kingdom/goal_complete.wav` (1853ms) | ✅ `Royal Kingdom/gong_stage_complete_1~3.wav` (3125ms) | 🟡 `Disney/streak_completed.wav` (920ms) | goal_complete 最適合；gong 系列可做 3 星分級 |
| `level.fail` | 失敗 | ✅ `Royal Kingdom/level_failed.wav` (1776ms) | 🟡 `Disney/sfx_coreGame_observer_tinkerbell_disappoint.wav` (2333ms) | — | level_failed 名稱直接對應 |
| `stars.grant1` | 1 星 | ✅ `Disney/general_star_land.wav` (1005ms) | ✅ `Disney/sfx_global_reward_star_land.wav` (2700ms) | — | star_land 完美匹配 |
| `stars.grant2` | 2 星 | ✅ `Disney/general_star_fly.wav` (1416ms) + `general_star_land.wav` | — | — | fly + land 組合 |
| `stars.grant3` | 3 星 | ✅ `Disney/sfx_global_reward_star_appear.wav` (2264ms) | — | — | 最華麗的星星音效 |
| `world.complete` | 世界完成 | 🟡 `Royal Kingdom/kingdom_completed.wav` (4676ms) | 🟡 `Royal Kingdom/district_completed.wav` (5430ms) | — | 兩者都有「大完成」氣勢 |
| `ui.reshuffle` | 重洗動畫 | 🟡 `Disney/sfx_coreGame_cards_stock_startSpread.wav` (636ms) | 🟡 `Royal Kingdom/magic_pot_powerups_spin.wav` (784ms) | — | 洗牌/旋轉感 |

---

## 七、UI 音效

| 遊戲事件 | 用途 | 候選 1 | 候選 2 | 候選 3 | 備註 |
|---|---|---|---|---|---|
| `ui.click.soft` | 次要按鈕 | ✅ `Disney/sfx_global_ui_button_tap.wav` (86ms) | ✅ `AudioClip/ButtonClick.wav` (131ms) | ✅ `Royal Kingdom/button_click_open.wav` (8ms) | 三個都很適合，button_tap 最有質感 |
| `ui.click.strong` | 主要 CTA | ✅ `AudioClip/TapButton2.wav` (933ms) | 🟡 `AudioClip/ButtonClick.wav` (131ms) + pitch down | — | TapButton2 有力度感 |
| `ui.hover` | Desktop hover | 🟡 `Royal Kingdom/button_click_open.wav` (8ms) | — | — | 極短，適合 hover |
| `ui.modal.open` | Modal 開啟 | ✅ `Disney/sfx_global_ui_popUp_opening.wav` (387ms) | 🟡 `Disney/store_screen_appear.wav` (1088ms) | — | popUp_opening 完美匹配 |
| `ui.modal.close` | Modal 關閉 | ✅ `Disney/sfx_global_ui_popUp_closing.wav` (191ms) | 🟡 `Disney/store_screen_disappear.wav` (911ms) | — | popUp_closing 完美匹配 |
| `ui.toast.show` | Toast 進入 | 🟡 `Disney/sfx_global_ui_toolTip_opening.wav` (2764ms) — 需裁短 | 🟡 `Royal Kingdom/booster_appear.wav` (800ms) | — | toolTip_opening 方向對但太長 |
| `ui.page.transition` | 畫面切換 | ✅ `Disney/curtains_transition_open.wav` (722ms) | ✅ `Disney/curtains_transition_close.wav` (743ms) | — | curtains 系列完美匹配場景轉換 |

---

## 八、總結與建議

### 高度推薦直接使用（幾乎不需後製）

| 音效 | 來源 | 對應事件 |
|---|---|---|
| `impossible_move.wav` | Royal Kingdom | `swap.invalid` |
| `match_explode_1~6.wav` | Royal Kingdom | `match.base`（6 變體） |
| `dynamite_creation.wav` | Royal Kingdom | `special.spawn.bomb` |
| `dynamite_explode.wav` | Royal Kingdom | `special.activate.bomb` |
| `dynamite_dynamite_combo.wav` | Royal Kingdom | `combo.bomb.bomb` |
| `electro_ball_creation.wav` | Royal Kingdom | `special.spawn.line` |
| `electro_ball_explode.wav` | Royal Kingdom | `special.activate.line` |
| `goal_complete.wav` | Royal Kingdom | `level.complete` |
| `level_failed.wav` | Royal Kingdom | `level.fail` |
| `general_star_land.wav` | Disney Solitaire | `stars.grant1/2/3` |
| `sfx_global_ui_button_tap.wav` | Disney Solitaire | `ui.click.soft` |
| `sfx_global_ui_popUp_opening.wav` | Disney Solitaire | `ui.modal.open` |
| `sfx_global_ui_popUp_closing.wav` | Disney Solitaire | `ui.modal.close` |
| `gem_open_1.wav` | Royal Kingdom | `gem.pick` |

### 需要後製但方向正確

| 音效 | 需要的處理 | 對應事件 |
|---|---|---|
| `ChainsBurst.wav` | 可能需裁切尾巴 | `chain.wow` |
| `sfx_coreGame_cards_tap_matchGliss_01~15.wav` | 選取 3-4 個做遞進 | `chain.tier1~3` |
| `kingdom_completed.wav` | 裁切前 2 秒 | `combo.colour.colour` |
| `sfx_coreGame_cards_stock_startSpread.wav` | 可能需加速 | `ui.reshuffle` |

### 仍建議保留合成的

| 事件 | 原因 |
|---|---|
| `match.base`（目前的 playStone） | 合成的 5 層石頭碎裂音效品質很好，且能隨 chain 連續變化。建議保留合成作為主音效，AudioLib 的 match_explode 作為疊加層 |
| `cascade.loop` | 庫中沒有理想的上升 loop 音效，建議用合成器製作 |

### 下一步行動

1. **試聽優先**：先聽 Royal Kingdom 的 `match_explode`、`dynamite` 系列、`goal_complete`、`level_failed`
2. **UI 音效可立即替換**：Disney Solitaire 的 UI 音效品質高且長度適中
3. **特殊寶石系統**：Royal Kingdom 的 dynamite/electro_ball 系列完整覆蓋 bomb/line 的生成→啟動流程
4. **星星音效**：Disney Solitaire 的 star 系列有 appear/fly/land 三階段，完美對應 GDD 的 `stars.grant1/2/3`
5. **授權確認**：使用前需確認這些音效的授權範圍是否允許用於本專案
