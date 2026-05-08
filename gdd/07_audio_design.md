# 07 · 音樂音效設計 (Audio Design)

> **Status**: v1.0 (synced 2026-05-08) · **Owner**: match3-audio-engineer
> **Last updated**: 2026-05-08 · **Phase**: 3 — Polish Systems

---

## 1. 目標 (Goals)

對應支柱：**P2 連鎖即爽感**、**P3 清晰思考空間**、**P5 尊重時間**。

- 連鎖反應的爽感有**明確遞進**的音效階層
- 不同世界有獨特音樂氣質，但整體維持神秘/沉穩/暖意的調性
- 所有 SFX 皆可即時被靜音/降低音量；設定即時生效
- 瀏覽器 autoplay 政策合規，100% 玩家可聽到音樂而無例外
- 音訊 bundle ≤ 8 MB gzipped

---

## 2. Library Choice

> **v0.9 決策**：**Howler.js** (`howler ^2.2.4`)
>
> **理由**：
> - Safari 與 iOS 的 autoplay unlock 處理最成熟
> - 支援 Web Audio API + HTML5 Audio fallback
> - 與 PixiJS 無耦合，降低風險
> - 體積小（~10 KB gzipped）
>
> `@pixi/sound` 評估：整合度佳，但在 Safari 某些版本有已知 autoplay issues。保留為 v1.1+ 再次評估。

---

## 3. SFX 分類 (SFX Taxonomy)

### 3.1 板面互動 (Board Interaction)

| Event | 用途 | 變體 | Voice cap | Priority | Bus |
|---|---|---|---|---|---|
| `gem.pick` | 選取寶石 | 3 (±5% pitch) | 4 | normal | SFX.gameplay |
| `gem.hover` | 滑鼠 hover 寶石 (desktop) | 1 (very subtle) | 2 | low | SFX.gameplay |
| `swap.valid` | 交換合法 | 2 | 4 | normal | SFX.gameplay |
| `swap.invalid` | 交換非法 | 1 | 2 | normal | SFX.gameplay |

### 3.2 消除 (Match)

| Event | 用途 | 變體 | Voice cap | Priority | Bus |
|---|---|---|---|---|---|
| `match.base` | 基礎消除落地 | 3 (pitch +1 semitone per chain 1–5) | 6 | normal | SFX.gameplay |
| `match.special` | 包含特殊寶石的消除 | 2 | 4 | high | SFX.gameplay |
| `cascade.loop` | 多重連鎖時的上升音 | 1 (loop) | 1 | high | SFX.gameplay |

### 3.3 連鎖階層 (Chain Tiers — 疊加於 `match.base` 之上)

| Event | 觸發 | 音效特性 | Bus |
|---|---|---|---|
| `chain.tier1` | chain = 2 | 軟、短 | SFX.stinger |
| `chain.tier2` | chain = 3–4 | 明亮、加長 | SFX.stinger |
| `chain.tier3` | chain = 5+ | 史詩、ducks music 4dB | SFX.stinger |
| `chain.wow` | chain ≥8 或稀有組合 | 一次性慶祝號角 | SFX.stinger |

### 3.4 特殊寶石 (Special Gems)

| Event | 觸發 | Variants | Voice cap |
|---|---|---|---|
| `special.spawn.bomb` | 4-match 生成 area bomb | 1 | 3 |
| `special.spawn.line` | 5-line 生成 line bomb | 1 | 3 |
| `special.spawn.colour` | 5-T/L 生成 colour gem | 1 | 2 (rare) |
| `special.activate.bomb` | area bomb 爆炸 | 2 | 3 |
| `special.activate.line.h` | 水平 line bomb 啟動 | 1 (whoosh 左右) | 3 |
| `special.activate.line.v` | 垂直 line bomb 啟動 | 1 (whoosh 上下) | 3 |
| `special.activate.colour` | colour gem 啟動 | 1 (sweep 旋律) | 2 |

### 3.5 組合 (Combos — 特殊寶石互擊)

每個唯一組合有獨立 stinger，共 10 種：

| Event | 組合 |
|---|---|
| `combo.bomb.bomb` | Area Bomb × Area Bomb |
| `combo.bomb.line` | Area Bomb × Line Bomb |
| `combo.bomb.colour` | Area Bomb × Colour Gem |
| `combo.line.line` | Line × Line (十字) |
| `combo.line.colour` | Line × Colour Gem |
| `combo.colour.colour` | Colour × Colour (王牌) |

