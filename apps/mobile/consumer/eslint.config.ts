import { defineConfig } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat';

export default defineConfig([
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
