import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Scaffolder - Write Once, Generate Forever!',
  description: 'Generate APIs from database schemas using reusable templates',

  base: process.env.VITEPRESS_BASE || '/',

  themeConfig: {
    siteTitle: 'Scaffolder',

    nav: [
      { text: 'Introduction', link: '/introduction/' },
      { text: 'Features', link: '/features/' },
      { text: 'Documentation', link: '/documentation/' },
    ],

    sidebar: {
      '/documentation/': [
        {
          text: 'Structure',
          items: [
            {
              text: 'Repository Folders',
              link: '/documentation/structure/repository-folders/',
              items: [
                {
                  text: 'Core',
                  link: '/documentation/structure/repository-folders/core/',
                },
                {
                  text: 'Projects',
                  link: '/documentation/structure/repository-folders/projects/',
                },
                {
                  text: 'Constants',
                  link: '/documentation/structure/repository-folders/constants/',
                },
                {
                  text: 'Schemas',
                  link: '/documentation/structure/repository-folders/schemas/',
                },
                {
                  text: 'Templates',
                  link: '/documentation/structure/repository-folders/templates/',
                },
                {
                  text: 'Base Methods',
                  link: '/documentation/structure/repository-folders/base-methods/',
                },
                {
                  text: 'Domain Methods',
                  link: '/documentation/structure/repository-folders/domain-methods/',
                },
                {
                  text: 'Enterprise Methods',
                  link: '/documentation/structure/repository-folders/enterprise-methods/',
                },
              ],
            },
          ],
        },
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/documentation/api-reference/' },
            {
              text: '$USE_CORE',
              link: '/documentation/api-reference/core-imports/',
            },
            {
              text: 'IMPORT_PROJECT',
              link: '/documentation/api-reference/project-imports/',
            },
          ],
        },
      ],
    },

    search: {
      provider: 'local',
    },

    footer: {
      message: 'Scaffolder',
      copyright: 'Copyright © 2025',
    },
  },

  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
});
