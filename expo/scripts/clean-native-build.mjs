import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const expoDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const targets = [
  path.join(expoDir, 'android', 'build'),
  path.join(expoDir, 'android', 'app', 'build'),
  path.join(expoDir, 'node_modules', 'expo', 'android', 'build'),
  path.join(expoDir, 'node_modules', 'expo-constants', 'android', 'build'),
];

for (const target of targets) {
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`Removed ${path.relative(expoDir, target)}`);
}