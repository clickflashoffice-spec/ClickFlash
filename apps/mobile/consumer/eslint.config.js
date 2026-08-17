// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    rules: {
      'react-compiler/react-compiler': 'off',
      'react-hooks/immutability': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    }
  }
]);
