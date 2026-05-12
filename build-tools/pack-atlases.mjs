#!/usr/bin/env node
/**
 * pack-atlases.mjs
 *
 * Packs individual PNG assets into texture atlases using free-tex-packer-core.
 * Produces PixiJS-compatible spritesheet JSON + PNG atlas files.
 *
 * Outputs:
 *   public/assets/atlases/game-atlas.png + game-atlas.json
 *   public/assets/atlases/particle-atlas.png + particle-atlas.json
 *
 * Usage: node build-tools/pack-atlases.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { createRequire } from 'module';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const { packAsync } = require('free-tex-packer-core');

// ─── Constants ──────────────────────────────────────────────

const ASSETS_DIR = 'public/assets';
const OUTPUT_DIR = 'public/assets/atlases';
const MAX_SIZE = 4096;
const PARTICLE_SIZE = 16;

// ─── Alias Mapping ──────────────────────────────────────────

/** Maps file paths (relative to public/) to their spritesheet alias */
const ALIAS_MAP = {
  // Gems
  'gems/r-base.png': 'gem-tex-R',
  'gems/o-base.png': 'gem-tex-O',
  'gems/y-base.png': 'gem-tex-Y',
  'gems/g-base.png': 'gem-tex-G',
  'gems/b-base.png': 'gem-tex-B',
  'gems/p-base.png': 'gem-tex-P',
  'gems/w-base.png': 'gem-tex-W',
  'gems/bomb.png': 'gem-tex-area',
  'gems/rainbow.png': 'gem-tex-colour',
  'gems/h-line.png': 'gem-tex-lineH',
  'gems/v-line.png': 'gem-tex-lineV',
  // Blockers
  'blockers/stone.png': 'blocker-stone',
  'blockers/unstable.png': 'blocker-unstable',
  'blockers/lock.png': 'blocker-lock',
  // Items
  'items/water-drop.png': 'item-water-drop',
  'items/wood-plank.png': 'item-wood-plank',
  'items/layer1.png': 'item-layer1',
  'items/layer2.png': 'item-layer2',
  'items/layer3.png': 'item-layer3',
  'items/layer4.png': 'item-layer4',
  // UI
  'ui/frame.png': 'ui-frame',
  'ui/chest-gold.png': 'ui-chest-gold',
  'ui/chest-silver.png': 'ui-chest-silver',
  'ui/key-gold.png': 'ui-key-gold',
  'ui/key-silver.png': 'ui-key-silver',
  'ui/clock.png': 'ui-clock',
};

// ─── Helpers ────────────────────────────────────────────────

function listPngs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => extname(f) === '.png')
    .map((f) => join(dir, f));
}

function getAlias(filePath) {
  // Convert absolute path to relative key for ALIAS_MAP
  const rel = filePath.replace(`${ASSETS_DIR}/`, '');
  return ALIAS_MAP[rel] || basename(filePath, '.png');
}

/**
 * Validate that no individual image exceeds MAX_SIZE.
 * Returns array of error messages (empty = all good).
 */
async function validateImageSizes(imagePaths) {
  const errors = [];
  for (const imgPath of imagePaths) {
    const metadata = await sharp(imgPath).metadata();
    if (metadata.width > MAX_SIZE || metadata.height > MAX_SIZE) {
      errors.push(
        `ERROR: Asset "${imgPath}" is ${metadata.width}×${metadata.height}, exceeds max ${MAX_SIZE}×${MAX_SIZE}`
      );
    }
  }
  return errors;
}

// ─── Particle Shape Generation ──────────────────────────────

