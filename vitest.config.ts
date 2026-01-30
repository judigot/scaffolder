import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['**/node_modules/**', '.worktrees/**', '.vercel/**', 'e2e/**'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
