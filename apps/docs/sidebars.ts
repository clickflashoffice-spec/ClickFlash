import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/quickstart',
        'getting-started/setup',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/ports',
        'architecture/electron',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/guide',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/reference',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/contributing',
        'guides/testing',
        'guides/security',
        'guides/troubleshooting',
      ],
    },
    'changelog',
  ],
};

export default sidebars;
