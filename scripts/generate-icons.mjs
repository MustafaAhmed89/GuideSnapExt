/**
 * Resizes src/assets/icon-source.png to the three required icon sizes
 * using the 'sharp' package (no native canvas required).
 */

import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '..', 'src', 'assets', 'icon-source.png');
const outDir = join(__dirname, '..', 'icons');

mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  await sharp(src).resize(size, size).png().toFile(join(outDir, `${size}.png`));
  console.log(`✓ icons/${size}.png`);
}

console.log('Icons generated.');
