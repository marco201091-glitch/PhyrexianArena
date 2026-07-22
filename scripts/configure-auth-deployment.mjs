import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const PRODUCTION_SITE_URL = 'https://phyrexian-arena.vercel.app';
const PREVIEW_SITE_URLS = {
  Dev: 'https://phyrexian-arena-git-dev-marco201091-9595s-projects.vercel.app',
  Test: 'https://phyrexian-arena-git-test-marco201091-9595s-projects.vercel.app',
};
const PREVIEW_BRANCHES = Object.keys(PREVIEW_SITE_URLS);
const SUPPORT_EMAIL = 'support@phyrexianarena.dpdns.org';

const REDIRECT_URLS = [
  `${PRODUCTION_SITE_URL}/auth/callback`,
  `${PRODUCTION_SITE_URL}/auth/reset-password`,
  ...Object.values(PREVIEW_SITE_URLS).flatMap((siteUrl) => [
    `${siteUrl}/auth/callback`,
    `${siteUrl}/auth/reset-password`,
  ]),
  'http://localhost:3000/auth/callback',
  'http://localhost:3000/auth/reset-password',
  'phyrexianarena://callback',
  'phyrexianarena://**',
  'phyrexianarena-dev://callback',
  'phyrexianarena-dev://**',
];

function loadEnv(path) {
  if (!existsSync(path)) {
    return {};
  }

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
    console.log(`skip vercel:${name}:${target}${gitBranch ? `:${gitBranch}` : ''} (missing value)`);
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
    '--sensitive',
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
    throw new Error(result.stderr || result.stdout || `Failed to set ${name} for ${target}`);
  }

  console.log(`ok vercel:${name}:${target}${gitBranch ? `:${gitBranch}` : ''}`);
}

const env = loadEnv('.env.local');

const vercelTargets = [
  { name: 'NEXT_PUBLIC_SUPABASE_URL', value: env.NEXT_PUBLIC_SUPABASE_URL, targets: ['production'] },
  ...PREVIEW_BRANCHES.map((gitBranch) => ({
    name: 'NEXT_PUBLIC_SUPABASE_URL', value: env.NEXT_PUBLIC_SUPABASE_URL, targets: ['preview'], gitBranch,
  })),
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, targets: ['production'] },
  ...PREVIEW_BRANCHES.map((gitBranch) => ({
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, targets: ['preview'], gitBranch,
  })),
  { name: 'RESEND_API_KEY', value: env.RESEND_API_KEY, targets: ['production', 'preview'] },
  { name: 'RESEND_FROM_EMAIL', value: env.RESEND_FROM_EMAIL, targets: ['production', 'preview'] },
  { name: 'NEXT_PUBLIC_SITE_URL', value: PRODUCTION_SITE_URL, targets: ['production'] },
  ...Object.entries(PREVIEW_SITE_URLS).map(([gitBranch, value]) => ({
    name: 'NEXT_PUBLIC_SITE_URL',
    value,
    targets: ['preview'],
    gitBranch,
  })),
  { name: 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', value: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, targets: ['preview'] },
  { name: 'TURNSTILE_SECRET_KEY', value: env.TURNSTILE_SECRET_KEY, targets: ['preview'] },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', value: env.SUPABASE_SERVICE_ROLE_KEY, targets: ['production'] },
  ...PREVIEW_BRANCHES.map((gitBranch) => ({
    name: 'SUPABASE_SERVICE_ROLE_KEY', value: env.SUPABASE_SERVICE_ROLE_KEY, targets: ['preview'], gitBranch,
  })),
  { name: 'PLATFORM_ADMIN_EMAILS', value: env.PLATFORM_ADMIN_EMAILS, targets: ['production', 'preview'] },
  { name: 'NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS', value: env.NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS, targets: ['production', 'preview'] },
  { name: 'NEXT_PUBLIC_SUPPORT_EMAIL', value: env.NEXT_PUBLIC_SUPPORT_EMAIL || SUPPORT_EMAIL, targets: ['production', 'preview'] },
];

console.log('Configuring Vercel environment variables...');
for (const item of vercelTargets) {
  for (const target of item.targets) {
    upsertVercelEnv(item.name, item.value, target, item.gitBranch);
  }
}

console.log('Self-hosted Auth must allow these redirect URLs:');
for (const url of REDIRECT_URLS) console.log(`- ${url}`);

assert.ok(env.RESEND_API_KEY, 'RESEND_API_KEY missing in .env.local');
assert.ok(env.RESEND_FROM_EMAIL, 'RESEND_FROM_EMAIL missing in .env.local');
console.log('Vercel auth environment configuration finished.');
