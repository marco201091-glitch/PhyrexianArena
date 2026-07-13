import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

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

const env = loadEnv('.env.local');
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);

const checks = {};
for (const table of ['platform_admin_emails', 'deck_private_notes', 'groups', 'profiles', 'decks']) {
  const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  checks[table] = error ? error.message : 'ok';
}

const { data: admins, error: adminError } = await supabase
  .from('platform_admin_emails')
  .select('email');

const { error: rpcError } = await supabase.rpc('get_group_by_invite_code', {
  p_invite_code: 'TEST',
});

const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 20,
});

const adminUsers = (authUsers?.users || [])
  .filter((user) => {
    const username = typeof user.user_metadata?.username === 'string'
      ? user.user_metadata.username.toLowerCase()
      : '';
    return username === 'administrator';
  })
  .map((user) => ({ id: user.id, email: user.email, username: user.user_metadata?.username }));

const adminUserId = adminUsers[0]?.id;
let isAdminResult = null;
let isAdminError = null;
let isGroupOwnerRpc = null;
let isGroupOwnerError = null;

if (adminUserId) {
  const { data, error } = await supabase.rpc('is_admin', { p_user_id: adminUserId });
  isAdminResult = data;
  isAdminError = error?.message || null;

  const ownerCheck = await supabase.rpc('is_group_owner', {
    p_group_id: '00000000-0000-0000-0000-000000000000',
    p_user_id: adminUserId,
  });
  isGroupOwnerRpc = ownerCheck.error ? null : 'ok';
  isGroupOwnerError = ownerCheck.error?.message || null;
}

const { data: sampleDeck } = await supabase.from('decks').select('*').limit(1).maybeSingle();
const { data: privateNotesProbe, error: privateNotesError } = await supabase
  .from('deck_private_notes')
  .select('deck_id', { count: 'exact', head: true });

console.log(JSON.stringify({
  checks,
  platformAdminEmails: adminError?.message || admins,
  joinRpc: rpcError?.message || 'ok',
  administratorAccounts: authError?.message || adminUsers,
  isAdminForAdministrator: isAdminError || isAdminResult,
  migration014_isGroupOwner: isGroupOwnerError || isGroupOwnerRpc || 'missing',
  deckPrivateNotesTable: privateNotesError?.message || (privateNotesProbe === null ? 'absent-or-empty' : 'present'),
  profileNotesColumnOnDeck: sampleDeck ? Object.prototype.hasOwnProperty.call(sampleDeck, 'profile_notes') : 'no-decks',
  envAdminConfigured: Boolean(env.PLATFORM_ADMIN_EMAILS && env.NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS),
}, null, 2));