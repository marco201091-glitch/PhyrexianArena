import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const mode = process.argv.includes('--expo') ? 'expo' : 'web';
const root = mode === 'expo'
  ? resolve('.qa-android-export/_expo/static/js/android')
  : resolve('.next/static/chunks');
const limit = mode === 'expo' ? 12 * 1024 * 1024 : 18 * 1024 * 1024;
const extensions = mode === 'expo' ? new Set(['.hbc', '.js']) : new Set(['.js']);

if (!existsSync(root)) throw new Error(`${mode} build output missing: ${root}`);
const files = readdirSync(root, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && extensions.has(extname(entry.name)))
  .map((entry) => join(entry.parentPath, entry.name));
const total = files.reduce((sum, file) => sum + statSync(file).size, 0);
if (total > limit) {
  throw new Error(`${mode} JavaScript budget exceeded: ${(total / 1024 / 1024).toFixed(2)} MiB > ${(limit / 1024 / 1024).toFixed(0)} MiB`);
}
console.log(`${mode} JavaScript budget OK: ${(total / 1024 / 1024).toFixed(2)} MiB / ${(limit / 1024 / 1024).toFixed(0)} MiB.`);
