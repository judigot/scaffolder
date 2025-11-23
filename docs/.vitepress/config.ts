import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Scaffolder Documentation',
  description: 'Documentation for Scaffolder - A dynamic code generation tool',

  // Base URL for GitHub Pages
  // For GitHub Pages: If repo is username/scaffolder, use '/scaffolder/'
  // For custom domain: use '/'
  // For local dev: VitePress automatically uses '/' when running 'vitepress dev'
  // The VITEPRESS_BASE env var is set in GitHub Actions workflow
  base: process.env.VITEPRESS_BASE || '/',

  // Theme configuration
  themeConfig: {
    // Site title in nav bar
    siteTitle: 'Scaffolder Docs',

    // Navigation bar
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Introduction', link: '/INTRODUCTION' },
      { text: 'Business Value', link: '/BUSINESS_VALUE' },
      { text: 'Dependencies', link: '/TRANSFORMATION_DEPENDENCIES' },
    ],

    // Sidebar navigation
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Home', link: '/' },
          { text: 'Introduction', link: '/INTRODUCTION' },
        ],
      },
      {
        text: 'Architecture',
        items: [
          {
            text: 'Business Value',
            link: '/BUSINESS_VALUE',
            items: [
              { text: 'Overview', link: '/BUSINESS_VALUE#overview' },
              { text: 'Architecture', link: '/BUSINESS_VALUE#architecture' },
              {
                text: 'Business Value',
                link: '/BUSINESS_VALUE#business-value',
              },
              {
                text: 'Developer Experience',
                link: '/BUSINESS_VALUE#developer-experience-improvements',
              },
              {
                text: 'Use Cases',
                link: '/BUSINESS_VALUE#real-world-use-cases',
              },
              {
                text: 'Best Practices',
                link: '/BUSINESS_VALUE#best-practices',
              },
            ],
          },
        ],
      },
      {
        text: 'Technical Documentation',
        items: [
          {
            text: 'Transformation Dependencies',
            link: '/TRANSFORMATION_DEPENDENCIES',
            items: [
              {
                text: 'Overview',
                link: '/TRANSFORMATION_DEPENDENCIES#overview',
              },
              {
                text: 'Dependency Rules',
                link: '/TRANSFORMATION_DEPENDENCIES#rule-transformations-must-wait-for-dependencies',
              },
              {
                text: 'Implementation',
                link: '/TRANSFORMATION_DEPENDENCIES#implementation-details',
              },
              { text: 'Testing', link: '/TRANSFORMATION_DEPENDENCIES#testing' },
              {
                text: 'Loading Sequence',
                link: '/TRANSFORMATION_DEPENDENCIES#loading-sequence',
              },
            ],
          },
        ],
      },
    ],

    // Social links (optional)
    socialLinks: [
      // Add your GitHub repo link if desired
      // { icon: 'github', link: 'https://github.com/yourusername/scaffolder' },
    ],

    // Search configuration
    search: {
      provider: 'local',
    },

    // Footer (optional)
    footer: {
      message: 'Scaffolder Documentation',
      copyright: 'Copyright © 2024',
    },

    // Edit link (optional - update with your repo URL)
    // editLink: {
    //   pattern: 'https://github.com/yourusername/scaffolder/edit/main/docs/:path',
    //   text: 'Edit this page on GitHub',
    // },
  },

  // Markdown configuration
  markdown: {
    lineNumbers: true,
    // Code highlighting theme
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
});
