import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

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

const sshArgs = ['-o', 'BatchMode=yes'];
const port = process.env[`${prefix}_VM_PORT`];
const keyPath = process.env[`${prefix}_VM_KEY_PATH`];
if (port) sshArgs.push('-p', port);
if (keyPath) sshArgs.push('-i', keyPath);
sshArgs.push(`${config.VM_USER}@${config.VM_HOST}`);

const remoteCommand = [
  `container=$(docker ps -q --filter label=com.docker.compose.project=${config.COMPOSE_PROJECT} --filter label=com.docker.compose.service=db | head -n 1)`,
  'test -n "$container"',
  'docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres',
].join(' && ');

const child = spawn('ssh', [...sshArgs, remoteCommand], { stdio: ['pipe', 'inherit', 'inherit'] });
child.stdin.end(readFileSync(sqlPath));
child.on('exit', (code) => process.exitCode = code ?? 1);
