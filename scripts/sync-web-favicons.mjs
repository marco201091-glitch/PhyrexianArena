import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(scriptDir, '..');
const sourceIcon = path.join(repoRoot, 'expo', 'assets', 'icon.png');
const publicDir = path.join(repoRoot, 'public');

if (!fs.existsSync(sourceIcon)) {
  throw new Error(`Missing launcher icon source: ${sourceIcon}`);
}

const outputs = [
  { file: 'favicon-32.png', size: 32 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

function createPngIco(pngBuffers) {
  const headerSize = 6 + pngBuffers.length * 16;
  let offset = headerSize;
  const parts = [Buffer.alloc(6)];

  parts[0][0] = 0;
  parts[0][1] = 0;
  parts[0][2] = 1;
  parts[0][3] = 0;
  parts[0][4] = pngBuffers.length;
  parts[0][5] = 0;

  for (const { size, png } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[4] = 1;
    entry[6] = 32;
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    parts.push(entry);
    parts.push(png);
    offset += png.length;
  }

  return Buffer.concat(parts);
}

for (const { file, size } of outputs) {
  await sharp(sourceIcon)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(path.join(publicDir, file));
  console.log(`Wrote public/${file} (${size}x${size})`);
}

const faviconPngs = await Promise.all(
  [16, 32].map(async (size) => ({
    size,
    png: await sharp(sourceIcon)
      .resize(size, size, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer(),
  })),
);

await fs.promises.writeFile(
  path.join(publicDir, 'favicon.ico'),
  createPngIco(faviconPngs),
);

console.log('Wrote public/favicon.ico (16 + 32)');
console.log(`Synced web favicons from ${path.relative(repoRoot, sourceIcon)}`);