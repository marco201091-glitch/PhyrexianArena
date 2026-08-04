const sqlFile = process.argv[2] || 'the requested SQL file';

console.error([
  `Blocked: ${sqlFile}`,
  'This repository uses self-hosted Supabase.',
  'Run this QA SQL through scripts/selfhosted-db.mjs against the appropriate VM.',
].join('\n'));

process.exit(1);
