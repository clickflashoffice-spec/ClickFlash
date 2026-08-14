import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import path from 'path';

const config: Config = {
  title: 'ClickFlash Docs',
  tagline: 'Documentation for the ClickFlash Photography Studio Ecosystem',
  favicon: 'img/favicon.ico',
  plugins: [
    () => ({
      name: 'resolve-react-singleton',
      configureWebpack() {
        return {
          resolve: {
            alias: {
              react: path.resolve(__dirname, '../../node_modules/react'),
              'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
            },
          },
        };
      },
    }),
  ],


  url: 'https://docs.clickflash.app',
  baseUrl: '/',

  organizationName: 'alaeddinekhemiri',
  projectName: 'ClickFlash',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          editUrl:
            'https://github.com/alaeddinekhemiri/ClickFlash/tree/main/apps/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/clickflash-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'ClickFlash',
      logo: {
        alt: 'ClickFlash Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/api/reference',
          label: 'API',
          position: 'left',
        },
        {
          to: '/docs/changelog',
          label: 'Changelog',
          position: 'left',
        },
        {
          href: 'https://github.com/alaeddinekhemiri/ClickFlash',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/',
            },
            {
              label: 'Architecture',
              to: '/docs/architecture/overview',
            },
            {
              label: 'Deployment',
              to: '/docs/deployment/guide',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'API Reference',
              to: '/docs/api/reference',
            },
            {
              label: 'Contributing',
              to: '/docs/guides/contributing',
            },
            {
              label: 'Security',
              to: '/docs/guides/security',
            },
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/alaeddinekhemiri/ClickFlash',
            },
            {
              label: 'Changelog',
              to: '/docs/changelog',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ClickFlash Photography Solutions. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'yaml', 'powershell', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
