import type { Config } from 'tailwindcss';
import designTokens from '@clickflash/ui/src/tokens/design-tokens.json';

const config: Config = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui/src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: designTokens.colors,
    },
  },
  plugins: [],
};

export default config;
