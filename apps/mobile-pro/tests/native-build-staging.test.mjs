import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pluginSource = readFileSync(
  new URL('../plugins/withNativeBuildStaging.js', import.meta.url),
  'utf8'
);
const generatedGradle = readFileSync(
  new URL('../android/build.gradle', import.meta.url),
  'utf8'
);

const nativeProjects = [
  'expo-modules-core',
  'react-native-reanimated',
  'react-native-screens',
  'react-native-svg',
  'react-native-worklets',
];

test('native dependencies stage their complete Gradle output under the short app path', () => {
  for (const project of nativeProjects) {
    assert.match(pluginSource, new RegExp(`"${project}"`));
    assert.match(generatedGradle, new RegExp(`"${project}"`));
  }

  assert.match(pluginSource, /subproject\.layout\.buildDirectory\.set/);
  assert.match(pluginSource, /\.native-build\/\\\$\{subproject\.name\}/);
  assert.match(generatedGradle, /subproject\.layout\.buildDirectory\.set/);
  assert.match(generatedGradle, /\.native-build\/\$\{subproject\.name\}/);
});
