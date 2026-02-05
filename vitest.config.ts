import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    root: './src',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['../vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '.worktrees/**',
      '.vercel/**',
      '.apps/**',
      'e2e/**',
      '**/golden-projects/output/**',
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
