import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd());

function json(relativePath: string) {
  return JSON.parse(readFileSync(resolve(root, relativePath), 'utf8')) as Record<string, unknown>;
}

describe('v7 release version parity', () => {
  it('keeps Web, Expo, native build numbers, locks and legal footer aligned', () => {
    const webPackage = json('package.json');
    const webLock = json('package-lock.json');
    const expoPackage = json('expo/package.json');
    const expoLock = json('expo/package-lock.json');
    const appConfig = json('expo/app.json').expo as Record<string, unknown>;
    const version = webPackage.version;

    expect(version).toBe('7.1.1');
    expect(webLock.version).toBe(version);
    expect(expoPackage.version).toBe(version);
    expect(expoLock.version).toBe(version);
    expect(appConfig.version).toBe(version);
    expect((appConfig.ios as Record<string, unknown>).buildNumber).toBe('70101');
    expect((appConfig.android as Record<string, unknown>).versionCode).toBe(70101);

    for (const path of ['lib/legal-site.ts', 'expo/lib/legal-site.ts', 'expo/lib/app-version.ts']) {
      expect(readFileSync(resolve(root, path), 'utf8'), path).toContain(`'${version}'`);
    }
  });
});
