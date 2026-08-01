import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import nextEnv from '@next/env';

const projectDir = process.cwd();
const standaloneDir = path.join(projectDir, '.next', 'standalone');

nextEnv.loadEnvConfig(projectDir);

await mkdir(path.join(standaloneDir, '.next'), { recursive: true });
await Promise.all([
  cp(path.join(projectDir, '.next', 'static'), path.join(standaloneDir, '.next', 'static'), {
    recursive: true,
    force: true,
  }),
  cp(path.join(projectDir, 'public'), path.join(standaloneDir, 'public'), {
    recursive: true,
    force: true,
  }),
]);

await import(pathToFileURL(path.join(standaloneDir, 'server.js')).href);