後 4 個（`bomb.line` ← → `line.bomb` 視為一致）。

### 3.6 狀態 / 進程

| Event | 觸發 |
|---|---|
| `level.start` | 關卡開始 intro 時 |
| `level.complete` | 達成目標後 victory sting |
| `level.fail` | 手數/時間用盡 |
| `stars.grant1` `stars.grant2` `stars.grant3` | Star reveal 每階 |
| `world.complete` | 世界完成 |
| `new.level.unlock` | 世界地圖上新關解鎖 |
| `achievement.unlock` | (v1.x) 成就解鎖 |

### 3.7 UI

| Event | 觸發 |
|---|---|
| `ui.click.soft` | 次要按鈕 |
| `ui.click.strong` | 主要 CTA |
| `ui.hover` | Desktop hover (可設定關閉) |
| `ui.toast.show` / `ui.toast.hide` | Toast 進/出 |
| `ui.modal.open` / `ui.modal.close` | Modal 進/出 |
| `ui.reshuffle` | 重洗動畫 |
| `ui.page.transition` | 畫面切換 |

### 3.8 Ambience / Music

| Event | 用途 |
|---|---|
| `music.menu` | 主選單 loop (60s seamless) |
| `music.world.1` | 世界 1 遊戲 loop (~180s) |
| `music.world.2` | 世界 2 遊戲 loop |
| `music.world.3` | 世界 3 遊戲 loop |
| `music.world.4` | 世界 4 遊戲 loop |
| `music.endless` | 無盡模式 loop |
| `music.celebrate` | 世界完成 fanfare (~15s, 非 loop) |
| `music.credits` | 製作群捲軸 (loop) |
| `ambience.board` | (optional, low) 棋盤底層氛圍 |

---

## 4. 自適應音樂系統 (Adaptive Music)

### 4.1 橫向重序列 (Horizontal Re-Sequencing)

- 每個世界的音樂作為 **無縫 loop**（180–240 秒）
- 世界切換時：交叉淡入淡出 1.5 秒
- 關卡完成 → 關卡開始時：背景持續；不中斷

### 4.2 垂直層疊 (Vertical Layering — 連鎖響應)

每首世界音樂匯出 **4 層 stem**：

| Layer | 內容 | 何時加入 |
|---|---|---|
| `L0.base` | 主旋律 + 節奏骨幹 | 永遠播放 |
| `L1.chain2` | 低音鋪陳（drum low, bass） | chain ≥2 (淡入 600ms) |
| `L2.chain4` | 中頻旋律 (string / pad) | chain ≥4 (淡入 400ms) |
| `L3.chain6plus` | 高頻璀璨（brass / bells） | chain ≥6 (淡入 200ms) |

所有 stem **BPM、調性、節拍** 鎖定，可任意組合不失和聲。

### 4.3 Intensity 映射

