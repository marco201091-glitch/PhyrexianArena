import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const PRODUCTION_SITE_URL = 'https://phyrexian-arena.vercel.app';
const TESTDEV_SITE_URL = 'https://phyrexian-arena-git-testdev-marco201091-9595s-projects.vercel.app';
const SUPPORT_EMAIL = 'support@phyrexianarena.dpdns.org';
const SUPABASE_PROJECT_REF = 'zljvnpjfartozqbrejwp';

const REDIRECT_URLS = [
  `${PRODUCTION_SITE_URL}/auth/callback`,
  `${PRODUCTION_SITE_URL}/auth/reset-password`,
  `${TESTDEV_SITE_URL}/auth/callback`,
  `${TESTDEV_SITE_URL}/auth/reset-password`,
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

async function configureSupabaseAuth(accessToken) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      site_url: PRODUCTION_SITE_URL,
      uri_allow_list: REDIRECT_URLS.join(','),
      mailer_autoconfirm: true,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Supabase auth config failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  console.log('ok supabase:auth-config');
  return payload;
}

const env = loadEnv('.env.local');

const vercelTargets = [
  { name: 'RESEND_API_KEY', value: env.RESEND_API_KEY, targets: ['production', 'preview'] },
  { name: 'RESEND_FROM_EMAIL', value: env.RESEND_FROM_EMAIL, targets: ['production', 'preview'] },
  { name: 'NEXT_PUBLIC_SITE_URL', value: PRODUCTION_SITE_URL, targets: ['production'] },
  { name: 'NEXT_PUBLIC_SITE_URL', value: TESTDEV_SITE_URL, targets: ['preview'], gitBranch: 'TestDev' },
  { name: 'NEXT_PUBLIC_HCAPTCHA_SITE_KEY', value: env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY, targets: ['preview'] },
  { name: 'HCAPTCHA_SECRET_KEY', value: env.HCAPTCHA_SECRET_KEY, targets: ['preview'] },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', value: env.SUPABASE_SERVICE_ROLE_KEY, targets: ['production', 'preview'] },
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

const accessToken = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
if (accessToken) {
  console.log('Configuring Supabase auth URLs...');
  await configureSupabaseAuth(accessToken);
} else {
  console.log('skip supabase:auth-config (SUPABASE_ACCESS_TOKEN missing)');
  console.log('Add SUPABASE_ACCESS_TOKEN to .env.local from https://supabase.com/dashboard/account/tokens');
  console.log('Then rerun: node scripts/configure-auth-deployment.mjs');
  console.log('Manual redirect URLs to allow:');
  for (const url of REDIRECT_URLS) {
    console.log(`- ${url}`);
  }
}

assert.ok(env.RESEND_API_KEY, 'RESEND_API_KEY missing in .env.local');
assert.ok(env.RESEND_FROM_EMAIL, 'RESEND_FROM_EMAIL missing in .env.local');
console.log('Auth deployment configuration finished.');
