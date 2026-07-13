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

const size = 1024;
const emblemScale = 0.58;
const LUMINANCE_THRESHOLD = 140;
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function emblemBuffer(emblemSize) {
  const meta = await sharp(emblemSource).metadata();

  if (meta.hasAlpha) {
    return sharp(emblemSource)
      .resize(emblemSize, emblemSize, {
        fit: 'contain',
        background: TRANSPARENT,
      })
      .png()
      .toBuffer();
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

function tintAlphaMask(buffer, { r, g, b }, alphaMultiplier = 1) {
  return sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      const out = Buffer.alloc(data.length);
      for (let i = 0; i < data.length; i += 4) {
        const alpha = Math.min(255, Math.round(data[i + 3] * alphaMultiplier));
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = alpha;
      }

      return sharp(out, {
        raw: { width: info.width, height: info.height, channels: 4 },
      })
        .png()
        .toBuffer();
    });
}

const emblemSize = Math.round(size * emblemScale);
const emblem = await emblemBuffer(emblemSize);

// Slightly thicken strokes so the ring + spike stay readable at 48dp.
const thickened = await sharp(emblem).median(3).png().toBuffer();

const innerGlow = await tintAlphaMask(
  await sharp(thickened).blur(10).png().toBuffer(),
  { r: 74, g: 222, b: 128 },
  0.95,
);

const outerGlow = await tintAlphaMask(
  await sharp(thickened).blur(24).png().toBuffer(),
  { r: 34, g: 197, b: 94 },
  0.55,
);

const outputPath = path.join(assetsDir, 'adaptive-icon.png');

await sharp({
  create: {
    width: size,
    height: size,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 1 },
  },
})
  .composite([
    { input: outerGlow, gravity: 'center' },
    { input: innerGlow, gravity: 'center' },
    { input: thickened, gravity: 'center' },
  ])
  .png()
  .toFile(outputPath);

console.log(`Wrote ${outputPath} (${size}x${size}, Phyrexia ring mark + oil glow from ${path.basename(emblemSource)})`);