/**
 * Generates placeholder GuideSnap icons using the canvas API (Node.js >= 18 doesn't have canvas,
 * so we write minimal valid PNG files directly as base64.)
 *
 * Each icon is a solid #FF6B35 square with a white "G" in the centre.
 * We use the 'canvas' npm package if available, otherwise fall back to writing a
 * pre-encoded 16×16 PNG as a placeholder so the build doesn't fail.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'icons');

mkdirSync(outDir, { recursive: true });

// Minimal 1×1 orange PNG as seed – real icons generated via canvas if available.
// These are valid PNGs the browser will accept.

let canvasLib;
try {
  const { createCanvas } = await import('canvas');
  canvasLib = createCanvas;
} catch {
  canvasLib = null;
}

const sizes = [16, 48, 128];

for (const size of sizes) {
  const dest = join(outDir, `${size}.png`);

  if (canvasLib) {
    const canvas = canvasLib(size, size);
    const ctx = canvas.getContext('2d');

    // Orange background
    ctx.fillStyle = '#FF6B35';
    const r = size * 0.15;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size);
    ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();

    // White "G"
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(size * 0.6)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('G', size / 2, size / 2 + size * 0.04);

    writeFileSync(dest, canvas.toBuffer('image/png'));
    console.log(`✓ icons/${size}.png`);
  } else {
    // Fallback: write a minimal valid 1x1 orange PNG, repeated to fill the header.
    // This is a 16×16 solid-color PNG encoded as base64.
    const px16 =
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAJElEQVQ4jWP4z8BQDwAEgAF/QualIQAAAABJRU5ErkJggg==';
    writeFileSync(dest, Buffer.from(px16, 'base64'));
    console.log(`✓ icons/${size}.png (placeholder)`);
  }
}

console.log('Icons generated.');
