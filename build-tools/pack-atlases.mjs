#!/usr/bin/env node
/**
 * pack-atlases.mjs
 *
 * Atlas packing script stub.
 * In production, this would use a tool like free-tex-packer or texturepacker
 * to combine individual SVG/PNG assets into sprite atlases.
 *
 * For now, it generates a manifest.json that references individual assets
 * and defines bundle groupings for the LoadController.
 *
 * Usage: node build-tools/pack-atlases.mjs
 */

import { writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, basename, extname } from 'path';

// ─── Constants ──────────────────────────────────────────────

const ASSETS_DIR = 'public/assets';
const OUTPUT_FILE = 'public/assets/manifest.json';

// ─── Helpers ────────────────────────────────────────────────

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => extname(f) === '.svg' || extname(f) === '.png')
    .map((f) => join(dir, f).replace(/^public\//, ''));
}

// ─── Build Manifest ─────────────────────────────────────────

function buildManifest() {
  const gemFiles = listFiles(join(ASSETS_DIR, 'gems'));
  const uiFiles = listFiles(join(ASSETS_DIR, 'ui'));
  const particleFiles = listFiles(join(ASSETS_DIR, 'particles'));
  const worldFiles = listFiles(join(ASSETS_DIR, 'worlds'));

  /** @type {import('../src/assets/manifest').AssetManifest} */
  const manifest = {
    version: 1,
    buildTime: new Date().toISOString(),
    bundles: [
      {
        name: 'core',
        description: 'Core assets loaded during splash screen',
        assets: [
          ...gemFiles.map((src) => ({
            alias: basename(src, extname(src)),
            src,
          })),
          ...uiFiles.map((src) => ({
            alias: `ui-${basename(src, extname(src))}`,
            src,
          })),
          ...particleFiles.map((src) => ({
            alias: `particle-${basename(src, extname(src))}`,
            src,
          })),
        ],
      },
      // Per-world bundles for lazy loading
      ...([1, 2, 3, 4].map((worldId) => ({
        name: `world-${worldId}`,
        description: `World ${worldId} assets (lazy loaded)`,
        assets: worldFiles
          .filter((f) => f.includes(`world-${worldId}`))
          .map((src) => ({
            alias: basename(src, extname(src)),
            src,
          })),
      }))),
      {
        name: 'audio',
        description: 'Audio assets (lazy loaded)',
        assets: [
          // Placeholder audio entries — actual files would be .mp3/.ogg
          { alias: 'bgm-world-1', src: 'assets/audio/bgm-world-1.mp3' },
          { alias: 'bgm-world-2', src: 'assets/audio/bgm-world-2.mp3' },
          { alias: 'bgm-world-3', src: 'assets/audio/bgm-world-3.mp3' },
          { alias: 'bgm-world-4', src: 'assets/audio/bgm-world-4.mp3' },
          { alias: 'sfx-match', src: 'assets/audio/sfx-match.mp3' },
          { alias: 'sfx-chain', src: 'assets/audio/sfx-chain.mp3' },
          { alias: 'sfx-special', src: 'assets/audio/sfx-special.mp3' },
          { alias: 'sfx-combo', src: 'assets/audio/sfx-combo.mp3' },
          { alias: 'sfx-invalid', src: 'assets/audio/sfx-invalid.mp3' },
        ],
      },
    ],
  };

  if (!existsSync(ASSETS_DIR)) {
    mkdirSync(ASSETS_DIR, { recursive: true });
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`✓ Manifest written to ${OUTPUT_FILE}`);
  console.log(`  Bundles: ${manifest.bundles.map((b) => b.name).join(', ')}`);
  console.log(`  Total assets: ${manifest.bundles.reduce((sum, b) => sum + b.assets.length, 0)}`);
}

// ─── Main ───────────────────────────────────────────────────

function main() {
  console.log('Packing atlases & building manifest...\n');
  buildManifest();
  console.log('\nDone.');
}

main();
