import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const fileName = process.argv[2];
if (!fileName) {
  console.error('Usage: node scripts/apply-single-migration.mjs <migration-file.sql>');
  process.exit(1);
}

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

const env = loadEnv('.env.local');
const accessToken = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'zljvnpjfartozqbrejwp';

if (!accessToken) {
  console.error('SUPABASE_ACCESS_TOKEN missing');
  process.exit(1);
}

const migrationPath = join(process.cwd(), 'supabase', 'migrations', fileName);
const query = readFileSync(migrationPath, 'utf8');

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query }),
});

const payload = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(`Migration ${fileName} failed:`, JSON.stringify(payload, null, 2));
  process.exit(1);
}

console.log(`ok ${fileName}`);