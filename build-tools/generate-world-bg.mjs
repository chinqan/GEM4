// 產生 World 2 / World 4 的佔位背景圖（1536×2048 PNG，與 world-1/3 同規格）
// 用法：node build-tools/generate-world-bg.mjs
// 主題色對齊 src/ui/theme.ts 的 WORLD_ACCENTS 與 GDD 04 章世界視覺定調。

import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'assets', 'worlds');

const W = 1536;
const H = 2048;

/** 決定性偽隨機（固定 seed，重跑輸出一致） */
function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stars(rng, count, colour, rMin, rMax, opacityMax) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = (rng() * W).toFixed(0);
    const y = (rng() * H).toFixed(0);
    const r = (rMin + rng() * (rMax - rMin)).toFixed(1);
    const o = (0.2 + rng() * (opacityMax - 0.2)).toFixed(2);
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${colour}" opacity="${o}"/>`;
  }
  return out;
}

/** 尖角水晶多邊形 */
function crystal(x, y, w, h, colour, opacity, tilt = 0) {
  const pts = [
    [x, y + h],
    [x - w / 2, y + h * 0.45],
    [x - w / 6, y + h * 0.18],
    [x, y],
    [x + w / 6, y + h * 0.18],
    [x + w / 2, y + h * 0.45],
  ]
    .map(([px, py]) => `${px.toFixed(0)},${py.toFixed(0)}`)
    .join(' ');
  return `<polygon points="${pts}" fill="${colour}" opacity="${opacity}" transform="rotate(${tilt} ${x} ${y + h / 2})"/>`;
}

// ─── World 2 — 水晶之根（深藍洞穴 + 水晶簇）──────────────────
function world2Svg() {
  const rng = mulberry32(20250902);
  let crystals = '';
  // 底部水晶簇
  for (let i = 0; i < 14; i++) {
    const x = rng() * W;
    const h = 260 + rng() * 620;
    const w = 90 + rng() * 200;
    const y = H - h * (0.55 + rng() * 0.3);
    const tone = ['#64b5f6', '#4a90d9', '#7fc4ff', '#1e5a96'][Math.floor(rng() * 4)];
    crystals += crystal(x, y, w, h, tone, 0.12 + rng() * 0.2, (rng() - 0.5) * 24);
  }
  // 頂部倒懸水晶
  for (let i = 0; i < 8; i++) {
    const x = rng() * W;
    const h = 180 + rng() * 380;
    const w = 70 + rng() * 130;
    crystals += `<g transform="translate(${x.toFixed(0)} 0) scale(1 -1) translate(${(-x).toFixed(0)} ${-h * 0.9})">${crystal(x, 0, w, h, '#4a90d9', 0.1 + rng() * 0.14, (rng() - 0.5) * 16)}</g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a1b33"/>
      <stop offset="0.45" stop-color="#123055"/>
      <stop offset="1" stop-color="#081527"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.75">
      <stop offset="0" stop-color="#64b5f6" stop-opacity="0.30"/>
      <stop offset="0.55" stop-color="#1e5a96" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${crystals}
  ${stars(rng, 90, '#bfe3ff', 1, 3.4, 0.7)}
  <rect width="${W}" height="${H}" fill="#050d18" opacity="0.14"/>
</svg>`;
}

// ─── World 4 — 星塵之塔（星空 + 高塔剪影 + 金紫星塵）─────────
function world4Svg() {
  const rng = mulberry32(20250904);

  // 高塔剪影（中央，逐層縮窄）
  let tower = '';
  const cx = W / 2;
  let y = H;
  let w = 620;
  for (let i = 0; i < 7; i++) {
    const h = 210 - i * 14;
    tower += `<rect x="${(cx - w / 2).toFixed(0)}" y="${(y - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h}" rx="14" fill="#140b2e" opacity="0.9"/>`;
    y -= h + 8;
    w *= 0.82;
  }
  tower += `<circle cx="${cx}" cy="${(y - 40).toFixed(0)}" r="58" fill="#ffd54f" opacity="0.9"/>`;
  tower += `<circle cx="${cx}" cy="${(y - 40).toFixed(0)}" r="120" fill="#ffd54f" opacity="0.22"/>`;

  // 星塵漩渦
  let dust = '';
  for (let i = 0; i < 220; i++) {
    const t = rng() * Math.PI * 6;
    const rad = 90 + t * 88 + rng() * 60;
    const x = cx + Math.cos(t) * rad * 0.9;
    const yy = H * 0.36 + Math.sin(t) * rad * 0.55;
    if (x < -20 || x > W + 20 || yy < -20 || yy > H + 20) continue;
    const tone = rng() < 0.6 ? '#ffd54f' : '#c9a3ff';
    dust += `<circle cx="${x.toFixed(0)}" cy="${yy.toFixed(0)}" r="${(0.8 + rng() * 2.6).toFixed(1)}" fill="${tone}" opacity="${(0.15 + rng() * 0.55).toFixed(2)}"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a0f38"/>
      <stop offset="0.5" stop-color="#2a1854"/>
      <stop offset="1" stop-color="#120a26"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.5" cy="0.34" r="0.7">
      <stop offset="0" stop-color="#ffd54f" stop-opacity="0.26"/>
      <stop offset="0.5" stop-color="#a87d00" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#halo)"/>
  ${stars(rng, 160, '#ffffff', 0.8, 2.8, 0.8)}
  ${dust}
  ${tower}
  <rect width="${W}" height="${H}" fill="#0a0618" opacity="0.1"/>
</svg>`;
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { id: 2, svg: world2Svg() },
  { id: 4, svg: world4Svg() },
];

for (const { id, svg } of targets) {
  const out = join(OUT_DIR, `world-${id}-bg.png`);
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(out, png);
  console.log(`✓ world-${id}-bg.png (${(png.length / 1024).toFixed(0)} KB)`);
}
