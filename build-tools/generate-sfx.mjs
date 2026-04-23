// 生成 placeholder 音效（WAV 合成）— 石塊爆破風格
import { writeFileSync, mkdirSync } from 'fs';

const SAMPLE_RATE = 44100;

function generateWav(samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  for (let i = 0; i < numSamples; i++) {
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  }
  return buffer;
}

function mix(...arrays) {
  const maxLen = Math.max(...arrays.map(a => a.length));
  const out = new Float64Array(maxLen);
  for (const arr of arrays) {
    for (let i = 0; i < arr.length; i++) out[i] += arr[i];
  }
  // normalize
  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 1) for (let i = 0; i < out.length; i++) out[i] /= peak;
  return out;
}

// 石塊爆破：短促噪音 + 低頻衝擊 + 快速衰減
function rockCrush(duration = 0.18, vol = 0.6) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const noise = new Float64Array(n);
  const impact = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 25); // 極快衰減
    // 帶通噪音（石頭碎裂感）
    noise[i] = (Math.random() * 2 - 1) * vol * env * 0.7;
    // 低頻衝擊（重量感）
    impact[i] = Math.sin(2 * Math.PI * 80 * t) * vol * env * 0.5;
  }
  return mix(noise, impact);
}

// 寶石碎裂：高頻碎片 + 中頻共鳴
function gemShatter(duration = 0.22, vol = 0.5) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const crack = new Float64Array(n);
  const ring = new Float64Array(n);
  const debris = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env1 = Math.exp(-t * 30);
    const env2 = Math.exp(-t * 12);
    // 碎裂聲（高頻噪音脈衝）
    crack[i] = (Math.random() * 2 - 1) * vol * env1 * 0.6;
    // 水晶共鳴
    ring[i] = Math.sin(2 * Math.PI * 1200 * t) * vol * env2 * 0.25;
    // 碎片散落
    debris[i] = Math.sin(2 * Math.PI * (600 + Math.random() * 400) * t) * vol * Math.exp(-t * 20) * 0.15;
  }
  return mix(crack, ring, debris);
}

// 連鎖爆破：更大的爆破 + 回響
function chainBlast(duration = 0.35, vol = 0.6) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const boom = new Float64Array(n);
  const shatter = new Float64Array(n);
  const reverb = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    // 低頻爆炸
    boom[i] = Math.sin(2 * Math.PI * 60 * t) * vol * Math.exp(-t * 15) * 0.5;
    // 碎裂
    shatter[i] = (Math.random() * 2 - 1) * vol * Math.exp(-t * 18) * 0.5;
    // 回響
    reverb[i] = Math.sin(2 * Math.PI * 200 * t) * vol * Math.exp(-t * 8) * 0.2;
  }
  return mix(boom, shatter, reverb);
}

// Swap 滑動：短促的嗖聲
function swoosh(duration = 0.1, vol = 0.35) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 800 + 1200 * (i / n);
    const env = Math.sin(Math.PI * i / n); // 中間最大
    out[i] = (Math.random() * 2 - 1) * vol * env * 0.3 +
             Math.sin(2 * Math.PI * freq * t) * vol * env * 0.2;
  }
  return out;
}

// 無效交換：低沉的碰撞
function thud(duration = 0.15, vol = 0.3) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 20);
    out[i] = Math.sin(2 * Math.PI * 150 * t) * vol * env +
             (Math.random() * 2 - 1) * vol * env * 0.2;
  }
  return out;
}

// 掉落：由高到低的碰撞聲
function dropImpact(duration = 0.12, vol = 0.3) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 400 - 200 * (i / n);
    const env = Math.exp(-t * 25);
    out[i] = Math.sin(2 * Math.PI * freq * t) * vol * env * 0.5 +
             (Math.random() * 2 - 1) * vol * env * 0.3;
  }
  return out;
}

// 特殊寶石生成：上升音調 + 閃光
function specialSpawn(duration = 0.4, vol = 0.4) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 400 + 1600 * (i / n);
    const env = Math.sin(Math.PI * i / n);
    out[i] = Math.sin(2 * Math.PI * freq * t) * vol * env * 0.4 +
             Math.sin(2 * Math.PI * freq * 1.5 * t) * vol * env * 0.15;
  }
  return out;
}

// 過關：三連音上升
function levelComplete() {
  const notes = [523, 659, 784, 1047];
  const parts = notes.map((freq, idx) => {
    const dur = idx === notes.length - 1 ? 0.4 : 0.15;
    const n = Math.floor(SAMPLE_RATE * dur);
    const offset = Math.floor(SAMPLE_RATE * idx * 0.18);
    const out = new Float64Array(offset + n);
    for (let i = 0; i < n; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.exp(-t * 4);
      out[offset + i] = Math.sin(2 * Math.PI * freq * t) * 0.35 * env;
    }
    return out;
  });
  return mix(...parts);
}

// 失敗：下降音
function levelFail() {
  const n = Math.floor(SAMPLE_RATE * 0.5);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 400 - 200 * (i / n);
    const env = Math.exp(-t * 3);
    out[i] = Math.sin(2 * Math.PI * freq * t) * 0.3 * env;
  }
  return out;
}

// Combo 爆破：更大更重的爆破
function comboBlast(duration = 0.4, vol = 0.7) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const boom = new Float64Array(n);
  const crack = new Float64Array(n);
  const sub = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    boom[i] = (Math.random() * 2 - 1) * vol * Math.exp(-t * 12) * 0.6;
    crack[i] = Math.sin(2 * Math.PI * 100 * t + Math.random()) * vol * Math.exp(-t * 10) * 0.4;
    sub[i] = Math.sin(2 * Math.PI * 40 * t) * vol * Math.exp(-t * 8) * 0.3;
  }
  return mix(boom, crack, sub);
}

const sfx = {
  'match': gemShatter(),
  'swap': swoosh(),
  'invalid': thud(),
  'cascade': dropImpact(),
  'chain': chainBlast(),
  'combo': comboBlast(),
  'special-spawn': specialSpawn(),
  'level-complete': levelComplete(),
  'level-fail': levelFail(),
  'click': swoosh(0.05, 0.25),
};

mkdirSync('public/assets/sfx', { recursive: true });

for (const [name, samples] of Object.entries(sfx)) {
  const wav = generateWav(samples);
  writeFileSync(`public/assets/sfx/${name}.wav`, wav);
  console.log(`Generated: ${name}.wav (${(wav.length / 1024).toFixed(1)} KB)`);
}

console.log('Done!');
