// ─── 音效系統 ──────────────────────────────────────────────
// 合成石頭碎裂音效（Web Audio API oscillator + noise buffer）
// match 音效完全由即時合成產生，其餘音效仍使用 .wav 檔

let _ctx: AudioContext | null = null;
const _sampleBuffers = new Map<string, AudioBuffer>();
const _noiseBuffers = new Map<string, AudioBuffer>();
let _loadPromise: Promise<void> | null = null;

function ensure(): AudioContext {
  if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (_ctx.state === 'suspended') void _ctx.resume();
  return _ctx;
}

// ─── Noise buffer 快取 ─────────────────────────────────────

function getNoiseBuffer(
  key: string,
  size: number,
  fill: (data: Float32Array, length: number) => void,
): AudioBuffer {
  let buf = _noiseBuffers.get(key);
  if (buf) return buf;
  const ctx = ensure();
  buf = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buf.getChannelData(0);
  fill(data, size);
  _noiseBuffers.set(key, buf);
  return buf;
}

/** 設定 onended 自動斷開所有節點 */
function setOnEnded(src: AudioBufferSourceNode | OscillatorNode, ...nodes: AudioNode[]): void {
  src.onended = () => {
    for (const n of nodes) {
      try { n.disconnect(); } catch { /* already disconnected */ }
    }
  };
}

// ─── 載入 .wav 音效檔（非 match 用）──────────────────────

const SFX_FILES: Record<string, string> = {
  swap:           '/assets/sfx/swap.wav',
  invalid:        '/assets/sfx/invalid.wav',
  cascade:        '/assets/sfx/cascade.wav',
  click:          '/assets/sfx/click.wav',
  combo:          '/assets/sfx/combo.wav',
  specialSpawn:   '/assets/sfx/special-spawn.wav',
  levelComplete:  '/assets/sfx/level-complete.wav',
  levelFail:      '/assets/sfx/level-fail.wav',
};

async function loadAllBuffers(): Promise<void> {
  const ctx = ensure();
  const entries = Object.entries(SFX_FILES);
  await Promise.all(
    entries.map(async ([key, url]) => {
      if (_sampleBuffers.has(key)) return;
      try {
        const res = await fetch(url);
        const arrayBuf = await res.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(arrayBuf);
        _sampleBuffers.set(key, audioBuf);
      } catch (e) {
        console.warn(`[SFX] Failed to load ${key}: ${url}`, e);
      }
    }),
  );
}

/** 預載所有音效，應在使用者首次互動後呼叫 */
export function preloadStoneSfx(): Promise<void> {
  if (!_loadPromise) {
    _loadPromise = loadAllBuffers();
  }
  return _loadPromise;
}

// ─── 播放 .wav 工具（非 match 用）──────────────────────────

