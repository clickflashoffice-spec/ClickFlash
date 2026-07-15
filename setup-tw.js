const fs = require('fs');
const apps = ['mobile-staff', 'mobile-customer'];

for (const app of apps) {
  const dir = `C:/Users/alamo/Desktop/ClickFlash/apps/${app}`;
  
  // metro.config.js
  const metro = `const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);
module.exports = withNativewind(config, {
  inlineVariables: false,
  globalClassNamePolyfill: false,
});`;
  fs.writeFileSync(`${dir}/metro.config.js`, metro);

  // postcss.config.mjs
  const postcss = `export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};`;
  fs.writeFileSync(`${dir}/postcss.config.mjs`, postcss);

  // Create dirs
  fs.mkdirSync(`${dir}/src/css`, { recursive: true });
  fs.mkdirSync(`${dir}/src/tw`, { recursive: true });

  // global.css
  const globalCss = `@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/preflight.css' layer(base);
@import 'tailwindcss/utilities.css';

@media android {
  :root {
    --font-mono: monospace;
    --font-rounded: normal;
    --font-serif: serif;
    --font-sans: normal;
  }
}

@media ios {
  :root {
    --font-mono: ui-monospace;
    --font-serif: ui-serif;
    --font-sans: system-ui;
    --font-rounded: ui-rounded;
  }
}
`;
  fs.writeFileSync(`${dir}/src/global.css`, globalCss);

  // src/tw/index.tsx
  const twIndex = `import { useCssElement, useNativeVariable } from 'react-native-css';
import { Link as RouterLink } from 'expo-router';
import React from 'react';
import { View as RNView, Text as RNText, Pressable as RNPressable, ScrollView as RNScrollView, TextInput as RNTextInput } from 'react-native';

export const Link = (props: any) => useCssElement(RouterLink, props, { className: 'style' });
Link.Trigger = RouterLink.Trigger;

export const useCSSVariable = process.env.EXPO_OS !== 'web' ? useNativeVariable : (v: string) => \`var(\${v})\`;

export const View = (props: any) => useCssElement(RNView, props, { className: 'style' });
export const Text = (props: any) => useCssElement(RNText, props, { className: 'style' });
export const ScrollView = (props: any) => useCssElement(RNScrollView, props, { className: 'style', contentContainerClassName: 'contentContainerStyle' });
export const Pressable = (props: any) => useCssElement(RNPressable, props, { className: 'style' });
export const TextInput = (props: any) => useCssElement(RNTextInput, props, { className: 'style' });
`;
  fs.writeFileSync(`${dir}/src/tw/index.tsx`, twIndex);

  // Update package.json resolutions
  const pkgPath = `${dir}/package.json`;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.resolutions = pkg.resolutions || {};
  pkg.resolutions['lightningcss'] = '1.30.1';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
}
console.log('Successfully configured Tailwind CSS templates for both apps!');
