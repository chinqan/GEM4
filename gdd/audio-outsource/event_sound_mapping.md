# 音效外包挑選對照表

> **專案**: Gem SFX  
> **規格版本**: v1.2  
> **匯出時間**: 2026-05-11T04:28:02.838Z  
> **完成度**: 45/45 事件, 56/56 檔案

---

| 狀態 | 事件 ID | 說明 | 需求變體 | 已選 | 對應音效檔 |
|:---:|---|---|:---:|:---:|---|
| | **板面互動** | | | | |
| ✅ | `gem.pick` | 玩家手指或滑鼠按下選取一顆寶石。寶石微微浮起、發出柔光。需要... | 3 | 3 | gem_pick_01.wav, gem_pick_02.wav, gem_pick_03.wav |
| ✅ | `gem.hover` | 滑鼠 hover 寶石（僅 Desktop）。極輕的觸感回饋... | 1 | 1 | gem_hover_01.wav |
| ✅ | `swap.valid` | 兩顆相鄰寶石成功交換位置（180ms 補間動畫）。像兩顆光滑... | 2 | 2 | swap_valid_01.wav, swap_valid_02.wav |
| ✅ | `swap.invalid` | 玩家嘗試非法交換，寶石回彈。短促明確的「不行」回饋，像碰到隱... | 1 | 1 | swap_invalid_01.wav |
| | **消除** | | | | |
| ✅ | `match.base` | 3 顆以上同色寶石被消除，寶石碎裂為光粒子飛散。需要清脆碎裂... | 6 | 6 | match_base_01.wav, match_base_02.wav, match_base_03.wav, match_base_04.wav, match_base_05.wav, match_base_06.wav |
| ✅ | `match.special` | 消除中包含特殊寶石時的額外強調音（會疊加在 `match.b... | 2 | 2 | match_special_01.wav, match_special_02.wav |
| ✅ | `cascade.loop` | 連鎖（cascade）持續發生時的背景上升音。能量持續累積、... | 1 | 1 | cascade_loop_01.wav |
| | **連鎖階層** | | | | |
| ✅ | `chain.tier1` | chain=2，第一次連鎖。輕柔的「叮」，像風鈴被微風觸碰。... | 1 | 1 | chain_tier1_01.wav |
| ✅ | `chain.tier2` | chain=3–4，連鎖加深。明亮的上升音階，像光束逐漸聚焦... | 1 | 1 | chain_tier2_01.wav |
| ✅ | `chain.tier3` | chain=5+，進入史詩領域。壯闊的和弦展開，像管弦樂齊奏... | 1 | 1 | chain_tier3_01.wav |
| ✅ | `chain.wow` | chain≥8 或極稀有組合。一次性慶祝 fanfare，像... | 1 | 1 | chain_wow_01.wav |
| | **特殊寶石生成** | | | | |
| ✅ | `special.spawn.bomb` | Area Bomb 生成（4-match 觸發）。能量從四周... | 1 | 1 | special_spawn_bomb_01.wav |
| ✅ | `special.spawn.line` | Line Bomb 生成（5-line 觸發）。能量沿直線凝... | 1 | 1 | special_spawn_line_01.wav |
| ✅ | `special.spawn.colour` | Colour Gem 生成（5-T/L 觸發，最稀有）。稜鏡... | 1 | 1 | special_spawn_colour_01.wav |
| | **特殊寶石啟動** | | | | |
| ✅ | `special.activate.bomb` | Area Bomb 爆炸：以自身為中心向四周擴散衝擊波，3×... | 2 | 2 | special_activate_bomb_01.wav, special_activate_bomb_02.wav |
| ✅ | `special.activate.line.h` | 水平 Line Bomb：能量光束從中心向左右兩端同時射出，... | 1 | 1 | special_activate_line_h_01.wav |
| ✅ | `special.activate.line.v` | 垂直 Line Bomb：能量光束從中心向上下兩端射出，縱貫... | 1 | 1 | special_activate_line_v_01.wav |
| ✅ | `special.activate.colour` | Colour Gem 啟動：彩色能量波從中心向全場擴散，將所... | 1 | 1 | special_activate_colour_01.wav |
| | **組合互擊** | | | | |
| ✅ | `combo.bomb.bomb` | Bomb × Bomb：兩顆炸彈合體，爆炸範圍加倍（5×5）... | 1 | 1 | combo_bomb_bomb_01.wav |
| ✅ | `combo.line.line` | Line × Line：形成十字光束，同時橫掃一行 + 縱貫... | 1 | 1 | combo_line_line_01.wav |
| ✅ | `combo.bomb.line` | Bomb × Line：炸彈沿線性方向連續爆炸，像多米諾骨牌... | 1 | 1 | combo_bomb_line_01.wav |
| ✅ | `combo.bomb.colour` | Bomb × Colour：全場所有同色寶石各自變成炸彈並同... | 1 | 1 | combo_bomb_colour_01.wav |
| ✅ | `combo.line.colour` | Line × Colour：全場所有同色寶石各自變成 Lin... | 1 | 1 | combo_line_colour_01.wav |
| ✅ | `combo.colour.colour` | Colour × Colour：全場所有寶石消除。遊戲中最強... | 1 | 1 | combo_colour_colour_01.wav |
| | **狀態/進程** | | | | |
| ✅ | `level.start` | 關卡開始，棋盤從上方落入畫面。像舞台幕簾拉開、冒險即將開始的... | 1 | 1 | level_start_01.wav |
| ✅ | `level.complete` | 達成關卡目標。歡慶的小型 fanfare，像完成一個小英雄旅... | 1 | 1 | level_complete_01.wav |
| ✅ | `level.fail` | 手數用盡未達目標。遺憾但不沮喪，像「下次再來」的溫柔鼓勵。重... | 1 | 1 | level_fail_01.wav |
| ✅ | `stars.grant1` | 結算第 1 顆星落下並亮起。清脆的星音，像夜空第一顆星點亮。 | 1 | 1 | stars_grant1_01.wav |
| ✅ | `stars.grant2` | 第 2 顆星飛入並落定。比第 1 顆更明亮，包含「飛入」的動... | 1 | 1 | stars_grant2_01.wav |
| ✅ | `stars.grant3` | 第 3 顆星華麗登場。三星齊亮的完美時刻，可有短暫的和弦綻放... | 1 | 1 | stars_grant3_01.wav |
| ✅ | `world.complete` | 一整個世界（含多關卡）全部完成。史詩級成就，像征服一座山峰後... | 1 | 1 | world_complete_01.wav |
| ✅ | `new.level.unlock` | 世界地圖上新關卡解鎖，路徑亮起。像發現新道路、新可能性的驚喜... | 1 | 1 | new_level_unlock_01.wav |
| ✅ | `ui.reshuffle` | 板面無可用移動時自動重洗，所有寶石飛散重組。像撲克牌洗牌的俐... | 1 | 1 | ui_reshuffle_01.wav |
| | **UI 音效** | | | | |
| ✅ | `ui.click.soft` | 次要按鈕點擊（返回、關閉、選項切換）。極輕觸感，像指尖點玻璃... | 1 | 1 | ui_click_soft_01.wav |
| ✅ | `ui.click.strong` | 主要 CTA（開始遊戲、確認購買）。比 soft 更有份量，... | 1 | 1 | ui_click_strong_01.wav |
| ✅ | `ui.hover` | Desktop 滑鼠 hover 按鈕。比 `gem.hov... | 1 | 1 | ui_hover_01.wav |
| ✅ | `ui.modal.open` | Modal 對話框從中心展開。像一扇小門優雅打開，有空間擴張... | 1 | 1 | ui_modal_open_01.wav |
| ✅ | `ui.modal.close` | Modal 對話框收合消失。像門輕輕關上，收束感，比 ope... | 1 | 1 | ui_modal_close_01.wav |
| ✅ | `ui.toast.show` | Toast 通知從邊緣滑入。輕巧的「叮」引起注意但不打擾，像... | 1 | 1 | ui_toast_show_01.wav |
| ✅ | `ui.toast.hide` | Toast 通知滑出消失。比 show 更安靜，像信件被收起... | 1 | 1 | ui_toast_hide_01.wav |
| ✅ | `ui.page.transition` | 主要畫面切換（地圖→關卡、關卡→結算）。有方向性的過場 wh... | 1 | 1 | ui_page_transition_01.wav |
| | **_________** | | | | |
| ✅ | `blocker.immovable` | 玩家嘗試拖動/交換果凍格中的寶石，操作被阻擋。需要帶有「黏稠... | 1 | 1 | blocker_immovable_01.wav |
| ✅ | `jelly.hit.l3` | 果凍格被周遭消除波及，從第 3 層（最厚）降至第 2 層。厚... | 1 | 1 | jelly_hit_l3_01.wav |
| ✅ | `jelly.hit.l2` | 果凍格從第 2 層降至第 1 層（薄層）。比 l3 版更高頻... | 1 | 1 | jelly_hit_l2_01.wav |
| ✅ | `jelly.clear` | 果凍格完全清除（最後一層消失）。果凍破裂的明亮「啵！」，帶有... | 2 | 2 | jelly_clear_01.wav, jelly_clear_02.wav |

