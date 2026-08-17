// @ts-nocheck
import { getDefaultConfig } from 'expo/metro-config';
import { withNativewind } from 'nativewind/metro';
const config = getDefaultConfig(__dirname) as any;
export default withNativewind(config, {
  inlineVariables: false,
  globalClassNamePolyfill: false,
});
