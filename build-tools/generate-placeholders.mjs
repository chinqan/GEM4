#!/usr/bin/env node
/**
 * generate-placeholders.mjs
 *
 * Generates placeholder SVG assets for the Gem game:
 * - 7 gem colours × (base + 4 special types) = 35 gem images
 * - UI images (buttons, icons, stars)
 * - Particle images
 * - World backgrounds (4 worlds)
 *
 * Usage: node build-tools/generate-placeholders.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// ─── Constants ──────────────────────────────────────────────

const GEM_COLOURS = {
  R: '#ff3344',
  G: '#33cc66',
  B: '#3388ff',
  Y: '#ffcc00',
  P: '#aa44ff',
  W: '#eeeeff',
  O: '#ff8833',
};

const SPECIAL_TYPES = ['base', 'lineH', 'lineV', 'area', 'colour'];

const WORLD_THEMES = [
  { id: 1, name: 'Crystal Caverns', bg: '#1a1a3e', accent: '#4488ff' },
  { id: 2, name: 'Ember Peaks', bg: '#3e1a1a', accent: '#ff6644' },
  { id: 3, name: 'Verdant Depths', bg: '#1a3e1a', accent: '#44ff66' },
  { id: 4, name: 'Twilight Spire', bg: '#2e1a3e', accent: '#aa66ff' },
];

const OUTPUT_DIR = 'public/assets';

// ─── Helpers ────────────────────────────────────────────────

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function writeSvg(path, content) {
  ensureDir(dirname(path));
  writeFileSync(path, content, 'utf-8');
}

// ─── Gem SVGs ───────────────────────────────────────────────

function generateGemSvg(colour, colourHex, specialType) {
  const size = 64;
  const cx = size / 2;
  const cy = size / 2;
  const r = 24;

  let overlay = '';

  switch (specialType) {
    case 'lineH':
      overlay = `<line x1="8" y1="${cy}" x2="${size - 8}" y2="${cy}" stroke="white" stroke-width="3" opacity="0.9"/>
      <polygon points="52,26 58,32 52,38" fill="white" opacity="0.9"/>
      <polygon points="12,26 6,32 12,38" fill="white" opacity="0.9"/>`;
      break;
    case 'lineV':
      overlay = `<line x1="${cx}" y1="8" x2="${cx}" y2="${size - 8}" stroke="white" stroke-width="3" opacity="0.9"/>
      <polygon points="26,12 32,6 38,12" fill="white" opacity="0.9"/>
      <polygon points="26,52 32,58 38,52" fill="white" opacity="0.9"/>`;
      break;
    case 'area':
      overlay = `<polygon points="32,10 38,26 54,26 41,36 46,52 32,42 18,52 23,36 10,26 26,26" fill="white" opacity="0.7" stroke="white" stroke-width="1"/>`;
      break;
    case 'colour':
      overlay = `<circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="none" stroke="url(#rainbow)" stroke-width="3"/>
      <defs><linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ff3344"/>
        <stop offset="20%" stop-color="#ff8833"/>
        <stop offset="40%" stop-color="#ffcc00"/>
        <stop offset="60%" stop-color="#33cc66"/>
        <stop offset="80%" stop-color="#3388ff"/>
        <stop offset="100%" stop-color="#aa44ff"/>
      </linearGradient></defs>`;
      break;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${colourHex}"/>
  <circle cx="${cx - 4}" cy="${cy - 4}" r="${r * 0.55}" fill="${colourHex}" opacity="0.5" filter="url(#glow)"/>
  ${overlay}
  <defs><filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
</svg>`;
}

function generateGems() {
  const dir = join(OUTPUT_DIR, 'gems');
  ensureDir(dir);

  for (const [code, hex] of Object.entries(GEM_COLOURS)) {
    for (const special of SPECIAL_TYPES) {
      const filename = `gem-${code.toLowerCase()}-${special}.svg`;
      const svg = generateGemSvg(code, hex, special);
      writeSvg(join(dir, filename), svg);
    }
  }

  console.log(`✓ Generated ${Object.keys(GEM_COLOURS).length * SPECIAL_TYPES.length} gem SVGs`);
}

// ─── UI SVGs ────────────────────────────────────────────────

function generateUiImages() {
  const dir = join(OUTPUT_DIR, 'ui');
  ensureDir(dir);

  // Button
  writeSvg(join(dir, 'button.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60">
  <rect x="2" y="2" width="196" height="56" rx="12" fill="#2244aa" stroke="#4488ff" stroke-width="2"/>
  <text x="100" y="36" text-anchor="middle" fill="white" font-size="18" font-family="sans-serif">Button</text>
</svg>`);

  // Star (filled)
  writeSvg(join(dir, 'star-filled.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <polygon points="24,4 30,18 46,18 33,28 38,44 24,34 10,44 15,28 2,18 18,18" fill="#ffcc00" stroke="#ff9900" stroke-width="1"/>
</svg>`);

  // Star (empty)
  writeSvg(join(dir, 'star-empty.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <polygon points="24,4 30,18 46,18 33,28 38,44 24,34 10,44 15,28 2,18 18,18" fill="none" stroke="#666666" stroke-width="2"/>
</svg>`);

  // Pause icon
  writeSvg(join(dir, 'icon-pause.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect x="8" y="6" width="6" height="20" rx="2" fill="white"/>
  <rect x="18" y="6" width="6" height="20" rx="2" fill="white"/>
</svg>`);

  // Settings icon
  writeSvg(join(dir, 'icon-settings.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="6" fill="none" stroke="white" stroke-width="2"/>
  <circle cx="16" cy="16" r="12" fill="none" stroke="white" stroke-width="2" stroke-dasharray="4 4"/>
</svg>`);

  // Back arrow
  writeSvg(join(dir, 'icon-back.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <polyline points="20,6 10,16 20,26" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`);

  console.log('✓ Generated UI placeholder SVGs');
}

// ─── Particle SVGs ──────────────────────────────────────────

function generateParticleImages() {
  const dir = join(OUTPUT_DIR, 'particles');
  ensureDir(dir);

  // Soft circle particle
  writeSvg(join(dir, 'particle-circle.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <radialGradient id="pg" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="white" stop-opacity="1"/>
    <stop offset="100%" stop-color="white" stop-opacity="0"/>
  </radialGradient>
  <circle cx="8" cy="8" r="8" fill="url(#pg)"/>
</svg>`);

  // Spark particle
  writeSvg(join(dir, 'particle-spark.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <line x1="8" y1="0" x2="8" y2="16" stroke="white" stroke-width="2" opacity="0.8"/>
  <line x1="0" y1="8" x2="16" y2="8" stroke="white" stroke-width="2" opacity="0.8"/>
</svg>`);

  // Ring particle (for shockwave)
  writeSvg(join(dir, 'particle-ring.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="14" fill="none" stroke="white" stroke-width="2" opacity="0.6"/>
</svg>`);

  // Glow particle
  writeSvg(join(dir, 'particle-glow.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <radialGradient id="gg" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="white" stop-opacity="0.8"/>
    <stop offset="60%" stop-color="white" stop-opacity="0.2"/>
    <stop offset="100%" stop-color="white" stop-opacity="0"/>
  </radialGradient>
  <circle cx="12" cy="12" r="12" fill="url(#gg)"/>
</svg>`);

  console.log('✓ Generated particle placeholder SVGs');
}

// ─── World Backgrounds ──────────────────────────────────────

function generateWorldBackgrounds() {
  const dir = join(OUTPUT_DIR, 'worlds');
  ensureDir(dir);

  for (const world of WORLD_THEMES) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <radialGradient id="wbg${world.id}" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="${world.accent}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${world.bg}" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="1280" height="720" fill="${world.bg}"/>
  <rect width="1280" height="720" fill="url(#wbg${world.id})"/>
  <!-- Decorative elements -->
  <circle cx="200" cy="150" r="80" fill="${world.accent}" opacity="0.05"/>
  <circle cx="1000" cy="500" r="120" fill="${world.accent}" opacity="0.04"/>
  <circle cx="640" cy="360" r="200" fill="${world.accent}" opacity="0.02"/>
  <text x="640" y="680" text-anchor="middle" fill="${world.accent}" font-size="14" font-family="sans-serif" opacity="0.4">World ${world.id}: ${world.name}</text>
</svg>`;
    writeSvg(join(dir, `world-${world.id}-bg.svg`), svg);
  }

  console.log(`✓ Generated ${WORLD_THEMES.length} world background SVGs`);
}

// ─── Main ───────────────────────────────────────────────────

function main() {
  console.log('Generating placeholder assets...\n');
  generateGems();
  generateUiImages();
  generateParticleImages();
  generateWorldBackgrounds();
  console.log(`\nAll assets written to ${OUTPUT_DIR}/`);
}

main();
