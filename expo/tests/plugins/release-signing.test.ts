import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { injectReleaseSigning } = require('../../plugins/with-release-signing.js') as {
  injectReleaseSigning: (contents: string) => string;
};

const generatedBuildGradle = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }
}`;

describe('production Android signing plugin', () => {
  it('is wired into Expo production prebuild', () => {
    expect(readFileSync(resolve('app.config.js'), 'utf8'))
      .toContain("'./plugins/with-release-signing'");
  });

  it('keeps debug signing isolated and replaces only release signing', () => {
    const result = injectReleaseSigning(generatedBuildGradle);

    expect(result).toContain('// phyrexian-release-signing');
    expect(result.match(/signingConfig signingConfigs\.debug/g)).toHaveLength(1);
    expect(result.match(/signingConfig signingConfigs\.release/g)).toHaveLength(1);
    expect(result.indexOf('signingConfig signingConfigs.debug'))
      .toBeLessThan(result.indexOf('signingConfig signingConfigs.release'));
  });

  it('is idempotent', () => {
    const once = injectReleaseSigning(generatedBuildGradle);
    expect(injectReleaseSigning(once)).toBe(once);
  });
});
