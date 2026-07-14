import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const expoDir = path.join(scriptDir, '..');
const repoRoot = path.join(expoDir, '..');

const emblemSource = path.join(repoRoot, 'public', 'logo-def.png');
const assets = {
  logo: path.join(expoDir, 'assets', 'logo.png'),
  icon: path.join(expoDir, 'assets', 'icon.png'),
  adaptiveIcon: path.join(expoDir, 'assets', 'adaptive-icon.png'),
  splashIcon: path.join(expoDir, 'assets', 'splash-icon.png'),
  favicon: path.join(expoDir, 'assets', 'favicon.png'),
};

const transparentAssets = new Set(['logo', 'splashIcon']);
const webTransparentLogo = path.join(repoRoot, 'public', 'logo-transparent.png');

const androidForeground = path.join(
  expoDir,
  'android',
  'app',
  'src',
  'main',
  'res',
  'mipmap-xxxhdpi',
  'ic_launcher_foreground.webp',
);
const androidSplash = path.join(
  expoDir,
  'android',
  'app',
  'src',
  'main',
  'res',
  'drawable-xxxhdpi',
  'splashscreen_logo.png',
);

async function analyzeEmblem(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let black = 0;
  let white = 0;
  let transparent = 0;
  let other = 0;

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = info.channels === 4 ? data[i + 3] : 255;
    if (a < 16) {
      transparent++;
      continue;
    }
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 24) black++;
    else if (max > 220 && max - min < 30) white++;
    else other++;
  }

  const total = info.width * info.height;
  return {
    path: filePath,
    width: info.width,
    height: info.height,
    blackRatio: black / total,
    whiteRatio: white / total,
    transparentRatio: transparent / total,
    otherRatio: other / total,
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

if (!fs.existsSync(emblemSource)) {
  throw new Error(`Missing emblem source: ${emblemSource}`);
}

for (const [name, filePath] of Object.entries(assets)) {
  assert(fs.existsSync(filePath), `Missing asset: ${name} (${filePath})`);
}

assert(fs.existsSync(webTransparentLogo), `Missing web asset: ${webTransparentLogo}`);

const sourceStats = await analyzeEmblem(emblemSource);
assert(sourceStats.whiteRatio > 0.08, 'logo-def source has too little white emblem pixels');

for (const [name, filePath] of Object.entries(assets)) {
  const stats = await analyzeEmblem(filePath);
  if (transparentAssets.has(name)) {
    assert(stats.transparentRatio > 0.45, `${name}: expected transparent background, got ${(stats.transparentRatio * 100).toFixed(1)}% transparent`);
    assert(stats.blackRatio < 0.05, `${name}: unexpected black background (${(stats.blackRatio * 100).toFixed(1)}% black)`);
  } else if (name === 'adaptiveIcon' || name === 'icon') {
    assert(stats.blackRatio > 0.25, `${name}: expected dark background, got ${(stats.blackRatio * 100).toFixed(1)}% black`);
    assert(stats.whiteRatio > 0.01, `${name}: expected bright emblem pixels, got ${(stats.whiteRatio * 100).toFixed(1)}% white`);
    assert(stats.otherRatio < 0.45, `${name}: unexpected color mix (${(stats.otherRatio * 100).toFixed(1)}% colored pixels)`);
  } else {
    assert(stats.blackRatio > 0.45, `${name}: expected black background, got ${(stats.blackRatio * 100).toFixed(1)}% black`);
    assert(stats.whiteRatio > 0.04, `${name}: expected white emblem, got ${(stats.whiteRatio * 100).toFixed(1)}% white`);
    assert(stats.otherRatio < 0.2, `${name}: too many non-black/non-white pixels (${(stats.otherRatio * 100).toFixed(1)}%)`);
  }
  console.log(
    `OK ${name}: ${stats.width}x${stats.height} black=${(stats.blackRatio * 100).toFixed(1)}% white=${(stats.whiteRatio * 100).toFixed(1)}% transparent=${(stats.transparentRatio * 100).toFixed(1)}%`,
  );
}

const webLogoStats = await analyzeEmblem(webTransparentLogo);
assert(webLogoStats.transparentRatio > 0.45, `web logo-transparent: expected transparent background, got ${(webLogoStats.transparentRatio * 100).toFixed(1)}% transparent`);
assert(webLogoStats.whiteRatio > 0.04, `web logo-transparent: expected white emblem, got ${(webLogoStats.whiteRatio * 100).toFixed(1)}% white`);
console.log(`OK web logo-transparent: ${webLogoStats.width}x${webLogoStats.height} transparent=${(webLogoStats.transparentRatio * 100).toFixed(1)}%`);

console.log('OK android adaptive icon is maintained separately from icon.png (simplified launcher mark)');

function assertFreshNative(assetPath, nativePath, label) {
  if (!fs.existsSync(nativePath)) {
    console.warn(`WARN ${label} not found — run npm run android:refresh-icons before native build`);
    return;
  }
  const assetTime = fs.statSync(assetPath).mtimeMs;
  const nativeTime = fs.statSync(nativePath).mtimeMs;
  assert(nativeTime >= assetTime - 2000, `${label} is older than ${path.basename(assetPath)} — run npm run android:prebuild`);
}

assertFreshNative(assets.adaptiveIcon, androidForeground, 'android launcher foreground');
assertFreshNative(assets.splashIcon, androidSplash, 'android splash logo');

if (fs.existsSync(androidForeground)) {
  const nativeStats = await analyzeEmblem(androidForeground);
  assert(nativeStats.whiteRatio > 0.03, 'Android launcher foreground missing emblem');
  console.log(`OK android foreground: white=${(nativeStats.whiteRatio * 100).toFixed(1)}%`);
}

if (fs.existsSync(androidSplash)) {
  const splashStats = await analyzeEmblem(androidSplash);
  assert(splashStats.whiteRatio > 0.03, 'Android splash logo missing emblem');
  console.log(`OK android splash: white=${(splashStats.whiteRatio * 100).toFixed(1)}%`);
}

const wordmarkPath = path.join(expoDir, 'assets', 'logo-wordmark.png');
assert(fs.existsSync(wordmarkPath), 'Missing logo-wordmark.png');
const wordmarkMeta = await sharp(wordmarkPath).metadata();
assert(wordmarkMeta.width && wordmarkMeta.height, 'logo-wordmark.png unreadable');
console.log(`OK wordmark: ${wordmarkMeta.width}x${wordmarkMeta.height}`);

console.log('All logo checks passed.');