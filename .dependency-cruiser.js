module.exports = {
  forbidden: [
    {
      name: 'packages-types-no-apps',
      comment: 'packages/types must NOT import from apps/*',
      severity: 'error',
      from: { path: '^packages/types' },
      to: { path: '^apps/' }
    },
    {
      name: 'packages-ui-no-node-builtins',
      comment: 'packages/ui must NOT import Node.js built-in modules',
      severity: 'error',
      from: { path: '^packages/ui' },
      to: { dependencyTypes: ['core'] }
    },
    {
      name: 'master-no-management-or-gallery',
      comment: 'apps/desktop/master must NOT import from apps/management or apps/gallery',
      severity: 'error',
      from: { path: '^apps/desktop/master' },
      to: { path: '^apps/(management|gallery)' }
    },
    {
      name: 'cloudflare-workers-no-electron-sqlite',
      comment: 'Cloudflare Workers must NOT import electron or better-sqlite3',
      severity: 'error',
      from: { path: '^apps/backend/cloud-backend' },
      to: { path: '(electron|better-sqlite3)' }
    },
    {
      name: 'react-native-no-better-sqlite3',
      comment: 'React Native apps must NOT import better-sqlite3 directly',
      severity: 'error',
      from: { path: '^apps/mobile' },
      to: { path: 'better-sqlite3' }
    },
    {
      name: 'no-circular',
      comment: 'No circular dependencies allowed',
      severity: 'error',
      from: {},
      to: { circular: true }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    }
  }
};
