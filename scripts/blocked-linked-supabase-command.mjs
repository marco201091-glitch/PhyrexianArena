const sqlFile = process.argv[2] || 'the requested SQL file';

console.error([
  `Blocked: ${sqlFile}`,
  'This repository uses self-hosted Supabase. The local Supabase CLI link points to the retired Cloud archive.',
  'Run this QA SQL only through the approved VM procedure against supabase-dev-db or supabase-staging.',
].join('\n'));

process.exit(1);
