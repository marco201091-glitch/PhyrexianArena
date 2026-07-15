import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_MIGRATION_FILES = [
  '20260708120000_017_arena_member_management.sql',
  '20260708130000_018_api_rate_limits.sql',
  '20260709120000_019_demo_sandbox.sql',
  '20260709130000_020_access_logs.sql',
  '20260709140000_021_access_logs_include_demo.sql',
  '20260709150000_022_analytics_exclusions.sql',
  '20260709160000_023_oauth_profile_usernames.sql',
  '20260709170000_024_oauth_username_dots.sql',
  '20260709180000_025_access_logs_admin_rpc.sql',
  '20260710150000_026_deck_commander_cmc.sql',
  '20260712120000_027_access_logs_source.sql',
  '20260713120000_028_v2_live_games_and_draws.sql',
];

function validateMigrationFileName(fileName) {
  if (!/^\d{14}_[a-z0-9_]+\.sql$/.test(fileName)) {
    throw new Error(`Invalid migration filename: ${fileName}`);
  }
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', fileName);
  if (!existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${fileName}`);
  }
  return fileName;
}

function loadEnv(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        const key = line.slice(0, index).trim();
        let value = line.slice(index + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        return [key, value];
      })
      .filter(([key]) => key),
  );
}

async function applyMigration(accessToken, projectRef, fileName) {
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', fileName);
  const query = readFileSync(migrationPath, 'utf8');

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Migration ${fileName} failed: ${JSON.stringify(payload)}`);
  }

  console.log(`ok ${fileName}`);
}

const env = loadEnv('.env.local');
const accessToken = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
const projectRef = process.env.SUPABASE_PROJECT_REF
  || env.SUPABASE_PROJECT_REF
  || projectUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];
const requestedFiles = process.argv.slice(2);
const migrationFiles = (requestedFiles.length > 0 ? requestedFiles : DEFAULT_MIGRATION_FILES)
  .map(validateMigrationFileName);

if (!projectRef) {
  throw new Error('SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL is required');
}

if (!accessToken) {
  console.log('SUPABASE_ACCESS_TOKEN missing. Apply migrations manually in Supabase SQL editor:');
  for (const fileName of migrationFiles) {
    console.log(`- supabase/migrations/${fileName}`);
  }
  process.exit(0);
}

for (const fileName of migrationFiles) {
  await applyMigration(accessToken, projectRef, fileName);
}

console.log('Remote Supabase migrations applied.');
