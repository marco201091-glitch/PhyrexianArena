import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(scriptDir, '..', 'assets');
const sourcePath = process.argv[2];

if (!sourcePath) {
  throw new Error('Usage: node apply-user-android-icon.mjs <source-image>');
}

const meta = await sharp(sourcePath).metadata();
console.log(`Source: ${meta.width}x${meta.height} (${meta.format})`);

const icon = sharp(sourcePath).resize(1024, 1024, {
  fit: 'cover',
  position: 'centre',
});

await icon.clone().png().toFile(path.join(assetsDir, 'adaptive-icon.png'));
await icon.clone().png().toFile(path.join(assetsDir, 'icon.png'));

console.log('Wrote assets/adaptive-icon.png and assets/icon.png (launcher only)');

const syncScript = path.join(scriptDir, '..', '..', 'scripts', 'sync-web-favicons.mjs');
if (fs.existsSync(syncScript)) {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, [syncScript], { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}