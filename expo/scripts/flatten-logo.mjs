import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(scriptDir, '..', 'assets');
const publicDir = path.join(scriptDir, '..', '..', 'public');
const emblemCandidates = [
  path.join(publicDir, 'logo-def.png'),
  path.join(publicDir, 'logo-transparent.png'),
];
const emblemSource = emblemCandidates.find((candidate) => fs.existsSync(candidate));

if (!emblemSource) {
  throw new Error('Missing logo source. Expected public/logo-def.png or public/logo-transparent.png');
}

const BLACK = { r: 0, g: 0, b: 0, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const LUMINANCE_THRESHOLD = 140;

async function emblemBuffer(size, emblemScale = 1, { flattenBlack = false } = {}) {
  const emblemSize = Math.round(size * emblemScale);
  const meta = await sharp(emblemSource).metadata();

  if (meta.hasAlpha) {
    let pipeline = sharp(emblemSource).resize(emblemSize, emblemSize, {
      fit: 'contain',
      background: TRANSPARENT,
    });
    if (flattenBlack) {
      pipeline = pipeline.flatten({ background: { r: 0, g: 0, b: 0 } });
    }
    return pipeline.png().toBuffer();
  }

  const { data, info } = await sharp(emblemSource)
    .resize(emblemSize, emblemSize, {
      fit: 'contain',
      background: TRANSPARENT,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, o = 0; i < data.length; i += info.channels, o += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luminance >= LUMINANCE_THRESHOLD) {
      out[o] = 255;
      out[o + 1] = 255;
      out[o + 2] = 255;
      out[o + 3] = 255;
    }
  }

  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function compositeEmblem(size, emblemScale = 1, { background = BLACK } = {}) {
  const emblem = await emblemBuffer(size, emblemScale, {
    flattenBlack: background.alpha === 1,
  });

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: emblem, gravity: 'center' }])
    .png();
}

const flattenEmblem = (size, emblemScale = 1) => compositeEmblem(size, emblemScale, { background: BLACK });
const transparentEmblem = (size, emblemScale = 1) => compositeEmblem(size, emblemScale, { background: TRANSPARENT });

const sourceMeta = await sharp(emblemSource).metadata();
const inAppSize = Math.max(sourceMeta.width || 1024, sourceMeta.height || 1024);

await (await transparentEmblem(inAppSize, 0.92)).toFile(path.join(assetsDir, 'logo.png'));
console.log(`Wrote assets/logo.png (${inAppSize}x${inAppSize}, transparent) from ${path.basename(emblemSource)}`);

await (await transparentEmblem(inAppSize, 0.92)).toFile(path.join(publicDir, 'logo-transparent.png'));
console.log(`Wrote public/logo-transparent.png (${inAppSize}x${inAppSize}, transparent)`);

const appIconSize = 1024;
const appIconScale = 0.78;
await (await flattenEmblem(appIconSize, appIconScale)).toFile(path.join(assetsDir, 'icon.png'));
console.log(`Wrote assets/icon.png (${appIconSize}x${appIconSize}, iOS + legacy)`);
console.log('Skipped assets/adaptive-icon.png — run npm run assets:android-icon for the Android launcher mark');

await (await transparentEmblem(512, 0.82)).toFile(path.join(assetsDir, 'splash-icon.png'));
console.log('Wrote assets/splash-icon.png (512x512, transparent)');

await (await flattenEmblem(192, 0.88)).toFile(path.join(assetsDir, 'favicon.png'));
console.log('Wrote assets/favicon.png (192x192)');

const webIcons = [
  { file: 'favicon-32.png', size: 32, scale: 0.88 },
  { file: 'icon-192.png', size: 192, scale: 0.88 },
  { file: 'icon-512.png', size: 512, scale: 0.82 },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.86 },
];

for (const { file, size, scale } of webIcons) {
  await (await flattenEmblem(size, scale)).toFile(path.join(publicDir, file));
  console.log(`Wrote public/${file} (${size}x${size})`);
}