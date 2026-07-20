import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3000';

function loadEnv(path) {
  const entries = readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      const key = line.slice(0, index);
      let value = line.slice(index + 1);
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      return [key, value];
    });

  return Object.fromEntries(entries);
}

async function fetchStatus(path, init) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  return { status: response.status, response };
}

async function testRoutes() {
  const cases = [
    ['/', 307],
    ['/auth/login', 200],
    ['/auth/register', 200],
    ['/auth/callback', 307],
    ['/auth/check-email', 200],
    ['/auth/forgot-password', 200],
    ['/auth/reset-password', 200],
    ['/auth/resend-confirmation', 200],
    ['/dashboard', 200],
    ['/profile', 200],
    ['/join/TESTCODE', 200],
    ['/arena/TESTCODE', 200],
    ['/legal/privacy', 200],
    ['/legal/terms', 200],
    ['/legal/cookies', 200],
  ];

  for (const [path, expected] of cases) {
    const { status } = await fetchStatus(path, { redirect: 'manual' });
    assert.equal(status, expected, `${path} expected ${expected}, got ${status}`);
  }

  const loginPage = await (await fetch(`${BASE_URL}/auth/login`)).text();
  const isClientRenderedLogin = /BAILOUT_TO_CLIENT_SIDE_RENDERING|app\/auth\/login\/page/i.test(loginPage);
  if (isClientRenderedLogin) {
    assert.match(loginPage, /Phyrexian Arena - EDH Tracker/i, 'login route should render app shell');
  } else {
    assert.match(loginPage, /Ricordami|Remember me/i, 'login page should show remember-me');
    assert.match(loginPage, /Entra nell|Sign in/i, 'login page should show submit action');
    assert.match(loginPage, /Password dimenticata|Forgot password/i, 'login page should show forgot-password link');
    assert.match(loginPage, /Google|google/i, 'login page should show Google sign-in');
    assert.doesNotMatch(loginPage, /turbopack/i, 'login page should be served by webpack dev');
  }

  const homeRedirect = await fetchStatus('/', { redirect: 'manual' });
  assert.equal(homeRedirect.response.headers.get('location'), '/auth/login');
}

async function testProtectedApis() {
  const protectedGetPaths = [
    '/api/scryfall-commanders?q=test',
    '/api/scryfall-card-arts?name=test',
    '/api/edhrec-commander?commander=Atraxa',
  ];

  for (const path of protectedGetPaths) {
    const { status } = await fetchStatus(path);
    assert.equal(status, 401, `${path} should require auth`);
  }

  const protectedPostPaths = [
    '/api/deck-import',
    '/api/archidekt-user-decks',
  ];

  for (const path of protectedPostPaths) {
    const { status } = await fetchStatus(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(status, 401, `${path} POST should require auth`);
  }
}

async function testPublicArenaApi() {
  const { status, response } = await fetchStatus('/api/public-arena/INVALID');
  assert.ok(status === 404 || status === 400, `public arena invalid code should not be 500 (got ${status})`);
  if (status === 404) {
    const payload = await response.json();
    assert.equal(typeof payload.error, 'string');
  }
}

async function testRegisterValidation() {
  const { status, response } = await fetchStatus('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bad', password: 'x', username: 'administrator' }),
  });

  assert.ok(status >= 400 && status < 500, `register should reject invalid payload (got ${status})`);
  const payload = await response.json();
  assert.equal(typeof payload.error, 'string');
}

async function testSupabaseInfra(env) {
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { error: adminTableError } = await supabase
    .from('platform_admin_emails')
    .select('email')
    .eq('email', 'administrator@phyrexianarena.local')
    .maybeSingle();
  assert.equal(adminTableError, null, 'platform_admin_emails should be readable');

  const { error: rpcError } = await supabase.rpc('get_group_by_invite_code', {
    p_invite_code: 'NONEXISTENT',
  });
  assert.equal(rpcError, null, 'get_group_by_invite_code RPC should exist');

  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 50,
  });
  assert.equal(authError, null, 'auth admin listUsers should work');

  const adminUser = (authUsers?.users || []).find((user) => {
    const username = typeof user.user_metadata?.username === 'string'
      ? user.user_metadata.username.toLowerCase()
      : '';
    return username === 'administrator';
  });
  assert.ok(adminUser, 'administrator user should exist');

  const { data: isAdmin, error: isAdminError } = await supabase.rpc('is_admin', {
    p_user_id: adminUser.id,
  });
  assert.equal(isAdminError, null, 'is_admin RPC should work');
  assert.equal(isAdmin, true, 'administrator user should be admin in DB');

  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id, invite_code, is_public')
    .eq('is_public', true)
    .limit(1);
  assert.equal(groupsError, null, 'groups table should be readable');

  if (groups?.[0]?.invite_code) {
    const code = groups[0].invite_code;
    const { status, response } = await fetchStatus(`/api/public-arena/${code}`);
    assert.equal(status, 200, `public arena API should work for public group ${code}`);
    const payload = await response.json();
    assert.equal(typeof payload.arena?.name, 'string');
  } else {
    const { data: privateGroup } = await supabase
      .from('groups')
      .select('invite_code')
      .eq('is_public', false)
      .limit(1)
      .maybeSingle();

    if (privateGroup?.invite_code) {
      const { status } = await fetchStatus(`/api/public-arena/${privateGroup.invite_code}`);
      assert.equal(status, 404, 'private arenas should not be exposed via public API');
    }
  }
}

async function main() {
  const env = loadEnv('.env.local');
  await testRoutes();
  await testProtectedApis();
  await testPublicArenaApi();
  await testRegisterValidation();
  await testSupabaseInfra(env);
  console.log('Smoke tests passed.');
}

main().catch((error) => {
  console.error('Smoke tests failed.');
  console.error(error);
  process.exit(1);
});
