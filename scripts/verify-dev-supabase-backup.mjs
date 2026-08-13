import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const path = resolve(process.argv[2] || '');
if (!process.argv[2] || !path.endsWith('.dump')) throw new Error('Usage: node scripts/verify-dev-supabase-backup.mjs <backup.dump>');
const bytes = readFileSync(path);
const expected = readFileSync(`${path}.sha256`, 'utf8').trim().split(/\s+/)[0];
const actual = createHash('sha256').update(bytes).digest('hex');
if (actual !== expected) throw new Error('Backup checksum mismatch.');
if (bytes.length < 1024 || bytes.subarray(0, 5).toString('ascii') !== 'PGDMP') {
  throw new Error('Backup is not a valid PostgreSQL custom-format dump.');
}
const storagePath = path.replace(/\.dump$/, '.storage.tar.gz');
if (!existsSync(storagePath) || !existsSync(`${storagePath}.sha256`)) {
  throw new Error(`Storage backup or checksum missing beside ${basename(path)}.`);
}
const storageBytes = readFileSync(storagePath);
const expectedStorage = readFileSync(`${storagePath}.sha256`, 'utf8').trim().split(/\s+/)[0];
const actualStorage = createHash('sha256').update(storageBytes).digest('hex');
if (actualStorage !== expectedStorage) throw new Error('Storage backup checksum mismatch.');
const storageListing = spawnSync('tar', ['-tzf', storagePath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
if (storageListing.error) throw storageListing.error;
if (storageListing.status !== 0) {
  process.stderr.write(storageListing.stderr || 'Storage archive verification failed.');
  process.exit(storageListing.status ?? 1);
}
console.log(`${basename(path)}: checksum and format OK; storage archive OK.`);