function play(key: string, volume = 1.0, rate = 1.0): void {
  const ctx = ensure();
  const buf = _sampleBuffers.get(key);
  if (!buf) {
    preloadStoneSfx();
    return;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.connect(gain).connect(ctx.destination);
  src.start(ctx.currentTime);
  src.onended = () => { try { src.disconnect(); gain.disconnect(); } catch {} };
}

// ─── 合成石頭碎裂音效 ──────────────────────────────────────

/**
 * 播放合成石頭碎裂音效。
 * @param level 強度 0~10
 *
 * 五層合成：
 *  1. click — 高頻噪音瞬態（石頭撞擊的「喀」）
 *  2. knock — 三角波下滑（中頻敲擊體感）
 *  3. grit  — 帶通噪音（碎裂的沙沙質感）
 *  4. thud  — 正弦波快速下滑（低頻衝擊）
 *  5. tail  — 正弦波淡入淡出（高頻餘韻）
 *
 * 所有參數隨 level 連續變化，不需要分層門檻。
 */
export function playStone(level: number): void {
  const ctx = ensure();
  const t = ctx.currentTime;
  const intensity = 0.6 + level * 0.07;

  // ── 層 1：click 瞬態 ──
  const clickDur = 0.008;
  const clickSz = Math.floor(ctx.sampleRate * clickDur);
  const clickBuf = getNoiseBuffer(`stone_click_${level}`, clickSz, (d, n) => {
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 12);
  });
  const clickSrc = ctx.createBufferSource();
  clickSrc.buffer = clickBuf;
  const clickG = ctx.createGain();
  clickG.gain.setValueAtTime(0.8 * intensity, t);
  clickG.gain.exponentialRampToValueAtTime(0.001, t + clickDur);
  const clickHPF = ctx.createBiquadFilter();
  clickHPF.type = 'highpass';
  clickHPF.frequency.setValueAtTime(3000, t);
  clickHPF.Q.setValueAtTime(2, t);
  clickSrc.connect(clickHPF).connect(clickG).connect(ctx.destination);
  clickSrc.start(t);
  clickSrc.stop(t + clickDur);
  setOnEnded(clickSrc, clickSrc, clickHPF, clickG);

  // ── 層 2：knock 敲擊 ──
  const knockDur = 0.12 + level * 0.02;
  const knockFreq = 800 - level * 40;
  const knockO = ctx.createOscillator();
  const knockG = ctx.createGain();
  knockO.type = 'triangle';
  knockO.frequency.setValueAtTime(knockFreq, t);
  knockO.frequency.exponentialRampToValueAtTime(knockFreq * 0.5, t + knockDur);
  knockG.gain.setValueAtTime(0.35 * intensity, t);
  knockG.gain.exponentialRampToValueAtTime(0.001, t + knockDur);
  const knockBPF = ctx.createBiquadFilter();
  knockBPF.type = 'bandpass';
  knockBPF.frequency.setValueAtTime(knockFreq, t);
  knockBPF.Q.setValueAtTime(5, t);
  knockO.connect(knockBPF).connect(knockG).connect(ctx.destination);
  knockO.start(t);
  knockO.stop(t + knockDur);
  setOnEnded(knockO, knockO, knockBPF, knockG);

  // ── 層 3：grit 碎裂質感 ──
  const gritDur = 0.15 + level * 0.02;
  const gritSz = Math.floor(ctx.sampleRate * gritDur);
  const gritBuf = getNoiseBuffer(`stone_grit_${level}`, gritSz, (d, n) => {
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 5);
  });
  const gritSrc = ctx.createBufferSource();
  gritSrc.buffer = gritBuf;
  const gritG = ctx.createGain();
  gritG.gain.setValueAtTime(0.18 * intensity, t + 0.005);
  gritG.gain.exponentialRampToValueAtTime(0.001, t + gritDur);
  const gritBPF = ctx.createBiquadFilter();
  gritBPF.type = 'bandpass';
  gritBPF.frequency.setValueAtTime(1500 + level * 100, t);
  gritBPF.Q.setValueAtTime(3, t);
  gritSrc.connect(gritBPF).connect(gritG).connect(ctx.destination);
  gritSrc.start(t + 0.005);
  gritSrc.stop(t + gritDur);
  setOnEnded(gritSrc, gritSrc, gritBPF, gritG);

  // ── 層 4：thud 低頻衝擊 ──
  const thudO = ctx.createOscillator();
  const thudG = ctx.createGain();
  thudO.type = 'sine';
  thudO.frequency.setValueAtTime(200 + level * 10, t);
  thudO.frequency.exponentialRampToValueAtTime(70, t + 0.05);
  thudG.gain.setValueAtTime(0.25 * intensity, t);
  thudG.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  thudO.connect(thudG).connect(ctx.destination);
  thudO.start(t);
  thudO.stop(t + 0.07);
  setOnEnded(thudO, thudO, thudG);

  // ── 層 5：tail 高頻餘韻 ──
  const tailDur = 0.2 + level * 0.03;
  const tailO = ctx.createOscillator();
  const tailG = ctx.createGain();
  tailO.type = 'sine';
  tailO.frequency.setValueAtTime(1200 + level * 50, t + 0.02);
  tailO.frequency.exponentialRampToValueAtTime(600, t + tailDur);
  tailG.gain.setValueAtTime(0.001, t);
  tailG.gain.linearRampToValueAtTime(0.04 * intensity, t + 0.04);
  tailG.gain.exponentialRampToValueAtTime(0.001, t + tailDur);
  tailO.connect(tailG).connect(ctx.destination);
  tailO.start(t + 0.02);
  tailO.stop(t + tailDur);
  setOnEnded(tailO, tailO, tailG);
}

// ─── 公開 API ──────────────────────────────────────────────

/**
 * 播放消除音效。
 *
 * level 公式：chain 為主要驅動，count 只做微調。
 * chain=1 → level 1~2, chain=2 → 3~4, ... chain=5 → 9~10
 * 確保 combo 永遠比前一消更強，不受 count 大小影響。
 */
export function playMatchSfx(count: number, chain: number): void {
  const base = Math.min(chain * 2 - 1, 9);
  const bonus = count >= 5 ? 1 : 0;
  const level = Math.min(base + bonus, 10);
  playStone(level);
}

export function playSwap(): void {
  // 暫時關閉
}

export function playInvalid(): void {
  play('invalid', 0.5, 1.0);
}

export function playCascade(): void {
  play('cascade', 0.4, 1.0);
}

export function playLevelComplete(): void {
  play('levelComplete', 0.7, 1.0);
}

export function playCombo(): void {
  play('combo', 0.7, 1.0);
}

export function playLevelFail(): void {
  play('levelFail', 0.6, 1.0);
}