---

## 檔案清單

| # | 事件 ID | 變體 | 檔案名稱 | 來源 | 長度 |
|:---:|---|:---:|---|---|---|
| 1 | `gem.pick` | #1 | gem_pick_01.wav | Royal Kingdom download/lightball_ray_2.wav | 440ms |
| 2 | `gem.pick` | #2 | gem_pick_02.wav | Royal Kingdom download/gem_open_1.wav | 326ms |
| 3 | `gem.pick` | #3 | gem_pick_03.wav | Royal Kingdom download/glass_tube_collect.wav | 500ms |
| 4 | `gem.hover` | #1 | gem_hover_01.wav | Royal Kingdom download/safe_gem_collect_1.wav | 106ms |
| 5 | `swap.valid` | #1 | swap_valid_01.wav | Royal Kingdom download/lightball_ray_1.wav | 507ms |
| 6 | `swap.valid` | #2 | swap_valid_02.wav | Royal Kingdom main/hidden_path_gem_success.wav | 1488ms |
| 7 | `swap.invalid` | #1 | swap_invalid_01.wav | Royal Kingdom download/gem_close_1.wav | 364ms |
| 8 | `match.base` | #1 | match_base_01.wav | Royal Kingdom download/gem_destroy_1.wav | 541ms |
| 9 | `match.base` | #2 | match_base_02.wav | Royal Kingdom main/crystal_destroy_2.wav | 866ms |
| 10 | `match.base` | #3 | match_base_03.wav | Royal Kingdom download/match_explode_4.wav | 214ms |
| 11 | `match.base` | #4 | match_base_04.wav | Royal Kingdom main/crystal_shield_destroy_2.wav | 899ms |
| 12 | `match.base` | #5 | match_base_05.wav | Royal Kingdom main/lily_destroy_2.wav | 419ms |
| 13 | `match.base` | #6 | match_base_06.wav | Royal Kingdom main/boss_pumpkin_destroy_2.wav | 408ms |
| 14 | `match.special` | #1 | match_special_01.wav | Royal Kingdom main/crystal_destroy_2.wav | 866ms |
| 15 | `match.special` | #2 | match_special_02.wav | Royal Kingdom download/gem_destroy_1.wav | 541ms |
| 16 | `cascade.loop` | #1 | cascade_loop_01.wav | AudioClip/ChainsBurst.wav | 1520ms |
| 17 | `chain.tier1` | #1 | chain_tier1_01.wav | AudioClip/RazorWind.wav | 890ms |
| 18 | `chain.tier2` | #1 | chain_tier2_01.wav | Royal Kingdom main/power_rush_icon_collect.wav | 1079ms |
| 19 | `chain.tier3` | #1 | chain_tier3_01.wav | Disney Solitaire Audio/sfx_metaGame_scene_mermaid_mission03_majesticEntrance.wav | 2343ms |
| 20 | `chain.wow` | #1 | chain_wow_01.wav | Disney Solitaire Audio/mtx_challenge_badge_complete.wav | 1659ms |
| 21 | `special.spawn.bomb` | #1 | special_spawn_bomb_01.wav | Royal Kingdom download/magic_wall_gemstone_throw_1.wav | 807ms |
| 22 | `special.spawn.line` | #1 | special_spawn_line_01.wav | Royal Kingdom main/cube_blast_multi_line_2.wav | 1323ms |
| 23 | `special.spawn.colour` | #1 | special_spawn_colour_01.wav | Royal Kingdom download/magic_pot_upgrade_X2.wav | 1305ms |
| 24 | `special.activate.bomb` | #1 | special_activate_bomb_01.wav | Royal Kingdom download/barrel_bomb_explode_1.wav | 1235ms |
| 25 | `special.activate.bomb` | #2 | special_activate_bomb_02.wav | Royal Kingdom download/magic_wall_destroy_1.wav | 765ms |
| 26 | `special.activate.line.h` | #1 | special_activate_line_h_01.wav | Royal Kingdom download/electro_ball_ray_1.wav | 773ms |
| 27 | `special.activate.line.v` | #1 | special_activate_line_v_01.wav | Royal Kingdom main/power_rush_icon_collect.wav | 1079ms |
| 28 | `special.activate.colour` | #1 | special_activate_colour_01.wav | Royal Kingdom main/medallion_destroy_2.wav | 786ms |
| 29 | `combo.bomb.bomb` | #1 | combo_bomb_bomb_01.wav | Royal Kingdom download/attack_cannon_projectile_explode.wav | 3167ms |
| 30 | `combo.line.line` | #1 | combo_line_line_01.wav | Royal Kingdom main/medallion_destroy_2.wav | 786ms |
| 31 | `combo.bomb.line` | #1 | combo_bomb_line_01.wav | Royal Kingdom download/steam_bomb_explode.wav | 2117ms |
| 32 | `combo.bomb.colour` | #1 | combo_bomb_colour_01.wav | Royal Kingdom main/cube_blast_multi_line_6.wav | 2032ms |
| 33 | `combo.line.colour` | #1 | combo_line_colour_01.wav | Royal Kingdom main/cube_blast_multi_line_6.wav | 2032ms |
| 34 | `combo.colour.colour` | #1 | combo_colour_colour_01.wav | Royal Kingdom main/hidden_path_explode_mole_directional.wav | 2556ms |
| 35 | `level.start` | #1 | level_start_01.wav | Royal Kingdom download/new_object_unlocked.wav | 2669ms |
| 36 | `level.complete` | #1 | level_complete_01.wav | Royal Kingdom download/stinger_level_win_celebration.wav | 5516ms |
| 37 | `level.fail` | #1 | level_fail_01.wav | Disney Solitaire Audio/level_rolling_carpet_undo.wav | 1819ms |
| 38 | `stars.grant1` | #1 | stars_grant1_01.wav | Disney Solitaire Audio/general_star_land.wav | 1005ms |
| 39 | `stars.grant2` | #1 | stars_grant2_01.wav | Disney Solitaire Audio/general_star_fly.wav | 1416ms |
| 40 | `stars.grant3` | #1 | stars_grant3_01.wav | Disney Solitaire Audio/album_set_complete_sparkle_appear.wav | 2068ms |
| 41 | `world.complete` | #1 | world_complete_01.wav | Royal Kingdom download/gong_stage_complete_3.wav | 3125ms |
| 42 | `new.level.unlock` | #1 | new_level_unlock_01.wav | Royal Kingdom download/new_district_unlocked.wav | 2132ms |
| 43 | `ui.reshuffle` | #1 | ui_reshuffle_01.wav | Royal Kingdom main/ice_block_penguin_hit_2.wav | 653ms |
| 44 | `ui.click.soft` | #1 | ui_click_soft_01.wav | Disney Solitaire Audio/album_transition_between_sets_carrousel_button.wav | 138ms |
| 45 | `ui.click.strong` | #1 | ui_click_strong_01.wav | AudioClip/ButtonClick.wav | 131ms |
| 46 | `ui.hover` | #1 | ui_hover_01.wav | Disney Solitaire Audio/album_transition_between_sets_carrousel_button.wav | 138ms |
| 47 | `ui.modal.open` | #1 | ui_modal_open_01.wav | Disney Solitaire Audio/sfx_global_ui_toolTip_opening.wav | 2764ms |
| 48 | `ui.modal.close` | #1 | ui_modal_close_01.wav | Disney Solitaire Audio/album_transition_between_sets_carrousel_button.wav | 138ms |
| 49 | `ui.toast.show` | #1 | ui_toast_show_01.wav | Royal Kingdom download/lightball_ray_1.wav | 507ms |
| 50 | `ui.toast.hide` | #1 | ui_toast_hide_01.wav | Royal Kingdom download/penguin_fall_2.wav | 922ms |
| 51 | `ui.page.transition` | #1 | ui_page_transition_01.wav | Disney Solitaire Audio/album_transition_between_sets_page_flip.wav | 942ms |
| 52 | `blocker.immovable` | #1 | blocker_immovable_01.wav | Royal Kingdom main/magic_wall_gemstone_throw_2.wav | 808ms |
| 53 | `jelly.hit.l3` | #1 | jelly_hit_l3_01.wav | Royal Kingdom main/magic_wall_gemstone_throw_2.wav | 808ms |
| 54 | `jelly.hit.l2` | #1 | jelly_hit_l2_01.wav | Royal Kingdom download/chain_break_1.wav | 776ms |
| 55 | `jelly.clear` | #1 | jelly_clear_01.wav | Royal Kingdom main/chain_break_2.wav | 739ms |
| 56 | `jelly.clear` | #2 | jelly_clear_02.wav | Royal Kingdom download/chain_break_1.wav | 776ms |
