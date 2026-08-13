import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const index = line.indexOf('=');
      const key = line.slice(0, index);
      if (!(key in process.env)) process.env[key] = line.slice(index + 1).replace(/^"|"$/g, '');
    }
  } catch {
    // Environment variables may be supplied by CI or the caller.
  }
}

loadEnvFile(process.env.DOKPLOY_ENV_FILE || '.env.local');

const baseUrl = process.env.DOKPLOY_URL?.replace(/\/$/, '');
const apiKey = process.env.DOKPLOY_API_KEY;
const applicationId = process.env.DOKPLOY_DEV_APPLICATION_ID || '0y9Dk8lwDTwkeBuM0hEJt';
if (!baseUrl || !apiKey) throw new Error('DOKPLOY_URL and DOKPLOY_API_KEY are required.');

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Unable to resolve the Git commit SHA.');
const headers = { 'x-api-key': apiKey, 'Content-Type': 'application/json' };

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function setVariable(source, name, value) {
  const lines = String(source || '').split(/\r?\n/).filter(Boolean);
  const next = lines.filter((line) => !line.startsWith(`${name}=`));
  next.push(`${name}=${value}`);
  return next.join('\n');
}

const application = await request(`/api/application.one?applicationId=${encodeURIComponent(applicationId)}`);
await request('/api/application.saveEnvironment', {
  method: 'POST',
  body: JSON.stringify({
    applicationId,
    env: setVariable(application.env, 'GIT_COMMIT_SHA', commit),
    buildArgs: setVariable(
      setVariable(application.buildArgs, 'GIT_COMMIT_SHA', commit),
      'NEXT_PUBLIC_GIT_COMMIT_SHA',
      commit,
    ),
    buildSecrets: application.buildSecrets || '',
    createEnvFile: Boolean(application.createEnvFile),
  }),
});
await request('/api/application.deploy', {
  method: 'POST',
  body: JSON.stringify({
    applicationId,
    title: `Deploy Dev ${commit.slice(0, 12)}`,
    description: `Commit: ${commit}`,
  }),
});

console.log(`Dev deployment queued for ${commit}.`);
