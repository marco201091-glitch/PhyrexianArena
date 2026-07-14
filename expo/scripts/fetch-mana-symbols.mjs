import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const colors = ['W', 'U', 'B', 'R', 'G', 'C'];
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(scriptDir, '..', 'assets', 'mana');

fs.mkdirSync(outDir, { recursive: true });

for (const color of colors) {
  const url = `https://svgs.scryfall.io/card-symbols/${color}.svg`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${color}: ${response.status}`);
  }

  const svg = Buffer.from(await response.arrayBuffer());
  const target = path.join(outDir, `${color}.png`);

  await sharp(svg).resize(128, 128).png().toFile(target);
  console.log(`Wrote ${target}`);
}