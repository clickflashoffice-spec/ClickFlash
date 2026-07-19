const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Restrict watchFolders to only node_modules and packages so Metro doesn't crawl all other apps and timeout on Windows
// config.watchFolders = [
//   path.resolve(workspaceRoot, 'node_modules'),
//   path.resolve(workspaceRoot, 'packages'),
// ];

config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  /.*[\/\\]apps[\/\\](?:master|website|moneytrash|touch|gallery|cloud-backend|installer|license-generator)[\/\\].*/,
  /.*[\/\\]\.turbo[\/\\].*/,
  /.*[\/\\]\.git[\/\\].*/,
];

module.exports = withNativewind(config, {
  inlineVariables: false,
  globalClassNamePolyfill: false,
});