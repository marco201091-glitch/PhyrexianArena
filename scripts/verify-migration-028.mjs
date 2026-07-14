import { readFileSync, existsSync } from 'node:fs';

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

const query = `
  SELECT 'is_draw' AS check_name, COUNT(*)::text AS found
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'matches' AND column_name = 'is_draw'
  UNION ALL
  SELECT 'live_games' AS check_name, COUNT(*)::text AS found
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'live_games'
  UNION ALL
  SELECT 'get_arena_stats_participants' AS check_name, COUNT(*)::text AS found
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'get_arena_stats_participants';
`;

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
  console.error('Verification failed:', JSON.stringify(payload, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(payload, null, 2));