`intensity` (0..1) 的公式 canonical 於 [`06_game_flow.md#35-intensity-計算` (06§3.5)](06_game_flow.md#35-intensity-計算)。遊戲每 frame 經由 event bus `intensity.updated` event 發送當前值；音訊系統接收後以 150ms smoothing 對應至 layer gain：

- L1 gain = smoothstep(0.1, 0.3, intensity)
- L2 gain = smoothstep(0.35, 0.55, intensity)
- L3 gain = smoothstep(0.6, 0.85, intensity)

Layer 淡出：chain 結束後 1–2 秒 graceful fade。

### 4.4 Ducking

大 stinger（chain.tier3, combo.colour.colour, level.complete）啟動時：

- Music bus → -6dB over 150ms
- 恢復 +6dB over 400ms
- 防疊加：多個 stinger 同時觸發時，duck 時長取最長者

### 4.5 無音樂情境

- Pause 時：音樂暫停（Web Audio suspend）
- Tab 隱藏：音樂暫停（visibilitychange）
- 設定音樂 = 0：完全 mute music bus，SFX 照常

### 4.6 Per-World Ambience 預設（canonical）

每個世界的環境氛圍音量相對 `Ambience bus` 的預設值（玩家仍可透過 Ambience volume 統一縮放）：

| World | Ambience 預設 | 描述 |
|---|---|---|
| W1 失落的山嶺花園 | -12 dB（柔風 + 石造迴響） | 相對安靜 |
| W2 水晶之根 | -10 dB（水滴 + 洞穴殘響） | 中等，凸顯 Lock 破鎖聲 |
| W3 月下神殿 | -14 dB（水聲 + 月光鈴） | 最安靜，為莊嚴合唱鋪墊 |
| W4 星塵之塔 | -8 dB（風與星塵粒子） | 最大，配合史詩推進 |
| Endless | W1 基礎 + 花園鳥聲 -10 dB | 輕鬆 |
| Menu / Credits | Ambience off | — |

### 4.7 iOS 低電量 / 背景節流策略

偵測：`navigator.getBattery()` 回報 `battery.level < 0.2` 或 iOS Safari 的 Low Power Mode（無直接 API，透過 rAF 頻率 < 30Hz 偵測推斷）。

節流動作：
- Music 降一層（僅保留 L0.base）
- Ambience bus mute
- SFX voice cap 32 → 16
- 所有 stinger 壓縮時長 -20%

玩家可在設定中關閉此自動節流（`settings.audio.autoThrottle` boolean, default `true`）。

---

## 5. Bus 架構

```
Master (user master slider + 全局 mute)
├── Music Bus (user music slider)
│   ├── L0.base
│   ├── L1.chain2
│   ├── L2.chain4
│   └── L3.chain6plus
├── SFX Bus (user sfx slider)
│   ├── Gameplay (match, swap, gem)
│   ├── UI
│   └── Stinger (chain, special, combo — **ducks Music -6dB**)
└── Ambience Bus (user ambience slider, default -12dB)
```

**實作**：

```typescript
class AudioSystem {
  master: GainNode;
  buses: {
    music: GainNode;       // 下有子層
    sfxGameplay: GainNode;
    sfxUI: GainNode;
    sfxStinger: GainNode;
    ambience: GainNode;
  };
  // 每個 GainNode 連到 master
}
```

音量更新：

- 設定改變 → 立即更新對應 GainNode.value（`exponentialRampToValueAtTime` over 100ms）
- Mute → master.gain = 0；unmute → 恢復

---

## 6. 瀏覽器 Autoplay 處理

### 6.1 策略

- App 啟動：建構 AudioContext 為 `suspended` 狀態
- Splash screen 要求玩家 tap / click → 觸發 `ctx.resume()`
- 同時預載 core SFX bundle（音訊解壓耗時，早載早好）

### 6.2 實作關鍵

```typescript
let audioUnlocked = false;
const unlock = async (): Promise<void> => {
  if (audioUnlocked) return;
  await Howler.ctx.resume();
  audioUnlocked = true;
  console.info('Audio unlocked');
};

// 綁定到 splash 的 tap handler：
splash.on('pointerdown', unlock);
// 備援：第一個 global user gesture
window.addEventListener('pointerdown', unlock, { once: true });
```

### 6.3 預載前行為

- 音訊未 unlock 時，所有 `audio.play()` 靜默（不報錯、不 queue）
- UI 不啟動任何「請點擊來啟動音訊」以外的音效

---

## 7. 資產管線 (Asset Pipeline)

### 7.1 源檔規格

| 類型 | 格式 | 規格 |
|---|---|---|
| Music | WAV 44.1kHz 16-bit 或 48kHz | stereo |
| SFX | WAV 44.1kHz 16-bit | mono 或 stereo |
| Stinger | WAV 44.1kHz 16-bit | stereo |

### 7.2 響度標準 (LUFS)

| 類型 | Target Integrated |
|---|---|
| Music | -18 LUFS |
| Gameplay SFX | -14 LUFS |
| UI SFX | -16 LUFS |
| Stinger | -12 LUFS (刻意較響以穿透 mix) |

- 所有資產送 LUFS meter 檢驗
- Peak max = -1 dBFS（避免 clip）

### 7.3 匯出格式

- **主**：OGG Vorbis Q4（品質均衡）
- **備援**：MP3 192 kbps（Safari 支援最好）
- **格式偵測與載入**：Howler 自動偵測並擇優

### 7.4 壓縮預算

| 項目 | 目標大小 |
|---|---|
| Core SFX bundle (gameplay + UI) | ≤ 1 MB |
| Menu music | ≤ 500 KB |
| 單個 world music (4 stems) | ≤ 1.5 MB |
| 4 worlds music 合計 | ≤ 6 MB |
| Celebrate / credits music | ≤ 500 KB |
| **全部音訊** | **≤ 8 MB gzipped** |

### 7.5 Loop Points

音樂檔內嵌 loop start / loop end 以取得 sample-accurate 循環：

- OGG：透過 Vorbis comment (`LOOPSTART`, `LOOPEND` in samples)
- MP3：metadata tag；Howler 對 MP3 loop 容忍度較低，必要時用 `sprite` 功能指定 [start, end, loop]

---

## 8. Voice Stealing / Polyphony

- 全系統最多同時 **32 voices**
- 每 event 有自己的 voice cap（見上表）
- 超過時 priority-based steal:
  - Low < Normal < High
  - 相同 priority 下 steal oldest
- `match.base` cap 6 意味著連鎖期間如果 >6 段時間同步消除，僅最新 6 個觸發

---

## 9. 設定與 Accessibility

| 設定 | 預設 | 範圍 | 影響 |
|---|---|---|---|
| Master volume | 80% | 0–100% | 整體 |
| Music volume | 80% | 0–100% | Music bus |
| SFX volume | 90% | 0–100% | SFX bus |
| Ambience volume | 40%（default，per-world 覆寫見 §4.6） | 0–100% | Ambience bus |
| Mute (全靜音) | off | on/off | 全系統 |
| Subtitles (v1.x for VO) | off | on/off | 若有 VO |

### 9.1 視覺等效

每個**關鍵 SFX** 必有視覺替代：

| SFX | 視覺替代 |
|---|---|
| `chain.tierN` | 畫面 saturation pulse + chain-count 顯示 |
| `level.complete` | 粒子大爆 + 星星動畫 |
| `special.spawn` | 震波圈 |
| `swap.invalid` | 寶石抖動 |

---

## 10. 測試計畫

### 10.1 瀏覽器矩陣

| 測試項 | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| Autoplay unlock 於 first tap | ✓ | ✓ | ✓ | ✓ |
| OGG 播放 | ✓ | ✓ | — (用 MP3) | ✓ |
| MP3 fallback | ✓ | ✓ | ✓ | ✓ |
| 音量即時生效 | ✓ | ✓ | ✓ | ✓ |
| Tab 切換時暫停/恢復 | ✓ | ✓ | ✓ | ✓ |

### 10.2 混音驗證

- 所有 stinger 不可 clip
- 全場大連鎖 + celebration scene 無 audio glitch
- Music 與 SFX 比例：music 可被 SFX 覆蓋但不失踪；SFX 可清晰聽到

### 10.3 資產驗證 (CI)

- 檔案大小檢查（違反預算 → fail build）
- LUFS 自動分析（外部 tool，每次新增資產跑）
- Loop continuity test（check waveform continuity at loop point，可聽覺審或腳本）

---

## 11. 開發階段置位資產 (Placeholder Audio)

v0.9 階段使用合成器/免費音色庫置位，讓 game flow 測試不被音訊阻塞：

- 寶石類：正弦 + 頻率變化
- 連鎖類：疊加白噪 + 失真
- 音樂：單一 chip-tune loop 先行

待音樂製作人接手再替換。

---

## 12. 開發任務清單 (Audio Production Checklist)

- [ ] v0.9：Placeholder audio bundle 上線（~2MB，足以通測）
- [ ] 音訊導演接手，從 SFX 清單開始
- [ ] 每 worlds 音樂 4 stems 交付
- [ ] LUFS 標準化 + loop marker 寫入
- [ ] OGG + MP3 匯出
- [ ] manifest.json 串接
- [ ] 瀏覽器矩陣測試通過
- [ ] release gate：autoplay 於所有 Tier 1 瀏覽器無靜啞

---

## 13. Open Questions

| # | 問題 | 備註 |
|---|---|---|
| 1 | 是否加入 VO（守夢人角色 / Lumi）？ | v1 預設不做；v1.1+ 評估 |
| 2 | Music 外包 vs 委託 | 待預算決定 |
| 3 | 是否提供「自定義 playlist」給 endless？ | 不做，複雜度過高 |
| 4 | Ambience 默認音量 40% 是否適合所有世界？ | 依各世界混音試聽 |
| 5 | iOS 低電量模式下的音訊 throttle？ | 測試後補策略 |

---

## Changelog

- **2026-04-21** · v0.9 · 初稿（owner: match3-audio-engineer）
