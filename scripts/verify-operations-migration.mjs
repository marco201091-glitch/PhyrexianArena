import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const migrations = readdirSync(join(root, 'supabase', 'migrations'))
  .filter((name) => /^\d{14}_.+\.sql$/.test(name))
  .sort();
const latest = migrations.at(-1);
assert.ok(latest, 'No Supabase migrations found.');

const operationsRoute = readFileSync(join(root, 'app', 'api', 'admin', 'operations', 'route.ts'), 'utf8');
assert.match(
  operationsRoute,
  new RegExp(`expectedLatestMigration: '${latest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`),
  'Operations must display the newest repository migration.',
);
console.log(`Operations migration check passed: ${latest}`);
