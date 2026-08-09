import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(testDirectory, '..');
const workspaceRoot = path.resolve(appRoot, '../..');
const require = createRequire(import.meta.url);
const config = require('../metro.config.js');

test('Metro watches only Mobile runtime workspace dependencies', () => {
  const expected = [
    path.join(workspaceRoot, 'node_modules'),
    ...['logger', 'types', 'ui', 'validation'].map((packageName) =>
      path.join(workspaceRoot, 'packages', packageName),
    ),
  ];

  assert.deepEqual(config.watchFolders, expected);
  assert.equal(
    config.watchFolders.some((folder) =>
      folder.includes(path.join('apps', 'master')) ||
      folder.includes('build-electron-stage'),
    ),
    false,
  );
});

test('Metro resolves app dependencies before workspace dependencies', () => {
  assert.deepEqual(config.resolver.nodeModulesPaths, [
    path.join(appRoot, 'node_modules'),
    path.join(workspaceRoot, 'node_modules'),
  ]);
});

test('Android Metro startup uses IPv4 localhost for ADB reverse', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'),
  );

  assert.equal(
    packageJson.scripts['start:android'],
    'node --dns-result-order=ipv4first ./node_modules/expo/bin/cli start --dev-client --localhost',
  );
});
