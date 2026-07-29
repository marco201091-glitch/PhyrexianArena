import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd());
const sourceRoots = [
  'app',
  'components',
  'hooks',
  'lib',
  'scripts',
  'expo/app',
  'expo/components',
  'expo/hooks',
  'expo/lib',
  'expo/scripts',
];
const rootFiles = [
  'next.config.js',
  'proxy.ts',
  'sentry.server.config.ts',
  'sentry.edge.config.ts',
  'instrumentation-client.ts',
  '.env.example',
];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.mjs']);

function collectSourceFiles(path: string): string[] {
  const absolute = join(root, path);
  if (!statSync(absolute).isDirectory()) return [absolute];

  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = join(path, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(relative);
    return sourceExtensions.has(extname(entry.name)) ? [join(root, relative)] : [];
  });
}

describe('self-hosted runtime independence', () => {
  it('contains no Vercel or Supabase Cloud runtime dependency', () => {
    const source = [...sourceRoots, ...rootFiles]
      .flatMap(collectSourceFiles)
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    expect(source).not.toMatch(/VERCEL_|\.vercel\.app|api\.supabase\.com/i);
    expect(source).not.toMatch(/[a-z0-9]{20}\.supabase\.co/i);
  });
});
