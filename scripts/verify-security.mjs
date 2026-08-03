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
const packageJson = readFileSync(join(root, 'package.json'), 'utf8');
assert.doesNotMatch(
  packageJson,
  /supabase\s+db\s+query\s+--linked/,
  'Repository scripts must not use Supabase CLI --linked against the retired Cloud archive',
);

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

const hardeningMigrationPath = 'supabase/migrations/20260727183959_harden_privileged_rpcs_and_indexes.sql';
const hardeningMigration = readFileSync(join(root, hardeningMigrationPath), 'utf8');
assert.match(
  hardeningMigration,
  /REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated/,
  'Every SECURITY DEFINER function must default to no untrusted client access',
);
assert.match(
  hardeningMigration,
  /GRANT EXECUTE ON FUNCTION %s TO service_role/,
  'Privileged RPCs must remain available to server-only service-role clients',
);
assert.doesNotMatch(
  hardeningMigration.match(/authenticated_rpc_names[\s\S]*?\];/)?.[0] ?? '',
  /resolve_login_email|check_api_rate_limit|record_user_access|purge_/,
  'Sensitive server-only RPCs must never be granted to authenticated clients',
);
assert.match(
  hardeningMigration,
  /ALTER POLICY "matches_select" ON public\.matches TO authenticated/,
  'Policies that invoke privileged membership helpers must not run as anon',
);
assert.match(
  hardeningMigration,
  /CREATE POLICY "matches_anon_public_select"[\s\S]*FOR SELECT TO anon/,
  'Anonymous arena visibility must remain explicitly read-only',
);
assert.match(
  hardeningMigration,
  /CREATE INDEX IF NOT EXISTS idx_matches_created_by/,
  'Foreign-key access paths must be indexed',
);

const loginRoute = readFileSync(join(root, 'app/api/auth/login/route.ts'), 'utf8');
assert.match(loginRoute, /authLogin/, 'Password login must be rate limited');
assert.match(
  loginRoute,
  /SUPABASE_SERVICE_ROLE_KEY/,
  'Login identifier resolution must use server-only credentials',
);
assert.match(
  loginRoute,
  /\/rest\/v1\/rpc\/resolve_login_email/,
  'Login identifier resolution must remain server-side',
);
assert.match(
  loginRoute,
  /\/auth\/v1\/token\?grant_type=password/,
  'Password verification must remain server-side',
);
assert.doesNotMatch(loginRoute, /email:\s*data/, 'The login API must never disclose resolved emails');
const rateLimitSource = readFileSync(join(root, 'lib/api-rate-limit.ts'), 'utf8');
assert.match(rateLimitSource, /authLogin:[\s\S]*?failClosed:\s*true/, 'Password login rate limiting must fail closed');
assert.match(rateLimitSource, /authRegister:[\s\S]*?failClosed:\s*true/, 'Registration rate limiting must fail closed');
assert.match(rateLimitSource, /publicArena:[\s\S]*?failClosed:\s*true/, 'Public arena rate limiting must fail closed');
const publicArenaRoute = readFileSync(join(root, 'app/api/public-arena/[code]/route.ts'), 'utf8');
assert.match(publicArenaRoute, /applyIpRateLimit\(request,\s*'publicArena'\)/, 'Public arena endpoint must be rate limited');
const loginSources = [
  'app/auth/login/page.tsx',
  'expo/app/(auth)/login.tsx',
].map((filePath) => readFileSync(join(root, filePath), 'utf8')).join('\n');
assert.doesNotMatch(
  loginSources,
  /\.rpc\(['"]resolve_login_email/,
  'Public clients must not call the login email resolver directly',
);

const devBuildScript = readFileSync(join(root, 'scripts/build-apk-dev.bat'), 'utf8');
const productionBuildScript = readFileSync(join(root, 'scripts/build-apk-production.bat'), 'utf8');
assert.match(devBuildScript, /verify-expo-build-env\.mjs"?\s+dev/, 'Dev builds must pass the Test-only environment gate');
assert.match(productionBuildScript, /verify-expo-build-env\.mjs"?\s+production/, 'Production builds must pass the Production environment gate');
assert.doesNotMatch(
  productionBuildScript,
  /supabase-staging\.phyrexianarena/i,
  'Production build scripts must never target Supabase Test',
);

console.log('Security verification checks passed.');
