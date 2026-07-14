import { existsSync, readFileSync } from 'node:fs';

const PRODUCTION_SITE_URL = 'https://phyrexian-arena.vercel.app';
const TESTDEV_SITE_URL = 'https://phyrexian-arena-git-testdev-marco201091-9595s-projects.vercel.app';
const SUPABASE_PROJECT_REF = 'zljvnpjfartozqbrejwp';

// Never use the Vercel team deployment URL as Site URL: it is SSO-protected and breaks OAuth.
const CANONICAL_REDIRECT_URLS = [
  `${PRODUCTION_SITE_URL}/auth/callback`,
  `${PRODUCTION_SITE_URL}/auth/reset-password`,
  `${PRODUCTION_SITE_URL}/**`,
  `${TESTDEV_SITE_URL}/auth/callback`,
  `${TESTDEV_SITE_URL}/auth/reset-password`,
  'http://localhost:3000/auth/callback',
  'http://localhost:3000/auth/reset-password',
  'http://localhost:3000/**',
  // Expo native app (preview APK / standalone) — route is /callback, not /auth/callback
  'phyrexianarena://callback',
  'phyrexianarena://**',
  // Expo Go / Metro dev (LAN IP varies per machine)
  'exp://127.0.0.1:8081/--/callback',
  'exp://localhost:8081/--/callback',
  'exp://10.0.2.2:8081/--/callback',
  'exp://**',
];

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

async function patchAuthConfig(accessToken, body) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Failed to update auth config (${response.status}): ${JSON.stringify(payload)}`);
  }

  return payload;
}

const env = loadEnv('.env.local');
const accessToken = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.log('SUPABASE_ACCESS_TOKEN missing.');
  console.log('Create one at https://supabase.com/dashboard/account/tokens');
  console.log('Add it to .env.local, then run: npm run configure:supabase-auth-redirects');
  console.log('');
  console.log('Manual redirect URLs to add in Supabase → Authentication → URL Configuration:');
  for (const url of CANONICAL_REDIRECT_URLS) {
    console.log(`- ${url}`);
  }
  console.log('');
  console.log(`Site URL: ${PRODUCTION_SITE_URL}`);
  process.exit(1);
}

const updated = await patchAuthConfig(accessToken, {
  site_url: PRODUCTION_SITE_URL,
  uri_allow_list: CANONICAL_REDIRECT_URLS.join(','),
  mailer_autoconfirm: true,
});

console.log('Supabase auth redirects configured.');
console.log(`Site URL: ${updated.site_url || PRODUCTION_SITE_URL}`);
console.log('Redirect URLs:');
for (const url of CANONICAL_REDIRECT_URLS) {
  console.log(`- ${url}`);
}