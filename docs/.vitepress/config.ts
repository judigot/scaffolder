import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Scaffolder Documentation',
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
              link: '/documentation/structure/',
              items: [
                {
                  text: 'Core',
                  link: '/documentation/structure/repository-folders/core/',
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
