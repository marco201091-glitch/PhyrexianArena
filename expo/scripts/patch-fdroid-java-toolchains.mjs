import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pluginRoot = resolve('node_modules/@react-native/gradle-plugin');
const buildFiles = [
  'react-native-gradle-plugin/build.gradle.kts',
  'settings-plugin/build.gradle.kts',
  'shared/build.gradle.kts',
  'shared-testutil/build.gradle.kts',
];

for (const relativePath of buildFiles) {
  const path = resolve(pluginRoot, relativePath);
  const source = readFileSync(path, 'utf8');
  const java17Matches = source.match(/jvmToolchain\(17\)/g) ?? [];
  const java21Matches = source.match(/jvmToolchain\(21\)/g) ?? [];

  if (java17Matches.length === 0 && java21Matches.length === 1) {
    continue;
  }
  if (java17Matches.length !== 1 || java21Matches.length !== 0) {
    throw new Error(
      `Unexpected JVM toolchain declarations in ${relativePath}: Java 17=${java17Matches.length}, Java 21=${java21Matches.length}`,
    );
  }

  writeFileSync(path, source.replace('jvmToolchain(17)', 'jvmToolchain(21)'));
}

console.log('React Native Gradle plugin configured to run on F-Droid JDK 21.');
