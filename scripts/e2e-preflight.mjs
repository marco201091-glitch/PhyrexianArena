import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import nextEnv from '@next/env';

if (process.env.E2E_BASE_URL) {
  console.log(`E2E external target: ${process.env.E2E_BASE_URL}`);
  process.exit(0);
}

nextEnv.loadEnvConfig(process.cwd());
const missing = [
  ['NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY],
].filter(([, value]) => !value).map(([name]) => name);

if (!existsSync(resolve('.next/standalone/server.js'))) {
  throw new Error('E2E standalone build missing. Run `npm run build` first.');
}
if (missing.length) {
  throw new Error(`E2E Supabase configuration missing: ${missing.join(', ')}. Configure .env.local or set E2E_BASE_URL.`);
}
console.log('E2E preflight OK.');
