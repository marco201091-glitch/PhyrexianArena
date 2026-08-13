import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

try {
  const local = readFileSync('.env.local', 'utf8');
  for (const line of local.split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const index = line.indexOf('=');
    const key = line.slice(0, index);
    if (!(key in process.env)) process.env[key] = line.slice(index + 1).replace(/^"|"$/g, '');
  }
} catch {
  // CI and callers may supply the variables directly instead.
}

const [action, environment, sqlPath] = process.argv.slice(2);
if (action !== 'apply' || !['dev', 'production'].includes(environment) || !sqlPath) {
  throw new Error('Usage: node scripts/selfhosted-db.mjs apply <dev|production> <migration.sql>');
}

const prefix = environment === 'production' ? 'SELFHOSTED_PRODUCTION' : 'SELFHOSTED_DEV';
const required = ['VM_HOST', 'VM_USER', 'COMPOSE_PROJECT'];
const config = Object.fromEntries(required.map((name) => [name, process.env[`${prefix}_${name}`]]));
const missing = required.filter((name) => !config[name]);
if (missing.length) throw new Error(`Missing ${missing.map((name) => `${prefix}_${name}`).join(', ')}`);
if (!/^[a-z0-9_.-]+$/i.test(config.COMPOSE_PROJECT)) {
  throw new Error(`${prefix}_COMPOSE_PROJECT contains unsupported characters.`);
}

const sshArgs = ['-o', 'BatchMode=yes'];
const port = process.env[`${prefix}_VM_PORT`];
const keyPath = process.env[`${prefix}_VM_KEY_PATH`];
const dbUser = process.env[`${prefix}_DB_USER`] ?? 'postgres';
if (!/^[a-z_][a-z0-9_]*$/i.test(dbUser)) {
  throw new Error(`${prefix}_DB_USER must be a valid PostgreSQL role name.`);
}
if (port) sshArgs.push('-p', port);
if (keyPath) sshArgs.push('-i', keyPath);
sshArgs.push(`${config.VM_USER}@${config.VM_HOST}`);

const migrationFile = basename(sqlPath);
const migrationMatch = /^(\d{14})_([a-z0-9_]+)\.sql$/i.exec(migrationFile);
if (!migrationMatch) throw new Error('Migration filename must be <14-digit-version>_<name>.sql.');
const [, version, migrationName] = migrationMatch;
const sql = readFileSync(sqlPath, 'utf8');
const checksum = createHash('sha256').update(sql).digest('hex');

const containerCommand = [
  `container=$(docker ps -q --filter label=com.docker.compose.project=${config.COMPOSE_PROJECT} --filter label=com.docker.compose.service=db | head -n 1)`,
  'test -n "$container"',
].join(' && ');

function runPsql(input, capture = false) {
  const remoteCommand = `${containerCommand} && docker exec -i "$container" psql -X -At --single-transaction -v ON_ERROR_STOP=1 -U ${dbUser} -d postgres`;
  const result = spawnSync('ssh', [...sshArgs, remoteCommand], {
    input,
    encoding: 'utf8',
    stdio: capture ? ['pipe', 'pipe', 'inherit'] : ['pipe', 'inherit', 'inherit'],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return capture ? result.stdout.trim() : '';
}

runPsql(`
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
create table if not exists app_private.schema_migrations (
  version text primary key,
  name text not null,
  checksum text not null check (checksum ~ '^[a-f0-9]{64}$'),
  applied_at timestamptz not null default now(),
  applied_by text not null default current_user
);
revoke all on app_private.schema_migrations from public, anon, authenticated;
`);

const existingChecksum = runPsql(
  `select checksum from app_private.schema_migrations where version = '${version}';`,
  true,
);
if (existingChecksum) {
  if (existingChecksum !== checksum) {
    throw new Error(`Migration ${version} was already applied with a different checksum.`);
  }
  console.log(`Migration ${version} already applied; checksum verified.`);
  process.exit(0);
}

runPsql(sql);
runPsql(`
insert into app_private.schema_migrations(version, name, checksum)
values ('${version}', '${migrationName}', '${checksum}');
`);

console.log(`Migration ${version} applied and recorded.`);
