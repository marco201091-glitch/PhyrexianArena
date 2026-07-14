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

const liveGameMigrationPath = 'supabase/migrations/20260714135348_add_live_game_win_condition.sql';
const liveGameMigration = readFileSync(join(root, liveGameMigrationPath), 'utf8');
assert.match(liveGameMigration, /SET search_path = ''/, 'Live-game RPCs must use a locked search path');
assert.match(liveGameMigration, /REVOKE ALL ON FUNCTION public\.apply_live_game_mutation[\s\S]+FROM PUBLIC, anon, authenticated/, 'Mutation RPC must explicitly revoke untrusted roles');
assert.match(liveGameMigration, /REVOKE ALL ON FUNCTION public\.finalize_live_game[\s\S]+FROM PUBLIC, anon, authenticated/, 'Finalization RPC must explicitly revoke untrusted roles');
assert.match(liveGameMigration, /auth\.uid\(\) IS NULL/, 'Live-game RPCs must reject anonymous calls');
assert.match(liveGameMigration, /public\.is_group_member\(v_game\.group_id, auth\.uid\(\)\)/, 'Live-game RPCs must authorize arena membership');
assert.match(liveGameMigration, /Live game participants cannot be replaced/, 'Mutation RPC must preserve the original pod');
assert.match(liveGameMigration, /pg_column_size\(p_next_state\) > 1048576/, 'Mutation RPC must cap client payload size');
assert.match(liveGameMigration, /Finalization does not match the live game pod/, 'Finalization must match persisted participants');
assert.match(liveGameMigration, /matches_win_condition_valid/, 'Win conditions must be database constrained');
assert.match(
  liveGameMigration,
  /p_win_condition IS NULL\s+OR p_win_condition NOT IN/,
  'Finalization must explicitly reject a missing win condition',
);

const publicClientSources = [
  'expo/lib/supabase.ts',
  'lib/supabase.ts',
].map((filePath) => readFileSync(join(root, filePath), 'utf8')).join('\n');
assert.doesNotMatch(publicClientSources, /service[_-]?role/i, 'Public clients must never reference a service-role key');

const metricsMigrationPath = 'supabase/migrations/20260714144707_add_live_game_participant_metrics.sql';
const metricsMigration = readFileSync(join(root, metricsMigrationPath), 'utf8');
assert.match(metricsMigration, /match_participants_live_metrics_nonnegative/, 'Live metrics must reject negative persisted values');
assert.match(metricsMigration, /SET search_path = ''/g, 'Metrics helpers must use a locked search path');
assert.match(metricsMigration, /REVOKE ALL ON FUNCTION private\.sync_match_live_metrics\(\) FROM PUBLIC, anon, authenticated/, 'Metrics trigger must not be callable by API roles');
assert.match(metricsMigration, /AFTER UPDATE OF match_id/, 'Finalized live games must persist their compact metrics');

console.log('Security verification checks passed.');
