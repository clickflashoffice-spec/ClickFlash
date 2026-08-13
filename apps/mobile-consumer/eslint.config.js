// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Reanimated useSharedValue().value is designed to be mutated directly.
    // The react-hooks/immutability rule from React Compiler doesn't understand this.
    rules: {
      "react-hooks/immutability": "off",
    },
  },
]);
