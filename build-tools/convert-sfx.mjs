// 將 public/assets/audio/sfx/*.wav 轉為 MP3（GDD 07§7.3 匯出格式），
// 原始 WAV 移至 assets-src/audio/sfx/（保留版本控管、不隨 dist 出貨）。
// 用法：node build-tools/convert-sfx.mjs

import { Mp3Encoder } from '@breezystack/lamejs';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SFX_DIR = join(__dirname, '..', 'public', 'assets', 'audio', 'sfx');
const SRC_DIR = join(__dirname, '..', 'assets-src', 'audio', 'sfx');

const MP3_KBPS = 96;

/** 極簡 RIFF/WAV 解析：回傳 { sampleRate, channels, samples: Int16Array（單聲道混音） } */
function parseWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('not a WAV file');
  }
  let offset = 12;
  let fmt = null;
  let data = null;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ') {
      fmt = {
        format: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bitsPerSample: buf.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      data = buf.subarray(body, body + size);
    }
    offset = body + size + (size % 2); // chunk 對齊
  }
  if (!fmt || !data) throw new Error('missing fmt/data chunk');
  if (fmt.format !== 1 || fmt.bitsPerSample !== 16) {
    throw new Error(`unsupported wav format (fmt=${fmt.format}, bits=${fmt.bitsPerSample})`);
  }

  const frames = data.length / 2 / fmt.channels;
  const mono = new Int16Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let ch = 0; ch < fmt.channels; ch++) {
      sum += data.readInt16LE((i * fmt.channels + ch) * 2);
    }
    mono[i] = Math.max(-32768, Math.min(32767, Math.round(sum / fmt.channels)));
  }
  return { sampleRate: fmt.sampleRate, channels: 1, samples: mono };
}

export function encodeMp3(samples, sampleRate, kbps = MP3_KBPS) {
  const enc = new Mp3Encoder(1, sampleRate, kbps);
  const chunks = [];
  const BLOCK = 1152;
  for (let i = 0; i < samples.length; i += BLOCK) {
    const out = enc.encodeBuffer(samples.subarray(i, i + BLOCK));
    if (out.length > 0) chunks.push(Buffer.from(out));
  }
  const end = enc.flush();
  if (end.length > 0) chunks.push(Buffer.from(end));
  return Buffer.concat(chunks);
}

// ─── main ────────────────────────────────────────────────────
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  mkdirSync(SRC_DIR, { recursive: true });
  const wavs = readdirSync(SFX_DIR).filter((f) => f.endsWith('.wav'));
  let inBytes = 0;
  let outBytes = 0;

  for (const file of wavs) {
    const wavPath = join(SFX_DIR, file);
    const buf = readFileSync(wavPath);
    const { sampleRate, samples } = parseWav(buf);
    const mp3 = encodeMp3(samples, sampleRate);
    const mp3Name = basename(file, '.wav') + '.mp3';
    writeFileSync(join(SFX_DIR, mp3Name), mp3);
    renameSync(wavPath, join(SRC_DIR, file));
    inBytes += buf.length;
    outBytes += mp3.length;
  }

  console.log(`✓ ${wavs.length} 個 SFX 轉為 MP3：${(inBytes / 1048576).toFixed(2)} MB → ${(outBytes / 1048576).toFixed(2)} MB`);
  console.log(`  原始 WAV 移至 ${SRC_DIR}`);
}
