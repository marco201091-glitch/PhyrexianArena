import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(scriptDir, '..', 'assets');
const assets = {
  master: { file: 'brand-master.png', size: 1254, alpha: false },
  transparentMaster: { file: 'brand-logo-transparent.png', size: 1254, alpha: true },
  logo: { file: 'logo.png', size: 1024, alpha: true },
  icon: { file: 'icon.png', size: 1024, alpha: false },
  adaptiveIcon: { file: 'adaptive-icon.png', size: 1024, alpha: true },
  splashIcon: { file: 'splash-icon.png', size: 512, alpha: true },
  favicon: { file: 'favicon.png', size: 192, alpha: false },
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function transparentRatio(filePath) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  for (let index = 3; index < data.length; index += info.channels) {
    if (data[index] < 16) transparent += 1;
  }
  return transparent / (info.width * info.height);
}

for (const [name, expected] of Object.entries(assets)) {
  const filePath = path.join(assetsDir, expected.file);
  assert(fs.existsSync(filePath), `Missing brand asset: ${expected.file}`);
  const metadata = await sharp(filePath).metadata();
  assert(
    metadata.width === expected.size && metadata.height === expected.size,
    `${expected.file}: expected ${expected.size}x${expected.size}`,
  );
  if (expected.alpha) {
    const ratio = await transparentRatio(filePath);
    assert(ratio > 0.2, `${expected.file}: transparent safe area is missing`);
  } else {
    assert(!metadata.hasAlpha, `${expected.file}: launcher asset must be opaque`);
  }
  console.log(`OK ${name}: ${expected.size}x${expected.size}`);
}

assert(
  !fs.existsSync(path.join(assetsDir, 'logo-wordmark.png')),
  'Obsolete logo-wordmark.png must be removed',
);

console.log('All brand transparency and launcher safe-area checks passed.');
