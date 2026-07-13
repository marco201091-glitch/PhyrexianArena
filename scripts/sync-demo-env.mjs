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
const previewBranch = 'TestDev';

const items = [
  { name: 'DEMO_MODE_ENABLED', value: env.DEMO_MODE_ENABLED },
  { name: 'NEXT_PUBLIC_DEMO_MODE', value: env.NEXT_PUBLIC_DEMO_MODE },
  { name: 'DEMO_USER_EMAIL', value: env.DEMO_USER_EMAIL },
  { name: 'DEMO_USER_PASSWORD', value: env.DEMO_USER_PASSWORD },
  { name: 'DEMO_USER_ID', value: env.DEMO_USER_ID },
  { name: 'CRON_SECRET', value: env.CRON_SECRET },
];

const targets = [
  { target: 'preview', gitBranch: previewBranch, label: `Preview (${previewBranch})` },
  { target: 'production', gitBranch: null, label: 'Production' },
];

for (const { target, gitBranch, label } of targets) {
  for (const item of items) {
    const sensitive = !item.name.startsWith('NEXT_PUBLIC_');
    upsertVercelEnv(item.name, item.value || 'true', target, gitBranch, sensitive);
  }
  console.log(`Demo env synced to Vercel ${label}.`);
}