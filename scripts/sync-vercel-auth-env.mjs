import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const PRODUCTION_SITE_URL = 'https://phyrexian-arena.vercel.app';
const TESTDEV_SITE_URL = 'https://phyrexian-arena-git-testdev-marco201091-9595s-projects.vercel.app';
const RESEND_FROM_EMAIL = 'Phyrexian Arena <noreply@phyrexianarena.dpdns.org>';

function loadEnv(path) {
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

function upsertVercelEnv(name, value, target, gitBranch) {
  if (!value) {
    console.log(`skip ${name} ${target}${gitBranch ? ` (${gitBranch})` : ''}`);
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
    '--force',
    '--sensitive',
  ];

  const result = spawnSync('vercel', args, {
    encoding: 'utf8',
    timeout: 120000,
    shell: true,
    windowsHide: true,
    input: value,
  });

  if (result.status !== 0) {
    console.error(result.stdout || result.stderr || `failed ${name}`);
    process.exit(result.status || 1);
  }

  console.log(`ok ${name} -> ${target}${gitBranch ? ` (${gitBranch})` : ''}`);
}

if (!existsSync('.env.local')) {
  console.error('.env.local not found');
  process.exit(1);
}

const env = loadEnv('.env.local');

const targets = [
  ['RESEND_API_KEY', env.RESEND_API_KEY, 'production'],
  ['RESEND_API_KEY', env.RESEND_API_KEY, 'preview'],
  ['RESEND_FROM_EMAIL', env.RESEND_FROM_EMAIL || RESEND_FROM_EMAIL, 'production'],
  ['RESEND_FROM_EMAIL', env.RESEND_FROM_EMAIL || RESEND_FROM_EMAIL, 'preview'],
  ['NEXT_PUBLIC_SITE_URL', PRODUCTION_SITE_URL, 'production'],
  ['NEXT_PUBLIC_SITE_URL', TESTDEV_SITE_URL, 'preview', 'TestDev'],
  ['NEXT_PUBLIC_TURNSTILE_SITE_KEY', env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, 'preview'],
];

for (const [name, value, target, gitBranch] of targets) {
  upsertVercelEnv(name, value, target, gitBranch);
}

console.log('Vercel auth env sync complete.');
