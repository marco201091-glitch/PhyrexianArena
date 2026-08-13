import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function loadEnv(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const index = line.indexOf('=');
      const key = line.slice(0, index);
      if (!(key in process.env)) process.env[key] = line.slice(index + 1).replace(/^"|"$/g, '');
    }
  } catch {}
}

loadEnv(process.env.DOKPLOY_ENV_FILE || '.env.local');
const host = process.env.SELFHOSTED_DEV_VM_HOST;
const user = process.env.SELFHOSTED_DEV_VM_USER;
const key = process.env.SELFHOSTED_DEV_VM_KEY_PATH;
const compose = process.env.SELFHOSTED_DEV_COMPOSE_PROJECT || 'supabase-dev';
const outputDir = resolve(process.argv[2] || 'backups/dev');
if (!host || !user || !key) throw new Error('SELFHOSTED_DEV_VM_HOST, VM_USER and VM_KEY_PATH are required.');
mkdirSync(outputDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = resolve(outputDir, `supabase-dev-${stamp}.dump`);
const storageOutput = resolve(outputDir, `supabase-dev-${stamp}.storage.tar.gz`);
const remote = `container=$(docker ps -q --filter label=com.docker.compose.project=${compose} --filter label=com.docker.compose.service=db | head -n 1) && test -n "$container" && docker exec "$container" pg_dump -U supabase_admin -d postgres --format=custom --no-owner --no-privileges`;
const result = spawnSync('ssh', ['-i', key, '-o', 'BatchMode=yes', `${user}@${host}`, remote], { encoding: null, maxBuffer: 1024 * 1024 * 1024 });
if (result.error) throw result.error;
if (result.status !== 0) {
  process.stderr.write(result.stderr || Buffer.alloc(0));
  process.exit(result.status ?? 1);
}
writeFileSync(output, result.stdout);
const checksum = createHash('sha256').update(result.stdout).digest('hex');
writeFileSync(`${output}.sha256`, `${checksum}  ${basename(output)}\n`);
const storageRemote = `container=$(docker ps -q --filter label=com.docker.compose.project=${compose} --filter label=com.docker.compose.service=storage | head -n 1) && test -n "$container" && docker exec "$container" tar -C /var/lib/storage -czf - .`;
const storageResult = spawnSync('ssh', ['-i', key, '-o', 'BatchMode=yes', `${user}@${host}`, storageRemote], { encoding: null, maxBuffer: 1024 * 1024 * 1024 });
if (storageResult.error) throw storageResult.error;
if (storageResult.status !== 0) {
  process.stderr.write(storageResult.stderr || Buffer.alloc(0));
  process.exit(storageResult.status ?? 1);
}
writeFileSync(storageOutput, storageResult.stdout);
const storageChecksum = createHash('sha256').update(storageResult.stdout).digest('hex');
writeFileSync(`${storageOutput}.sha256`, `${storageChecksum}  ${basename(storageOutput)}\n`);
console.log(`${output}\n${storageOutput}`);
