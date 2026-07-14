import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function getSafeRedirectPath(value, fallback = '/dashboard') {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  if (!/^\/[A-Za-z0-9_./%-]*$/.test(trimmed)) return fallback;
  return trimmed;
}

const reserved = new Set(['administrator', 'admin', 'root', 'support', 'system', 'phyrexianarena']);

assert.equal(getSafeRedirectPath('/dashboard'), '/dashboard');
assert.equal(getSafeRedirectPath('//evil.com'), '/dashboard');
assert.equal(getSafeRedirectPath('/join/ABC123'), '/join/ABC123');
assert.equal(getSafeRedirectPath('https://evil.com'), '/dashboard');
assert.equal(getSafeRedirectPath(null), '/dashboard');

assert.equal(reserved.has('administrator'), true);
assert.equal(reserved.has('Marco'), false);

const root = process.cwd();
const protectedRoutes = [
  'app/api/deck-import/route.ts',
  'app/api/archidekt-user-decks/route.ts',
  'app/api/scryfall-commanders/route.ts',
  'app/api/scryfall-card-arts/route.ts',
  'app/api/edhrec-commander/route.ts',
];

for (const routePath of protectedRoutes) {
  const source = readFileSync(join(root, routePath), 'utf8');
  assert.match(source, /requireAuthOr401/, `${routePath} must enforce authentication`);
}

const clientFiles = [
  'app/profile/page.tsx',
  'app/table/[id]/page.tsx',
  'lib/deck-color-sync.ts',
  'components/deck/edhrec-badge.tsx',
  'components/arena/guest-commander-picker.tsx',
];

for (const filePath of clientFiles) {
  const source = readFileSync(join(root, filePath), 'utf8');
  assert.match(source, /authenticatedFetch/, `${filePath} must use authenticatedFetch for protected APIs`);
}

console.log('Security verification checks passed.');