async function generateCircle() {
  // White filled circle on transparent background
  const size = PARTICLE_SIZE;
  const radius = size / 2;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${radius}" cy="${radius}" r="${radius - 1}" fill="white"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function generateDiamond() {
  // White diamond/rhombus on transparent background
  const size = PARTICLE_SIZE;
  const mid = size / 2;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${mid},1 ${size - 1},${mid} ${mid},${size - 1} 1,${mid}" fill="white"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function generateBlob() {
  // White blob with slight inner highlight (soft circle)
  const size = PARTICLE_SIZE;
  const mid = size / 2;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="blobGrad">
        <stop offset="0%" stop-color="white" stop-opacity="1"/>
        <stop offset="70%" stop-color="white" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${mid}" cy="${mid}" r="${mid - 1}" fill="url(#blobGrad)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// ─── Atlas Packing ──────────────────────────────────────────

async function packAtlas(images, textureName) {
  const options = {
    textureName,
    width: MAX_SIZE,
    height: MAX_SIZE,
    fixedSize: false,
    powerOfTwo: false,
    padding: 2,
    allowRotation: false,
    detectIdentical: true,
    allowTrim: false,
    removeFileExtension: false,
    prependFolderName: false,
    textureFormat: 'png',
    exporter: 'Pixi',
  };

  const files = await packAsync(images, options);
  return files;
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  console.log('Packing texture atlases...\n');

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // ── Game Atlas ──────────────────────────────────────────

  const dirs = ['gems', 'blockers', 'items', 'ui'];
  const gamePaths = dirs.flatMap((d) => listPngs(join(ASSETS_DIR, d)));

  // Validate sizes
  const sizeErrors = await validateImageSizes(gamePaths);
  if (sizeErrors.length > 0) {
    for (const err of sizeErrors) console.error(err);
    process.exit(1);
  }

  // Build image list with aliases as path (free-tex-packer uses path as frame name)
  const gameImages = gamePaths.map((filePath) => ({
    path: getAlias(filePath) + '.png',
    contents: readFileSync(filePath),
  }));

  console.log(`  Game atlas: ${gameImages.length} images`);
  const gameFiles = await packAtlas(gameImages, 'game-atlas');

  for (const file of gameFiles) {
    const outPath = join(OUTPUT_DIR, file.name);
    writeFileSync(outPath, file.buffer);
    console.log(`  ✓ ${outPath} (${(file.buffer.length / 1024).toFixed(1)} KB)`);
  }

  // ── Particle Atlas ─────────────────────────────────────

  const [circleBuffer, diamondBuffer, blobBuffer] = await Promise.all([
    generateCircle(),
    generateDiamond(),
    generateBlob(),
  ]);

  const particleImages = [
    { path: 'particle-circle.png', contents: circleBuffer },
    { path: 'particle-diamond.png', contents: diamondBuffer },
    { path: 'particle-blob.png', contents: blobBuffer },
  ];

  console.log(`  Particle atlas: ${particleImages.length} images`);
  const particleFiles = await packAtlas(particleImages, 'particle-atlas');

  for (const file of particleFiles) {
    const outPath = join(OUTPUT_DIR, file.name);
    writeFileSync(outPath, file.buffer);
    console.log(`  ✓ ${outPath} (${(file.buffer.length / 1024).toFixed(1)} KB)`);
  }

  // ── Post-process JSON to fix frame names ───────────────
  // free-tex-packer with removeFileExtension:false keeps .png in names
  // We need to strip it for PixiJS alias resolution
  fixFrameNames(join(OUTPUT_DIR, 'game-atlas.json'));
  fixFrameNames(join(OUTPUT_DIR, 'particle-atlas.json'));

  console.log('\n✓ Atlas packing complete.');
}

/**
 * Strip .png extension from frame names in the spritesheet JSON
 * so aliases match exactly (e.g. "gem-tex-R" not "gem-tex-R.png")
 */
function fixFrameNames(jsonPath) {
  const raw = readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw);

  const fixedFrames = {};
  for (const [key, value] of Object.entries(data.frames)) {
    const cleanKey = key.replace(/\.png$/, '');
    fixedFrames[cleanKey] = value;
  }
  data.frames = fixedFrames;

  writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
}

main().catch((err) => {
  console.error('Atlas packing failed:', err);
  process.exit(1);
});
