import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = process.env.PHYREXIAN_SIGNING_PROPERTIES?.trim();

function fail(message) {
  console.error(`Release signing gate failed: ${message}`);
  process.exit(1);
}

if (!configPath) fail('PHYREXIAN_SIGNING_PROPERTIES is missing');

const resolvedConfigPath = path.resolve(configPath);
if (!fs.existsSync(resolvedConfigPath)) fail('signing properties file not found');

const configRelativeToRepo = path.relative(repoRoot, resolvedConfigPath);
if (!configRelativeToRepo.startsWith('..') && !path.isAbsolute(configRelativeToRepo)) {
  fail('signing properties must be stored outside the repository');
}

const properties = Object.fromEntries(
  fs.readFileSync(resolvedConfigPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const separator = line.indexOf('=');
      return separator < 1
        ? [line, '']
        : [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
);

for (const name of ['storeFile', 'storePassword', 'keyAlias', 'keyPassword']) {
  const value = properties[name];
  if (!value) fail(`${name} is missing`);
  if (/CHANGE_ME/i.test(value)) fail(`${name} still contains a placeholder`);
}

if (!path.isAbsolute(properties.storeFile)) {
  fail('storeFile must be an absolute path');
}
if (!fs.existsSync(properties.storeFile)) fail('keystore file not found');
if (/debug/i.test(path.basename(properties.storeFile)) || /androiddebugkey/i.test(properties.keyAlias)) {
  fail('debug signing material is not allowed');
}

console.log('Release signing configuration passed.');
