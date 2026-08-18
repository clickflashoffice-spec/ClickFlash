import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    'apps/*': {
      entry: [
        'src/main.ts',
        'src/main.tsx',
        'src/index.ts',
        'src/index.tsx',
        'index.js',
        'App.tsx',
        'worker.ts'
      ],
      ignore: ['test-results/**', 'dist/**', 'build/**']
    },
    'packages/*': {
      entry: ['src/index.ts'],
      ignore: ['dist/**', 'build/**']
    }
  },
  ignore: ['generated/**', '**/__fixtures__/**', 'scripts/**']
};

export default config;
