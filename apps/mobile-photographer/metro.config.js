const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);

// Expo's monorepo discovery includes every workspace package by default. In
// ClickFlash that also pulls large desktop build stages into Metro's file map,
// delaying the dev server before it can bind port 8081. Mobile needs only the
// shared packages declared in its package.json.
const mobileWorkspacePackages = ['logger', 'types', 'ui', 'validation'].map(
  (packageName) => path.join(workspaceRoot, 'packages', packageName),
);

config.watchFolders = [
  path.join(workspaceRoot, 'node_modules'),
  ...mobileWorkspacePackages,
];
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, 'node_modules'),
  path.join(workspaceRoot, 'node_modules'),
];

module.exports = withNativewind(config, {
  inlineVariables: false,
  globalClassNamePolyfill: false,
});
