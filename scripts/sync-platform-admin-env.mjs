import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

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

function upsertVercelEnv(name, value, target, gitBranch, sensitive = true) {
  if (!value) {
    console.log(`skip ${name} (${target}${gitBranch ? `:${gitBranch}` : ''})`);
    return;
  }

  const args = [
    '--non-interactive',
    'env',
    'add',
    name,
    target,
    ...(gitBranch ? [gitBranch] : []),
    '--yes',
    ...(sensitive ? ['--sensitive'] : []),
    '--force',
  ];

  const result = spawnSync('vercel', args, {
    encoding: 'utf8',
    timeout: 120000,
    shell: true,
    windowsHide: true,
    input: value,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Failed to set ${name}`);
  }

  console.log(`ok ${name} (${target}${gitBranch ? `:${gitBranch}` : ''})`);
}

const env = loadEnv('.env.local');
const items = [
  { name: 'PLATFORM_ADMIN_EMAILS', value: env.PLATFORM_ADMIN_EMAILS, sensitive: true },
  { name: 'NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS', value: env.NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS, sensitive: false },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', value: env.SUPABASE_SERVICE_ROLE_KEY, sensitive: true },
];

for (const item of items) {
  upsertVercelEnv(item.name, item.value, 'production', null, item.sensitive);
}

console.log('Platform admin env synced to Vercel Production.');